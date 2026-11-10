"""Trusted local SQLite action boundary for synthetic recovery experiments.

This is a centrally ordered simulator, not a distributed authorisation service.
Fixture grant identifiers are local registry keys, not cryptographic identities.
The deterministic framework harness supplies caller identity as a trusted input.
This experiment does not contain a hostile worker forging another subject or
grant handle. An untrusted model integration must bind identity outside its tool
arguments before making a stronger authority claim.
Expiry uses the next durable event sequence, not a wall clock. The host, issuer,
SQLite database and this enforcement implementation are within the trusted base.
"""

from contextlib import contextmanager
import hashlib
import json
import sqlite3


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False)


def payload_hash(payload):
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()


def default_grants():
    """Synthetic issuer registry. Runtime tools receive IDs, never issue rights."""
    grants = []
    for job in ("A", "B"):
        for suffix, subject, issuer, parent, limit in (
            ("root", "coordinator", "fixture-issuer", None, 2),
            ("investigator", "investigator", "coordinator", f"{job}-root", 1),
            ("write", "specialist", "investigator", f"{job}-investigator", 0),
        ):
            grants.append({"id": f"{job}-{suffix}", "issuer": issuer,
                           "subject": subject, "job": job,
                           "actions": ["queue.submit"],
                           "resources": ["remediation-queue"],
                           "expires_at": 1_000_000_000,
                           "delegation_limit": limit, "parent": parent})
        grants.append({"id": f"{job}-read", "issuer": "fixture-issuer",
                       "subject": "specialist", "job": job,
                       "actions": ["receipt.read"],
                       "resources": ["remediation-queue"],
                       "expires_at": 1_000_000_000,
                       "delegation_limit": 0, "parent": None})
    return grants


class DurableStore:
    """All authorisation, idempotency and mutation decisions occur in a transaction.

    ``allow-revoked`` and ``forget-idempotency`` are deliberately deficient local
    controls. The selected control is fixed in the database at creation. Even
    deficient effects remain in the durable queue and event log for the grader.
    ``record`` records observations from trusted harness/framework instrumentation.
    It is not exposed as an agent tool and cannot create action-boundary events.
    """

    CONTROLS = {"enforced", "allow-revoked", "forget-idempotency"}
    BOUNDARY_KINDS = {"begin", "commit", "replay", "deny", "conflict", "revoke", "lookup"}

    def __init__(self, path, *, control=None, grants=None):
        if control is not None and control not in self.CONTROLS:
            raise ValueError("Unknown control")
        self.path = str(path)
        self.connection = sqlite3.connect(self.path, timeout=15, isolation_level=None)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys=ON")
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA synchronous=FULL")
        self.connection.executescript("""
            CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS grants (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS events (
                seq INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS requests (
                request_id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS queue (
                action_id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS idempotency (
                job TEXT NOT NULL, key TEXT NOT NULL, payload_hash TEXT NOT NULL,
                action_id TEXT NOT NULL REFERENCES queue(action_id), PRIMARY KEY(job,key));
            CREATE TABLE IF NOT EXISTS revocations (job TEXT PRIMARY KEY, seq INTEGER NOT NULL);
        """)
        with self._transaction():
            saved = self.connection.execute("SELECT value FROM metadata WHERE key='control'").fetchone()
            if saved is None:
                self.control = control or "enforced"
                fixture = default_grants() if grants is None else grants
                self.connection.execute("INSERT INTO metadata VALUES ('control',?)", (self.control,))
                for grant in fixture:
                    self.connection.execute("INSERT INTO grants VALUES (?,?)",
                                            (grant["id"], canonical_json(grant)))
            else:
                self.control = saved["value"]
                if control is not None and control != self.control:
                    raise ValueError("Cannot change a persisted control")
                if grants is not None and sorted(grants, key=lambda g: g["id"]) != self._grants():
                    raise ValueError("Cannot change the persisted issuer registry")

    def close(self):
        self.connection.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    @contextmanager
    def _transaction(self):
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            yield
        except BaseException:
            self.connection.rollback()
            raise
        else:
            self.connection.commit()

    def _next_seq(self):
        return self.connection.execute("SELECT COALESCE(MAX(seq),0)+1 FROM events").fetchone()[0]

    def _event(self, kind, *, actor="framework", **fields):
        data = {"kind": kind, "actor": actor, **fields}
        cursor = self.connection.execute("INSERT INTO events(data) VALUES (?)", (canonical_json(data),))
        return {"seq": cursor.lastrowid, **data}

    def _grants(self):
        return [json.loads(r["data"]) for r in self.connection.execute("SELECT data FROM grants ORDER BY id")]

    def _authorise(self, grant_id, job, subject, action, resource):
        registry = {g["id"]: g for g in self._grants()}
        grant = registry.get(grant_id)
        if grant is None:
            return "UNKNOWN_GRANT"
        if grant.get("subject") != subject:
            return "SUBJECT_MISMATCH"
        seen = set()
        while grant is not None:
            if grant["id"] in seen:
                return "INVALID_CHAIN"
            seen.add(grant["id"])
            if grant.get("job") != job or action not in grant.get("actions", []) or resource not in grant.get("resources", []):
                return "SCOPE_MISMATCH"
            expiry, limit = grant.get("expires_at"), grant.get("delegation_limit")
            if type(expiry) is not int or type(limit) is not int or limit < 0:
                return "INVALID_CHAIN"
            if self._next_seq() >= expiry:
                return "EXPIRED"
            if grant.get("parent") is None:
                if grant.get("issuer") != "fixture-issuer":
                    return "INVALID_ISSUER"
                break
            parent = registry.get(grant["parent"])
            if parent is None:
                return "INVALID_CHAIN"
            if (grant.get("issuer") != parent.get("subject")
                    or grant.get("job") != parent.get("job")
                    or not set(grant.get("actions", [])).issubset(parent.get("actions", []))
                    or not set(grant.get("resources", [])).issubset(parent.get("resources", []))
                    or type(parent.get("expires_at")) is not int
                    or expiry > parent["expires_at"]
                    or type(parent.get("delegation_limit")) is not int
                    or limit >= parent["delegation_limit"]):
                return "INVALID_CHAIN"
            grant = parent
        if (action == "queue.submit" and self.control != "allow-revoked"
                and self.connection.execute("SELECT 1 FROM revocations WHERE job=?", (job,)).fetchone()):
            return "REVOKED"
        return None

    def _deny(self, operation, reason, *, actor="framework", **fields):
        event = self._event("deny", actor=actor, operation=operation, reason=reason, **fields)
        return {"status": "DENIED", "reason": reason, "receipt": None, "event_seq": event["seq"]}

    @staticmethod
    def _check_input(job, key, payload):
        if not isinstance(job, str) or not job or not isinstance(key, str) or not 0 < len(key) <= 128:
            raise ValueError("Job and bounded idempotency key must be non-empty strings")
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a JSON object")
        canonical_json(payload)

    def begin(self, job, key, payload, *, grant_id=None, subject="specialist",
              resource="remediation-queue", actor="framework"):
        self._check_input(job, key, payload)
        grant_id = grant_id if grant_id is not None else f"{job}-write"
        with self._transaction():
            fields = {"job": job, "key": key, "payload": payload,
                      "payload_hash": payload_hash(payload), "grant_id": grant_id,
                      "subject": subject, "resource": resource}
            reason = self._authorise(grant_id, job, subject, "queue.submit", resource)
            if reason:
                return self._deny("begin", reason, actor=actor, **fields)
            seq = self._next_seq()
            request = {"request_id": f"request-{seq}", "begin_seq": seq, **fields}
            self.connection.execute("INSERT INTO requests VALUES (?,?)",
                                    (request["request_id"], canonical_json(request)))
            event = self._event("begin", actor=actor, status="PENDING", **request)
            return {"status": "PENDING", "request_id": request["request_id"], "event_seq": event["seq"]}

    def commit(self, request_id, *, actor="framework"):
        with self._transaction():
            row = self.connection.execute("SELECT data FROM requests WHERE request_id=?", (request_id,)).fetchone()
            if row is None:
                return self._deny("commit", "UNKNOWN_REQUEST", actor=actor, request_id=request_id)
            request = json.loads(row["data"])
            fields = {k: request[k] for k in ("request_id", "job", "key", "grant_id", "subject", "resource")}
            reason = self._authorise(request["grant_id"], request["job"], request["subject"], "queue.submit", request["resource"])
            if reason:
                return self._deny("commit", reason, actor=actor, **fields)
            existing = self.connection.execute("SELECT * FROM idempotency WHERE job=? AND key=?",
                                               (request["job"], request["key"])).fetchone()
            if existing and existing["payload_hash"] != request["payload_hash"]:
                event = self._event("conflict", actor=actor, status="CONFLICT", **fields,
                                    payload_hash=request["payload_hash"], existing_payload_hash=existing["payload_hash"])
                return {"status": "CONFLICT", "reason": "PAYLOAD_CONFLICT", "receipt": None, "event_seq": event["seq"]}
            if existing and self.control != "forget-idempotency":
                receipt = json.loads(self.connection.execute("SELECT data FROM queue WHERE action_id=?",
                                                             (existing["action_id"],)).fetchone()["data"])
                event = self._event("replay", actor=actor, status="REPLAY", receipt=receipt, **fields)
                return {"status": "REPLAY", "receipt": receipt, "event_seq": event["seq"]}
            seq = self._next_seq()
            receipt = {"action_id": f"effect-{seq}", "commit_seq": seq,
                       **{k: request[k] for k in ("job", "key", "payload", "payload_hash")}}
            self.connection.execute("INSERT INTO queue VALUES (?,?)", (receipt["action_id"], canonical_json(receipt)))
            # The deliberately deficient control skips the existing record, but
            # retains both effects and the original key binding for inspection.
            if not existing:
                self.connection.execute("INSERT INTO idempotency VALUES (?,?,?,?)",
                                        (request["job"], request["key"], request["payload_hash"], receipt["action_id"]))
            event = self._event("commit", actor=actor, status="COMMITTED", receipt=receipt, **fields)
            return {"status": "COMMITTED", "receipt": receipt, "event_seq": event["seq"]}

    def revoke(self, job, *, actor="harness"):
        if not isinstance(job, str) or not job:
            raise ValueError("Job must be a non-empty string")
        with self._transaction():
            event = self._event("revoke", actor=actor, job=job)
            self.connection.execute("INSERT OR IGNORE INTO revocations VALUES (?,?)", (job, event["seq"]))
            return event

    def lookup(self, job, key, *, grant_id=None, subject="specialist",
               resource="remediation-queue", actor="framework"):
        grant_id = grant_id if grant_id is not None else f"{job}-read"
        with self._transaction():
            fields = {"job": job, "key": key, "grant_id": grant_id, "subject": subject, "resource": resource}
            reason = self._authorise(grant_id, job, subject, "receipt.read", resource)
            if reason:
                return self._deny("lookup", reason, actor=actor, **fields)
            row = self.connection.execute("SELECT queue.data FROM idempotency JOIN queue USING(action_id) WHERE job=? AND key=?",
                                          (job, key)).fetchone()
            receipt = json.loads(row["data"]) if row else None
            status = "FOUND" if receipt else "ABSENT"
            event = self._event("lookup", actor=actor, status=status, receipt=receipt, **fields)
            return {"status": status, "receipt": receipt, "event_seq": event["seq"]}

    def record(self, kind, *, actor="harness", **fields):
        if kind in self.BOUNDARY_KINDS or any(k in fields for k in ("seq", "kind", "actor")):
            raise ValueError("Instrumentation cannot forge an action-boundary event")
        with self._transaction():
            return self._event(kind, actor=actor, **fields)

    def snapshot(self):
        with self._transaction():
            return {"control": self.control,
                    "events": [{"seq": row["seq"], **json.loads(row["data"])}
                               for row in self.connection.execute("SELECT * FROM events ORDER BY seq")],
                    "queue": [json.loads(row["data"]) for row in self.connection.execute("SELECT data FROM queue ORDER BY rowid")],
                    "requests": [json.loads(row["data"]) for row in self.connection.execute("SELECT data FROM requests ORDER BY rowid")],
                    "grants": self._grants(),
                    "revocations": [dict(row) for row in self.connection.execute("SELECT * FROM revocations ORDER BY seq")]}


Store = DurableStore
