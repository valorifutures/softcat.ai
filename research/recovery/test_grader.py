"""Replay real development records and challenge their evaluator independently."""

from copy import deepcopy
import json
from pathlib import Path
import unittest

from research.recovery.grader import grade_trace
from research.recovery.negative_cases import create_negative_cases


DIRECTORY = Path(__file__).parent


class GraderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads((DIRECTORY / "fixture.json").read_text())
        receipt = json.loads((DIRECTORY / "results" / "latest.json").read_text())
        cls.traces = [run["trace"] for run in receipt["runs"]]
        cls.valid = [trace for trace in cls.traces if trace["control"] == "enforced"]

    def test_all_six_real_valid_records_pass(self):
        self.assertEqual(len(self.valid), 6)
        for trace in self.valid:
            with self.subTest(scenario=trace["scenario"]):
                result = grade_trace(trace, self.fixture)
                self.assertTrue(result["passed"], result["violations"])

    def test_controls_fail_the_registered_causal_property(self):
        expected = {"allow-revoked": "POST_REVOCATION_COMMIT",
                    "forget-idempotency": "DUPLICATE_EFFECT",
                    "false-success-on-lostack": "FALSE_CERTAINTY"}
        controls = [trace for trace in self.traces if trace["control"] != "enforced"]
        self.assertEqual(len(controls), 3)
        for trace in controls:
            with self.subTest(control=trace["control"]):
                result = grade_trace(trace, self.fixture)
                self.assertFalse(result["passed"])
                self.assertIn(expected[trace["control"]], [failure["code"] for failure in result["violations"]])

    def test_each_named_corruption_hits_its_specific_invariant(self):
        negatives = create_negative_cases(self.valid, self.fixture)
        self.assertGreaterEqual(len(negatives), 28)
        self.assertEqual(len({case["name"] for case in negatives}), len(negatives))
        for case in negatives:
            with self.subTest(corruption=case["name"]):
                result = grade_trace(case["trace"], self.fixture)
                self.assertFalse(result["passed"])
                self.assertIn(case["expectedCode"], [failure["code"] for failure in result["violations"]])

    def test_wrong_payload_is_rejected_when_trace_is_internally_consistent(self):
        case = next(c for c in create_negative_cases(self.valid, self.fixture)
                    if c["name"] == "consistent but wrong remediation")
        self.assertEqual([v["code"] for v in grade_trace(case["trace"], self.fixture)["violations"]],
                         ["WRONG_REMEDIATION"])

    def test_duplicate_grant_id_cannot_hide_behind_mapping(self):
        trace = deepcopy(self.valid[0])
        trace["grants"].append(deepcopy(trace["grants"][0]))
        self.assertIn("GRANT_REGISTRY", [v["code"] for v in grade_trace(trace, self.fixture)["violations"]])

    def test_repeated_revocation_keeps_first_authoritative_sequence(self):
        trace = deepcopy(next(t for t in self.valid if t["scenario"] == "delayed_revocation"))
        original = deepcopy(trace["revocations"])
        trace["events"].append({"seq": len(trace["events"]) + 1, "kind": "revoke",
                                "actor": "harness", "job": "A"})
        result = grade_trace(trace, self.fixture)
        self.assertTrue(result["passed"], result["violations"])
        self.assertEqual(trace["revocations"], original)

    def test_malformed_traces_return_failure(self):
        for trace in (None, [], {}, {"events": []}):
            with self.subTest(trace=trace):
                self.assertFalse(grade_trace(trace, self.fixture)["passed"])

    def test_untrusted_fixture_is_required(self):
        for fixture in (None, {}, {"grants": []}):
            with self.subTest(fixture=fixture):
                self.assertFalse(grade_trace(self.valid[0], fixture)["passed"])

    def test_grader_has_no_queue_policy_import(self):
        import ast
        tree = ast.parse((DIRECTORY / "grader.py").read_text())
        modules = [node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)]
        modules += [alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names]
        self.assertEqual(set(modules), {"hashlib", "json"})


if __name__ == "__main__":
    unittest.main()
