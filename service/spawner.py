"""Pipeline runner for the spawn GUI — wraps S.O.F.T stages with progress events."""

import asyncio
import json
import shutil
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)


class SpawnProgress:
    """Holds progress events for a spawn job, readable via SSE."""

    def __init__(self):
        self.events: list[dict] = []
        self._waiters: list[asyncio.Event] = []

    def emit(self, stage: str, status: str, detail: str = ""):
        self.events.append({"stage": stage, "status": status, "detail": detail})
        for w in self._waiters:
            w.set()

    async def listen(self, after: int = 0):
        """Yield events starting from index `after`."""
        while True:
            if after < len(self.events):
                for e in self.events[after:]:
                    yield e
                after = len(self.events)
                # Check if we're done
                if self.events and self.events[-1]["stage"] in ("complete", "error"):
                    return
            waiter = asyncio.Event()
            self._waiters.append(waiter)
            await waiter.wait()
            self._waiters.remove(waiter)


# Global dict of active jobs
active_jobs: dict[str, SpawnProgress] = {}

DOWNLOADS_DIR = Path.home() / ".softcat" / "spawner" / "downloads"


async def run_spawn(
    job_id: str,
    description: str,
    scan_result_dict: dict | None = None,
) -> None:
    """Run the S.O.F.T pipeline in a background task, emitting progress events."""
    from softcat.config import get_config
    from softcat.core.scanner import Scanner, ScanResult
    from softcat.core.orchestrator import Orchestrator
    from softcat.core.fabricator import Fabricator
    from softcat.core.tester import Tester

    from . import db

    progress = SpawnProgress()
    active_jobs[job_id] = progress

    config = get_config()
    import tempfile
    temp_base = Path(tempfile.mkdtemp(prefix="softcat-spawn-"))
    original_agents_dir = config.agents_dir
    config.agents_dir = temp_base

    try:
        # S — Scan
        if scan_result_dict:
            scan_result = ScanResult(**scan_result_dict)
            progress.emit("scanning", "complete", f"Design ready: {scan_result.summary}")
        else:
            progress.emit("scanning", "running", "Parsing your description...")
            await db.update_spawn_job(job_id, status="scanning")
            scanner = Scanner(config)
            scan_result = await asyncio.to_thread(scanner.scan, description)
            progress.emit("scanning", "complete", scan_result.summary)

        agent_name = scan_result.suggested_name

        # O — Orchestrate
        progress.emit("orchestrating", "running", "Selecting tools and model...")
        await db.update_spawn_job(job_id, status="orchestrating")
        orchestrator = Orchestrator(config)
        plan = await asyncio.to_thread(orchestrator.plan, scan_result)
        progress.emit("orchestrating", "complete", f"{plan.template} template, {plan.model}")

        # F — Fabricate
        progress.emit("fabricating", "running", "Generating agent code...")
        await db.update_spawn_job(job_id, status="fabricating")
        fabricator = Fabricator(config)
        agent_dir = await asyncio.to_thread(fabricator.fabricate, agent_name, scan_result, plan)
        progress.emit("fabricating", "complete", f"Generated {agent_name}/")

        # T — Test
        progress.emit("testing", "running", "Validating the output...")
        await db.update_spawn_job(job_id, status="testing")
        tester = Tester(config)
        test_result = await asyncio.to_thread(tester.test, agent_dir)

        if not test_result.passed:
            progress.emit("testing", "failed", test_result.message)
            await db.update_spawn_job(
                job_id, status="failed", error=test_result.message,
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
            progress.emit("error", "failed", "Agent failed validation")
            return

        progress.emit("testing", "complete", "All checks passed")

        # Inject README
        readme = _generate_readme(agent_name, description, scan_result)
        (agent_dir / "README.md").write_text(readme)

        # Capture file contents for preview
        files = {}
        for fname in ["agent.py", "prompt.md", "config.yaml", "requirements.txt", "README.md"]:
            fpath = agent_dir / fname
            if fpath.exists():
                files[fname] = fpath.read_text()

        # Zip
        DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
        zip_path = DOWNLOADS_DIR / f"{job_id}.zip"
        await asyncio.to_thread(
            shutil.make_archive,
            str(zip_path.with_suffix("")), "zip",
            root_dir=str(temp_base), base_dir=agent_name,
        )

        download_token = str(uuid.uuid4())
        download_expires = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()

        await db.update_spawn_job(
            job_id,
            status="complete",
            agent_name=agent_name,
            zip_path=str(zip_path),
            download_token=download_token,
            download_expires=download_expires,
            files_json=json.dumps(files),
            completed_at=datetime.now(timezone.utc).isoformat(),
        )

        progress.emit("complete", "complete", "Ready to download")

    except Exception as e:
        logger.exception(f"Spawn job {job_id} failed")
        progress.emit("error", "failed", str(e))
        await db.update_spawn_job(
            job_id, status="failed", error=str(e),
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        config.agents_dir = original_agents_dir
        shutil.rmtree(temp_base, ignore_errors=True)


def _generate_readme(agent_name: str, description: str, scan_result) -> str:
    """Generate a README for the downloadable agent package."""
    schedule = scan_result.schedule.cron_expression or "manual"
    return f"""# {agent_name}

Built by SOFT CAT. {scan_result.summary}

## What this agent does

{description}

## Quick start

1. Install Python 3.10+ if you don't have it
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your API key:
   ```
   ANTHROPIC_API_KEY="your-key-here"
   ```
4. Run it:
   ```
   python agent.py
   ```

## Schedule

To run this automatically, add a cron job:
```
{schedule} cd /path/to/{agent_name} && set -a && . .env && set +a && python agent.py
```

## Files

- `agent.py` — the agent script
- `prompt.md` — the prompt template
- `config.yaml` — agent configuration
- `requirements.txt` — Python dependencies

## Need help?

Visit https://softcat.ai
"""
