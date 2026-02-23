#!/usr/bin/env python3
"""
SOFT CAT content bot: AI News Digest

Pulls AI news from RSS feeds, picks the most interesting stories,
generates an opinionated digest in the house style, and commits it to the site repo.
"""

import os
import sys
import json
import subprocess
from datetime import datetime, date
from pathlib import Path

import feedparser
from dotenv import load_dotenv
from anthropic import Anthropic

# Paths
BOT_DIR = Path(__file__).parent
REPO_DIR = BOT_DIR.parent
CONTENT_DIR = REPO_DIR / "src" / "content" / "workshop-log"
HISTORY_FILE = BOT_DIR / "digest_history.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"

# RSS feeds for AI news
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
    return {"digests": []}


def save_history(history: dict):
    HISTORY_FILE.write_text(json.dumps(history, indent=2))


def fetch_feed_entries() -> list[dict]:
    """Pull recent entries from all feeds."""
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
                    "published": entry.get("published", ""),
                })
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
    return entries


def generate_digest(entries: list[dict], history: dict) -> str | None:
    """Use Claude to write an opinionated digest of the week's AI news."""
    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text()

    # Skip links we've already covered
    past_links = set()
    for d in history.get("digests", []):
        past_links.update(d.get("links", []))

    fresh = [e for e in entries if e["link"] not in past_links]

    if len(fresh) < 3:
        print("Not enough fresh stories for a digest.")
        return None

    feed_text = "\n\n".join(
        f"**{e['title']}**\nSource: {e['source']}\nLink: {e['link']}\nPublished: {e['published']}\n{e['summary']}"
        for e in fresh[:30]
    )

    today = date.today().isoformat()

    prompt = f"""You are writing a weekly AI news digest for SOFT CAT .ai, an AI workshop site. Pick the 3-5 most interesting or important stories from the feed below and write a digest post.

## House style (follow this exactly):
{style_guide}

## Feed entries:
{feed_text}

## Output format:
Return ONLY a markdown file with YAML frontmatter. No extra commentary.

```
---
title: "AI digest: [short punchy theme of the week]"
date: {today}
tags: [ai-news, digest]
summary: "One sentence overview of what's in this digest."
draft: false
---

Brief 1-2 sentence intro.

## [Story 1 headline]

2-3 sentences on what happened and why it matters. Include your take. Link to the source.

## [Story 2 headline]

Same format.

## [Story 3 headline]

Same format.

(etc, 3-5 stories)
```

Rules:
- Pick stories that actually matter, not fluff
- Have an opinion. "This is interesting because..." or "Not sure this changes much because..."
- No em dashes anywhere
- Write like a person talking to a mate who's into tech, not a journalist
- Each story section should be 2-4 sentences max
- Include the source link naturally in the text (as a markdown link)
- Keep the whole thing under 400 words"""

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


def save_and_push(content: str, entries: list[dict], history: dict):
    """Save the digest, update history, commit and push."""
    slug_date = date.today().strftime("%Y-%m-%d")
    filename = f"{slug_date}-ai-digest.md"

    output_path = CONTENT_DIR / filename
    output_path.write_text(content + "\n")
    print(f"Written: {output_path}")

    # Track which links we used
    links = [e["link"] for e in entries[:30]]
    history.setdefault("digests", []).append({
        "date": date.today().isoformat(),
        "file": filename,
        "links": links,
    })
    save_history(history)

    # Commit and push
    os.chdir(REPO_DIR)
    subprocess.run(["git", "add", f"src/content/workshop-log/{filename}", "bot/digest_history.json"], check=True)
    msg = f"bot: add AI news digest ({slug_date})"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    subprocess.run(["git", "push"], check=True)
    print(f"Pushed: {msg}")


def main():
    print(f"[{datetime.now().isoformat()}] AI News Digest bot starting")

    history = load_history()

    print("Fetching feeds...")
    entries = fetch_feed_entries()
    print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

    if not entries:
        print("No entries found. Exiting.")
        sys.exit(0)

    print("Generating digest...")
    content = generate_digest(entries, history)

    if not content:
        print("Nothing to publish. Exiting.")
        sys.exit(0)

    print("Saving and pushing...")
    save_and_push(content, entries, history)

    print("Done.")


if __name__ == "__main__":
    main()
