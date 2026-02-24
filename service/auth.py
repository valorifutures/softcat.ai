"""Magic link auth and session management."""

import os
from fastapi import Request, HTTPException, Depends

from . import db

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")


async def get_current_user(request: Request) -> dict | None:
    """Read session cookie and return user, or None."""
    session_token = request.cookies.get("softcat_session")
    if not session_token:
        return None
    return await db.get_session_user(session_token)


async def require_user(request: Request) -> dict:
    """FastAPI dependency: require an authenticated user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Not authenticated")
    if user["status"] != "approved":
        raise HTTPException(403, "Account not approved")
    return user


async def require_admin(request: Request) -> None:
    """FastAPI dependency: require admin token in Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or not ADMIN_TOKEN:
        raise HTTPException(401, "Admin token required")
    if auth[7:] != ADMIN_TOKEN:
        raise HTTPException(403, "Invalid admin token")
