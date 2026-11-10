"""Registered deterministic development cases, not held-out agent evaluation."""
from __future__ import annotations

import json
from pathlib import Path
import tempfile

from .adapters import FrameworkAdapter, offline_guard
from .store import DurableStore

FIXTURE_PATH = Path(__file__).with_name("fixture.json")
CASES = (
    ("clean", "enforced", "clean"),
    ("delayed_revocation", "enforced", "delayed_revocation"),
    ("lost_ack_restart", "enforced", "lost_ack_restart"),
    ("restart_before_commit_revoke", "enforced", "restart_before_commit_revoke"),
    ("identical_retry", "enforced", "identical_retry"),
    ("conflicting_retry", "enforced", "conflicting_retry"),
    ("allow_revoked", "allow-revoked", "delayed_revocation"),
    ("forget_idempotency", "forget-idempotency", "identical_retry"),
    ("false_success", "false-success-on-lostack", "lost_ack_restart"),
)


def run_case(case_id, control, scenario, directory, fixture=None):
    fixture = fixture or json.loads(FIXTURE_PATH.read_text())
    store_control = control if control in ("allow-revoked", "forget-idempotency") else "enforced"
    database = Path(directory) / f"{case_id}.sqlite"
    if database.exists():
        raise FileExistsError(f"Refusing to append another trial to {database.name}")
    store = DurableStore(database, control=store_control,
                         grants=fixture["grants"])
    adapter = FrameworkAdapter(store, case_id)
    reports = []
    payloads = fixture["payloads"]

    def emit(job, status, receipt=None):
        report = {"job": job, "status": status,
                  "action_ids": [receipt["action_id"]] if receipt else []}
        store.record("reported", **report)
        reports.append(report)

    def begin(job, payload=None):
        return adapter.call("begin", {"job": job, "key": f"{job}-remediation",
                                       "payload": payload or payloads[job]})

    def commit(request, crash=None):
        if request["status"] != "PENDING":
            raise RuntimeError(f"Unexpected begin response: {request}")
        return adapter.call("commit", {"request_id": request["request_id"]}, crash=crash)

    def complete(job):
        result = commit(begin(job))
        if result["status"] not in ("COMMITTED", "REPLAY"):
            raise RuntimeError(f"Unexpected completion response: {result}")
        emit(job, "committed", result["receipt"])
        return result

    def lost_ack():
        worker_id = adapter.runs[-1]["worker_id"]
        store.record("response_lost", job="A", key="A-remediation", worker_id=worker_id)
        if control == "false-success-on-lostack":
            # Deliberate bad control. Absence of acknowledgement proves no success.
            emit("A", "committed")
        else:
            store.record("outcome_unknown", job="A", key="A-remediation", worker_id=worker_id)

    def reconcile():
        result = adapter.call("lookup", {"job": "A", "key": "A-remediation"})
        if result["status"] not in ("FOUND", "ABSENT"):
            raise RuntimeError(f"Unexpected lookup response: {result}")
        store.record("reconciled", job="A", key="A-remediation", status=result["status"],
                     worker_id=adapter.runs[-1]["worker_id"],
                     action_ids=[result["receipt"]["action_id"]] if result["receipt"] else [],
                     lookup_seq=result["event_seq"])
        return result

    error = None
    try:
        with offline_guard():
            if scenario == "clean":
                complete("A")
                complete("B")
            elif scenario == "delayed_revocation":
                pending = begin("A")
                store.revoke("A")
                result = commit(pending)
                # Local delivery follows the attempt. The action boundary already knew.
                store.record("local_revocation_observed", job="A")
                emit("A", "committed" if result["receipt"] else "revoked", result["receipt"])
                complete("B")
            elif scenario == "lost_ack_restart":
                result = commit(begin("A"), crash="after_tool")
                if result["status"] != "NO_RESPONSE":
                    raise RuntimeError("Registered lost acknowledgement did not occur")
                lost_ack()
                found = reconcile()
                emit("A", "committed" if found["receipt"] else "unknown", found["receipt"])
                complete("B")
            elif scenario == "restart_before_commit_revoke":
                pending = begin("A")
                result = commit(pending, crash="before_tool")
                if result["status"] != "NO_RESPONSE":
                    raise RuntimeError("Registered pre-commit exit did not occur")
                lost_ack()
                store.revoke("A")
                result = commit(pending)
                absent = reconcile()
                emit("A", "revoked" if result["status"] == "DENIED" and not absent["receipt"]
                     else "unknown", absent["receipt"])
                complete("B")
            elif scenario in ("identical_retry", "conflicting_retry"):
                first = commit(begin("A"))
                if first["status"] != "COMMITTED":
                    raise RuntimeError("Initial action did not commit")
                payload = dict(payloads["A"])
                if scenario == "conflicting_retry":
                    payload["remediation"] = "different-synthetic-remediation"
                second = commit(begin("A", payload))
                store.record("retry_observed", job="A", status=second["status"])
                emit("A", "committed", first["receipt"])
                complete("B")
            else:
                raise ValueError("Unregistered scenario")
    except Exception as caught:
        error = f"{type(caught).__name__}: {caught}"
        store.record("case_error", error=error)
    snapshot = store.snapshot()
    store.close()
    return {"id": case_id, "control": control, "scenario": scenario, **snapshot,
            "control": control, "reports": reports, "worker_runs": adapter.runs,
            "framework_calls": adapter.calls, "error": error}


def run_suite(fixture=None, directory=None):
    if directory is None:
        with tempfile.TemporaryDirectory(prefix="softcat-recovery-") as temporary:
            return run_suite(fixture, temporary)
    Path(directory).mkdir(parents=True, exist_ok=True)
    return [run_case(*case, directory, fixture) for case in CASES]
