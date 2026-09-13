#!/usr/bin/env python3
"""
SOFT CAT content bot: Prompt Library

Reads AI news feeds for inspiration on what developers need prompts for,
proposes two unpublished prompt drafts for editorial review.
"""

import argparse
import os
import re
import sys
import json
import subprocess
import time as _time
from datetime import datetime
from pathlib import Path

import httpx
import feedparser
from dotenv import load_dotenv
from anthropic import Anthropic

from pipeline_log import log_run
from prompt_drafts import prepare_prompt_drafts, assert_prompt_draft
import git_safe

# Paths
BOT_DIR = Path(__file__).parent
REPO_DIR = BOT_DIR.parent
CONTENT_DIR = REPO_DIR / "src" / "content" / "prompts"
HISTORY_FILE = BOT_DIR / "prompt_history.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"
RETIREMENTS_FILE = REPO_DIR / "src" / "data" / "prompt-retirements.json"

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
    return {"prompts": []}


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


def get_existing_prompts() -> list[str]:
    """Read titles and categories of all existing prompts on disk."""
    prompts = []
    for f in CONTENT_DIR.glob("*.md"):
        text = f.read_text()
        title_match = re.search(r'^title:\s*["\'](.+?)["\']', text, re.MULTILINE)
        cat_match = re.search(r'^category:\s*["\']?(.+?)["\']?\s*$', text, re.MULTILINE)
        if title_match:
            prompts.append(f"{title_match.group(1)} ({cat_match.group(1) if cat_match else 'unknown'})")
    retired = json.loads(RETIREMENTS_FILE.read_text())
    prompts.extend(f"{entry['title']} (retired, do not recreate)" for entry in retired["entries"])
    return prompts


def slugify(title: str) -> str:
    """Turn a title into a URL-friendly slug."""
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return slug[:60]


def generate_prompts(entries: list[dict], history: dict) -> list[str] | None:
    """Propose two unpublished tasks for a later editorial review."""
    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text()

    existing_prompts = get_existing_prompts()
    existing_text = "\n".join(f"- {p}" for p in existing_prompts) or "None yet."

    past_titles = [p.get("title", "") for p in history.get("prompts", [])]
    past_text = "\n".join(f"- {t}" for t in past_titles[-30:]) or "None yet."

    feed_text = "\n\n".join(
        f"**{e['title']}**\nSource: {e['source']}\n{e['summary']}"
        for e in entries[:30]
    )

    prompt = "\n\n".join([
        "Propose exactly two small prompt tasks for editorial review at SOFT CAT .ai.",
        "House style:\n" + style_guide,
        "Current and retired templates. Do not recreate or lightly rename these:\n" + existing_text,
        "Earlier generated titles:\n" + past_text,
        "Feed material for topic inspiration only:\n" + feed_text,
        """Return only a JSON array of exactly two objects. Each object must have
these six fields and no others:
- title: a short descriptive string
- description: one sentence describing the proposed task
- category: a lowercase-hyphenated string
- tags: two to six lowercase-hyphenated strings
- prompt: the complete reusable prompt, with named inputs such as {{source}}
- notes: a short worked example, target result, checks and limitations for the reviewer

These are unpublished proposals, not verified recipes. Do not include draft,
recipe, reviewedAt, generated_by or any other publication metadata.
Choose a bounded task with evidence the visitor can supply and a way to judge
the answer. Distinguish a requested test from a test actually run. Do not
promise validation, security, correctness, model compatibility or measured
savings. Do not invent a score, benchmark, percentage or executed result.
No broad all-purpose validator frameworks. No raw HTML in the notes.
Use British English. Do not wrap the JSON in Markdown fences.""",
    ])

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        messages=[{"role": "user", "content": prompt}],
    )
    # Store usage for pipeline logging
    generate_prompts._last_usage = response.usage

    if response.stop_reason == "max_tokens":
        raise ValueError("Prompt generation was truncated. Refusing to publish.")
    return prepare_prompt_drafts(response.content[0].text)


def extract_title(content: str) -> str:
    """Pull the title from the YAML frontmatter."""
    match = re.search(r'^title:\s*["\'](.+?)["\']', content, re.MULTILINE)
    return match.group(1) if match else "untitled"


def extract_category(content: str) -> str:
    """Pull the category from the YAML frontmatter."""
    match = re.search(r'^category:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    return match.group(1) if match else "general"


def save_and_push(prompts: list[str], history: dict, *, push: bool = True, run_details: dict | None = None):
    """Validate the entire unpublished batch before writing any proposal."""
    metadata = [assert_prompt_draft(content) for content in prompts]
    retired = json.loads(RETIREMENTS_FILE.read_text())["entries"]
    retired_ids = {entry["id"] for entry in retired}
    retired_titles = {entry["title"].casefold() for entry in retired}
    paths, titles, planned = set(), set(), []
    for content, data in zip(prompts, metadata):
        title, category = data["title"], data["category"]
        slug = slugify(title)
        filename = f"{slug}.md"
        path = CONTENT_DIR / filename
        if not slug or slug in retired_ids or title.casefold() in retired_titles:
            raise ValueError("A retired prompt cannot be recreated by the draft writer")
        if path.exists() or filename in paths or title.casefold() in titles:
            raise ValueError("Prompt proposal duplicates an existing path or batch title")
        paths.add(filename)
        titles.add(title.casefold())
        planned.append((content, path, title, category))

    files_created, additions = [], []
    try:
        for content, output_path, title, category in planned:
            with output_path.open("x", encoding="utf-8") as output_file:
                # Own the path only after exclusive creation succeeds. A write
                # failure must remove our partial file, never a competing file.
                files_created.append(f"src/content/prompts/{output_path.name}")
                output_file.write(content + "\n")
            print(f"Draft written: {output_path}")
            additions.append({
                "date": datetime.now().strftime("%Y-%m-%d"),
                "file": output_path.name,
                "title": title,
                "category": category,
                "status": "draft",
            })

        # Validate actual YAML with Astro's parser before history or git.
        subprocess.run(["node", "scripts/validate-content.mjs"], cwd=REPO_DIR, check=True)
    except (subprocess.CalledProcessError, OSError):
        for filename in files_created:
            (REPO_DIR / filename).unlink(missing_ok=True)
        raise
    if run_details is not None:
        log_run("prompt_bot", status="success", items_published=0,
                items_drafted=len(files_created), output_files=files_created, **run_details)
    history.setdefault("prompts", []).extend(additions)
    save_history(history)

    # Commit and push (serialized + health-checked via git_safe)
    git_add = files_created + ["bot/prompt_history.json", "src/data/pipeline/runs.json"]
    msg = f"bot: propose {len(prompts)} unpublished prompt draft(s)"
    git_safe.safe_commit_and_push(git_add, msg, push=push)


def ping_healthcheck(status="success"):
    """Ping Healthchecks.io to report bot status."""
    url = os.environ.get("HC_PING_PROMPTS")
    if not url:
        return
    try:
        suffix = "/fail" if status == "fail" else ""
        httpx.get(f"{url}{suffix}", timeout=10)
    except Exception as e:
        print(f"Healthcheck ping failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="SOFT CAT Prompt Library bot")
    parser.add_argument("--no-push", action="store_true", help="Commit but don't push")
    args = parser.parse_args()

    print(f"[{datetime.now().isoformat()}] Prompt Library bot starting")
    t0 = _time.time()

    try:
        history = load_history()

        print("Fetching feeds for inspiration...")
        entries = fetch_feed_entries()
        print(f"Found {len(entries)} entries across {len(FEEDS)} feeds")

        if not entries:
            print("No entries found. Exiting.")
            log_run("prompt_bot", status="success", duration_s=_time.time() - t0,
                    feeds_scanned=len(FEEDS), items_found=0, items_published=0)
            ping_healthcheck()
            sys.exit(0)

        print("Reading existing prompts...")
        existing = get_existing_prompts()
        print(f"Found {len(existing)} existing prompts")

        print("Generating new prompts...")
        prompts = generate_prompts(entries, history)

        if not prompts:
            print("Nothing to publish. Exiting.")
            log_run("prompt_bot", status="success", duration_s=_time.time() - t0,
                    feeds_scanned=len(FEEDS), items_found=len(entries), items_published=0)
            ping_healthcheck()
            sys.exit(0)

        usage = getattr(generate_prompts, "_last_usage", None)
        cost = None
        in_tok = out_tok = 0
        if usage:
            cost = (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000
            in_tok, out_tok = usage.input_tokens, usage.output_tokens

        # The writer logs only after all draft files pass validation, before
        # the same atomic commit. No generated proposal counts as published.
        run_details = dict(duration_s=_time.time() - t0,
                           feeds_scanned=len(FEEDS), items_found=len(entries),
                           model="claude-sonnet-4-6", cost_usd=cost,
                           input_tokens=in_tok, output_tokens=out_tok)

        print(f"Generated {len(prompts)} prompt(s). Saving...")
        save_and_push(prompts, history, push=not args.no_push, run_details=run_details)

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        log_run("prompt_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e))
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
