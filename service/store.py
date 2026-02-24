"""JSON file-based request store."""

import fcntl
import json
from pathlib import Path

from .models import AgentRequest, RequestStatus


STORE_PATH = Path.home() / ".softcat" / "requests" / "queue.json"


class RequestStore:
    def __init__(self, path: Path = STORE_PATH):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write([])

    def _read(self) -> list[dict]:
        with open(self.path, "r") as f:
            fcntl.flock(f, fcntl.LOCK_SH)
            try:
                return json.load(f)
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)

    def _write(self, data: list[dict]) -> None:
        with open(self.path, "w") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                json.dump(data, f, indent=2)
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)

    def list_all(self, status: RequestStatus | None = None) -> list[AgentRequest]:
        items = self._read()
        requests = [AgentRequest(**item) for item in items]
        if status:
            requests = [r for r in requests if r.status == status]
        return sorted(requests, key=lambda r: r.created_at, reverse=True)

    def get(self, request_id: str) -> AgentRequest | None:
        for item in self._read():
            if item["id"] == request_id:
                return AgentRequest(**item)
        return None

    def add(self, request: AgentRequest) -> AgentRequest:
        items = self._read()
        items.append(request.model_dump())
        self._write(items)
        return request

    def update(self, request_id: str, **fields) -> AgentRequest | None:
        items = self._read()
        for i, item in enumerate(items):
            if item["id"] == request_id:
                item.update(fields)
                items[i] = item
                self._write(items)
                return AgentRequest(**item)
        return None
