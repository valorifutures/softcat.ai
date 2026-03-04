#!/usr/bin/env python3
"""
SOFT CAT content bot: The Radar

Pulls AI news from RSS feeds, extracts genuine product and tool launches,
generates editorial JSON data for the /radar page, and commits to the site repo.
"""

import os
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
RADAR_DIR = REPO_DIR / "src" / "data" / "radar"
MANIFEST_FILE = RADAR_DIR / "index.json"
HISTORY_FILE = BOT_DIR / "radar_history.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"

# RSS feeds for AI news (same sources as digest bot)
FEEDS = [
    "https://www.marktechpost.com/feed/",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://buttondown.com/ainews/rss",
    "https://the-decoder.com/feed/",
    "https://www.artificialintelligence-news.com/feed/",
]

# Valid categories for radar products
CATEGORIES = [
    "AI Agents", "Developer Tools", "AI Coding", "AI Security",
    "AI Infrastructure", "AI Platforms", "Design Tools", "AI Writing",
    "Data Tools", "AI Research",
]

# Rolling archive depth
MAX_ARCHIVE_DAYS = 30

load_dotenv(BOT_DIR / ".env")


def load_history() -> dict:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"scans": []}


def save_history(history: dict):
    HISTORY_FILE.write_text(json.dumps(history, indent=2) + "\n")


def load_manifest() -> dict:
    if MANIFEST_FILE.exists():
        return json.loads(MANIFEST_FILE.read_text())
    return {"latest": "", "dates": []}


def save_manifest(manifest: dict):
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2) + "\n")


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


def get_past_product_names(history: dict) -> list[str]:
    """Collect all previously featured product names for deduplication."""
    names = []
    for scan in history.get("scans", []):
        names.extend(scan.get("products", []))
    return names


def generate_radar(entries: list[dict], history: dict) -> dict | None:
    """Use Claude to extract product launches and generate radar JSON."""
    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text()

    past_names = get_past_product_names(history)
    past_names_text = ", ".join(past_names[-50:]) if past_names else "None yet"

    feed_text = "\n\n".join(
        f"**{e['title']}**\nSource: {e['source']}\nLink: {e['link']}\nPublished: {e['published']}\n{e['summary']}"
        for e in entries[:40]
    )

    today = date.today().isoformat()

    prompt = f"""You are curating "The Radar" for SOFT CAT .ai. Your job is to find genuine AI product and tool LAUNCHES from the feed below. Not news articles. Not opinion pieces. Not funding announcements. Actual products or tools that someone can go and use or try.

## House style (follow this exactly):
{style_guide}

## Products already covered (do NOT repeat these):
{past_names_text}

## Feed entries:
{feed_text}

## Your task:
1. Extract any genuine product or tool launches from the entries above
2. For each product, write a "why_radar" editorial note (2-3 sentences, opinionated, in the SOFT CAT voice)
3. Pick the top 2-3 most interesting as "featured", the rest as "picks"
4. Categorise each into one of: {', '.join(CATEGORIES)}

## Output format:
Return ONLY valid JSON. No markdown fences. No commentary. Match this schema exactly:

{{
  "date": "{today}",
  "featured": [
    {{
      "id": "ph-[short-slug]",
      "name": "Product Name",
      "tagline": "One line description.",
      "logo_url": "",
      "category": "One of the categories above",
      "why_radar": "2-3 sentence editorial in SOFT CAT voice. Why this matters. Your take.",
      "ph_url": "URL to the product page or source article",
      "maker": "Company or maker name",
      "featured": true,
      "added_at": "{today}T06:00:00Z"
    }}
  ],
  "picks": [
    {{
      "id": "ph-[short-slug]",
      "name": "Product Name",
      "tagline": "One line description.",
      "logo_url": "",
      "category": "One of the categories above",
      "why_radar": "2-3 sentence editorial in SOFT CAT voice.",
      "ph_url": "URL to the product page or source article",
      "maker": "Company or maker name",
      "featured": false,
      "added_at": "{today}T06:30:00Z"
    }}
  ]
}}

Rules:
- Use British English throughout
- No em dashes in why_radar text
- Keep why_radar to 2-3 short sentences
- If you find fewer than 2 genuine product launches, return exactly: {{"skip": true}}
- Do NOT include news articles, opinion pieces, or funding rounds
- Do NOT repeat products from the "already covered" list
- Be selective. Quality over quantity. 2-6 products is the sweet spot."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    # Strip code fences if Claude wraps it
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:])
        if content.endswith("```"):
            content = content[:-3].strip()

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from Claude: {e}")
        print(f"Raw output: {content[:500]}")
        return None

    # Check if Claude said skip
    if data.get("skip"):
        print("Claude found fewer than 2 product launches. Skipping.")
        return None

    # Validate basic structure
    if "featured" not in data or "picks" not in data:
        print("Missing featured or picks in response.")
        return None

    total = len(data.get("featured", [])) + len(data.get("picks", []))
    if total < 2:
        print(f"Only {total} products found. Skipping.")
        return None

    return data


def save_and_push(radar_data: dict, history: dict):
    """Save radar JSON, update manifest, commit and push."""
    today = date.today().isoformat()
    filename = f"{today}.json"

    # Write the daily radar file
    output_path = RADAR_DIR / filename
    output_path.write_text(json.dumps(radar_data, indent=2) + "\n")
    print(f"Written: {output_path}")

    # Update manifest
    manifest = load_manifest()
    manifest["latest"] = today
    if today not in manifest["dates"]:
        manifest["dates"].insert(0, today)
    # Cap at rolling archive depth
    manifest["dates"] = manifest["dates"][:MAX_ARCHIVE_DAYS]
    save_manifest(manifest)
    print(f"Manifest updated: {len(manifest['dates'])} dates")

    # Update history
    product_names = [p["name"] for p in radar_data.get("featured", [])]
    product_names += [p["name"] for p in radar_data.get("picks", [])]
    history.setdefault("scans", []).append({
        "date": today,
        "file": filename,
        "products": product_names,
    })
    save_history(history)

    # Git commit and push
    os.chdir(REPO_DIR)
    subprocess.run(["git", "pull", "--rebase"], check=True)
    subprocess.run([
        "git", "add",
        f"src/data/radar/{filename}",
        "src/data/radar/index.json",
        "bot/radar_history.json",
    ], check=True)

    # Only commit if there are staged changes
    result = subprocess.run(["git", "diff", "--cached", "--quiet"])
    if result.returncode == 0:
        print("No changes to commit.")
        return

    msg = f"bot: add radar data ({today})"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    subprocess.run(["git", "push"], check=True)
    print(f"Pushed: {msg}")


def ping_healthcheck(status="success"):
    """Ping Healthchecks.io to report bot status."""
    url = os.environ.get("HC_PING_RADAR")
    if not url:
        return
    try:
        suffix = "/fail" if status == "fail" else ""
        httpx.get(f"{url}{suffix}", timeout=10)
    except Exception as e:
        print(f"Healthcheck ping failed: {e}")


def main():
    print(f"[{datetime.now().isoformat()}] Radar bot starting")

    try:
        history = load_history()

        print("Fetching feeds...")
        entries = fetch_feed_entries()
        print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

        if not entries:
            print("No entries found. Exiting.")
            ping_healthcheck()
            sys.exit(0)

        print("Generating radar...")
        radar_data = generate_radar(entries, history)

        if not radar_data:
            print("Nothing to publish. Exiting.")
            ping_healthcheck()
            sys.exit(0)

        print("Saving and pushing...")
        save_and_push(radar_data, history)

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
