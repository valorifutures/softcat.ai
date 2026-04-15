#!/usr/bin/env python3
"""
SOFT CAT content bot: Tool of the Week

Pulls AI tool discoveries from RSS feeds, picks one worth writing about,
generates a markdown post in the house style, and commits it to the site repo.
"""

import os
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
- Keep it under 200 words in the body"""

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
    """Commit the new file and push."""
    os.chdir(REPO_DIR)

    subprocess.run(["git", "add", f"src/content/tools/{filename}", "bot/history.json", "src/data/pipeline/runs.json"], check=True)

    msg = f"bot: add tool of the week ({filename.replace('.md', '')})"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    subprocess.run(["git", "push"], check=True)

    print(f"Pushed: {msg}")


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


def main():
    print(f"[{datetime.now().isoformat()}] Tool of the Week bot starting")
    t0 = _time.time()

    try:
        history = load_history()

        print("Fetching feeds...")
        entries = fetch_feed_entries()
        print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

        if not entries:
            print("No entries found. Exiting.")
            log_run("tool_bot", status="success", duration_s=_time.time() - t0,
                    feeds_scanned=len(FEEDS), items_found=0, items_published=0)
            ping_healthcheck()
            sys.exit(0)

        print("Picking a tool and writing it up...")
        filename = pick_and_write(entries, history)

        if not filename:
            print("Nothing to publish. Exiting.")
            log_run("tool_bot", status="success", duration_s=_time.time() - t0,
                    feeds_scanned=len(FEEDS), items_found=len(entries), items_published=0)
            ping_healthcheck()
            sys.exit(0)

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

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        log_run("tool_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e))
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
