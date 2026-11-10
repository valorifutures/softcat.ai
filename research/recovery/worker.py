"""One real PydanticAI tool dispatch in a short-lived offline specialist."""
from __future__ import annotations

import json
import os
import sys

from pydantic_ai import Agent, models
from pydantic_ai.messages import ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import UsageLimits

from .adapters import offline_guard
from .store import DurableStore


def run(request):
    models.ALLOW_MODEL_REQUESTS = False
    store = DurableStore(request["database"], control=request["control"])
    worker_id = request["worker_id"]
    store.record("worker_started", worker_id=worker_id, job=request["job"], pid=os.getpid(),
                 framework="pydantic-ai", model="FunctionModel", provider_requests=False)
    invocation = 0

    async def deterministic_model(messages, info):
        nonlocal invocation
        invocation += 1
        store.record("model_request", worker_id=worker_id, ordinal=invocation,
                     source="deterministic-function", provider_request=False)
        returns = [part for message in messages for part in message.parts
                   if isinstance(part, ToolReturnPart)]
        if returns:
            # The report comes from the real tool return, not an expected answer.
            return ModelResponse(parts=[TextPart(json.dumps(returns[-1].content))])
        return ModelResponse(parts=[ToolCallPart("execute", {
            "operation": request["operation"], "arguments": request["arguments"],
        }, tool_call_id=f"{worker_id}-tool")])

    agent = Agent(FunctionModel(deterministic_model), retries=0,
                  name="offline-shared-specialist")

    @agent.tool_plain
    async def execute(operation: str, arguments: dict) -> dict:
        """Use the simulated queue through its authoritative local action boundary."""
        if operation not in ("begin", "commit", "lookup"):
            raise ValueError("Unknown operation")
        store.record("tool_dispatch", worker_id=worker_id, operation=operation,
                     framework="pydantic-ai")
        if request.get("crash") == "before_tool":
            store.record("injected_exit", worker_id=worker_id, phase="before_tool", exit_code=73)
            os._exit(73)
        result = getattr(store, operation)(**arguments)
        if request.get("crash") == "after_tool":
            store.record("injected_exit", worker_id=worker_id, phase="after_tool", exit_code=74)
            os._exit(74)
        return result

    with offline_guard():
        result = agent.run_sync("Execute this registered synthetic queue operation.",
                                usage_limits=UsageLimits(request_limit=2, tool_calls_limit=1))
    return {"result": json.loads(result.output), "pid": os.getpid(),
            "function_requests": invocation, "provider_requests": 0}


if __name__ == "__main__":
    print(json.dumps(run(json.load(sys.stdin)), sort_keys=True))
