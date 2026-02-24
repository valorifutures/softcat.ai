"""Pydantic models for agent requests."""

from datetime import datetime, timezone, timedelta
from enum import Enum
from pydantic import BaseModel, Field
import uuid


class RequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    building = "building"
    built = "built"
    delivered = "delivered"
    rejected = "rejected"
    failed = "failed"


class AgentRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    description: str
    status: RequestStatus = RequestStatus.pending
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reviewed_at: str | None = None
    built_at: str | None = None
    agent_name: str | None = None
    download_token: str | None = None
    download_expires: str | None = None
    zip_path: str | None = None
    reject_reason: str | None = None


class RequestSubmission(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=2000)
