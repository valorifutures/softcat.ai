"""Supplemental real-transport falsification probes, outside the 14-case receipt."""
import json
from pathlib import Path
import socket
import ssl
import tempfile
import unittest

from research.boundary.scenarios import Client, begin_request, certificates


class TransportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="boundary-transport-tests-")
        cls.directory = Path(cls.temporary.name)
        cls.principals, _ = certificates(cls.directory)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def setUp(self):
        self.client = Client(self.directory, self._testMethodName, self.principals)
        self.client.start()

    def tearDown(self):
        self.client.stop()

    def raw(self, payload):
        context = ssl.create_default_context(cafile=str(self.directory / "ca.crt"))
        context.load_cert_chain(str(self.directory / "specialist.crt"), str(self.directory / "specialist.key"))
        with socket.create_connection(("127.0.0.1", self.client.port), timeout=3) as connection:
            with context.wrap_socket(connection, server_hostname="127.0.0.1") as secured:
                secured.sendall(payload)
                result = bytearray()
                while b"\n" not in result:
                    block = secured.recv(4096)
                    if not block:
                        break
                    result.extend(block)
                return json.loads(result)

    def snapshot(self):
        return self.client.call({"op": "snapshot"}, "admin", record=False)

    def test_roles_cannot_cross_admin_action_boundary(self):
        for request in (begin_request(), {"op": "commit", "request_id": "request-1"},
                        {"op": "lookup", "job": "A", "key": "A-remediation", "grant_id": "A-read", "resource": "remediation-queue"}):
            self.assertEqual(self.client.call(request, "admin")["reason"], "ACTION_PRINCIPAL_REQUIRED")
        for request in ({"op": "revoke", "job": "A"}, {"op": "snapshot"}):
            self.assertEqual(self.client.call(request)["reason"], "ADMIN_REQUIRED")
        self.assertEqual(self.snapshot()["events"], [])

    def test_unmapped_valid_certificate_is_not_a_principal(self):
        self.client.stop()
        configuration = json.loads(self.client.config.read_text())
        configuration["principals"] = {key: value for key, value in configuration["principals"].items() if value != "wrong-specialist"}
        self.client.config.write_text(json.dumps(configuration))
        self.client.start()
        self.assertEqual(self.client.call(begin_request(), "wrong")["reason"], "UNMAPPED_CERTIFICATE")
        self.assertEqual(self.snapshot()["events"], [])

    def test_invalid_certificates_rejected_while_valid_client_still_operates(self):
        for identity in ("none", "untrusted"):
            self.assertIsNone(self.client.call(begin_request(), identity))
            self.assertEqual(self.client.calls[-1]["error"], "TLS_REJECTED")
        pending = self.client.call(begin_request())
        committed = self.client.call({"op": "commit", "request_id": pending["request_id"]})
        self.assertEqual(committed["status"], "COMMITTED")
        self.assertEqual(len(self.snapshot()["queue"]), 1)

    def test_ambiguous_or_unbounded_json_never_reaches_store(self):
        request = json.dumps(begin_request()).encode()
        deep = 0
        for _ in range(10):
            deep = [deep]
        probes = [b'{"op":"snapshot","op":"begin"}\n', b'{"op":"begin","payload":NaN}\n',
                  request[:-1] + b',"caller":"specialist"}\n',
                  json.dumps(begin_request(payload={"deep": deep})).encode() + b"\n",
                  json.dumps(begin_request(key="x" * 129)).encode() + b"\n"]
        for payload in probes:
            self.assertEqual(self.raw(payload)["reason"], "INVALID_SCHEMA")
        self.assertEqual(self.snapshot()["events"], [])


if __name__ == "__main__":
    unittest.main()
