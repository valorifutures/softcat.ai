"""Offline evidence checks for the authenticated action-boundary development suite.

The evaluator owns its case contracts. It imports no service, client, runner or
store implementation, and never accepts a run's claimed grade as evidence.
"""

import hashlib
import json


# Tuples are (operation, certificate role, observed status, denial/error reason).
# This table is evaluator input, never populated from a record's expected field.
BEGIN = ("begin", "specialist", "PENDING", None)
COMMIT = ("commit", "specialist", "COMMITTED", None)
CASES = {
    "authorised": (["A"], [BEGIN, COMMIT]),
    "missing_certificate": ([], [("begin", "none", None, "TLS_REJECTED")]),
    "untrusted_certificate": ([], [("begin", "untrusted", None, "TLS_REJECTED")]),
    "wrong_caller": ([], [("begin", "wrong", "DENIED", "SUBJECT_MISMATCH")]),
    "caller_spoof": ([], [("begin", "specialist", "DENIED", "INVALID_SCHEMA")]),
    "scope_job": ([], [("begin", "specialist", "DENIED", "SCOPE_MISMATCH")]),
    "scope_resource": ([], [("begin", "specialist", "DENIED", "SCOPE_MISMATCH")]),
    "expired_grant": ([], [BEGIN, ("commit", "specialist", "DENIED", "EXPIRED")]),
    "revoked_inflight": (["B"], [BEGIN, ("revoke", "admin", None, None),
                                   ("commit", "specialist", "DENIED", "REVOKED"),
                                   ("lookup", "specialist", "ABSENT", None), BEGIN, COMMIT]),
    "identical_retry": (["A"], [BEGIN, COMMIT, BEGIN, ("commit", "specialist", "REPLAY", None)]),
    "conflicting_retry": (["A"], [BEGIN, COMMIT, BEGIN, ("commit", "specialist", "CONFLICT", "PAYLOAD_CONFLICT")]),
    "lost_reply_restart": (["A"], [BEGIN, ("commit", "specialist", None, "NO_RESPONSE"),
                                      ("lookup", "specialist", "FOUND", None)]),
    "receipt_read_denied": (["A"], [BEGIN, COMMIT,
                                      ("lookup", "wrong", "DENIED", "SUBJECT_MISMATCH"),
                                      ("lookup", "specialist", "DENIED", "SCOPE_MISMATCH")]),
    "commit_wrong_caller": ([], [BEGIN, ("commit", "wrong", "DENIED", "REQUEST_OWNER_MISMATCH")]),
}
CONTROL_CODES = {
    "unexpected_effect": "UNEXPECTED_EFFECT", "missing_B": "MISSING_EFFECT",
    "false_auth_success": "AUTHENTICATION_BYPASS", "duplicate_effect": "DUPLICATE_EFFECT",
    "lost_reply_false_success": "FALSE_CERTAINTY",
}
PAYLOADS = {job: {"remediation": f"synthetic-{job}"} for job in ("A", "B")}


def _grants(expired=False):
    grants = []
    for job in ("A", "B"):
        for suffix, subject, issuer, parent, limit in (
            ("root", "coordinator", "fixture-issuer", None, 2),
            ("investigator", "investigator", "coordinator", f"{job}-root", 1),
            ("write", "specialist", "investigator", f"{job}-investigator", 0),
        ):
            grants.append({"id": f"{job}-{suffix}", "issuer": issuer, "subject": subject,
                           "job": job, "actions": ["queue.submit"], "resources": ["remediation-queue"],
                           "expires_at": 2 if expired and job == "A" else 1_000_000_000,
                           "delegation_limit": limit, "parent": parent})
        grants.append({"id": f"{job}-read", "issuer": "fixture-issuer", "subject": "specialist",
                       "job": job, "actions": ["receipt.read"], "resources": ["remediation-queue"],
                       "expires_at": 1_000_000_000, "delegation_limit": 0, "parent": None})
    return sorted(grants, key=lambda grant: grant["id"])


def grade_case(trace):
    """Grade untrusted JSON and fail closed for malformed values."""
    try:
        return _grade_case(trace)
    except (TypeError, ValueError, KeyError, AttributeError, IndexError) as error:
        return {"passed": False, "errors": [{"code": "MALFORMED_VALUE", "detail": str(error)}]}


def _grade_case(trace):
    errors = []

    def fail(code, detail):
        errors.append({"code": code, "detail": str(detail)})

    def result():
        return {"passed": not errors, "errors": errors}

    if not isinstance(trace, dict) or trace.get("id") not in CASES:
        fail("CASE_CONTRACT", "A registered case identifier is required.")
        return result()
    name = trace["id"]
    if trace.get("scenario") != name:
        fail("CASE_CONTRACT", "Case identifier and scenario disagree.")
    if trace.get("error") is not None:
        fail("CASE_EXECUTION_ERROR", trace["error"])
    snapshot, calls = trace.get("snapshot"), trace.get("calls")
    if (not isinstance(snapshot, dict) or not isinstance(calls, list)
            or any(not isinstance(snapshot.get(field), list) for field in
                   ("events", "queue", "requests", "grants", "revocations"))):
        fail("INVALID_SCHEMA", "Calls and all durable snapshot arrays are required.")
        return result()
    if snapshot.get("control") != "enforced":
        fail("STORE_CONTROL", "The registered service uses the enforced store.")
    if sorted(snapshot["grants"], key=lambda grant: grant["id"]) != _grants(name == "expired_grant"):
        fail("GRANT_REGISTRY", "The stored registry differs from evaluator-owned grants.")
        return result()
    if len(calls) > 16 or len(snapshot["events"]) > 64:
        fail("CASE_BUDGET", "The case exceeds its registered call or event budget.")
    process_ids = trace.get("process_ids")
    count = 2 if name == "lost_reply_restart" else 1
    if (not isinstance(process_ids, list) or len(process_ids) != count
            or any(type(pid) is not int or pid <= 0 for pid in process_ids)
            or len(set(process_ids)) != len(process_ids)):
        fail("PROCESS_COVERAGE", "The case lacks the registered distinct service process starts.")
    expected_jobs, expected_calls = CASES[name]
    if len(calls) != len(expected_calls):
        fail("CALL_CONTRACT", "The registered sequence of probes is incomplete or extended.")
    events = snapshot["events"]
    used_events, last_seq, pending_request_id = set(), 0, None
    for ordinal, (call, expected) in enumerate(zip(calls, expected_calls)):
        operation, client, status, reason = expected
        if not isinstance(call, dict) or not isinstance(call.get("request"), dict):
            fail("CALL_CONTRACT", f"Malformed call {ordinal + 1}.")
            continue
        request, response = call["request"], call.get("response")
        if call.get("operation") != operation or request.get("op") != operation or call.get("client") != client:
            fail("CALL_CONTRACT", f"Call {ordinal + 1} did not exercise its registered identity and operation.")
        if operation in {"begin", "lookup"}:
            job = "B" if name == "scope_job" or (name == "revoked_inflight" and ordinal >= 4) else "A"
            grant = "A-write" if name == "scope_job" else f"{job}-{'read' if operation == 'lookup' else 'write'}"
            if name == "receipt_read_denied" and ordinal == 3:
                grant = "A-write"
            required = {"op", "job", "key", "grant_id", "resource"}
            if operation == "begin":
                required.add("payload")
                payload = ({"remediation": "different-synthetic-remediation"}
                           if name == "conflicting_retry" and ordinal == 2 else PAYLOADS[job])
                if request.get("payload") != payload:
                    fail("PROBE_CONTRACT", "The probe changed its registered payload.")
            if name == "caller_spoof":
                required.add("subject")
                if request.get("subject") != "specialist":
                    fail("PROBE_CONTRACT", "The caller override probe did not claim specialist identity.")
            valid_resource = request.get("resource") == ("other-resource" if name == "scope_resource" else "remediation-queue")
            if (set(request) != required or request.get("job") != job or request.get("key") != f"{job}-remediation"
                    or request.get("grant_id") != grant or not valid_resource):
                fail("PROBE_CONTRACT", "The probe changed its registered scope or fields.")
        elif operation == "commit":
            if set(request) != {"op", "request_id"} or request.get("request_id") != pending_request_id or pending_request_id is None:
                fail("PROBE_CONTRACT", "The commit must reference the registered preceding pending request.")
        elif operation == "revoke" and request != {"op": "revoke", "job": "A"}:
            fail("PROBE_CONTRACT", "Only Job A is registered for revocation.")
        if reason in {"TLS_REJECTED", "NO_RESPONSE"}:
            if response is not None or call.get("error") != reason:
                fail("AUTHENTICATION_BYPASS" if reason == "TLS_REJECTED" else "FALSE_CERTAINTY",
                     f"Call {ordinal + 1} claims a response where {reason} is required.")
            if reason == "TLS_REJECTED":
                continue
            matches = [event for event in events if event.get("kind") == "commit"
                       and event.get("request_id") == request.get("request_id")]
            event = matches[0] if len(matches) == 1 else None
        else:
            if not isinstance(response, dict) or call.get("error") is not None:
                fail("CALL_CONTRACT", f"Call {ordinal + 1} lacks an observed response.")
                continue
            if operation == "revoke":
                correct = response.get("kind") == "revoke" and response.get("job") == "A"
            else:
                correct = response.get("status") == status and response.get("reason") == reason
            if not correct:
                fail("CALL_CONTRACT", f"Call {ordinal + 1} returned the wrong status or denial reason.")
            if reason in {"INVALID_SCHEMA", "REQUEST_OWNER_MISMATCH"}:
                if response.get("receipt") is not None or "event_seq" in response:
                    fail("CALL_CONTRACT", "A pre-store denial must carry no receipt or store event.")
                continue
            seq = response.get("seq") if operation == "revoke" else response.get("event_seq")
            event = next((item for item in events if item.get("seq") == seq), None)
        if event is None:
            fail("CALL_EVENT_MISMATCH", f"Call {ordinal + 1} has no matching durable event.")
            continue
        seq = event["seq"]
        if seq in used_events or seq <= last_seq:
            fail("CALL_EVENT_ORDER", "Calls reuse or reorder durable action events.")
        used_events.add(seq)
        last_seq = seq
        expected_kind = {"PENDING": "begin", "COMMITTED": "commit", "REPLAY": "replay",
                         "CONFLICT": "conflict", "FOUND": "lookup", "ABSENT": "lookup", "DENIED": "deny"}.get(status)
        expected_kind = "revoke" if operation == "revoke" else "commit" if reason == "NO_RESPONSE" else expected_kind
        if event.get("kind") != expected_kind or (status == "DENIED" and event.get("reason") != reason):
            fail("CALL_EVENT_MISMATCH", f"Call {ordinal + 1} disagrees with the event kind or reason.")
        if operation in {"begin", "lookup"}:
            fields = ("job", "key", "grant_id", "resource") + (("payload",) if operation == "begin" else ())
            if any(event.get(field) != request.get(field) for field in fields):
                fail("CALL_EVENT_MISMATCH", f"Call {ordinal + 1} changed fields at the boundary.")
            if event.get("subject") != {"specialist": "specialist", "wrong": "wrong-specialist"}.get(client):
                fail("CALLER_IDENTITY", "The service did not bind the verified certificate to its registered principal.")
        if event.get("actor") != ("authenticated-admin" if operation == "revoke" else "authenticated-service"):
            fail("CALLER_IDENTITY", "The action event has the wrong authenticated service actor.")
        if operation == "commit" and event.get("request_id") != request.get("request_id"):
            fail("CALL_EVENT_MISMATCH", "Commit refers to another request.")
        if response is not None and operation != "revoke":
            if status in {"COMMITTED", "REPLAY", "FOUND", "ABSENT"} and response.get("receipt") != event.get("receipt"):
                fail("RESPONSE_RECEIPT", "The received receipt differs from durable evidence.")
            if status == "PENDING" and response.get("request_id") != event.get("request_id"):
                fail("RESPONSE_REQUEST", "The pending response refers to another request.")
            if status == "PENDING":
                pending_request_id = response.get("request_id")
            if status in {"DENIED", "CONFLICT"} and response.get("receipt") is not None:
                fail("RESPONSE_RECEIPT", "An unsuccessful response carries a receipt.")
    if used_events != {event.get("seq") for event in events}:
        fail("UNACCOUNTED_EVENT", "The durable event history contains an unaccounted operation.")
    _, commits, revoked = _replay(snapshot, fail)
    queue = snapshot["queue"]
    actual_jobs = [item.get("job") for item in queue]
    for job in actual_jobs:
        if job not in expected_jobs:
            fail("UNEXPECTED_EFFECT", f"Job {job} has an effect outside its registered final state.")
    for job in expected_jobs:
        if job not in actual_jobs:
            fail("MISSING_EFFECT", f"Authorised job {job} did not complete.")
    if len(actual_jobs) != len(set(actual_jobs)):
        fail("DUPLICATE_EFFECT", "The durable queue repeats a job effect.")
    for item in queue:
        if item.get("payload") != PAYLOADS.get(item.get("job")) or item.get("key") != f"{item.get('job')}-remediation":
            fail("WRONG_REMEDIATION", "The durable effect differs from the registered payload or key.")
    if name == "revoked_inflight":
        if set(revoked) != {"A"} or not any(item.get("job") == "B" and item.get("commit_seq", 0) > revoked.get("A", 10**9) for item in commits):
            fail("MISSING_EFFECT", "Job B must commit after the single Job A revocation.")
    elif revoked:
        fail("UNEXPECTED_REVOCATION", "This case has no registered revocation.")
    if name == "lost_reply_restart":
        observations = trace.get("observations")
        found = (calls[-1].get("response") or {}) if calls else {}
        if (not isinstance(observations, list) or len(observations) != 2
                or observations[0] != {"status": "outcome_unknown"}
                or observations[1] != {"status": "reconciled", "receipt": found.get("receipt")}
                or calls[-1].get("operation") != "lookup" or found.get("status") != "FOUND"
                or found.get("receipt") not in commits):
            fail("FALSE_CERTAINTY", "Lost-reply recovery requires recorded uncertainty and a subsequent authoritative receipt read.")
        if trace.get("process_exits") != [74, 0]:
            fail("PROCESS_COVERAGE", "The service must exit 74 at the fault and recover in a new process.")
    elif trace.get("process_exits") != [0]:
        fail("PROCESS_COVERAGE", "The service did not shut down successfully.")
    return result()


def grade_receipt(receipt):
    """Regrade every registered case and check the full, fixed denominator."""
    errors, grades = [], []
    if not isinstance(receipt, dict) or not isinstance(receipt.get("runs"), list):
        return {"passed": False, "errors": [{"code": "INVALID_SCHEMA", "detail": "Receipt runs are required."}], "cases": []}
    if receipt.get("schemaVersion") != 1 or receipt.get("stage") != "authenticated-action-boundary":
        errors.append({"code": "RECEIPT_CONTRACT", "detail": "Unknown receipt schema or stage."})
    ids = []
    for run in receipt["runs"]:
        if not isinstance(run, dict):
            errors.append({"code": "INVALID_SCHEMA", "detail": "A run must be an object."})
            continue
        ids.append(run.get("id"))
        grade = grade_case(run.get("trace"))
        grades.append({"id": run.get("id"), **grade})
        if not isinstance(run.get("trace"), dict) or run.get("id") != run["trace"].get("id"):
            errors.append({"code": "CASE_CONTRACT", "detail": "Run and trace identifiers disagree."})
        if not grade["passed"]:
            errors.append({"code": "FAILED_CASE", "detail": str(run.get("id"))})
        if run.get("grade") != grade:
            errors.append({"code": "RECORDED_GRADE", "detail": "Stored grade differs from independent replay."})
    if ids != list(CASES):
        errors.append({"code": "CASE_DENOMINATOR", "detail": "Every registered case must occur once in fixed order."})
    return {"passed": not errors, "errors": errors, "cases": grades}


def _digest(value):
    raw = json.dumps(value, sort_keys=True, separators=(",", ":"),
                     ensure_ascii=False, allow_nan=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _replay(snapshot, fail):
    """Reconstruct durable state solely from ordered action-boundary events."""
    requests, effects, keys, revoked, commits = {}, {}, {}, {}, []
    grants = {grant["id"]: grant for grant in snapshot["grants"]}

    def authority(item, seq, action):
        grant = grants.get(item.get("grant_id"))
        if grant is None:
            return "UNKNOWN_GRANT"
        if grant.get("subject") != item.get("subject"):
            return "SUBJECT_MISMATCH"
        seen = set()
        while grant is not None:
            if grant["id"] in seen:
                return "INVALID_CHAIN"
            seen.add(grant["id"])
            if (grant.get("job") != item.get("job")
                    or action not in grant.get("actions", [])
                    or item.get("resource") not in grant.get("resources", [])):
                return "SCOPE_MISMATCH"
            expiry, limit = grant.get("expires_at"), grant.get("delegation_limit")
            if type(expiry) is not int or type(limit) is not int or limit < 0:
                return "INVALID_CHAIN"
            if seq >= expiry:
                return "EXPIRED"
            parent_id = grant.get("parent")
            if parent_id is None:
                if grant.get("issuer") != "fixture-issuer":
                    return "INVALID_ISSUER"
                break
            parent = grants.get(parent_id)
            if (parent is None or grant.get("issuer") != parent.get("subject")
                    or grant.get("job") != parent.get("job")
                    or not set(grant.get("actions", [])).issubset(parent.get("actions", []))
                    or not set(grant.get("resources", [])).issubset(parent.get("resources", []))
                    or expiry > parent.get("expires_at", -1)
                    or limit >= parent.get("delegation_limit", -1)):
                return "INVALID_CHAIN"
            grant = parent
        if action == "queue.submit" and item.get("job") in revoked:
            return "REVOKED"
        return None

    for index, event in enumerate(snapshot["events"], 1):
        if not isinstance(event, dict) or type(event.get("seq")) is not int or event["seq"] != index:
            fail("EVENT_ORDER", f"Malformed or reordered event {index}.")
            continue
        kind = event.get("kind")
        if kind == "begin":
            rid = event.get("request_id")
            if rid != f"request-{index}" or rid in requests or event.get("begin_seq") != index or event.get("status") != "PENDING":
                fail("REQUEST_ORDER", f"Invalid begin identity at {index}.")
            fields = ("request_id", "begin_seq", "job", "key", "payload", "payload_hash", "grant_id", "subject", "resource")
            request = {name: event.get(name) for name in fields}
            if not isinstance(request["payload"], dict) or request["payload_hash"] != _digest(request["payload"]):
                fail("PAYLOAD_HASH", f"Incorrect request digest at {index}.")
            reason = authority(request, index, "queue.submit")
            if reason:
                fail("UNAUTHORISED_BEGIN", f"Begin {index} violates {reason}.")
            requests[rid] = request
        elif kind in {"commit", "replay", "conflict"}:
            if event.get("status") != {"commit": "COMMITTED", "replay": "REPLAY", "conflict": "CONFLICT"}[kind]:
                fail("EVENT_STATUS", f"{kind} at {index} carries an inconsistent status.")
            request = requests.get(event.get("request_id"))
            if request is None:
                fail("UNMATCHED_EFFECT", f"{kind} at {index} has no earlier request.")
                continue
            if any(event.get(name) != request[name] for name in ("job", "key", "grant_id", "subject", "resource")):
                fail("ACTION_SCOPE", f"{kind} changed request scope at {index}.")
            reason = authority(request, index, "queue.submit")
            if reason:
                fail("POST_REVOCATION_COMMIT" if reason == "REVOKED" else "UNAUTHORISED_COMMIT",
                     f"{kind} at {index} violates {reason}.")
            key = (request["job"], request["key"])
            if kind == "conflict":
                existing = keys.get(key)
                if (not existing or existing["payload_hash"] == request["payload_hash"]
                        or event.get("payload_hash") != request["payload_hash"]
                        or event.get("existing_payload_hash") != existing["payload_hash"]):
                    fail("FALSE_CONFLICT", f"Conflict at {index} lacks two different payloads.")
                continue
            receipt = event.get("receipt")
            if not isinstance(receipt, dict) or any(receipt.get(name) != request[name] for name in ("job", "key", "payload", "payload_hash")):
                fail("RECEIPT_MISMATCH", f"{kind} at {index} changed the action.")
                continue
            if kind == "replay":
                if receipt != keys.get(key):
                    fail("FABRICATED_REPLAY", f"Replay at {index} has no original effect.")
            else:
                if receipt.get("action_id") != f"effect-{index}" or receipt.get("commit_seq") != index:
                    fail("RECEIPT_MISMATCH", f"Commit identity at {index} differs from its event.")
                if key in keys or receipt.get("action_id") in effects:
                    fail("DUPLICATE_EFFECT", f"A second effect was recorded for {key}.")
                effects[receipt.get("action_id")] = receipt
                keys.setdefault(key, receipt)
                commits.append(receipt)
        elif kind == "deny":
            operation = event.get("operation")
            if operation == "begin" and (not isinstance(event.get("payload"), dict) or event.get("payload_hash") != _digest(event.get("payload"))):
                fail("PAYLOAD_HASH", f"Denied request at {index} has an incorrect digest.")
            request = requests.get(event.get("request_id")) if operation == "commit" else event
            reason = ("UNKNOWN_REQUEST" if request is None else
                      authority(request, index, "receipt.read" if operation == "lookup" else "queue.submit"))
            if operation not in {"begin", "commit", "lookup"} or reason != event.get("reason"):
                fail("DENIAL_REASON", f"Denial at {index} disagrees with independent authority.")
        elif kind == "revoke":
            if event.get("job") not in {"A", "B"}:
                fail("REVOCATION_CONTRACT", f"Unknown job revoked at {index}.")
            revoked.setdefault(event.get("job"), index)
        elif kind == "lookup":
            if authority(event, index, "receipt.read"):
                fail("UNAUTHORISED_READ", f"Lookup at {index} lacks read authority.")
            expected = keys.get((event.get("job"), event.get("key")))
            if event.get("receipt") != expected or event.get("status") != ("FOUND" if expected else "ABSENT"):
                fail("FABRICATED_RECEIPT", f"Lookup at {index} differs from committed state.")
        elif kind not in {"service_started", "boundary_denied", "response_lost"}:
            fail("UNKNOWN_EVENT", f"Unknown event kind {kind!r} at {index}.")
    if snapshot["requests"] != list(requests.values()):
        fail("REQUEST_REGISTRY", "Durable requests differ from ordered begins.")
    if snapshot["queue"] != commits:
        fail("QUEUE_MISMATCH", "Durable queue differs from independently reconstructed commits.")
    expected_revocations = [{"job": job, "seq": seq} for job, seq in revoked.items()]
    if snapshot["revocations"] != expected_revocations:
        fail("REVOCATION_REGISTRY", "Durable revocations differ from ordered events.")
    return requests, commits, revoked
