"""FastAPI backend for agent requests and spawn GUI."""

import asyncio
import json
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from .models import (
    AgentRequest, RequestSubmission, RequestStatus,
    AccessRequest, MagicLinkLogin, SpawnRequest, DesignerMessage,
)
from .store import RequestStore
from .email import notify_owner, notify_access_request, send_magic_link
from . import db
from .auth import get_current_user, require_user, require_admin
from .spawner import run_spawn, active_jobs

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="SOFT CAT API", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://softcat.ai", "https://www.softcat.ai"],
    allow_methods=["POST", "GET", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
)

store = RequestStore()

# Simple in-memory rate limiting
_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = 3
RATE_LIMIT_WINDOW = 3600  # 1 hour
SPAWN_LIMIT_PER_DAY = 3


def _check_rate_limit(key: str) -> bool:
    """Return True if within rate limit."""
    now = time.time()
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[key]) >= RATE_LIMIT_MAX:
        return False
    _rate_limits[key].append(now)
    return True


# ============================================================
# Existing endpoints (request-an-agent flow) — UNTOUCHED
# ============================================================

@app.post("/api/request")
async def submit_request(submission: RequestSubmission, request: Request):
    """Submit a new agent request."""
    client_ip = request.client.host if request.client else "unknown"

    if not _check_rate_limit(f"email:{submission.email}"):
        raise HTTPException(429, "Too many requests from this email. Try again later.")

    if not _check_rate_limit(f"ip:{client_ip}"):
        raise HTTPException(429, "Too many requests. Try again later.")

    agent_request = AgentRequest(
        name=submission.name,
        email=submission.email,
        description=submission.description,
    )

    store.add(agent_request)
    logger.info(f"New request {agent_request.id} from {submission.name} ({submission.email})")

    try:
        notify_owner(
            name=submission.name,
            email=submission.email,
            description=submission.description,
            request_id=agent_request.id,
        )
    except Exception as e:
        logger.error(f"Failed to send owner notification: {e}")

    return {"id": agent_request.id, "status": "pending"}


@app.get("/api/request/{request_id}")
async def get_request_status(request_id: str):
    """Check the status of a request."""
    agent_request = store.get(request_id)
    if not agent_request:
        raise HTTPException(404, "Request not found")
    return {"id": agent_request.id, "status": agent_request.status}


@app.get("/download/{token}")
async def download_agent(token: str):
    """Download a built agent zip (request flow)."""
    for req in store.list_all():
        if req.download_token == token:
            if req.download_expires:
                expires = datetime.fromisoformat(req.download_expires)
                if datetime.now(timezone.utc) > expires:
                    raise HTTPException(410, "Download link has expired")

            if not req.zip_path or not Path(req.zip_path).exists():
                raise HTTPException(404, "Agent file not found")

            filename = f"{req.agent_name or 'agent'}.zip"
            store.update(req.id, status=RequestStatus.delivered.value)

            return FileResponse(
                req.zip_path,
                media_type="application/zip",
                filename=filename,
            )

    raise HTTPException(404, "Invalid download link")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


# ============================================================
# Spawn GUI — access & auth
# ============================================================

@app.post("/api/spawn/access")
async def request_access(body: AccessRequest, request: Request):
    """Request access to the spawn GUI."""
    client_ip = request.client.host if request.client else "unknown"

    if not _check_rate_limit(f"access:{body.email}"):
        raise HTTPException(429, "Too many requests. Try again later.")

    if not _check_rate_limit(f"access_ip:{client_ip}"):
        raise HTTPException(429, "Too many requests. Try again later.")

    existing = await db.get_user_by_email(body.email)
    if existing:
        if existing["status"] == "approved":
            # Already approved — send a new magic link
            token = await db.create_magic_link(existing["id"])
            magic_url = f"https://softcat.ai/spawn?token={token}"
            try:
                send_magic_link(existing["name"], body.email, magic_url)
            except Exception as e:
                logger.error(f"Failed to send magic link: {e}")
            return {"status": "link_sent"}
        return {"status": "pending"}

    user = await db.create_user(body.name, body.email)

    try:
        notify_access_request(body.name, body.email, user["id"])
    except Exception as e:
        logger.error(f"Failed to send access notification: {e}")

    return {"status": "pending"}


@app.post("/api/spawn/login")
async def login(body: MagicLinkLogin):
    """Verify magic link and create session."""
    user = await db.verify_magic_link(body.token)
    if not user:
        raise HTTPException(401, "Invalid or expired login link")

    session_token = await db.create_session(user["id"])

    response = {"user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

    from fastapi.responses import JSONResponse
    resp = JSONResponse(response)
    resp.set_cookie(
        key="softcat_session",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=30 * 24 * 3600,
        domain=".softcat.ai",
    )
    return resp


@app.get("/api/spawn/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info."""
    if not user:
        raise HTTPException(401, "Not authenticated")
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "status": user["status"],
        "total_spawns": user["total_spawns"],
    }


@app.post("/api/spawn/logout")
async def logout(request: Request):
    """Clear session."""
    session_token = request.cookies.get("softcat_session")
    if session_token:
        await db.delete_session(session_token)

    from fastapi.responses import JSONResponse
    resp = JSONResponse({"status": "ok"})
    resp.delete_cookie(
        key="softcat_session",
        domain=".softcat.ai",
        secure=True,
        samesite="none",
    )
    return resp


# ============================================================
# Spawn GUI — designer (multi-turn chat)
# ============================================================

@app.post("/api/spawn/designer/start")
async def designer_start(user: dict = Depends(require_user)):
    """Start a new designer chat session."""
    session = await db.create_designer_session(user["id"])
    return {"session_id": session["id"]}


@app.post("/api/spawn/designer/{session_id}/message")
async def designer_message(session_id: str, body: DesignerMessage, user: dict = Depends(require_user)):
    """Send a message to the designer and get Claude's response."""
    from softcat.core.designer import DESIGNER_SYSTEM_PROMPT, DESIGN_COMPLETE_MARKER
    from softcat.core.scanner import ScanResult
    from softcat.config import get_config

    session = await db.get_designer_session(session_id)
    if not session or session["user_id"] != user["id"]:
        raise HTTPException(404, "Designer session not found")

    if session["scan_result"]:
        raise HTTPException(400, "Design already complete")

    # Add user message
    await db.append_designer_message(session_id, "user", body.message)

    # Build message history
    messages = session["messages"] + [{"role": "user", "content": body.message}]

    # Call Claude
    config = get_config()
    client = anthropic.Anthropic(api_key=config.anthropic_api_key)

    response = await asyncio.to_thread(
        client.messages.create,
        model=config.default_model,
        max_tokens=2000,
        system=DESIGNER_SYSTEM_PROMPT,
        messages=messages,
    )

    assistant_text = response.content[0].text.strip()
    await db.append_designer_message(session_id, "assistant", assistant_text)

    # Check for completion
    if DESIGN_COMPLETE_MARKER in assistant_text:
        parts = assistant_text.split(DESIGN_COMPLETE_MARKER, 1)
        conversational = parts[0].strip()
        json_text = parts[1].strip()

        # Strip markdown fences
        if json_text.startswith("```"):
            json_text = json_text.split("\n", 1)[1]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
            json_text = json_text.strip()

        try:
            data = json.loads(json_text)
            scan_result = ScanResult(**data)
            await db.set_designer_scan_result(session_id, data)
            return {
                "content": conversational,
                "complete": True,
                "scan_result": data,
            }
        except Exception as e:
            logger.error(f"Failed to parse design: {e}")
            return {"content": assistant_text, "complete": False}

    return {"content": assistant_text, "complete": False}


# ============================================================
# Spawn GUI — spawn jobs
# ============================================================

@app.post("/api/spawn/run")
async def spawn_run(body: SpawnRequest, user: dict = Depends(require_user)):
    """Start a spawn job."""
    # Check rate limit
    count = await db.get_spawn_count_today(user["id"])
    if count >= SPAWN_LIMIT_PER_DAY:
        raise HTTPException(429, f"Spawn limit reached ({SPAWN_LIMIT_PER_DAY} per day)")

    # Get description and optional scan result from designer
    scan_result_dict = None
    description = body.description

    if body.designer_session_id:
        session = await db.get_designer_session(body.designer_session_id)
        if not session or session["user_id"] != user["id"]:
            raise HTTPException(404, "Designer session not found")
        if not session["scan_result"]:
            raise HTTPException(400, "Design not yet complete")
        scan_result_dict = session["scan_result"]
        description = scan_result_dict.get("summary", description)

    if not description and not scan_result_dict:
        raise HTTPException(400, "Provide a description or a completed designer session")

    await db.increment_spawn_count(user["id"])

    job = await db.create_spawn_job(user["id"], description)

    # Launch pipeline in background
    asyncio.create_task(run_spawn(job["id"], description, scan_result_dict))

    return {"job_id": job["id"]}


@app.get("/api/spawn/run/{job_id}/stream")
async def spawn_stream(job_id: str, user: dict = Depends(require_user)):
    """SSE endpoint: stream pipeline progress events."""
    # Verify job belongs to user
    job = await db.get_spawn_job(job_id)
    if not job or job["user_id"] != user["id"]:
        raise HTTPException(404, "Job not found")

    progress = active_jobs.get(job_id)
    if not progress:
        # Job already finished — return stored status
        async def finished_stream():
            yield f"data: {json.dumps({'stage': job['status'], 'status': job['status'], 'detail': job.get('error') or ''})}\n\n"
        return StreamingResponse(finished_stream(), media_type="text/event-stream")

    async def event_stream():
        seen = 0
        async for event in progress.listen(after=seen):
            yield f"data: {json.dumps(event)}\n\n"
            seen += 1

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/spawn/run/{job_id}/files")
async def spawn_files(job_id: str, user: dict = Depends(require_user)):
    """Get generated file contents for preview."""
    job = await db.get_spawn_job(job_id)
    if not job or job["user_id"] != user["id"]:
        raise HTTPException(404, "Job not found")

    if job["status"] != "complete":
        raise HTTPException(400, "Job not complete")

    files = json.loads(job["files_json"]) if job["files_json"] else {}
    return {"agent_name": job["agent_name"], "files": files}


@app.get("/api/spawn/run/{job_id}/download")
async def spawn_download(job_id: str, user: dict = Depends(require_user)):
    """Download the built agent zip."""
    job = await db.get_spawn_job(job_id)
    if not job or job["user_id"] != user["id"]:
        raise HTTPException(404, "Job not found")

    if job["status"] != "complete":
        raise HTTPException(400, "Job not complete")

    if not job["zip_path"] or not Path(job["zip_path"]).exists():
        raise HTTPException(404, "Agent file not found")

    if job["download_expires"]:
        expires = datetime.fromisoformat(job["download_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(410, "Download link has expired")

    filename = f"{job['agent_name'] or 'agent'}.zip"
    return FileResponse(job["zip_path"], media_type="application/zip", filename=filename)


# ============================================================
# Admin endpoints
# ============================================================

@app.get("/api/spawn/admin/users")
async def admin_list_users(_: None = Depends(require_admin)):
    """List all users."""
    users = await db.list_users()
    return {"users": users}


@app.post("/api/spawn/admin/approve/{user_id}")
async def admin_approve_user(user_id: str, _: None = Depends(require_admin)):
    """Approve a user and send them a magic login link."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if user["status"] == "approved":
        raise HTTPException(400, "User already approved")

    user = await db.approve_user(user_id)

    # Create and send magic link
    token = await db.create_magic_link(user_id)
    magic_url = f"https://softcat.ai/spawn?token={token}"

    try:
        send_magic_link(user["name"], user["email"], magic_url)
    except Exception as e:
        logger.error(f"Failed to send magic link: {e}")
        raise HTTPException(500, "User approved but failed to send login link")

    return {"status": "approved", "user": user}
