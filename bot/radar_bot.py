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
import time
from datetime import datetime, date
from pathlib import Path

import httpx
import feedparser
from dotenv import load_dotenv
from anthropic import Anthropic

from pipeline_log import log_run as _log_run

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

# HackerNews Algolia API search terms
HN_SEARCH_TERMS = [
    "AI agent",
    "autonomous agent",
    "LLM agent",
    "agent framework",
    "AI automation",
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


def fetch_hn_entries() -> list[dict]:
    """Pull recent AI stories from HackerNews via Algolia API."""
    since = int(time.time()) - 86400  # last 24 hours
    seen_ids = set()
    hits = []

    for term in HN_SEARCH_TERMS:
        try:
            resp = httpx.get(
                "https://hn.algolia.com/api/v1/search",
                params={
                    "query": term,
                    "tags": "story",
                    "numericFilters": f"created_at_i>{since}",
                    "hitsPerPage": 20,
                },
                timeout=15,
            )
            resp.raise_for_status()
            for hit in resp.json().get("hits", []):
                oid = hit.get("objectID")
                if oid and oid not in seen_ids:
                    seen_ids.add(oid)
                    hits.append(hit)
        except Exception as e:
            print(f"HN search failed for '{term}': {e}")

    # Rank by engagement and take top 10
    hits.sort(key=lambda h: (h.get("points", 0) + h.get("num_comments", 0)), reverse=True)
    entries = []
    for h in hits[:10]:
        entries.append({
            "title": h.get("title", ""),
            "link": h.get("url") or f"https://news.ycombinator.com/item?id={h['objectID']}",
            "summary": h.get("title", ""),
            "source": "HackerNews",
            "published": h.get("created_at", ""),
            "hn_url": f"https://news.ycombinator.com/item?id={h['objectID']}",
            "points": h.get("points", 0),
            "comments": h.get("num_comments", 0),
        })
    return entries


def get_past_product_names(history: dict) -> list[str]:
    """Collect all previously featured product names for deduplication."""
    names = []
    for scan in history.get("scans", []):
        names.extend(scan.get("products", []))
    return names


def generate_radar(entries: list[dict], hn_entries: list[dict], history: dict) -> dict | None:
    """Use Claude to extract product launches and generate radar JSON."""
    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text()

    past_names = get_past_product_names(history)
    past_names_text = ", ".join(past_names[-50:]) if past_names else "None yet"

    feed_text = "\n\n".join(
        f"**{e['title']}**\nSource: {e['source']}\nLink: {e['link']}\nPublished: {e['published']}\n{e['summary']}"
        for e in entries[:40]
    )

    hn_text = "\n\n".join(
        f"**{e['title']}** ({e['points']} pts, {e['comments']} comments)\nHN: {e['hn_url']}\nLink: {e['link']}"
        for e in hn_entries[:10]
    ) if hn_entries else "No HN stories found."

    today = date.today().isoformat()

    prompt = f"""You are curating "The Radar" for SOFT CAT .ai. Your job is to find genuine AI product and tool LAUNCHES from the feeds below. Not news articles. Not opinion pieces. Not funding announcements. Actual products or tools that someone can go and use or try.

## House style (follow this exactly):
{style_guide}

## Products already covered (do NOT repeat these):
{past_names_text}

## RSS feed entries:
{feed_text}

## HackerNews top AI stories (last 24h):
{hn_text}

## Your task:
1. Extract any genuine product or tool launches from ALL sources above (RSS feeds AND HackerNews)
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
  ],
  "hn_top5": [
    {{
      "title": "Story title",
      "points": 123,
      "comments": 45,
      "summary": "2-3 sentence summary. What is it, why it matters.",
      "hn_url": "https://news.ycombinator.com/item?id=..."
    }}
  ],
  "discord_summary": "A ready-to-post Discord message under 1800 chars. Format below."
}}

## discord_summary format:
The discord_summary field should be a single string, ready to post as-is. Use this layout:

Daily AI Intel - [DATE]

**HackerNews**

1. **[Title]** ([points] pts, [comments] comments)
[2-3 sentence summary.]
<HN URL>

2. ...up to 5 stories...

---

**Radar Picks**

1. **[Product Name]** - [tagline]
[why_radar text]
<URL>

2. ...featured + picks combined, top 3-4...

Keep discord_summary under 1800 characters. Wrap all URLs in angle brackets.

## Rules:
- Use British English throughout
- No em dashes in any text
- No semicolons (except in code)
- Keep why_radar to 2-3 short sentences
- If you find fewer than 2 genuine product launches, still include hn_top5 and discord_summary but set featured and picks to empty arrays
- Do NOT include news articles, opinion pieces, or funding rounds in featured/picks
- Do NOT repeat products from the "already covered" list
- Be selective. Quality over quantity. 2-6 products is the sweet spot."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
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

    # Validate basic structure
    if "featured" not in data and "picks" not in data and "discord_summary" not in data:
        print("Missing expected fields in response.")
        return None

    # Ensure arrays exist even if empty
    data.setdefault("featured", [])
    data.setdefault("picks", [])

    return data, response.usage


def save_and_push(radar_data: dict, history: dict):
    """Save radar JSON, update manifest, commit and push."""
    os.chdir(REPO_DIR)
    # Stash any dirty files (e.g. runs.json from other bots) so rebase can proceed
    stash_result = subprocess.run(["git", "stash", "--include-untracked"], capture_output=True, text=True)
    stashed = "No local changes" not in stash_result.stdout
    subprocess.run(["git", "pull", "--rebase"], check=True)
    if stashed:
        subprocess.run(["git", "stash", "pop"], check=True)

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
    subprocess.run([
        "git", "add",
        f"src/data/radar/{filename}",
        "src/data/radar/index.json",
        "bot/radar_history.json",
        "src/data/pipeline/runs.json",
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


def post_to_discord(radar_data: dict):
    """Post the daily summary to Discord via webhook."""
    webhook_url = os.environ.get("DISCORD_WEBHOOK_RADAR")
    if not webhook_url:
        print("No DISCORD_WEBHOOK_RADAR set, skipping Discord post.")
        return

    summary = radar_data.get("discord_summary", "")
    if not summary:
        print("No discord_summary in radar data, skipping Discord post.")
        return

    try:
        resp = httpx.post(
            webhook_url,
            json={"content": summary, "username": "SOFT CAT Radar"},
            timeout=15,
        )
        resp.raise_for_status()
        print("Discord summary posted.")
    except Exception as e:
        print(f"Discord post failed: {e}")


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
    t0 = time.time()

    try:
        history = load_history()

        print("Fetching feeds...")
        entries = fetch_feed_entries()
        print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

        print("Fetching HackerNews...")
        hn_entries = fetch_hn_entries()
        print(f"Found {len(hn_entries)} HN stories")

        total_found = len(entries) + len(hn_entries)

        if not entries and not hn_entries:
            print("No entries found — writing empty state.")
            empty_data = {"date": date.today().isoformat(), "featured": [], "picks": []}
            save_and_push(empty_data, history)
            _log_run("radar_bot", status="success", duration_s=time.time() - t0,
                     feeds_scanned=len(FEEDS) + len(HN_SEARCH_TERMS),
                     items_found=0, items_published=0)
            ping_healthcheck()
            sys.exit(0)

        print("Generating radar...")
        result = generate_radar(entries, hn_entries, history)

        if not result:
            print("Claude returned 0 picks — writing empty state.")
            empty_data = {"date": date.today().isoformat(), "featured": [], "picks": []}
            save_and_push(empty_data, history)
            _log_run("radar_bot", status="success", duration_s=time.time() - t0,
                     feeds_scanned=len(FEEDS) + len(HN_SEARCH_TERMS),
                     items_found=total_found, items_published=0,
                     model="claude-sonnet-4-20250514")
            ping_healthcheck()
            sys.exit(0)

        radar_data, usage = result
        cost = (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000
        published = len(radar_data.get("featured", [])) + len(radar_data.get("picks", []))
        rejected = total_found - published

        # Post to Discord before stripping extra fields
        print("Posting to Discord...")
        post_to_discord(radar_data)

        # Strip Discord-only fields before saving to site JSON
        site_data = {
            "date": radar_data["date"],
            "featured": radar_data.get("featured", []),
            "picks": radar_data.get("picks", []),
            "hn_top5": radar_data.get("hn_top5", []),
        }

        print("Saving and pushing...")
        save_and_push(site_data, history)

        today = date.today().isoformat()
        _log_run("radar_bot", status="success", duration_s=time.time() - t0,
                 feeds_scanned=len(FEEDS) + len(HN_SEARCH_TERMS),
                 items_found=total_found, items_rejected=rejected, items_published=published,
                 model="claude-sonnet-4-20250514", cost_usd=cost,
                 input_tokens=usage.input_tokens, output_tokens=usage.output_tokens,
                 output_files=[f"src/data/radar/{today}.json"])

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        _log_run("radar_bot", status="error", duration_s=time.time() - t0,
                 error_msg=str(e))
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
