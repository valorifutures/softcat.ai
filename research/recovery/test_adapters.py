import os
import socket
import unittest
from unittest.mock import patch

from research.recovery.adapters import offline_guard, worker_environment
from research.recovery.scenarios import run_suite


class AdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = {case["id"]: case for case in run_suite()}

    def test_all_registered_conditions_execute_without_hidden_errors(self):
        self.assertEqual(len(self.cases), 9)
        for case in self.cases.values():
            with self.subTest(case=case["id"]):
                self.assertIsNone(case["error"])
                self.assertLessEqual(case["framework_calls"], 12)
                self.assertLessEqual(len(case["events"]), 300)

    def test_real_graph_and_model_tool_dispatch_are_recorded(self):
        events = self.cases["clean"]["events"]
        nodes = {e["node"] for e in events if e["kind"] == "framework_dispatch"}
        self.assertEqual(nodes, {"coordinator", "investigator"})
        self.assertEqual(len([e for e in events if e["kind"] == "tool_dispatch"]), 4)
        self.assertEqual(len([e for e in events if e["kind"] == "model_request"]), 8)
        self.assertTrue(all(not e["provider_request"] for e in events
                            if e["kind"] == "model_request"))

    def test_lost_ack_is_real_exit_then_unknown_then_fresh_lookup(self):
        case = self.cases["lost_ack_restart"]
        events = case["events"]
        crash = next(e for e in events if e["kind"] == "worker_exit" and e["exit_code"] == 74)
        unknown = next(e for e in events if e["kind"] == "outcome_unknown")
        reconciled = next(e for e in events if e["kind"] == "reconciled")
        starts = {e["worker_id"]: e for e in events if e["kind"] == "worker_started"}
        self.assertLess(crash["seq"], unknown["seq"])
        self.assertLess(unknown["seq"], reconciled["seq"])
        self.assertNotEqual(crash["worker_id"], reconciled["worker_id"])
        self.assertNotEqual(starts[crash["worker_id"]]["pid"],
                            starts[reconciled["worker_id"]]["pid"])
        self.assertEqual(reconciled["status"], "FOUND")
        self.assertEqual(len([q for q in case["queue"] if q["job"] == "A"]), 1)

    def test_before_commit_exit_cannot_bypass_later_revocation(self):
        case = self.cases["restart_before_commit_revoke"]
        self.assertTrue(any(e["kind"] == "worker_exit" and e["exit_code"] == 73
                            for e in case["events"]))
        self.assertEqual([q["job"] for q in case["queue"]], ["B"])
        self.assertEqual(case["reports"][0]["status"], "revoked")

    def test_retry_deduplicates_and_conflict_preserves_original_effect(self):
        for name, expected in (("identical_retry", "REPLAY"), ("conflicting_retry", "CONFLICT")):
            case = self.cases[name]
            self.assertEqual(len([q for q in case["queue"] if q["job"] == "A"]), 1)
            event = next(e for e in case["events"] if e["kind"] == "retry_observed")
            self.assertEqual(event["status"], expected)

    def test_delayed_local_notification_does_not_delay_enforcement(self):
        case = self.cases["delayed_revocation"]
        denied = next(e for e in case["events"] if e["kind"] == "deny")
        notified = next(e for e in case["events"] if e["kind"] == "local_revocation_observed")
        self.assertLess(denied["seq"], notified["seq"])
        self.assertEqual([q["job"] for q in case["queue"]], ["B"])

    def test_control_failures_remain_in_raw_output(self):
        self.assertEqual(len(self.cases["allow_revoked"]["queue"]), 2)
        self.assertEqual(len(self.cases["forget_idempotency"]["queue"]), 3)
        wrong = self.cases["false_success"]
        self.assertEqual(wrong["reports"][0], {"job": "A", "status": "committed", "action_ids": []})
        self.assertFalse(any(e["kind"] == "outcome_unknown" for e in wrong["events"]))

    def test_worker_environment_drops_credentials(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "synthetic-do-not-inherit",
                                     "GITHUB_TOKEN": "synthetic-do-not-inherit",
                                     "LANGSMITH_API_KEY": "synthetic-do-not-inherit"}):
            env = worker_environment()
        self.assertNotIn("OPENAI_API_KEY", env)
        self.assertNotIn("GITHUB_TOKEN", env)
        self.assertNotIn("LANGSMITH_API_KEY", env)
        self.assertEqual(env["OTEL_SDK_DISABLED"], "true")

    def test_offline_guard_blocks_ipv4_ipv6_and_dns_without_connecting(self):
        with offline_guard():
            for family, address in ((socket.AF_INET, ("127.0.0.1", 9)),
                                    (socket.AF_INET6, ("::1", 9))):
                with socket.socket(family) as candidate:
                    with self.assertRaises(RuntimeError):
                        candidate.connect(address)
                    with self.assertRaises(RuntimeError):
                        candidate.connect_ex(address)
            with self.assertRaises(RuntimeError):
                socket.getaddrinfo("example.invalid", 443)


if __name__ == "__main__":
    unittest.main()
