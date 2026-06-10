#!/usr/bin/env python3
"""
SOFT CAT content bot: Tool of the Week

Pulls AI tool discoveries from RSS feeds, picks one worth writing about,
generates a markdown post in the house style, and commits it to the site repo.
"""

import os
import re
import sys
import json
import hashlib
import subprocess
import time as _time
from datetime import datetime, date
from pathlib import Path

import httpx
import feedparser
from dotenv import load_dotenv
from anthropic import Anthropic

from pipeline_log import log_run
import git_safe

# Paths
BOT_DIR = Path(__file__).parent
REPO_DIR = BOT_DIR.parent
CONTENT_DIR = REPO_DIR / "src" / "content" / "tools"
HISTORY_FILE = BOT_DIR / "history.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"

# RSS feeds to scan for AI tools and news
FEEDS = [
    "https://www.marktechpost.com/feed/",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://news.bensbites.com/feed",
    "https://buttondown.com/ainews/rss",
]

load_dotenv(BOT_DIR / ".env")


def load_history() -> dict:
    """Load the history of previously featured tools."""
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"featured": []}


def save_history(history: dict):
    """Save the history."""
    HISTORY_FILE.write_text(json.dumps(history, indent=2))


def fetch_feed_entries() -> list[dict]:
    """Pull entries from all RSS feeds."""
    entries = []
    for url in FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:10]:
                entries.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "summary": entry.get("summary", "")[:500],
                    "source": feed.feed.get("title", url),
                })
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
    return entries


def pick_and_write(entries: list[dict], history: dict) -> str | None:
    """Use Claude to pick an interesting tool and write it up."""
    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text()

    # Filter out already featured links
    featured_links = set(history.get("featured", []))
    fresh = [e for e in entries if e["link"] not in featured_links]

    if not fresh:
        print("No new entries to feature.")
        return None

    # Build the feed summary for Claude
    feed_text = "\n\n".join(
        f"**{e['title']}**\nSource: {e['source']}\nLink: {e['link']}\n{e['summary']}"
        for e in fresh[:20]
    )

    today = date.today().isoformat()
    slug_date = date.today().strftime("%Y-%m-%d")

    prompt = f"""You are writing content for SOFT CAT .ai. Your job is to pick ONE interesting AI tool, library, or technique from the feed below and write a short "Tool of the Week" post.

## House style (follow this exactly):
{style_guide}

## Feed entries to choose from:
{feed_text}

## Output format:
Return ONLY a markdown file with YAML frontmatter. No extra commentary. The file must match this exact schema:

```
---
title: "Name of the tool"
description: "One sentence. What it is and why it's interesting."
date: {today}
url: "https://link-to-the-tool-or-article"
status: experimental
tags: [tag1, tag2, tag3]
draft: false
---

Body text here. 2-4 short paragraphs. What it does, why it caught your eye, who it's for.
```

Rules:
- Pick something genuinely useful or interesting, not just hype
- Tags should be lowercase, hyphenated where needed, specific
- No em dashes anywhere
- Write like a real person, not a press release
- Keep it under 200 words in the body
- NEVER claim hands-on testing or first-hand use ("we tested", "we tried",
  "we've been using"). You have not used the tool. Attribute claims to the
  source ("the benchmarks show", "the demo handles") or stay neutral."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    # Store usage for pipeline logging
    pick_and_write._last_usage = response.usage

    content = response.content[0].text.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:])
        if content.endswith("```"):
            content = content[:-3].strip()

    # Generate a filename from the title
    title_line = ""
    for line in content.split("\n"):
        if line.startswith("title:"):
            title_line = line.split(":", 1)[1].strip().strip('"').strip("'")
            break

    if not title_line:
        print("Could not extract title from generated content.")
        return None

    slug = title_line.lower()
    slug = "".join(c if c.isalnum() or c == " " else "" for c in slug)
    slug = slug.strip().replace(" ", "-")[:60]
    filename = f"{slug_date}-{slug}.md"

    # Extract URL for history tracking
    url_line = ""
    for line in content.split("\n"):
        if line.startswith("url:"):
            url_line = line.split(":", 1)[1].strip().strip('"').strip("'")
            # Rejoin in case URL had colons
            if line.count(":") > 1:
                url_line = ":".join(line.split(":")[1:]).strip().strip('"').strip("'")
            break

    # Write the file
    output_path = CONTENT_DIR / filename
    output_path.write_text(content + "\n")
    print(f"Written: {output_path}")

    # Update history
    if url_line:
        history.setdefault("featured", []).append(url_line)
    save_history(history)

    return filename


def git_commit_and_push(filename: str):
    """Commit the new file and push (serialized + health-checked via git_safe)."""
    msg = f"bot: add tool of the week ({filename.replace('.md', '')})"
    git_safe.safe_commit_and_push(
        [f"src/content/tools/{filename}", "bot/history.json", "src/data/pipeline/runs.json"],
        msg,
    )


def ping_healthcheck(status="success"):
    """Ping Healthchecks.io to report bot status."""
    url = os.environ.get("HC_PING_TOOL_OF_WEEK")
    if not url:
        return
    try:
        suffix = "/fail" if status == "fail" else ""
        httpx.get(f"{url}{suffix}", timeout=10)
    except Exception as e:
        print(f"Healthcheck ping failed: {e}")


# --------------------------------------------------------------------------- #
# Job 2: weekly link verification (B7/E3, hardened per D6/D12/E6.8)           #
#                                                                              #
#   write-up url ──▶ HTTP STATUS check only ──▶ verdict                       #
#        │   (no content ever reaches an LLM)     │                           #
#        │                                        ├─ ok ──▶ last_verified     #
#   no url? skip                                  │         stamp             #
#   (context-window-viz,                          ├─ unverifiable (403/429/   #
#    softcat-site,                                │   timeout/5xx/SSL) ──▶    #
#    token-cost-calculator)                       │   staged + /pipeline +    #
#                                                 │   Discord, NEVER archives │
#                                                 └─ definitive-dead (404/410/│
#                                                     DNS/conn-refused) ──▶   │
#                                                     streak; 3 consecutive   │
#                                                     weeks ──▶ archived      │
# --------------------------------------------------------------------------- #

VERIFY_HISTORY = BOT_DIR / "tool_verify_history.json"
UNVERIFIABLE_FILE = Path.home() / ".softcat-bot-staging" / "tool-verify-unverifiable.json"
ARCHIVE_AFTER = 3  # consecutive definitive-dead weekly checks (D12)

DEFINITIVE_DEAD_CODES = {404, 410}


def classify_status(code: int | None, exc: Exception | None = None) -> str:
    """Map an HTTP status (or transport error) to a verdict.

    Returns 'ok' | 'dead' | 'unverifiable'. Archiving is reserved for
    provable death; bot-blocking (403/429), timeouts, and server errors
    are 'unverifiable' and only ever surfaced for manual review (D12/2A).
    """
    if exc is not None:
        # DNS failure / connection refused are definitive-dead transport
        # signals; everything else (timeout, TLS, protocol) is ambiguous.
        import socket
        if isinstance(exc, httpx.ConnectError):
            cause = str(exc).lower()
            if "name" in cause or "resolve" in cause or "refused" in cause or \
               isinstance(exc.__cause__, (socket.gaierror, ConnectionRefusedError)):
                return "dead"
        return "unverifiable"
    if code is None:
        return "unverifiable"
    if code in DEFINITIVE_DEAD_CODES:
        return "dead"
    if 200 <= code < 400:
        return "ok"
    return "unverifiable"


def check_url(url: str) -> str:
    """Status-code-only check. HEAD first, GET fallback (some hosts 405 HEAD).
    Response bodies are never read into anything."""
    try:
        resp = httpx.head(url, timeout=15, follow_redirects=True)
        if resp.status_code in (405, 501):
            resp = httpx.get(url, timeout=15, follow_redirects=True)
        return classify_status(resp.status_code)
    except Exception as e:
        return classify_status(None, e)


def load_verify_history() -> dict:
    """Corrupt history resets to empty with a logged warning (shadow guard)."""
    if not VERIFY_HISTORY.exists():
        return {}
    try:
        data = json.loads(VERIFY_HISTORY.read_text())
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, ValueError):
        print(f"[tool_bot] WARNING: {VERIFY_HISTORY} corrupt, resetting streaks")
        return {}


def update_streak(history: dict, key: str, verdict: str) -> tuple[dict, bool]:
    """Pure streak logic. Returns (history, should_archive).
    'ok' resets the streak; 'unverifiable' leaves it untouched (a blocked
    check is not evidence of death); 'dead' increments."""
    entry = history.get(key, {"streak": 0})
    if verdict == "ok":
        entry["streak"] = 0
    elif verdict == "dead":
        entry["streak"] = entry.get("streak", 0) + 1
    entry["last_verdict"] = verdict
    history[key] = entry
    return history, verdict == "dead" and entry["streak"] >= ARCHIVE_AFTER


FRONT_URL = re.compile(r'^url:\s*"?([^"\n]+)"?\s*$', re.M)
FRONT_STATUS = re.compile(r"^status:\s*(\w+)\s*$", re.M)
FRONT_VERIFIED = re.compile(r"^last_verified:\s*\S+\s*$", re.M)


def stamp_file(path: Path, verdict: str, archive: bool, today: str) -> bool:
    """Apply last_verified stamp / archived flip to a write-up's frontmatter.
    Returns True when the file changed. Data-only edits, direct-commit path."""
    txt = path.read_text()
    new = txt
    if verdict == "ok":
        if FRONT_VERIFIED.search(new):
            new = FRONT_VERIFIED.sub(f"last_verified: {today}", new)
        else:
            new = re.sub(r"(^date:.*$)", rf"\1\nlast_verified: {today}", new, count=1, flags=re.M)
    if archive and FRONT_STATUS.search(new):
        current = FRONT_STATUS.search(new).group(1)
        if current != "archived":
            new = FRONT_STATUS.sub("status: archived", new, count=1)
    if new != txt:
        path.write_text(new)
        return True
    return False


def post_unverifiable_to_discord(items: list[dict]):
    webhook = os.environ.get("DISCORD_WEBHOOK_TOOL_OF_WEEK")
    if not webhook or not items:
        return
    lines = [f"**Tool bot:** {len(items)} link(s) unverifiable this week:"]
    lines += [f"- {i['file']}: {i['url']}" for i in items[:10]]
    try:
        httpx.post(webhook, json={"content": "\n".join(lines),
                                  "username": "SOFT CAT Tool of the Week"}, timeout=15)
    except Exception as e:
        print(f"[tool_bot] Discord post failed: {e}")


def run_verify_job(t0: float):
    """Job 2 entry point: weekly link checks across all write-ups."""
    today = date.today().isoformat()
    history = load_verify_history()
    changed_files: list[str] = []
    unverifiable: list[dict] = []
    checked = archived = 0

    for path in sorted(CONTENT_DIR.glob("*.md")):
        m = FRONT_URL.search(path.read_text())
        if not m:
            continue  # url-less write-ups are skipped, no stamp (E6.8)
        url = m.group(1).strip()
        verdict = check_url(url)
        checked += 1
        history, should_archive = update_streak(history, path.name, verdict)
        if verdict == "unverifiable":
            unverifiable.append({"file": path.name, "url": url})
            print(f"  unverifiable: {path.name}")
            continue
        if stamp_file(path, verdict, should_archive, today):
            changed_files.append(f"src/content/tools/{path.name}")
        if should_archive:
            archived += 1
            print(f"  ARCHIVED (streak {ARCHIVE_AFTER}): {path.name}")

    VERIFY_HISTORY.write_text(json.dumps(history, indent=2) + "\n")

    if unverifiable:
        UNVERIFIABLE_FILE.parent.mkdir(parents=True, exist_ok=True)
        UNVERIFIABLE_FILE.write_text(json.dumps(
            {"generated_at": today, "items": unverifiable}, indent=2) + "\n")
        post_unverifiable_to_discord(unverifiable)

    log_run("tool_bot", status="success", duration_s=_time.time() - t0,
            items_found=checked, items_published=len(changed_files),
            items_rejected=len(unverifiable), job="verify",
            error_msg="" if not unverifiable else
            f"{len(unverifiable)} unverifiable: " + ", ".join(i["file"] for i in unverifiable[:5]))

    if changed_files:
        git_safe.safe_commit_and_push(
            changed_files + ["bot/tool_verify_history.json", "src/data/pipeline/runs.json"],
            f"bot: verify write-up links ({today}, {archived} archived)")
    print(f"[tool_bot] verify: {checked} checked, {len(changed_files)} stamped, "
          f"{archived} archived, {len(unverifiable)} unverifiable")


def main():
    print(f"[{datetime.now().isoformat()}] Tool of the Week bot starting")
    t0 = _time.time()

    # ---- Job 1: weekly write-up. Early "nothing to publish" outcomes no
    # longer exit the process — the verify job below runs every week.
    try:
        history = load_history()

        print("Fetching feeds...")
        entries = fetch_feed_entries()
        print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

        filename = None
        if entries:
            print("Picking a tool and writing it up...")
            filename = pick_and_write(entries, history)

        if filename:
            usage = getattr(pick_and_write, "_last_usage", None)
            cost = None
            in_tok = out_tok = 0
            if usage:
                cost = (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000
                in_tok, out_tok = usage.input_tokens, usage.output_tokens

            # Log BEFORE commit so the runs.json entry lands in the same commit
            # as this bot's data changes, not the next bot's commit (issue #97).
            log_run("tool_bot", status="success", duration_s=_time.time() - t0,
                    feeds_scanned=len(FEEDS), items_found=len(entries), items_published=1,
                    model="claude-sonnet-4-20250514", cost_usd=cost,
                    input_tokens=in_tok, output_tokens=out_tok,
                    output_files=[f"src/content/tools/{filename}"])

            print("Committing and pushing...")
            git_commit_and_push(filename)
        else:
            print("Nothing to publish this week.")
            log_run("tool_bot", status="success", duration_s=_time.time() - t0,
                    feeds_scanned=len(FEEDS), items_found=len(entries), items_published=0)

    except Exception as e:
        print(f"Bot failed (write-up job): {e}")
        log_run("tool_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e))
        ping_healthcheck("fail")
        sys.exit(1)

    # ---- Job 2: link verification (loud but independent of Job 1)
    try:
        print("Verifying write-up links...")
        run_verify_job(t0)
    except Exception as e:
        print(f"Bot failed (verify job): {e}")
        log_run("tool_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e), job="verify")
        ping_healthcheck("fail")
        sys.exit(1)

    print("Done.")
    ping_healthcheck()


if __name__ == "__main__":
    main()
