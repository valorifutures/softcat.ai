"""SQLite async store for the spawn GUI."""

import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import aiosqlite

DB_PATH = Path.home() / ".softcat" / "spawner.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    approved_at TEXT,
    spawns_today INTEGER NOT NULL DEFAULT 0,
    spawns_today_date TEXT,
    total_spawns INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS magic_links (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS spawn_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    completed_at TEXT,
    error TEXT,
    agent_name TEXT,
    zip_path TEXT,
    download_token TEXT,
    download_expires TEXT,
    files_json TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS designer_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    messages_json TEXT NOT NULL DEFAULT '[]',
    scan_result_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""


async def get_db() -> aiosqlite.Connection:
    """Get a database connection, initializing schema if needed."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.executescript(SCHEMA)
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uuid() -> str:
    return str(uuid.uuid4())


# --- Users ---

async def create_user(name: str, email: str) -> dict:
    db = await get_db()
    try:
        user_id = _uuid()
        await db.execute(
            "INSERT INTO users (id, name, email, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
            (user_id, name, email.lower(), _now()),
        )
        await db.commit()
        return await get_user(user_id)
    finally:
        await db.close()


async def get_user(user_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def get_user_by_email(email: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def list_users(status: str | None = None) -> list[dict]:
    db = await get_db()
    try:
        if status:
            cursor = await db.execute("SELECT * FROM users WHERE status = ? ORDER BY created_at DESC", (status,))
        else:
            cursor = await db.execute("SELECT * FROM users ORDER BY created_at DESC")
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


async def approve_user(user_id: str) -> dict | None:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE users SET status = 'approved', approved_at = ? WHERE id = ?",
            (_now(), user_id),
        )
        await db.commit()
        return await get_user(user_id)
    finally:
        await db.close()


async def increment_spawn_count(user_id: str) -> int:
    """Increment daily spawn count. Returns new count."""
    db = await get_db()
    try:
        today = datetime.now(timezone.utc).date().isoformat()
        user = await get_user(user_id)
        if not user:
            return 0

        if user["spawns_today_date"] == today:
            new_count = user["spawns_today"] + 1
        else:
            new_count = 1

        await db.execute(
            "UPDATE users SET spawns_today = ?, spawns_today_date = ?, total_spawns = total_spawns + 1 WHERE id = ?",
            (new_count, today, user_id),
        )
        await db.commit()
        return new_count
    finally:
        await db.close()


async def get_spawn_count_today(user_id: str) -> int:
    user = await get_user(user_id)
    if not user:
        return 0
    today = datetime.now(timezone.utc).date().isoformat()
    if user["spawns_today_date"] == today:
        return user["spawns_today"]
    return 0


# --- Magic Links ---

async def create_magic_link(user_id: str) -> str:
    db = await get_db()
    try:
        token = _uuid()
        now = _now()
        expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        await db.execute(
            "INSERT INTO magic_links (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, expires),
        )
        await db.commit()
        return token
    finally:
        await db.close()


async def verify_magic_link(token: str) -> dict | None:
    """Verify and consume a magic link. Returns user dict or None."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM magic_links WHERE token = ?", (token,))
        row = await cursor.fetchone()
        if not row:
            return None

        link = dict(row)
        if link["used"]:
            return None

        expires = datetime.fromisoformat(link["expires_at"])
        if datetime.now(timezone.utc) > expires:
            return None

        await db.execute("UPDATE magic_links SET used = 1 WHERE token = ?", (token,))
        await db.commit()

        return await get_user(link["user_id"])
    finally:
        await db.close()


# --- Sessions ---

async def create_session(user_id: str) -> str:
    db = await get_db()
    try:
        token = _uuid()
        now = _now()
        expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        await db.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, expires),
        )
        await db.commit()
        return token
    finally:
        await db.close()


async def get_session_user(session_token: str) -> dict | None:
    """Validate session token and return user, or None."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM sessions WHERE token = ?", (session_token,))
        row = await cursor.fetchone()
        if not row:
            return None

        session = dict(row)
        expires = datetime.fromisoformat(session["expires_at"])
        if datetime.now(timezone.utc) > expires:
            await db.execute("DELETE FROM sessions WHERE token = ?", (session_token,))
            await db.commit()
            return None

        return await get_user(session["user_id"])
    finally:
        await db.close()


async def delete_session(session_token: str) -> None:
    db = await get_db()
    try:
        await db.execute("DELETE FROM sessions WHERE token = ?", (session_token,))
        await db.commit()
    finally:
        await db.close()


# --- Spawn Jobs ---

async def create_spawn_job(user_id: str, description: str) -> dict:
    db = await get_db()
    try:
        job_id = _uuid()
        await db.execute(
            "INSERT INTO spawn_jobs (id, user_id, description, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
            (job_id, user_id, description, _now()),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM spawn_jobs WHERE id = ?", (job_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


async def update_spawn_job(job_id: str, **fields) -> dict | None:
    db = await get_db()
    try:
        sets = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [job_id]
        await db.execute(f"UPDATE spawn_jobs SET {sets} WHERE id = ?", values)
        await db.commit()
        cursor = await db.execute("SELECT * FROM spawn_jobs WHERE id = ?", (job_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def get_spawn_job(job_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM spawn_jobs WHERE id = ?", (job_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


# --- Designer Sessions ---

async def create_designer_session(user_id: str) -> dict:
    db = await get_db()
    try:
        session_id = _uuid()
        await db.execute(
            "INSERT INTO designer_sessions (id, user_id, messages_json, created_at) VALUES (?, ?, '[]', ?)",
            (session_id, user_id, _now()),
        )
        await db.commit()
        return {"id": session_id, "user_id": user_id, "messages": [], "scan_result": None}
    finally:
        await db.close()


async def get_designer_session(session_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM designer_sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["messages"] = json.loads(d["messages_json"])
        d["scan_result"] = json.loads(d["scan_result_json"]) if d["scan_result_json"] else None
        return d
    finally:
        await db.close()


async def append_designer_message(session_id: str, role: str, content: str) -> None:
    db = await get_db()
    try:
        session = await get_designer_session(session_id)
        if not session:
            return
        messages = session["messages"]
        messages.append({"role": role, "content": content})
        await db.execute(
            "UPDATE designer_sessions SET messages_json = ? WHERE id = ?",
            (json.dumps(messages), session_id),
        )
        await db.commit()
    finally:
        await db.close()


async def set_designer_scan_result(session_id: str, scan_result: dict) -> None:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE designer_sessions SET scan_result_json = ? WHERE id = ?",
            (json.dumps(scan_result), session_id),
        )
        await db.commit()
    finally:
        await db.close()
