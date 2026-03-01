#!/usr/bin/env python3
"""
SOFT CAT content bot: AI Thoughts

Reads AI news feeds for inspiration, generates an original opinion piece
in the house style, and commits it to the site repo.
"""

import argparse
import os
import re
import sys
import json
import subprocess
from datetime import datetime, date
from pathlib import Path

import httpx
import feedparser
from dotenv import load_dotenv
from anthropic import Anthropic

# Paths
BOT_DIR = Path(__file__).parent
REPO_DIR = BOT_DIR.parent
CONTENT_DIR = REPO_DIR / "src" / "content" / "thoughts"
HISTORY_FILE = BOT_DIR / "thoughts_history.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"

# Same RSS feeds as the digest bot (used for inspiration, not summarising)
FEEDS = [
    "https://www.marktechpost.com/feed/",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://buttondown.com/ainews/rss",
    "https://the-decoder.com/feed/",
    "https://www.artificialintelligence-news.com/feed/",
]

load_dotenv(BOT_DIR / ".env")


def load_history() -> dict:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"thoughts": []}


def save_history(history: dict):
    HISTORY_FILE.write_text(json.dumps(history, indent=2))


def fetch_feed_entries() -> list[dict]:
    """Pull recent entries from all feeds for topic inspiration."""
    entries = []
    for url in FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                entries.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "summary": entry.get("summary", "")[:500],
                    "source": feed.feed.get("title", url),
                })
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
    return entries


def slugify(title: str) -> str:
    """Turn a title into a URL-friendly slug."""
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return slug[:60]


def generate_thought(entries: list[dict], history: dict) -> str | None:
    """Use Claude to write an original opinion piece inspired by current AI news."""
    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text()

    if len(entries) < 5:
        print("Not enough feed entries for inspiration.")
        return None

    # Build list of past titles so Claude avoids repeating topics
    past_titles = [t.get("title", "") for t in history.get("thoughts", [])]
    past_titles_text = "\n".join(f"- {t}" for t in past_titles[-30:]) or "None yet."

    feed_text = "\n\n".join(
        f"**{e['title']}**\nSource: {e['source']}\n{e['summary']}"
        for e in entries[:30]
    )

    target_date = os.environ.get("THOUGHT_DATE", date.today().isoformat())

    prompt = f"""You are writing an opinion piece for SOFT CAT .ai. Use the AI news feed below as INSPIRATION for a topic, but do NOT summarise individual stories. Write an original take on an AI theme or trend.

## House style (follow this exactly):
{style_guide}

## Feed entries (for inspiration only, do not summarise these):
{feed_text}

## Previously covered topics (do NOT repeat these):
{past_titles_text}

## Output format:
Return ONLY a markdown file with YAML frontmatter. No extra commentary.

```
---
title: "[Short punchy opinionated title]"
date: {target_date}
tags: [2-4 lowercase hyphenated tags]
summary: "One punchy sentence that captures the take."
draft: false
pinned: false
---

Opening paragraph. 2-3 sentences. State your take directly.

## [Section heading]

2-4 sentences expanding on the point.

## [Section heading]

2-4 sentences with another angle or the "but" / counterpoint.

Optional closing line.
```

Rules:
- Use British English throughout ("optimising" not "optimizing", "centre" not "center", "analyse" not "analyze")
- Pick ONE theme and have a strong opinion about it
- Write like you're talking to a mate who works in tech
- No em dashes anywhere
- No links to sources (this is an opinion piece, not a digest)
- 200-400 words total
- Title should be a statement or hot take, not a question
- 2-3 sections with H2 headings
- Do NOT start the title with "AI" every time. Mix it up.
- This is NOT a news summary. It's a thought piece with a clear point of view."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    # Strip code fences if present
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:])
        if content.endswith("```"):
            content = content[:-3].strip()

    return content


def extract_title(content: str) -> str:
    """Pull the title from the YAML frontmatter."""
    match = re.search(r'^title:\s*["\'](.+?)["\']', content, re.MULTILINE)
    return match.group(1) if match else "untitled"


def save_and_push(content: str, history: dict, *, push: bool = True):
    """Save the thought, update history, commit and optionally push."""
    title = extract_title(content)
    slug_date = os.environ.get("THOUGHT_DATE", date.today().isoformat())
    slug = slugify(title)
    filename = f"{slug_date}-{slug}.md"

    output_path = CONTENT_DIR / filename
    output_path.write_text(content + "\n")
    print(f"Written: {output_path}")

    # Track what we've written
    history.setdefault("thoughts", []).append({
        "date": slug_date,
        "file": filename,
        "title": title,
    })
    save_history(history)

    # Commit and push
    os.chdir(REPO_DIR)
    subprocess.run(["git", "add", f"src/content/thoughts/{filename}", "bot/thoughts_history.json"], check=True)
    msg = f"bot: add thought ({slug_date})"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    if push:
        subprocess.run(["git", "push"], check=True)
        print(f"Pushed: {msg}")
    else:
        print(f"Committed (no push): {msg}")


def ping_healthcheck(status="success"):
    """Ping Healthchecks.io to report bot status."""
    url = os.environ.get("HC_PING_THOUGHTS")
    if not url:
        return
    try:
        suffix = "/fail" if status == "fail" else ""
        httpx.get(f"{url}{suffix}", timeout=10)
    except Exception as e:
        print(f"Healthcheck ping failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="SOFT CAT AI Thoughts bot")
    parser.add_argument("--date", help="Override date (YYYY-MM-DD) for backfilling")
    parser.add_argument("--no-push", action="store_true", help="Commit but don't push")
    args = parser.parse_args()

    if args.date:
        os.environ["THOUGHT_DATE"] = args.date

    print(f"[{datetime.now().isoformat()}] AI Thoughts bot starting")

    try:
        history = load_history()

        print("Fetching feeds for inspiration...")
        entries = fetch_feed_entries()
        print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

        if not entries:
            print("No entries found. Exiting.")
            ping_healthcheck()
            sys.exit(0)

        print("Generating thought piece...")
        content = generate_thought(entries, history)

        if not content:
            print("Nothing to publish. Exiting.")
            ping_healthcheck()
            sys.exit(0)

        print("Saving and pushing...")
        save_and_push(content, history, push=not args.no_push)

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
