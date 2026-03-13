#!/usr/bin/env python3
"""
SOFT CAT content bot: Prompt Library

Reads AI news feeds for inspiration on what developers need prompts for,
generates 2 new copy-ready prompts, and commits them to the site repo.
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

# Paths
BOT_DIR = Path(__file__).parent
REPO_DIR = BOT_DIR.parent
CONTENT_DIR = REPO_DIR / "src" / "content" / "prompts"
HISTORY_FILE = BOT_DIR / "prompt_history.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"

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
    return prompts


def slugify(title: str) -> str:
    """Turn a title into a URL-friendly slug."""
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return slug[:60]


def generate_prompts(entries: list[dict], history: dict) -> list[str] | None:
    """Use Claude to generate 2 new prompts for the library."""
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

    prompt = f"""You are creating copy-ready prompts for the SOFT CAT .ai Prompt Library. These are reusable prompt templates that developers can copy and paste into any AI model.

## House style (follow this exactly):
{style_guide}

## Current prompts already in the library (do NOT duplicate these):
{existing_text}

## Previously generated prompts (do NOT repeat):
{past_text}

## Current AI news (use for inspiration on what developers need right now):
{feed_text}

## Your task:
Generate EXACTLY 2 new prompts. Each must be a complete markdown file.

Target categories that are NOT yet covered: testing, api-design, git-workflows, architecture, security, documentation, data-analysis, devops, prompt-engineering, agent-design, migration, monitoring, interviewing, accessibility.

Pick categories that feel relevant to current AI trends in the news above.

## Output format:
Return EXACTLY 2 prompt files separated by the delimiter `---SPLIT---` on its own line.
Each file must follow this exact format:

```
---
title: "Short Descriptive Title"
description: "One sentence explaining what this prompt does."
category: "lowercase-hyphenated-category"
tags: [tag1, tag2, tag3]
prompt: |
  The actual prompt text here.
  Use markdown formatting within the prompt.
  Include placeholder text like [paste code here] where the user inserts their content.
  Make the prompt specific and actionable.
draft: false
---

One short paragraph (2-3 sentences) explaining when and how to use this prompt. Mention it works with Claude, GPT-4, and Gemini.
```

Rules:
- Use British English ("optimising", "analyse", "colour")
- Each prompt should be genuinely useful, not generic filler
- The `prompt` field is the actual text users will copy. Make it detailed and structured.
- The body after the frontmatter is a short usage note (2-3 sentences)
- No em dashes
- No corporate buzzwords ("leveraging", "robust", "comprehensive")
- Prompts should be model-agnostic (work with any LLM)
- Category must be lowercase and hyphenated
- Tags must be lowercase and hyphenated"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    # Store usage for pipeline logging
    generate_prompts._last_usage = response.usage

    content = response.content[0].text.strip()

    # Strip outer code fences if present
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:])
        if content.endswith("```"):
            content = content[:-3].strip()

    # Split into 2 prompts
    parts = content.split("---SPLIT---")
    parts = [p.strip() for p in parts if p.strip()]

    if len(parts) < 2:
        print(f"Expected 2 prompts, got {len(parts)}. Using what we have.")

    return parts[:2] if parts else None


def extract_title(content: str) -> str:
    """Pull the title from the YAML frontmatter."""
    match = re.search(r'^title:\s*["\'](.+?)["\']', content, re.MULTILINE)
    return match.group(1) if match else "untitled"


def extract_category(content: str) -> str:
    """Pull the category from the YAML frontmatter."""
    match = re.search(r'^category:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    return match.group(1) if match else "general"


def normalise_frontmatter(content: str) -> str:
    """Ensure content has valid YAML frontmatter delimiters."""
    content = content.strip()
    # If the file doesn't start with ---, add it
    if not content.startswith("---"):
        content = "---\n" + content
    # Ensure there's a closing --- after the frontmatter
    parts = content.split("---", 2)  # ['', frontmatter, body_or_more]
    if len(parts) >= 3:
        return content  # Already has opening and closing ---
    # Only one --- found (the opening one); find where frontmatter ends
    # Look for the first line that isn't YAML-like after ---
    lines = content.split("\n")
    in_yaml = False
    for i, line in enumerate(lines):
        if line.strip() == "---" and not in_yaml:
            in_yaml = True
            continue
        if in_yaml and line.strip() == "---":
            return content  # Already properly delimited
    # No closing --- found; shouldn't happen with valid prompts but be safe
    return content


def save_and_push(prompts: list[str], history: dict, *, push: bool = True):
    """Save prompts, update history, commit and optionally push."""
    files_created = []

    for content in prompts:
        content = normalise_frontmatter(content)
        title = extract_title(content)
        category = extract_category(content)
        slug = slugify(title)
        filename = f"{slug}.md"

        # Avoid overwriting existing files
        output_path = CONTENT_DIR / filename
        if output_path.exists():
            filename = f"{slug}-2.md"
            output_path = CONTENT_DIR / filename

        output_path.write_text(content + "\n")
        print(f"Written: {output_path}")
        files_created.append(f"src/content/prompts/{filename}")

        history.setdefault("prompts", []).append({
            "date": datetime.now().strftime("%Y-%m-%d"),
            "file": filename,
            "title": title,
            "category": category,
        })

    save_history(history)

    # Commit and push
    os.chdir(REPO_DIR)
    git_add = files_created + ["bot/prompt_history.json", "src/data/pipeline/runs.json"]
    subprocess.run(["git", "add"] + git_add, check=True)
    msg = f"bot: add {len(prompts)} prompt(s) to library"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    if push:
        subprocess.run(["git", "push"], check=True)
        print(f"Pushed: {msg}")
    else:
        print(f"Committed (no push): {msg}")


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

        print(f"Generated {len(prompts)} prompt(s). Saving...")
        save_and_push(prompts, history, push=not args.no_push)

        log_run("prompt_bot", status="success", duration_s=_time.time() - t0,
                feeds_scanned=len(FEEDS), items_found=len(entries),
                items_published=len(prompts),
                model="claude-sonnet-4-20250514", cost_usd=cost,
                input_tokens=in_tok, output_tokens=out_tok)

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
