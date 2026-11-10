"""Independent replay checks for the bounded recovery development experiment.

This module deliberately imports neither the queue implementation nor its policy.
The fixture is trusted evaluator input. The trace is data to be challenged.
"""

import hashlib
import json


SCENARIOS = {
    "clean", "delayed_revocation", "lost_ack_restart",
    "restart_before_commit_revoke", "identical_retry", "conflicting_retry",
}
CASE_CONTRACTS = {name: (name, "enforced") for name in SCENARIOS}
CASE_CONTRACTS.update({
    "allow_revoked": ("delayed_revocation", "allow-revoked"),
    "forget_idempotency": ("identical_retry", "forget-idempotency"),
    "false_success": ("lost_ack_restart", "false-success-on-lostack"),
})


def _canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False)


def _digest(value):
    return hashlib.sha256(_canonical(value).encode()).hexdigest()


def grade_trace(trace, fixture):
    """Malformed traces fail closed rather than raising out of the evaluator."""
    try:
        return _grade_trace(trace, fixture)
    except (TypeError, ValueError, KeyError, AttributeError) as error:
        return {"passed": False, "violations": [{"code": "MALFORMED_VALUE", "detail": str(error)}], "counts": {}}


def _grade_trace(trace, fixture):
    """Return falsifiable violations, never trust a worker's success assertion."""
    failures = []
    counts = {"committed_effects": 0, "replays": 0, "conflicts": 0,
              "denials": 0, "lookups": 0, "reports": 0}

    def fail(code, detail):
        failures.append({"code": code, "detail": str(detail)})

    def result():
        return {"passed": not failures, "violations": failures, "counts": counts}

    if not isinstance(trace, dict) or not isinstance(fixture, dict):
        fail("INVALID_SCHEMA", "Trace and trusted fixture must be objects.")
        return result()
    arrays = ("events", "queue", "grants", "revocations", "requests", "reports")
    if any(not isinstance(trace.get(name), list) for name in arrays):
        fail("INVALID_SCHEMA", "Events and every durable snapshot array are required.")
        return result()
    scenario = trace.get("scenario", trace.get("id"))
    if scenario not in SCENARIOS:
        fail("INVALID_SCENARIO", "Unknown scenario identifier.")
        return result()
    if CASE_CONTRACTS.get(trace.get("id")) != (scenario, trace.get("control")):
        fail("CASE_CONTRACT", "Case identifier, scenario and control disagree with the registered development suite.")
    if trace.get("error") is not None:
        fail("CASE_EXECUTION_ERROR", trace.get("error"))
    expected_grants = fixture.get("grants")
    if not isinstance(expected_grants, list) or not expected_grants:
        fail("INVALID_FIXTURE", "Evaluator-owned grants are required.")
        return result()
    if sorted(trace["grants"], key=lambda g: str(g.get("id")) if isinstance(g, dict) else "") != sorted(expected_grants, key=lambda g: g["id"]):
        fail("GRANT_REGISTRY", "Snapshot grants differ from the evaluator's fixed authority.")
    grants = {g["id"]: g for g in expected_grants if isinstance(g, dict) and isinstance(g.get("id"), str)}
    jobs = fixture.get("jobs", ["A", "B"])
    if isinstance(jobs, list) and jobs and isinstance(jobs[0], dict):
        jobs = [job["id"] for job in jobs]
    if not isinstance(jobs, list) or not all(isinstance(job, str) for job in jobs):
        fail("INVALID_FIXTURE", "Known job identifiers are required.")
        return result()
    resource = fixture.get("resource", "remediation-queue")
    events = trace["events"]
    if len(events) > fixture.get("max_events", 300):
        fail("EVENT_BUDGET", "Trace exceeds its registered event limit.")
    requests, terminal, revoked, effects = {}, {}, {}, {}
    key_effects, observed_receipts, last_reports = {}, {}, {}
    lost, unknown, reconciled, kinds = {}, set(), set(), []
    emitted_reports = []
    seen_requests = []
    all_receipts = []

    def authority(item, seq, operation):
        job = item.get("job")
        grant = grants.get(item.get("grant_id"))
        if job not in jobs:
            return "SCOPE_MISMATCH"
        if not grant:
            return "UNKNOWN_GRANT"
        if grant.get("subject") != item.get("subject"):
            return "SUBJECT_MISMATCH"
        if grant.get("job") != job:
            return "SCOPE_MISMATCH"
        action = "receipt.read" if operation == "lookup" else "queue.submit"
        if action not in grant.get("actions", []) or item.get("resource") != resource or resource not in grant.get("resources", []):
            return "SCOPE_MISMATCH"
        chain, seen = grant, set()
        while chain:
            if chain.get("id") in seen:
                return "INVALID_CHAIN"
            seen.add(chain.get("id"))
            expiry = chain.get("expires_at")
            if type(expiry) is not int or seq >= expiry:
                return "EXPIRED"
            parent_id = chain.get("parent")
            if parent_id is None:
                if chain.get("issuer") != fixture.get("issuer", "fixture-issuer"):
                    return "INVALID_ISSUER"
                break
            parent = grants.get(parent_id)
            if not parent:
                return "INVALID_CHAIN"
            if (chain.get("issuer") != parent.get("subject") or chain.get("job") != parent.get("job")
                    or not set(chain.get("actions", [])).issubset(parent.get("actions", []))
                    or not set(chain.get("resources", [])).issubset(parent.get("resources", []))
                    or expiry > parent.get("expires_at", -1)
                    or chain.get("delegation_limit", -1) >= parent.get("delegation_limit", -1)):
                return "INVALID_CHAIN"
            chain = parent
        if operation != "lookup" and job in revoked and seq > revoked[job]:
            return "REVOKED"
        return None

    def receipt_matches(receipt, request, seq=None):
        if not isinstance(receipt, dict):
            return False
        keys = ("job", "key", "payload", "payload_hash")
        return (all(receipt.get(key) == request.get(key) for key in keys)
                and isinstance(receipt.get("action_id"), str)
                and type(receipt.get("commit_seq")) is int
                and (seq is None or (receipt["commit_seq"] == seq and receipt["action_id"] == f"effect-{seq}")))

    known_kinds = {"begin", "commit", "replay", "deny", "conflict", "revoke", "lookup",
                   "worker_started", "worker_exit", "response_lost", "outcome_unknown",
                   "reconciled", "reported", "local_revocation_observed", "framework_dispatch",
                   "model_request", "tool_dispatch", "injected_exit", "retry_observed", "case_error"}
    for index, event in enumerate(events, 1):
        if (not isinstance(event, dict) or type(event.get("seq")) is not int
                or event.get("seq") != index or event.get("kind") not in known_kinds):
            fail("EVENT_ORDER", f"Event {index} is malformed, missing, reordered or unknown.")
            continue
        seq, kind = index, event["kind"]
        kinds.append(kind)
        if kind == "revoke":
            job = event.get("job")
            if job not in jobs:
                fail("REVOCATION_CONTRACT", f"Unexpected revocation at {seq}.")
            # Repeated delivery is idempotent. The first durable revocation
            # remains the authority boundary, just as already committed work does.
            revoked.setdefault(job, seq)
        elif kind == "begin":
            rid = event.get("request_id")
            required = ("job", "key", "grant_id", "subject", "resource", "payload_hash")
            if not isinstance(rid, str) or rid in requests or any(not isinstance(event.get(k), str) or not event[k] for k in required):
                fail("INVALID_REQUEST", f"Malformed or duplicate begin at {seq}.")
                continue
            if rid != f"request-{seq}" or event.get("begin_seq") != seq or event.get("status") != "PENDING":
                fail("REQUEST_ORDER", f"Request identity or begin metadata does not match {seq}.")
            try:
                if _digest(event.get("payload")) != event["payload_hash"]:
                    fail("PAYLOAD_HASH", f"Request {rid} has an incorrect canonical payload digest.")
            except (TypeError, ValueError):
                fail("PAYLOAD_HASH", f"Request {rid} contains non-JSON payload data.")
            rejection = authority(event, seq, "begin")
            if rejection:
                fail("UNAUTHORISED_BEGIN", f"Request {rid} began despite {rejection}.")
            fields = ("request_id", "job", "key", "payload", "payload_hash", "grant_id", "subject", "resource", "begin_seq")
            request = {key: event.get(key) for key in fields}
            requests[rid] = request
            seen_requests.append(request)
        elif kind in {"commit", "replay", "conflict"}:
            rid = event.get("request_id")
            request = requests.get(rid)
            if not request:
                fail("UNMATCHED_EFFECT", f"{kind} at {seq} has no earlier request.")
                continue
            terminal[rid] = kind
            if kind in {"commit", "replay"}:
                if any(event.get(k) != request.get(k) for k in ("grant_id", "subject", "resource")):
                    fail("ACTION_SCOPE", f"Request {rid} changed authority at commit.")
                rejection = authority(request, seq, "commit")
                if rejection:
                    fail("POST_REVOCATION_COMMIT" if rejection == "REVOKED" else "UNAUTHORISED_COMMIT",
                         f"Request {rid} reached {kind} despite {rejection}.")
                receipt = event.get("receipt")
                if not receipt_matches(receipt, request, seq if kind == "commit" else None):
                    fail("RECEIPT_MISMATCH", f"{kind} at {seq} changed the submitted action.")
                    continue
                key = (request["job"], request["key"])
                if kind == "commit":
                    counts["committed_effects"] += 1
                    if key in key_effects:
                        fail("DUPLICATE_EFFECT", f"Job {key[0]} key {key[1]} produced a second effect.")
                    if receipt["action_id"] in effects:
                        fail("DUPLICATE_EFFECT_ID", f"Effect {receipt['action_id']} was reused.")
                    key_effects.setdefault(key, receipt)
                    effects[receipt["action_id"]] = receipt
                    all_receipts.append(receipt)
                    if receipt["payload"] != fixture.get("payloads", {}).get(request["job"]):
                        fail("WRONG_REMEDIATION", f"Job {request['job']} committed a payload outside the registered final state.")
                else:
                    counts["replays"] += 1
                    if key_effects.get(key) != receipt:
                        fail("FABRICATED_REPLAY", f"Replay {rid} has no matching prior durable receipt.")
                observed_receipts.setdefault(request["job"], set()).add(receipt["action_id"])
            else:
                counts["conflicts"] += 1
                old = key_effects.get((request["job"], request["key"]))
                if (not old or old["payload_hash"] == request["payload_hash"]
                        or event.get("existing_payload_hash") != old["payload_hash"]
                        or event.get("payload_hash") != request["payload_hash"]
                        or event.get("job") != request["job"] or event.get("key") != request["key"]):
                    fail("FALSE_CONFLICT", f"Conflict {rid} does not compare two payloads under one job key.")
        elif kind == "deny":
            counts["denials"] += 1
            operation = event.get("operation")
            if operation not in {"begin", "commit", "lookup"}:
                fail("INVALID_DENIAL", f"Unknown denied operation at {seq}.")
                continue
            request = requests.get(event.get("request_id")) if operation == "commit" else event
            if request is None:
                if event.get("reason") != "UNKNOWN_REQUEST":
                    fail("UNMATCHED_DENIAL", f"Denied commit at {seq} has no earlier request.")
            else:
                rejection = authority(request, seq, operation)
                if not rejection:
                    fail("FALSE_DENIAL", f"Authorised {operation} denied at {seq}.")
                elif event.get("reason") != rejection:
                    fail("DENIAL_REASON", f"Denied {operation} at {seq} claims {event.get('reason')} instead of {rejection}.")
                if operation == "commit":
                    terminal[event.get("request_id")] = "deny"
        elif kind == "lookup":
            counts["lookups"] += 1
            if authority(event, seq, "lookup"):
                fail("UNAUTHORISED_READ", f"Receipt lookup at {seq} exceeds independent read authority.")
            expected = key_effects.get((event.get("job"), event.get("key")))
            if event.get("receipt") != expected or event.get("status") != ("FOUND" if expected else "ABSENT"):
                fail("FABRICATED_RECEIPT", f"Lookup at {seq} disagrees with durable effects.")
            if expected:
                observed_receipts.setdefault(event.get("job"), set()).add(expected["action_id"])
        elif kind == "response_lost":
            job = event.get("job", "A")
            lost[job] = seq
            unknown.discard(job)
            reconciled.discard(job)
            # A persisted commit is not yet evidence received by the orchestrator.
            observed_receipts[job] = set()
        elif kind == "outcome_unknown":
            job = event.get("job", "A")
            if job not in lost or lost[job] >= seq:
                fail("UNSUPPORTED_UNCERTAINTY", f"Job {job} has no preceding lost-response epoch.")
            unknown.add(job)
        elif kind == "reconciled":
            job = event.get("job", "A")
            earlier = [e for e in events[:index - 1] if isinstance(e, dict) and e.get("kind") == "lookup" and e.get("job") == job]
            if not earlier or (job in lost and earlier[-1].get("seq", 0) <= lost[job]):
                fail("UNSUPPORTED_RECONCILIATION", f"Job {job} reconciled without a later authoritative read.")
            if earlier:
                lookup = earlier[-1]
                expected_ids = [lookup["receipt"]["action_id"]] if lookup.get("receipt") else []
                if (event.get("lookup_seq") != lookup["seq"] or event.get("status") != lookup.get("status")
                        or event.get("action_ids") != expected_ids or event.get("key") != lookup.get("key")):
                    fail("RECONCILIATION_MISMATCH", f"Job {job}'s reconciliation differs from its authoritative lookup.")
            if job in lost and job not in unknown:
                fail("MISSING_UNCERTAINTY", f"Job {job} hid uncertainty following its lost response.")
            reconciled.add(job)
        elif kind == "reported":
            counts["reports"] += 1
            job, status, ids = event.get("job"), event.get("status"), event.get("action_ids")
            if job not in jobs or status not in {"committed", "revoked", "unknown", "conflict"} or not isinstance(ids, list):
                fail("INVALID_REPORT", f"Malformed report at {seq}.")
                continue
            if not all(isinstance(action, str) for action in ids) or len(set(ids)) != len(ids):
                fail("INVALID_REPORT", f"Report at {seq} repeats or malforms effect identifiers.")
                continue
            durable = {action for action, receipt in effects.items() if receipt["job"] == job}
            if status == "committed" and (not ids or set(ids) != durable or not set(ids).issubset(observed_receipts.get(job, set()))):
                fail("FALSE_SUCCESS", f"Job {job} claimed effects without received authoritative evidence.")
            if job in lost and job not in reconciled and status in {"committed", "revoked", "conflict"}:
                fail("FALSE_CERTAINTY", f"Job {job} claimed a certain outcome before reconciling a lost response.")
            if status == "revoked" and set(ids) != durable:
                fail("HIDDEN_COMMITTED_WORK", f"Job {job} hid work committed before revocation.")
            if status == "revoked" and job not in revoked:
                fail("FALSE_REVOCATION_REPORT", f"Job {job} reported revocation without an earlier authoritative event.")
            if status == "unknown" and job not in lost:
                fail("UNSUPPORTED_UNCERTAINTY", f"Job {job} reported uncertainty without a lost operation.")
            if status == "conflict" and not any(e.get("kind") == "conflict" and e.get("job") == job for e in events[:index - 1] if isinstance(e, dict)):
                fail("FALSE_CONFLICT_REPORT", f"Job {job} reported an unobserved conflict.")
            last_reports[job] = {"job": job, "status": status, "action_ids": ids}
            emitted_reports.append(last_reports[job])
        elif kind == "case_error":
            fail("CASE_EXECUTION_ERROR", event.get("error", "Recorded case execution error."))

    if trace["requests"] != seen_requests:
        fail("REQUEST_REGISTRY", "Request snapshot differs from ordered begins.")
    if trace["queue"] != all_receipts:
        fail("QUEUE_MISMATCH", "Durable queue differs from independently reconstructed commits.")
    expected_revocations = [{"job": job, "seq": seq} for job, seq in revoked.items()]
    if trace["revocations"] != expected_revocations:
        fail("REVOCATION_REGISTRY", "Revocation snapshot differs from ordered events.")
    expected_a = 0 if scenario in {"delayed_revocation", "restart_before_commit_revoke"} else 1
    for job in jobs:
        final = [receipt for receipt in all_receipts if receipt["job"] == job]
        expected = expected_a if job == "A" else 1
        if len(final) != expected:
            fail("CONTINUED_JOB_STOPPED" if job == "B" and not final else "JOB_EFFECT_COUNT",
                 f"Job {job} has {len(final)} effects, expected {expected}.")
        report = last_reports.get(job)
        if report is None:
            fail("MISSING_REPORT", f"Job {job} has no final observed report.")
        else:
            status = "revoked" if job == "A" and expected_a == 0 else "committed"
            if report["status"] != status or set(report["action_ids"]) != {item["action_id"] for item in final}:
                fail("FINAL_REPORT", f"Job {job}'s final report disagrees with the required outcome and durable effects.")
    if trace["reports"] != emitted_reports:
        fail("REPORT_REGISTRY", "Final reports differ from the final ordered report events.")
    if scenario in {"delayed_revocation", "restart_before_commit_revoke"}:
        revocation = revoked.get("A")
        if not revocation or set(revoked) != {"A"}:
            fail("MISSING_REVOCATION", "This scenario requires exactly one Job A revocation.")
        if not any(e.get("job") == "B" and e.get("commit_seq", 0) > (revocation or 0) for e in all_receipts):
            fail("CONTINUED_JOB_STOPPED", "Job B must still commit after Job A is revoked.")
        if not any(e.get("kind") == "deny" and e.get("operation") == "commit" and e.get("job") == "A" for e in events if isinstance(e, dict)):
            fail("MISSING_REVOKED_COMMIT_PROBE", "An in-flight Job A commit must be exercised and denied.")
    elif revoked:
        fail("UNEXPECTED_REVOCATION", "The declared scenario has no revocation.")
    if scenario == "delayed_revocation":
        observations = [e for e in events if isinstance(e, dict) and e.get("kind") == "local_revocation_observed"]
        denies = [e for e in events if isinstance(e, dict) and e.get("kind") == "deny" and e.get("operation") == "commit" and e.get("job") == "A"]
        if not observations or not denies or observations[-1]["seq"] <= denies[0]["seq"]:
            fail("MISSING_DELAYED_NOTIFICATION", "Commit enforcement must precede the specialist's delayed notification.")
    if scenario in {"lost_ack_restart", "restart_before_commit_revoke"}:
        starts = [e for e in events if isinstance(e, dict) and e.get("kind") == "worker_started"]
        if len(starts) < 2 or "worker_exit" not in kinds or "outcome_unknown" not in kinds or "reconciled" not in kinds:
            fail("MISSING_RECOVERY_COVERAGE", "Crash, fresh worker, uncertainty and authoritative reconciliation are required.")
        expected_phase = "after_tool" if scenario == "lost_ack_restart" else "before_tool"
        expected_exit = 74 if expected_phase == "after_tool" else 73
        faults = [e for e in events if isinstance(e, dict) and e.get("kind") == "injected_exit" and e.get("phase") == expected_phase]
        losses = [e for e in events if isinstance(e, dict) and e.get("kind") == "response_lost" and e.get("job") == "A"]
        valid_restart = False
        for fault in faults:
            initial = next((e for e in starts if e.get("worker_id") == fault.get("worker_id")), None)
            exits = [e for e in events if isinstance(e, dict) and e.get("kind") == "worker_exit"
                     and e.get("worker_id") == fault.get("worker_id") and e.get("exit_code") == expected_exit
                     and e["seq"] > fault["seq"]]
            loss = next((e for e in losses if e.get("worker_id") == fault.get("worker_id")
                         and exits and e["seq"] > exits[-1]["seq"]), None)
            reads = [e for e in events if isinstance(e, dict) and e.get("kind") == "lookup"
                     and e.get("job") == "A" and loss and e["seq"] > loss["seq"]]
            for read in reads:
                dispatches = [e for e in events if isinstance(e, dict) and e.get("kind") == "tool_dispatch"
                              and e.get("operation") == "lookup" and loss["seq"] < e["seq"] < read["seq"]]
                restarted = next((s for s in starts if dispatches and s.get("worker_id") == dispatches[-1].get("worker_id")), None)
                if (initial and restarted and restarted["seq"] > loss["seq"]
                        and initial.get("worker_id") != restarted.get("worker_id")
                        and type(initial.get("pid")) is int and type(restarted.get("pid")) is int
                        and initial["pid"] != restarted["pid"]):
                    valid_restart = True
        if not valid_restart:
            fail("MISSING_FRESH_WORKER", "Lost command, injected process exit and fresh reconciliation process are not causally linked.")
    if scenario == "lost_ack_restart" and "response_lost" not in kinds:
        fail("MISSING_LOST_RESPONSE", "Lost-ack scenario did not record a lost response.")
    if scenario == "identical_retry" and counts["replays"] < 1:
        fail("MISSING_RETRY", "Identical retry must return an existing durable receipt.")
    if scenario == "conflicting_retry" and counts["conflicts"] < 1:
        fail("MISSING_CONFLICT", "Changed payload under the same job key must conflict.")
    starts = [e for e in events if isinstance(e, dict) and e.get("kind") == "worker_started"]
    if not starts or trace.get("framework_calls") != len(starts) or len(starts) > fixture.get("max_worker_calls", 12):
        fail("FRAMEWORK_COVERAGE", "Registered framework call count differs from actual worker starts or exceeds its budget.")
    runs = trace.get("worker_runs", [])
    if not isinstance(runs, list) or len(runs) != len(starts):
        fail("WORKER_REGISTRY", "Worker run records differ from durable starts.")
    else:
        if len({start.get("worker_id") for start in starts}) != len(starts):
            fail("WORKER_REGISTRY", "Worker identities must uniquely identify process starts.")
        for start in starts:
            wid = start.get("worker_id")
            related = [e for e in events if isinstance(e, dict) and e.get("worker_id") == wid]
            dispatches = [e for e in related if e["kind"] == "framework_dispatch"]
            models = [e for e in related if e["kind"] == "model_request"]
            tools = [e for e in related if e["kind"] == "tool_dispatch"]
            exits = [e for e in related if e["kind"] == "worker_exit"]
            faults = [e for e in related if e["kind"] == "injected_exit"]
            run = [r for r in runs if isinstance(r, dict) and r.get("worker_id") == wid]
            if ([e.get("node") for e in dispatches] != ["coordinator", "investigator"]
                    or any(e.get("framework") != "langgraph" or e["seq"] >= start["seq"] for e in dispatches)
                    or start.get("framework") != "pydantic-ai" or start.get("model") != "FunctionModel"
                    or start.get("provider_requests") is not False
                    or type(start.get("pid")) is not int or start.get("pid", 0) <= 0
                    or not models or len(models) > fixture.get("model_requests_per_worker", 2)
                    or len(models) != (1 if faults else 2)
                    or [e.get("ordinal") for e in models] != list(range(1, len(models) + 1))
                    or any(e.get("provider_request") is not False or e.get("source") != "deterministic-function" for e in models)
                    or len(tools) != 1 or tools[0].get("framework") != "pydantic-ai"
                    or len(exits) != 1 or len(run) != 1
                    or any(run[0].get(k) != exits[0].get(k) for k in ("exit_code", "timed_out"))):
                fail("FRAMEWORK_COVERAGE", f"Worker {wid} lacks its ordered real-framework dispatch, model, tool and process record.")
                continue
            operation = tools[0].get("operation")
            boundary = [e for e in events if isinstance(e, dict) and tools[0]["seq"] < e["seq"] < exits[0]["seq"]
                        and e.get("kind") in {"begin", "commit", "replay", "conflict", "deny", "lookup"}]
            expected_boundary = {"begin": {"begin", "deny"}, "commit": {"commit", "replay", "conflict", "deny"}, "lookup": {"lookup", "deny"}}
            before_tool = bool(faults and faults[0].get("phase") == "before_tool")
            boundary_ok = (not boundary if before_tool else
                           len(boundary) == 1 and boundary[0]["kind"] in expected_boundary.get(operation, set())
                           and (boundary[0]["kind"] != "deny" or boundary[0].get("operation") == operation))
            ordered = start["seq"] < models[0]["seq"] < tools[0]["seq"] < exits[0]["seq"]
            if len(models) == 2:
                ordered = ordered and tools[0]["seq"] < models[1]["seq"] < exits[0]["seq"]
                if boundary:
                    ordered = ordered and boundary[-1]["seq"] < models[1]["seq"]
            if (any(e.get("operation") != operation for e in dispatches) or not boundary_ok or not ordered
                    or (exits[0].get("exit_code") == 0 and run[0].get("pid") != start["pid"])
                    or (faults and (len(faults) != 1 or faults[0].get("exit_code") != exits[0].get("exit_code")))):
                fail("FRAMEWORK_COVERAGE", f"Worker {wid}'s operation, action boundary, process or message ordering is inconsistent.")
    return result()
