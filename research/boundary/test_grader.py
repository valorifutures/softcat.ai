"""Synthetic unit fixtures challenge the offline grader, without running TLS.

These fixtures are not study receipts. Real transport/process evidence is
collected only by the separately registered runner.
"""

import ast
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from research.boundary.grader import CASES, CONTROL_CODES, grade_case, grade_receipt
from research.recovery.store import DurableStore, default_grants


def fixture(name):
    """Construct known records using store calls, with explicit fake process IDs."""
    with TemporaryDirectory() as directory:
        grants = default_grants()
        if name == "expired_grant":
            for grant in grants:
                if grant["id"] in {"A-root", "A-investigator", "A-write"}:
                    grant["expires_at"] = 2
        with DurableStore(Path(directory) / "fixture.sqlite", grants=grants) as store:
            calls = []

            def call(request, client="specialist", forced=None, error=None):
                operation = request["op"]
                subject = "wrong-specialist" if client == "wrong" else "specialist"
                params = {key: value for key, value in request.items() if key != "op"}
                if error == "TLS_REJECTED":
                    response = None
                elif forced:
                    response = {"status": "DENIED", "reason": forced, "receipt": None}
                elif operation in {"begin", "lookup"}:
                    response = getattr(store, operation)(**params, subject=subject, actor="authenticated-service")
                elif operation == "revoke":
                    response = store.revoke(**params, actor="authenticated-admin")
                else:
                    response = store.commit(**params, actor="authenticated-service")
                calls.append({"operation": operation, "client": client, "request": request,
                              "response": None if error else response, "error": error})
                return response

            def begin(job="A", client="specialist", **changes):
                request = {"op": "begin", "job": job, "key": f"{job}-remediation",
                           "payload": {"remediation": f"synthetic-{job}"},
                           "grant_id": f"{job}-write", "resource": "remediation-queue"}
                request.update(changes.pop("request_changes", {}))
                return call(request, client, **changes)

            def commit(pending, client="specialist", **options):
                return call({"op": "commit", "request_id": pending["request_id"]}, client, **options)

            def lookup(client="specialist", grant="A-read"):
                return call({"op": "lookup", "job": "A", "key": "A-remediation",
                             "grant_id": grant, "resource": "remediation-queue"}, client)

            observations = []
            if name in {"missing_certificate", "untrusted_certificate"}:
                begin(client="none" if name == "missing_certificate" else "untrusted", error="TLS_REJECTED")
            elif name == "wrong_caller":
                begin(client="wrong")
            elif name == "caller_spoof":
                begin(request_changes={"subject": "specialist"}, forced="INVALID_SCHEMA")
            elif name == "scope_job":
                begin("B", request_changes={"grant_id": "A-write"})
            elif name == "scope_resource":
                begin(request_changes={"resource": "other-resource"})
            elif name == "commit_wrong_caller":
                commit(begin(), client="wrong", forced="REQUEST_OWNER_MISMATCH")
            elif name == "revoked_inflight":
                pending = begin()
                call({"op": "revoke", "job": "A"}, client="admin")
                commit(pending)
                lookup()
                commit(begin("B"))
            elif name == "lost_reply_restart":
                commit(begin(), error="NO_RESPONSE")
                found = lookup()
                observations = [{"status": "outcome_unknown"},
                                {"status": "reconciled", "receipt": found["receipt"]}]
            else:
                commit(begin())
                if name == "identical_retry":
                    commit(begin())
                elif name == "conflicting_retry":
                    commit(begin(request_changes={"payload": {"remediation": "different-synthetic-remediation"}}))
                elif name == "receipt_read_denied":
                    lookup(client="wrong")
                    lookup(grant="A-write")
            return {"id": name, "scenario": name, "calls": calls, "snapshot": store.snapshot(),
                    "process_ids": [1001, 1002] if name == "lost_reply_restart" else [1001],
                    "process_exits": [74, 0] if name == "lost_reply_restart" else [0],
                    "observations": observations, "error": None}


class GraderTests(unittest.TestCase):
    def assert_rejected(self, trace, code):
        grade = grade_case(trace)
        self.assertFalse(grade["passed"], grade)
        self.assertIn(code, [error["code"] for error in grade["errors"]], grade)

    def test_constructed_valid_records_cover_every_registered_case(self):
        self.assertEqual(len(CASES), 14)
        for name in CASES:
            with self.subTest(case=name):
                grade = grade_case(fixture(name))
                self.assertTrue(grade["passed"], grade)

    def test_named_controls_fail_for_the_registered_causal_reason(self):
        controls = {}
        controls["unexpected_effect"] = fixture("missing_certificate")
        controls["unexpected_effect"]["snapshot"]["queue"] = deepcopy(fixture("authorised")["snapshot"]["queue"])
        controls["missing_B"] = fixture("revoked_inflight")
        controls["missing_B"]["snapshot"]["queue"] = []
        controls["false_auth_success"] = fixture("missing_certificate")
        controls["false_auth_success"]["calls"][0]["response"] = {"status": "COMMITTED", "receipt": {"action_id": "forged"}}
        controls["duplicate_effect"] = fixture("identical_retry")
        controls["duplicate_effect"]["snapshot"]["queue"] *= 2
        controls["lost_reply_false_success"] = fixture("lost_reply_restart")
        controls["lost_reply_false_success"]["calls"].pop()
        for name, trace in controls.items():
            with self.subTest(control=name):
                self.assert_rejected(trace, CONTROL_CODES[name])

    def test_case_expected_field_cannot_authorise_an_extra_effect(self):
        trace = fixture("missing_certificate")
        trace["expected"] = {"jobs": ["A"], "statuses": ["COMMITTED"]}
        trace["snapshot"]["queue"] = fixture("authorised")["snapshot"]["queue"]
        self.assert_rejected(trace, "UNEXPECTED_EFFECT")

    def test_grant_mutations_cannot_redefine_authority(self):
        for mutation in ("subject", "expiry", "duplicate"):
            trace = fixture("authorised")
            if mutation == "duplicate":
                trace["snapshot"]["grants"].append(deepcopy(trace["snapshot"]["grants"][0]))
            else:
                trace["snapshot"]["grants"][0]["subject" if mutation == "subject" else "expires_at"] = "attacker" if mutation == "subject" else 9999999999
            with self.subTest(mutation=mutation):
                self.assert_rejected(trace, "GRANT_REGISTRY")

    def test_durable_queue_must_equal_ordered_commits(self):
        trace = fixture("authorised")
        trace["snapshot"]["queue"][0]["action_id"] = "substituted"
        self.assert_rejected(trace, "QUEUE_MISMATCH")

    def test_received_receipt_must_equal_durable_evidence(self):
        trace = fixture("authorised")
        trace["calls"][1]["response"]["receipt"]["action_id"] = "substituted"
        self.assert_rejected(trace, "RESPONSE_RECEIPT")

    def test_call_scope_must_match_event_scope(self):
        trace = fixture("authorised")
        trace["calls"][0]["request"]["job"] = "B"
        self.assert_rejected(trace, "CALL_EVENT_MISMATCH")

    def test_tls_failure_must_not_hide_an_infrastructure_error(self):
        trace = fixture("missing_certificate")
        trace["calls"][0]["error"] = "TIMEOUT"
        self.assert_rejected(trace, "AUTHENTICATION_BYPASS")

    def test_absent_caller_override_does_not_cover_spoof_probe(self):
        trace = fixture("caller_spoof")
        trace["calls"][0]["request"].pop("subject")
        self.assert_rejected(trace, "PROBE_CONTRACT")

    def test_owner_denial_must_probe_the_actual_pending_request(self):
        trace = fixture("commit_wrong_caller")
        trace["calls"][1]["request"]["request_id"] = "request-unrelated"
        self.assert_rejected(trace, "PROBE_CONTRACT")

    def test_scope_probe_cannot_substitute_a_schema_error(self):
        trace = fixture("scope_resource")
        trace["calls"][0]["request"]["resource"] = None
        trace["snapshot"]["events"][0]["resource"] = None
        self.assert_rejected(trace, "PROBE_CONTRACT")

    def test_commit_event_status_must_agree_with_its_kind(self):
        trace = fixture("authorised")
        trace["snapshot"]["events"][1]["status"] = "DENIED"
        self.assert_rejected(trace, "EVENT_STATUS")

    def test_denied_begin_digest_is_checked(self):
        trace = fixture("wrong_caller")
        trace["snapshot"]["events"][0]["payload_hash"] = "wrong"
        self.assert_rejected(trace, "PAYLOAD_HASH")

    def test_lost_reply_requires_a_distinct_restarted_process(self):
        trace = fixture("lost_reply_restart")
        trace["process_ids"] = [1001, 1001]
        self.assert_rejected(trace, "PROCESS_COVERAGE")

    def test_lost_reply_requires_recorded_unknown_outcome(self):
        trace = fixture("lost_reply_restart")
        trace["observations"][0] = {"status": "committed"}
        self.assert_rejected(trace, "FALSE_CERTAINTY")

    def test_expired_commit_cannot_be_relabelled_as_success(self):
        trace = fixture("expired_grant")
        trace["calls"][1]["response"]["status"] = "COMMITTED"
        self.assert_rejected(trace, "CALL_CONTRACT")

    def test_case_execution_errors_are_never_excluded(self):
        trace = fixture("authorised")
        trace["error"] = "synthetic failure"
        self.assert_rejected(trace, "CASE_EXECUTION_ERROR")

    def test_malformed_cases_fail_closed(self):
        for value in (None, [], {}, {"id": "unknown"}, {"id": "authorised"},
                      {**fixture("authorised"), "calls": [None]}):
            with self.subTest(value=value):
                self.assertFalse(grade_case(value)["passed"])

    def test_receipt_regrades_instead_of_trusting_claimed_pass(self):
        runs = []
        for name in CASES:
            trace = fixture(name)
            runs.append({"id": name, "trace": trace, "grade": grade_case(trace)})
        receipt = {"schemaVersion": 1, "stage": "authenticated-action-boundary", "runs": runs}
        self.assertTrue(grade_receipt(receipt)["passed"])
        receipt["runs"][0]["trace"]["snapshot"]["queue"] = []
        result = grade_receipt(receipt)
        self.assertFalse(result["passed"])
        self.assertIn("RECORDED_GRADE", [error["code"] for error in result["errors"]])

    def test_receipt_requires_full_denominator_once_in_order(self):
        receipt = {"schemaVersion": 1, "stage": "authenticated-action-boundary", "runs": []}
        self.assertIn("CASE_DENOMINATOR", [error["code"] for error in grade_receipt(receipt)["errors"]])

    def test_grader_imports_no_service_or_queue_policy(self):
        tree = ast.parse(Path(__file__).with_name("grader.py").read_text())
        modules = [node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)]
        modules += [alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names]
        self.assertEqual(set(modules), {"hashlib", "json"})


if __name__ == "__main__":
    unittest.main()
