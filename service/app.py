"""FastAPI backend for agent requests."""

import logging
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .models import AgentRequest, RequestSubmission, RequestStatus
from .store import RequestStore
from .email import notify_owner

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="SOFT CAT Request API", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://softcat.ai", "https://www.softcat.ai"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

store = RequestStore()

# Simple in-memory rate limiting
_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = 3
RATE_LIMIT_WINDOW = 3600  # 1 hour


def _check_rate_limit(key: str) -> bool:
    """Return True if within rate limit."""
    now = time.time()
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[key]) >= RATE_LIMIT_MAX:
        return False
    _rate_limits[key].append(now)
    return True


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
    """Download a built agent zip."""
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
