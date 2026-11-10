"""Fixed synthetic service clients; neither framework nor model is invoked."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import select
import signal
import socket
import ssl
import subprocess
import sys
import tempfile
import time

from research.recovery.store import default_grants

ROOT = Path(__file__).resolve().parents[2]
CASES = ("authorised", "missing_certificate", "untrusted_certificate", "wrong_caller",
         "caller_spoof", "scope_job", "scope_resource", "expired_grant", "revoked_inflight",
         "identical_retry", "conflicting_retry", "lost_reply_restart", "receipt_read_denied",
         "commit_wrong_caller")


def environment():
    return {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL", "SYSTEMROOT") if key in os.environ} | {
        "PYTHONHASHSEED": "0", "PYTHONDONTWRITEBYTECODE": "1",
        "OTEL_SDK_DISABLED": "true", "LANGSMITH_TRACING": "false"}


def certificates(directory):
    directory = Path(directory)
    count = 0
    def openssl(*args):
        nonlocal count
        count += 1
        if count > 16:
            raise RuntimeError("certificate subprocess limit")
        subprocess.run(["openssl", *map(str, args)], cwd=directory, env=environment(),
                       check=True, capture_output=True, timeout=10)
    openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
            "-keyout", "ca.key", "-out", "ca.crt", "-subj", "/CN=synthetic-local-issuer",
            "-addext", "basicConstraints=critical,CA:TRUE")
    for name in ("server", "specialist", "wrong", "admin"):
        openssl("req", "-newkey", "rsa:2048", "-nodes", "-keyout", f"{name}.key",
                "-out", f"{name}.csr", "-subj", f"/CN=synthetic-{name}")
        extension = "basicConstraints=critical,CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\n"
        extension += "extendedKeyUsage=serverAuth\nsubjectAltName=IP:127.0.0.1\n" if name == "server" else "extendedKeyUsage=clientAuth\n"
        (directory / f"{name}.ext").write_text(extension)
        openssl("x509", "-req", "-in", f"{name}.csr", "-CA", "ca.crt", "-CAkey", "ca.key",
                "-CAcreateserial", "-days", "1", "-out", f"{name}.crt", "-extfile", f"{name}.ext")
    openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-keyout", "untrusted.key",
            "-out", "untrusted.crt", "-subj", "/CN=synthetic-foreign-client")
    for key in directory.glob("*.key"):
        key.chmod(0o600)
    mapping = {}
    for name, principal in (("specialist", "specialist"), ("wrong", "wrong-specialist"), ("admin", "harness-admin")):
        der = ssl.PEM_cert_to_DER_cert((directory / f"{name}.crt").read_text())
        mapping[hashlib.sha256(der).hexdigest()] = principal
    return mapping, count


class Client:
    def __init__(self, directory, case_id, principals):
        self.directory = Path(directory)
        self.database = self.directory / f"{case_id}.sqlite"
        self.config = self.directory / f"{case_id}.json"
        grants = default_grants()
        if case_id == "expired_grant":
            for grant in grants:
                if grant["id"] in ("A-root", "A-investigator", "A-write"):
                    grant["expires_at"] = 2
        self.config.write_text(json.dumps({"principals": principals, "grants": grants}))
        self.calls, self.process_ids, self.process_exits = [], [], []
        self.total_calls, self.snapshot_calls = 0, 0
        self.process = None

    def start(self, drop=False):
        if len(self.process_ids) >= 2:
            raise RuntimeError("service process limit")
        command = [sys.executable, "-m", "research.boundary.service", "--database", str(self.database),
                   "--config", str(self.config), "--ca", str(self.directory / "ca.crt"),
                   "--cert", str(self.directory / "server.crt"), "--key", str(self.directory / "server.key")]
        if drop:
            command.append("--drop-commit-reply")
        self.process = subprocess.Popen(command, cwd=ROOT, env=environment(),
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if not select.select([self.process.stdout], [], [], 3)[0]:
            raise TimeoutError("service startup timeout")
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError("service failed to start")
        ready = json.loads(line)
        if ready["pid"] != self.process.pid or ready["pid"] == os.getpid():
            raise RuntimeError("separate service process required")
        self.port = ready["port"]
        self.process_ids.append(ready["pid"])

    def stop(self):
        if self.process is None:
            return
        if self.process.poll() is None:
            self.process.terminate()
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=1)
            raise TimeoutError("service shutdown timeout")
        self.process_exits.append(self.process.returncode)
        stderr = self.process.stderr.read(8192)
        self.process.stdout.close()
        self.process.stderr.close()
        self.process = None
        if stderr:
            raise RuntimeError("service emitted unexpected stderr: " + stderr)

    def call(self, request, client="specialist", record=True):
        if self.total_calls >= 16:
            raise RuntimeError("client call limit")
        self.total_calls += 1
        self.snapshot_calls += int(request.get("op") == "snapshot")
        context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile=str(self.directory / "ca.crt"))
        context.minimum_version = ssl.TLSVersion.TLSv1_3
        if client != "none":
            context.load_cert_chain(str(self.directory / f"{client}.crt"), str(self.directory / f"{client}.key"))
        response, error = None, None
        try:
            with socket.create_connection(("127.0.0.1", self.port), timeout=3) as raw:
                with context.wrap_socket(raw, server_hostname="127.0.0.1") as connection:
                    connection.sendall(json.dumps(request, allow_nan=False).encode() + b"\n")
                    data = bytearray()
                    while b"\n" not in data and len(data) <= 16_384:
                        block = connection.recv(4096)
                        if not block:
                            break
                        data.extend(block)
                    if not data:
                        error = "NO_RESPONSE"
                    elif len(data) > 16_384 or not data.endswith(b"\n"):
                        raise RuntimeError("invalid response frame")
                    else:
                        response = json.loads(data)
        except ssl.SSLError:
            error = "TLS_REJECTED"
        if record:
            self.calls.append({"operation": request["op"], "client": client,
                               "request": request, "response": response, "error": error})
        return response


def begin_request(job="A", **changes):
    return {"op": "begin", "job": job, "key": f"{job}-remediation",
            "payload": {"remediation": f"synthetic-{job}"},
            "grant_id": f"{job}-write", "resource": "remediation-queue", **changes}


def lookup_request(job="A", **changes):
    return {"op": "lookup", "job": job, "key": f"{job}-remediation",
            "grant_id": f"{job}-read", "resource": "remediation-queue", **changes}


def run_case(case_id, directory, principals):
    client = Client(directory, case_id, principals)
    observations, error, snapshot = [], None, None
    def begin(job="A", **changes):
        return client.call(begin_request(job, **changes))
    def commit(pending, caller="specialist"):
        if not pending or pending.get("status") != "PENDING":
            raise RuntimeError("expected pending request")
        return client.call({"op": "commit", "request_id": pending["request_id"]}, caller)
    try:
        client.start(drop=case_id == "lost_reply_restart")
        if case_id == "missing_certificate":
            client.call(begin_request(), "none")
        elif case_id == "untrusted_certificate":
            client.call(begin_request(), "untrusted")
        elif case_id == "wrong_caller":
            client.call(begin_request(), "wrong")
        elif case_id == "caller_spoof":
            client.call(begin_request(subject="specialist"))
        elif case_id == "scope_job":
            begin("B", grant_id="A-write")
        elif case_id == "scope_resource":
            begin(resource="other-resource")
        elif case_id == "commit_wrong_caller":
            commit(begin(), "wrong")
        elif case_id in ("authorised", "expired_grant"):
            commit(begin())
        elif case_id == "revoked_inflight":
            pending = begin()
            client.call({"op": "revoke", "job": "A"}, "admin")
            commit(pending)
            client.call(lookup_request())
            commit(begin("B"))
        elif case_id in ("identical_retry", "conflicting_retry"):
            commit(begin())
            changed = {"payload": {"remediation": "different-synthetic-remediation"}} if case_id == "conflicting_retry" else {}
            commit(begin(**changed))
        elif case_id == "lost_reply_restart":
            result = commit(begin())
            if result is not None or client.calls[-1]["error"] != "NO_RESPONSE":
                raise RuntimeError("expected lost acknowledgement")
            observations.append({"status": "outcome_unknown"})
            client.process.wait(timeout=3)
            client.stop()
            client.start()
            found = client.call(lookup_request())
            observations.append({"status": "reconciled", "receipt": found.get("receipt")})
        elif case_id == "receipt_read_denied":
            commit(begin())
            client.call(lookup_request(), "wrong")
            client.call(lookup_request(grant_id="A-write"))
        else:
            raise ValueError("unregistered case")
        snapshot = client.call({"op": "snapshot"}, "admin", record=False)
        if snapshot is None:
            raise RuntimeError("missing final state snapshot")
    except Exception as caught:
        error = f"{type(caught).__name__}: {caught}"
    finally:
        try:
            client.stop()
        except Exception as caught:
            error = (error + "; " if error else "") + f"{type(caught).__name__}: {caught}"
    return {"id": case_id, "scenario": case_id, "calls": client.calls, "snapshot": snapshot,
            "process_ids": client.process_ids, "process_exits": client.process_exits,
            "total_calls": client.total_calls, "snapshot_calls": client.snapshot_calls,
            "observations": observations, "error": error}


def run_suite():
    start = time.monotonic()
    def deadline(*_):
        raise TimeoutError("suite deadline")
    old_handler = signal.signal(signal.SIGALRM, deadline)
    signal.alarm(180)
    traces, openssl_calls = [], 0
    try:
        with tempfile.TemporaryDirectory(prefix="softcat-boundary-") as directory:
            principals, openssl_calls = certificates(directory)
            for case_id in CASES:
                if time.monotonic() - start > 180:
                    raise TimeoutError("suite deadline")
                traces.append(run_case(case_id, directory, principals))
    except Exception as caught:
        for case_id in CASES[len(traces):]:
            traces.append({"id": case_id, "scenario": case_id, "calls": [], "snapshot": None,
                           "process_ids": [], "process_exits": [], "observations": [],
                           "total_calls": 0, "snapshot_calls": 0,
                           "error": f"NOT_RUN: {type(caught).__name__}: {caught}"})
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)
    return traces, openssl_calls
