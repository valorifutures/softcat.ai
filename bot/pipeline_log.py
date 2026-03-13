"""
Shared pipeline logging utility for SOFT CAT bots.

Every bot calls log_run() at the end of its main function to append
a run entry to src/data/pipeline/runs.json. The site reads this file
at build time to render the /pipeline dashboard and activity ticker.
"""

import fcntl
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_DIR = Path(__file__).parent.parent
RUNS_FILE = REPO_DIR / "src" / "data" / "pipeline" / "runs.json"
MAX_DAYS = 90


def _load_runs() -> list[dict]:
    """Read runs.json, recovering gracefully from missing or corrupt files."""
    if not RUNS_FILE.exists():
        return []
    try:
        data = json.loads(RUNS_FILE.read_text())
        if isinstance(data, list):
            return data
        return []
    except (json.JSONDecodeError, ValueError):
        print(f"[pipeline_log] WARNING: {RUNS_FILE} was corrupt, starting fresh")
        return []


def _prune_old(runs: list[dict]) -> list[dict]:
    """Keep only entries from the last MAX_DAYS days."""
    if not runs:
        return runs
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_DAYS)
    cutoff_str = cutoff.isoformat()
    return [r for r in runs if r.get("timestamp", "") >= cutoff_str]


def log_run(
    bot: str,
    *,
    status: str = "success",
    duration_s: float = 0,
    feeds_scanned: int = 0,
    items_found: int = 0,
    items_rejected: int = 0,
    items_published: int = 0,
    model: str = "",
    cost_usd: float | None = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    output_files: list[str] | None = None,
    error_msg: str = "",
) -> None:
    """Append a run entry to runs.json with file locking."""
    entry = {
        "bot": bot,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "duration_s": round(duration_s, 1),
        "feeds_scanned": feeds_scanned,
        "items_found": items_found,
        "items_rejected": items_rejected,
        "items_published": items_published,
        "model": model,
        "cost_usd": round(cost_usd, 4) if cost_usd is not None else None,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "output_files": output_files or [],
    }
    if error_msg:
        entry["error_msg"] = error_msg

    # Ensure directory exists
    RUNS_FILE.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Open (or create) the file and lock it
        with open(RUNS_FILE, "a+") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                f.seek(0)
                content = f.read()
                runs = json.loads(content) if content.strip() else []
                if not isinstance(runs, list):
                    runs = []
            except (json.JSONDecodeError, ValueError):
                runs = []

            runs.append(entry)
            runs = _prune_old(runs)

            f.seek(0)
            f.truncate()
            f.write(json.dumps(runs, indent=2) + "\n")
            fcntl.flock(f, fcntl.LOCK_UN)

        print(f"[pipeline_log] Logged run: {bot} ({status})")

    except OSError as e:
        print(f"[pipeline_log] Failed to write run log: {e}")
