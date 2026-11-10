"""Real framework plumbing with fixed responses, never a live model benchmark."""
from __future__ import annotations

from contextlib import contextmanager
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from typing import TypedDict

os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["OTEL_SDK_DISABLED"] = "true"

from langgraph.graph import END, START, StateGraph

WORKER_TIMEOUT_SECONDS = 10
MAX_WORKER_CALLS_PER_CASE = 12


@contextmanager
def offline_guard():
    """Accident guard for Python network calls, not a hostile-code sandbox."""
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_dns = socket.getaddrinfo

    def guarded_connect(self, address):
        if self.family in (socket.AF_INET, socket.AF_INET6):
            raise RuntimeError("Network disabled in this offline development run")
        return original_connect(self, address)

    def guarded_connect_ex(self, address):
        if self.family in (socket.AF_INET, socket.AF_INET6):
            raise RuntimeError("Network disabled in this offline development run")
        return original_connect_ex(self, address)

    def denied_dns(*args, **kwargs):
        raise RuntimeError("DNS disabled in this offline development run")

    socket.socket.connect = guarded_connect
    socket.socket.connect_ex = guarded_connect_ex
    socket.getaddrinfo = denied_dns
    try:
        yield
    finally:
        socket.socket.connect = original_connect
        socket.socket.connect_ex = original_connect_ex
        socket.getaddrinfo = original_dns


class DispatchState(TypedDict, total=False):
    command: dict
    worker_id: str
    route: str
    response: dict
    runtime: dict


def worker_environment():
    """No inherited provider, tracing, GitHub or publishing credentials."""
    permitted = ("PATH", "LANG", "LC_ALL", "TZ", "SYSTEMROOT")
    env = {key: os.environ[key] for key in permitted if key in os.environ}
    env.update({"PYTHONHASHSEED": "0", "PYTHONNOUSERSITE": "1",
                "LANGCHAIN_TRACING_V2": "false", "LANGSMITH_TRACING": "false",
                "OTEL_SDK_DISABLED": "true"})
    return env


class FrameworkAdapter:
    """A LangGraph coordinator/investigator routes to a PydanticAI subprocess."""

    def __init__(self, store, case_id):
        self.store = store
        self.case_id = case_id
        self.calls = 0
        self.runs = []
        graph = StateGraph(DispatchState)
        graph.add_node("coordinator", self._coordinate)
        graph.add_node("investigator", self._investigate)
        graph.add_edge(START, "coordinator")
        graph.add_edge("coordinator", "investigator")
        graph.add_edge("investigator", END)
        self.graph = graph.compile()

    def _coordinate(self, state):
        command = state["command"]
        if command["operation"] not in ("begin", "commit", "lookup"):
            raise ValueError("Unregistered worker operation")
        self.store.record("framework_dispatch", worker_id=state["worker_id"],
                          framework="langgraph", node="coordinator",
                          operation=command["operation"])
        return {"route": "shared-specialist"}

    def _investigate(self, state):
        self.store.record("framework_dispatch", worker_id=state["worker_id"],
                          framework="langgraph", node="investigator",
                          operation=state["command"]["operation"])
        request = dict(state["command"], database=str(self.store.path),
                       worker_id=state["worker_id"], control=self.store.control)
        with offline_guard():
            try:
                completed = subprocess.run(
                    [sys.executable, "-m", "research.recovery.worker"],
                    input=json.dumps(request), text=True, capture_output=True,
                    timeout=WORKER_TIMEOUT_SECONDS, env=worker_environment(),
                    cwd=Path(__file__).resolve().parents[2], check=False,
                )
            except subprocess.TimeoutExpired:
                runtime = {"worker_id": state["worker_id"], "job": request["job"], "exit_code": None,
                           "timed_out": True}
                self.store.record("worker_exit", **runtime)
                return {"response": {"status": "NO_RESPONSE"}, "runtime": runtime}
        runtime = {"worker_id": state["worker_id"], "job": request["job"], "exit_code": completed.returncode,
                   "timed_out": False}
        self.store.record("worker_exit", **runtime)
        if completed.returncode:
            # Keep the actual failure for diagnostics, never convert it to success.
            runtime["stderr"] = completed.stderr[-4000:]
            return {"response": {"status": "NO_RESPONSE"}, "runtime": runtime}
        try:
            response = json.loads(completed.stdout)
        except json.JSONDecodeError as error:
            raise RuntimeError("Worker returned invalid JSON") from error
        runtime["pid"] = response["pid"]
        return {"response": response["result"], "runtime": runtime}

    def call(self, operation, arguments, *, crash=None):
        self.calls += 1
        if self.calls > MAX_WORKER_CALLS_PER_CASE:
            raise RuntimeError("Registered per-case worker budget exhausted")
        worker_id = f"{self.case_id}-worker-{self.calls}"
        job = arguments.get("job")
        if job is None:
            job = next(item["job"] for item in self.store.snapshot()["requests"]
                       if item["request_id"] == arguments["request_id"])
        result = self.graph.invoke({"command": {"operation": operation,
                                                "arguments": arguments,
                                                "job": job,
                                                "crash": crash},
                                    "worker_id": worker_id},
                                   config={"recursion_limit": 4})
        self.runs.append(result["runtime"])
        return result["response"]
