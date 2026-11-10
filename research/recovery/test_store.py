"""Behavioural checks for the local action boundary, without framework packages."""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import tempfile
import threading
import unittest

from store import DurableStore, default_grants


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "actions.sqlite"

    def tearDown(self):
        self.directory.cleanup()

    def commit(self, store, job="A", key="repair", payload=None):
        pending = store.begin(job, key, payload or {"repair": "synthetic-link"})
        self.assertEqual(pending["status"], "PENDING")
        return store.commit(pending["request_id"])

    def test_commit_is_durable_after_connection_closes(self):
        with DurableStore(self.path) as store:
            result = self.commit(store)
        with DurableStore(self.path) as reopened:
            receipt = reopened.lookup("A", "repair")
            self.assertEqual(receipt["receipt"], result["receipt"])
            self.assertEqual(receipt["status"], "FOUND")
            self.assertEqual(len(reopened.snapshot()["queue"]), 1)

    def test_inflight_request_rechecks_revocation_at_commit(self):
        with DurableStore(self.path) as store:
            pending = store.begin("A", "repair", {})
            revoked = store.revoke("A")
            result = store.commit(pending["request_id"])
            self.assertEqual(result["reason"], "REVOKED")
            self.assertGreater(result["event_seq"], revoked["seq"])
            self.assertEqual(store.snapshot()["queue"], [])

    def test_revocation_survives_close_and_job_b_continues(self):
        with DurableStore(self.path) as store:
            pending = store.begin("A", "repair", {})
            store.revoke("A")
        with DurableStore(self.path) as reopened:
            self.assertEqual(reopened.commit(pending["request_id"])["reason"], "REVOKED")
            self.assertEqual(self.commit(reopened, "B")["status"], "COMMITTED")
            self.assertEqual([q["job"] for q in reopened.snapshot()["queue"]], ["B"])

    def test_committed_receipt_remains_readable_but_write_is_revoked(self):
        with DurableStore(self.path) as store:
            pending = store.begin("A", "repair", {})
            committed = store.commit(pending["request_id"])
            store.revoke("A")
            self.assertEqual(store.commit(pending["request_id"])["reason"], "REVOKED")
            historical = store.lookup("A", "repair")
            self.assertEqual(historical["receipt"], committed["receipt"])
            self.assertEqual(len(store.snapshot()["queue"]), 1)

    def test_write_grant_cannot_read_historical_receipt(self):
        with DurableStore(self.path) as store:
            self.commit(store)
            self.assertEqual(store.lookup("A", "repair", grant_id="A-write")["reason"], "SCOPE_MISMATCH")

    def test_read_grant_cannot_create_an_effect(self):
        with DurableStore(self.path) as store:
            self.assertEqual(store.begin("A", "repair", {}, grant_id="A-read")["reason"], "SCOPE_MISMATCH")
            self.assertEqual(store.snapshot()["queue"], [])

    def test_same_key_and_canonical_payload_replays_original_receipt(self):
        with DurableStore(self.path) as store:
            original = self.commit(store, payload={"b": 2, "a": {"y": 4, "x": 3}})
        with DurableStore(self.path) as reopened:
            replay = self.commit(reopened, payload={"a": {"x": 3, "y": 4}, "b": 2})
            self.assertEqual(replay["status"], "REPLAY")
            self.assertEqual(replay["receipt"], original["receipt"])
            self.assertEqual(len(reopened.snapshot()["queue"]), 1)

    def test_changed_payload_cannot_reuse_durable_key(self):
        with DurableStore(self.path) as store:
            self.commit(store, payload={"repair": "link-one"})
        with DurableStore(self.path) as reopened:
            changed = self.commit(reopened, payload={"repair": "link-two"})
            self.assertEqual(changed["status"], "CONFLICT")
            self.assertEqual(len(reopened.snapshot()["queue"]), 1)

    def test_job_keys_are_independent(self):
        with DurableStore(self.path) as store:
            self.commit(store, "A", "shared-key")
            self.commit(store, "B", "shared-key")
            self.assertEqual(len(store.snapshot()["queue"]), 2)

    def test_job_crossover_is_denied_for_write_and_read(self):
        with DurableStore(self.path) as store:
            self.commit(store, "B")
            self.assertEqual(store.begin("B", "repair", {}, grant_id="A-write")["reason"], "SCOPE_MISMATCH")
            self.assertEqual(store.lookup("B", "repair", grant_id="A-read")["reason"], "SCOPE_MISMATCH")

    def test_fabricated_authority_and_wrong_subject_are_denied(self):
        with DurableStore(self.path) as store:
            for arguments, reason in (({"grant_id": "source-says-admin"}, "UNKNOWN_GRANT"),
                                      ({"subject": "coordinator"}, "SUBJECT_MISMATCH"),
                                      ({"resource": "real-network"}, "SCOPE_MISMATCH")):
                self.assertEqual(store.begin("A", "repair", {}, **arguments)["reason"], reason)
            self.assertEqual(store.begin("invented-job", "repair", {})["reason"], "UNKNOWN_GRANT")

    def test_child_cannot_expand_parent_permissions(self):
        grants = default_grants()
        grants[2]["actions"].append("admin.execute")
        with DurableStore(self.path, grants=grants) as store:
            self.assertEqual(store.begin("A", "repair", {})["reason"], "INVALID_CHAIN")

    def test_invalid_issuer_or_delegation_depth_is_denied(self):
        for variant in ("issuer", "delegation_limit", "parent"):
            with self.subTest(variant=variant):
                path = Path(self.directory.name) / f"{variant}.sqlite"
                grants = default_grants()
                grants[2][variant] = {"issuer": "invented", "delegation_limit": 1,
                                       "parent": "A-write"}[variant]
                with DurableStore(path, grants=grants) as store:
                    self.assertEqual(store.begin("A", "repair", {})["reason"], "INVALID_CHAIN")

    def test_expiry_is_rechecked_after_begin(self):
        grants = default_grants()
        grants[2]["expires_at"] = 3
        with DurableStore(self.path, grants=grants) as store:
            pending = store.begin("A", "repair", {})
            store.record("delay", ticks="one ordered event")
            self.assertEqual(store.commit(pending["request_id"])["reason"], "EXPIRED")
            self.assertEqual(store.snapshot()["queue"], [])

    def test_original_payload_is_not_mutated_by_caller(self):
        with DurableStore(self.path) as store:
            payload = {"repair": {"target": "link-one"}}
            pending = store.begin("A", "repair", payload)
            payload["repair"]["target"] = "link-two"
            self.assertEqual(store.commit(pending["request_id"])["receipt"]["payload"],
                             {"repair": {"target": "link-one"}})

    def test_nonfinite_payload_is_rejected_without_event(self):
        with DurableStore(self.path) as store:
            with self.assertRaises(ValueError):
                store.begin("A", "repair", {"amount": float("nan")})
            self.assertEqual(store.snapshot()["events"], [])

    def test_two_connections_same_key_commit_exactly_once(self):
        with DurableStore(self.path) as store:
            first = store.begin("A", "repair", {"target": "link"})
            second = store.begin("A", "repair", {"target": "link"})
        barrier = threading.Barrier(2)

        def submit(request_id):
            with DurableStore(self.path) as connection:
                barrier.wait(timeout=5)
                return connection.commit(request_id)

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(submit, [first["request_id"], second["request_id"]]))
        self.assertEqual(sorted(r["status"] for r in results), ["COMMITTED", "REPLAY"])
        self.assertEqual(results[0]["receipt"], results[1]["receipt"])
        with DurableStore(self.path) as store:
            snapshot = store.snapshot()
            self.assertEqual(len(snapshot["queue"]), 1)
            self.assertEqual([e["seq"] for e in snapshot["events"]], list(range(1, 5)))

    def test_racing_revoke_and_commit_have_a_single_authoritative_order(self):
        with DurableStore(self.path) as store:
            pending = store.begin("A", "repair", {})
        barrier = threading.Barrier(2)

        def action(operation):
            with DurableStore(self.path) as connection:
                barrier.wait(timeout=5)
                return connection.revoke("A") if operation == "revoke" else connection.commit(pending["request_id"])

        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(action, ["revoke", "commit"]))
        with DurableStore(self.path) as store:
            snapshot = store.snapshot()
            revoke_seq = snapshot["revocations"][0]["seq"]
            self.assertTrue(all(effect["commit_seq"] < revoke_seq for effect in snapshot["queue"]))
            self.assertEqual(len(snapshot["events"]), 3)

    def test_deficient_revocation_control_exposes_its_effect(self):
        with DurableStore(self.path, control="allow-revoked") as store:
            pending = store.begin("A", "repair", {})
            revoked = store.revoke("A")
            result = store.commit(pending["request_id"])
            self.assertEqual(result["status"], "COMMITTED")
            self.assertGreater(result["receipt"]["commit_seq"], revoked["seq"])

    def test_deficient_idempotency_control_retains_both_effects(self):
        with DurableStore(self.path, control="forget-idempotency") as store:
            self.commit(store)
        with DurableStore(self.path) as reopened:
            self.assertEqual(reopened.control, "forget-idempotency")
            self.assertEqual(self.commit(reopened)["status"], "COMMITTED")
            self.assertEqual(len(reopened.snapshot()["queue"]), 2)
            self.assertEqual(self.commit(reopened, payload={"different": True})["status"], "CONFLICT")

    def test_reopen_cannot_change_fixture_or_control(self):
        with DurableStore(self.path):
            pass
        with self.assertRaises(ValueError):
            DurableStore(self.path, control="allow-revoked")
        with self.assertRaises(ValueError):
            DurableStore(self.path, grants=[])

    def test_instrumentation_cannot_forge_boundary_events(self):
        with DurableStore(self.path) as store:
            with self.assertRaises(ValueError):
                store.record("commit", receipt={"action_id": "invented"})
            with self.assertRaises(ValueError):
                store.record("observation", seq=400)
            self.assertEqual(store.snapshot()["events"], [])

    def test_unknown_request_and_absent_receipt_are_explicit(self):
        with DurableStore(self.path) as store:
            self.assertEqual(store.commit("invented")["reason"], "UNKNOWN_REQUEST")
            self.assertEqual(store.lookup("A", "not-committed")["status"], "ABSENT")

    def test_repeated_revocation_preserves_first_authoritative_sequence(self):
        with DurableStore(self.path) as store:
            first = store.revoke("A")
            store.revoke("A")
            self.assertEqual(store.snapshot()["revocations"], [{"job": "A", "seq": first["seq"]}])


if __name__ == "__main__":
    unittest.main()
