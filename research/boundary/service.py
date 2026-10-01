"""Loopback mTLS adapter. Same-user processes are expressly outside containment."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import signal
import ssl
import sys
import time

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from research.recovery.store import DurableStore

MAX_BYTES = 16_384
SCHEMAS = {
    "begin": {"op", "job", "key", "payload", "grant_id", "resource"},
    "commit": {"op", "request_id"},
    "lookup": {"op", "job", "key", "grant_id", "resource"},
    "revoke": {"op", "job"},
    "snapshot": {"op"},
}


def denied(reason):
    return {"status": "DENIED", "reason": reason, "receipt": None}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def decode(raw):
    def invalid_constant(_):
        raise ValueError("non-finite JSON number")
    value = json.loads(raw, object_pairs_hook=unique_object,
                       parse_constant=invalid_constant)
    def bounded(item, depth=0):
        if depth > 8:
            raise ValueError("JSON nesting limit")
        if isinstance(item, str) and len(item) > 128:
            raise ValueError("string limit")
        if isinstance(item, dict):
            if len(item) > 32:
                raise ValueError("object limit")
            for k, v in item.items():
                bounded(k, depth + 1)
                bounded(v, depth + 1)
        elif isinstance(item, list):
            if len(item) > 32:
                raise ValueError("array limit")
            for v in item:
                bounded(v, depth + 1)
        elif isinstance(item, float):
            import math
            if not math.isfinite(item):
                raise ValueError("non-finite JSON number")
    bounded(value)
    if not isinstance(value, dict) or not isinstance(value.get("op"), str):
        raise ValueError("request must name operation")
    operation = value["op"]
    if operation not in SCHEMAS or set(value) != SCHEMAS[operation]:
        raise ValueError("invalid operation schema")
    for key, item in value.items():
        if key != "payload" and (not isinstance(item, str) or not item):
            raise ValueError("expected non-empty string")
    if "payload" in value and (not isinstance(value["payload"], dict)
            or len(json.dumps(value["payload"]).encode()) > 4096):
        raise ValueError("invalid bounded payload")
    return value


def dispatch(store, principal, request):
    operation = request["op"]
    if operation in ("revoke", "snapshot"):
        if principal != "harness-admin":
            return denied("ADMIN_REQUIRED")
        return store.revoke(request["job"], actor="authenticated-admin") if operation == "revoke" else store.snapshot()
    if principal == "harness-admin":
        return denied("ACTION_PRINCIPAL_REQUIRED")
    actor = "authenticated-service"
    if operation == "commit":
        # Store.commit rechecks the persisted grant chain; this adapter must also
        # bind the caller to the durable request owner, outside caller arguments.
        pending = next((r for r in store.snapshot()["requests"]
                        if r["request_id"] == request["request_id"]), None)
        if pending is not None and pending["subject"] != principal:
            return denied("REQUEST_OWNER_MISMATCH")
        return store.commit(request["request_id"], actor=actor)
    arguments = {k: v for k, v in request.items() if k != "op"}
    return getattr(store, operation)(**arguments, subject=principal, actor=actor)


def serve(args):
    config = json.loads(Path(args.config).read_text())
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_3
    context.verify_mode = ssl.CERT_REQUIRED
    context.load_verify_locations(args.ca)
    context.load_cert_chain(args.cert, args.key)
    deadline = time.monotonic() + 20
    with DurableStore(args.database, grants=config["grants"]) as store, socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen(4)
        listener.settimeout(1)
        print(json.dumps({"port": listener.getsockname()[1], "pid": os.getpid()}), flush=True)
        connections = 0
        while connections < 32 and time.monotonic() < deadline:
            try:
                raw, _ = listener.accept()
            except TimeoutError:
                continue
            connections += 1
            connection_deadline = min(time.monotonic() + 3, deadline)
            raw.settimeout(max(0.001, connection_deadline - time.monotonic()))
            try:
                with context.wrap_socket(raw, server_side=True) as connection:
                    fingerprint = hashlib.sha256(connection.getpeercert(binary_form=True)).hexdigest()
                    principal = config["principals"].get(fingerprint)
                    data = bytearray()
                    while b"\n" not in data and len(data) <= MAX_BYTES:
                        remaining = connection_deadline - time.monotonic()
                        if remaining <= 0:
                            raise TimeoutError("absolute connection deadline")
                        connection.settimeout(remaining)
                        block = connection.recv(min(4096, MAX_BYTES + 1 - len(data)))
                        if not block:
                            break
                        data.extend(block)
                    try:
                        if len(data) > MAX_BYTES or not data.endswith(b"\n") or data.count(b"\n") != 1:
                            raise ValueError("invalid frame")
                        request = decode(data)
                        response = denied("UNMAPPED_CERTIFICATE") if principal is None else dispatch(store, principal, request)
                        if args.drop_commit_reply and request["op"] == "commit" and response.get("status") == "COMMITTED":
                            os._exit(74)
                    except (ValueError, TypeError, RecursionError, UnicodeError):
                        response = denied("INVALID_SCHEMA")
                    wire = json.dumps(response, sort_keys=True, allow_nan=False).encode() + b"\n"
                    if len(wire) > MAX_BYTES:
                        raise RuntimeError("response limit")
                    remaining = connection_deadline - time.monotonic()
                    if remaining <= 0:
                        raise TimeoutError("absolute connection deadline")
                    connection.settimeout(remaining)
                    connection.sendall(wire)
            except (ssl.SSLError, OSError):
                raw.close()


def main():
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    signal.signal(signal.SIGALRM, lambda *_: sys.exit(75))
    signal.alarm(20)
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("database", "config", "ca", "cert", "key"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--drop-commit-reply", action="store_true")
    serve(parser.parse_args())


if __name__ == "__main__":
    main()
