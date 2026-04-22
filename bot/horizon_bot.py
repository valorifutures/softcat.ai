#!/usr/bin/env python3
"""
SOFT CAT horizon bot.

Three jobs, in order:
  1. NOW proposals: read today's radar + news + thoughts, propose new Now-lane
     entries to a staging file OUTSIDE the repo. Bot never writes to now.json
     directly in v1 — Valori reviews, Valori lands.
  2. NEXT confidence shifts: FLAG-ONLY in v1. Count recent evidence per theme,
     mark any Next entry whose themes have accumulated >=3 new supporting
     radar/thoughts items since the bot last ran. No auto-shifts.
  3. PAST promotion candidates: scan radar entries older than 60 days, score
     them with a cheap heuristic, surface the top few as "does this deserve
     canonisation?" — again only to the staging file.

Every run also refreshes src/data/horizon/shifts.json from
`git log -- src/data/horizon/` so Step 7 (weekly shift log on the page) has
a stable structured source. This is a committed file; the proposals file is
NOT.

Now proposals are written to now.json on a dated branch and a PR is opened for
review. Valori merges to land. Next flags and Past candidates still go to
~/.softcat-bot-staging/horizon-bot-proposals.json for manual review.
past.json is SINGLE-WRITER (Valori only). debates.json is 100% human-curated.

Issue #96 hard lesson: LLM calls in this bot are grounded ONLY in provided
context. The prompt forbids inventing model names, prices, dates, or company
claims. If the evidence doesn't support an entry, the bot proposes nothing.
Issue #97 hard lesson: `_log_run()` runs BEFORE the git commit so the run-log
entry lands in the same commit as this bot's data changes, not the next bot's.
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx
from anthropic import Anthropic
from dotenv import load_dotenv

from pipeline_log import log_run as _log_run

# Paths
BOT_DIR = Path(__file__).parent
REPO_DIR = BOT_DIR.parent
HORIZON_DIR = REPO_DIR / "src" / "data" / "horizon"
RADAR_DIR = REPO_DIR / "src" / "data" / "radar"
THOUGHTS_DIR = REPO_DIR / "src" / "content" / "thoughts"
NEWS_DIR = REPO_DIR / "src" / "content" / "news-and-updates"
SHIFTS_FILE = HORIZON_DIR / "shifts.json"
STYLE_GUIDE = REPO_DIR / "STYLE.md"

STAGING_DIR = Path.home() / ".softcat-bot-staging"
STAGING_FILE = STAGING_DIR / "horizon-bot-proposals.json"

# Valid themes (must stay in sync with src/content.config.ts HORIZON_THEMES)
HORIZON_THEMES = {
    "models", "agents", "robotics", "interfaces", "search",
    "code", "data", "infrastructure", "chips", "regulation",
    "security", "enterprise", "work", "education", "creativity", "society",
}

# Heuristics
PAST_MIN_AGE_DAYS = 60       # radar entries younger than this are too fresh to canonise
PAST_CANDIDATE_LIMIT = 5     # how many Past candidates to surface per run
NEXT_SHIFT_MIN_EVIDENCE = 3  # supporting items needed to flag a Next entry
SHIFT_LOG_LOOKBACK_DAYS = 90 # how far back shifts.json reaches

# Model + cost accounting (same pattern as radar_bot)
MODEL = "claude-sonnet-4-20250514"
INPUT_COST_PER_MTOK = 3
OUTPUT_COST_PER_MTOK = 15

load_dotenv(BOT_DIR / ".env")


# --------------------------------------------------------------------------- #
# Loaders                                                                     #
# --------------------------------------------------------------------------- #

def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, ValueError):
        return default


def load_lane(name: str) -> list[dict]:
    return _read_json(HORIZON_DIR / f"{name}.json", [])


def load_recent_radar(days: int = 7) -> list[dict]:
    """Every radar entry from the last N days, flattened with source date."""
    today = date.today()
    out = []
    for n in range(days):
        d = (today - timedelta(days=n)).isoformat()
        p = RADAR_DIR / f"{d}.json"
        data = _read_json(p, None)
        if not data:
            continue
        for section in ("featured", "picks"):
            for item in data.get(section, []) or []:
                out.append({**item, "_radar_date": d, "_section": section})
    return out


def load_radar_dates() -> list[str]:
    """All dated radar files present in the archive, sorted oldest first."""
    if not RADAR_DIR.exists():
        return []
    names = [p.stem for p in RADAR_DIR.glob("????-??-??.json")]
    return sorted(names)


def _read_markdown_frontmatter(path: Path) -> dict:
    """Cheap frontmatter parser — avoids pulling in a yaml dep."""
    text = path.read_text()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return {}
    meta = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta


def load_recent_markdown(dir_path: Path, days: int = 7) -> list[dict]:
    """Frontmatter + body slice from recent .md entries in a content dir."""
    if not dir_path.exists():
        return []
    today = date.today()
    out = []
    for p in sorted(dir_path.glob("*.md")):
        meta = _read_markdown_frontmatter(p)
        date_str = meta.get("date", "")
        if not date_str or len(date_str) < 10:
            continue
        try:
            d = date.fromisoformat(date_str[:10])
        except ValueError:
            continue
        if (today - d).days > days:
            continue
        body = p.read_text().split("---", 2)[-1].strip()
        out.append({
            "slug": p.stem,
            "title": meta.get("title", ""),
            "summary": meta.get("summary", ""),
            "date": date_str[:10],
            "body_excerpt": body[:1500],
        })
    return out


# --------------------------------------------------------------------------- #
# Job 1 — Now proposals                                                       #
# --------------------------------------------------------------------------- #

def propose_now_entries(
    radar_items: list[dict],
    thoughts: list[dict],
    news: list[dict],
    existing_now: list[dict],
) -> tuple[list[dict], object | None]:
    """Ask Claude for Now-lane proposals grounded only in provided evidence."""
    if not radar_items and not thoughts and not news:
        return [], None

    client = Anthropic()
    style_guide = STYLE_GUIDE.read_text() if STYLE_GUIDE.exists() else ""
    existing_titles = [e.get("title", "") for e in existing_now]

    radar_text = "\n".join(
        f"- [{r.get('_radar_date')}] {r.get('name','?')}: {r.get('description','')[:200]}"
        for r in radar_items[:60]
    ) or "(none)"
    thoughts_text = "\n".join(
        f"- [{t['date']}] {t['title']}: {t['summary'][:200]}"
        for t in thoughts
    ) or "(none)"
    news_text = "\n".join(
        f"- [{n['date']}] {n['title']}: {n['summary'][:200]}"
        for n in news
    ) or "(none)"
    existing_text = "\n".join(f"- {t}" for t in existing_titles) or "(none yet)"

    today = date.today().isoformat()
    year_month = today[:7]

    prompt = f"""You are proposing new entries for the NOW lane of the SOFT CAT Horizon Map.
The Now lane tracks "what is changing in AI right now". Entries are signals
about the present, not forecasts. Your job is to look across the recent
radar, thoughts, and news entries below and identify EMERGING CROSS-SOURCE
PATTERNS that deserve a Now entry.

## Style guide (follow exactly)
{style_guide}

## Hard rules (non-negotiable)

1. Propose entries ONLY if at least TWO distinct items in the provided context
   support the pattern. No single-source entries.
2. NEVER invent model names, prices, company names, dates, or claims that are
   not in the provided context. If you are unsure, leave it out.
3. Deduplicate against existing Now titles. Don't re-propose what is already live.
4. Output AT MOST 3 proposals. It is valid (and often correct) to output zero.
5. Each proposal must cite its evidence with the exact radar date or
   thought/news slug from the context. The `ref` field is the filename stem
   (e.g. "2026-04-09" for radar, "2026-04-08-slug" for thoughts/news).
6. `themes` must be a subset of: {sorted(HORIZON_THEMES)}.
7. `confidence` is one of: confirmed, emerging, contested, speculative. Default
   to "emerging" unless the pattern is demonstrably well-established (confirmed)
   or the evidence actively disagrees (contested).
8. `signal_type` is one of: event, trend, forecast, debate, inflection, warning.
9. Lead `why_it_matters` with the point, 1-2 short sentences, no em dashes,
   no corporate vocabulary.

## Context

### Recent radar ({len(radar_items)} items)
{radar_text}

### Recent thoughts ({len(thoughts)} items)
{thoughts_text}

### Recent news ({len(news)} items)
{news_text}

### Existing Now titles (do not duplicate)
{existing_text}

## Output

Return a single JSON object:

{{
  "proposals": [
    {{
      "id": "now-{year_month}-<kebab-slug>",
      "title": "...",
      "themes": ["..."],
      "signal_type": "...",
      "confidence": "...",
      "why_it_matters": "...",
      "implication": "1-sentence italic takeaway for the reader. Start with a verb.",
      "evidence": [
        {{"type": "radar|thought|news", "ref": "...", "label": "..."}}
      ],
      "added": "{today}",
      "_rationale": "1-sentence internal note for Valori: why this pattern?"
    }}
  ]
}}

If nothing clears the two-source bar, return {{"proposals": []}}. Do not
apologise, do not explain, just return the JSON.
"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text.strip()
    # Strip code fences if Claude wrapped the JSON
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        print("[horizon_bot] Claude returned non-JSON for Now proposals")
        return [], response.usage

    proposals = parsed.get("proposals", []) or []
    # Filter out proposals using invalid themes (belt-and-braces; the eventual
    # landing step also runs the Zod schema, but cheap to enforce here too).
    clean = []
    for p in proposals:
        themes = p.get("themes", [])
        if not themes or any(t not in HORIZON_THEMES for t in themes):
            continue
        clean.append(p)
    return clean, response.usage


# --------------------------------------------------------------------------- #
# Job 2 — Next confidence shift flags (FLAG-ONLY, no auto-shift)              #
# --------------------------------------------------------------------------- #

def flag_next_shifts(
    next_entries: list[dict],
    radar_items: list[dict],
    thoughts: list[dict],
) -> list[dict]:
    """Flag Next entries whose themes have accumulated fresh supporting
    evidence the entry does not yet reference. No auto-shifts in v1."""
    flags = []
    for entry in next_entries:
        themes = set(entry.get("themes", []))
        if not themes:
            continue
        existing_refs = {
            ev.get("ref", "") for ev in entry.get("evidence", []) or []
        }

        # Count fresh radar items whose themes plausibly overlap. Radar entries
        # don't carry horizon themes natively, so we fall back to a text match
        # against the radar item's name+description. Cheap and deterministic.
        supporting = []
        haystacks = themes | {t.replace("_", " ") for t in themes}
        for r in radar_items:
            text = f"{r.get('name','')} {r.get('description','')}".lower()
            if any(h in text for h in haystacks):
                ref = r.get("_radar_date", "")
                if ref and ref not in existing_refs:
                    supporting.append({"type": "radar", "ref": ref,
                                       "label": r.get("name", "")[:120]})
        for t in thoughts:
            text = f"{t['title']} {t['summary']}".lower()
            if any(h in text for h in haystacks):
                if t["slug"] not in existing_refs:
                    supporting.append({"type": "thought", "ref": t["slug"],
                                       "label": t["title"][:120]})

        if len(supporting) >= NEXT_SHIFT_MIN_EVIDENCE:
            flags.append({
                "id": entry["id"],
                "title": entry.get("title", ""),
                "current_confidence": entry.get("confidence", ""),
                "new_supporting_evidence": supporting[:10],
                "note": (
                    "Flag only: fresh evidence has accumulated. Valori to "
                    "review whether the confidence label still fits or if "
                    "the entry should be updated."
                ),
            })
    return flags


# --------------------------------------------------------------------------- #
# Job 3 — Past promotion candidates                                           #
# --------------------------------------------------------------------------- #

def score_past_candidates(
    past_entries: list[dict],
) -> list[dict]:
    """Surface radar products older than PAST_MIN_AGE_DAYS that aren't yet
    canonised. Scoring is intentionally simple — the human decides."""
    existing_origin_refs = {
        (e.get("origin") or {}).get("ref", "") for e in past_entries
    }

    today = date.today()
    cutoff = today - timedelta(days=PAST_MIN_AGE_DAYS)
    radar_dates = load_radar_dates()
    candidates = []
    for d in radar_dates:
        try:
            day = date.fromisoformat(d)
        except ValueError:
            continue
        if day > cutoff:
            continue  # too recent to canonise
        data = _read_json(RADAR_DIR / f"{d}.json", None)
        if not data:
            continue
        for item in data.get("featured", []) or []:
            name = item.get("name", "")
            if not name:
                continue
            # Skip if this radar day is already the origin for a past entry
            if d in existing_origin_refs:
                continue
            description = item.get("description", "")
            score = 0
            # Featured items get a base score; picks we skip entirely to keep
            # the candidate list lean.
            score += 2
            # Cross-theme breadth heuristic: how many horizon themes appear in
            # the blurb? More coverage => more likely to have mattered.
            hits = sum(1 for t in HORIZON_THEMES if t in description.lower())
            score += hits
            candidates.append({
                "radar_date": d,
                "name": name,
                "description": description[:240],
                "score": score,
                "suggested_origin": {"type": "radar", "ref": d, "promoted_at": today.isoformat()},
            })

    candidates.sort(key=lambda c: (-c["score"], c["radar_date"]))
    return candidates[:PAST_CANDIDATE_LIMIT]


# --------------------------------------------------------------------------- #
# Shifts log (for Step 7)                                                     #
# --------------------------------------------------------------------------- #

def build_shifts_log() -> list[dict]:
    """Parse `git log -- src/data/horizon/` into a structured shift log."""
    os.chdir(REPO_DIR)
    since = (date.today() - timedelta(days=SHIFT_LOG_LOOKBACK_DAYS)).isoformat()
    try:
        out = subprocess.run(
            [
                "git", "log",
                f"--since={since}",
                "--pretty=format:%H|%ai|%s",
                "--name-status",
                "--",
                "src/data/horizon/",
            ],
            capture_output=True, text=True, check=True,
        ).stdout
    except subprocess.CalledProcessError as e:
        print(f"[horizon_bot] git log failed: {e}")
        return []

    shifts = []
    current = None
    for line in out.splitlines():
        if not line.strip():
            current = None
            continue
        if "|" in line and line.count("|") >= 2:
            sha, iso, subject = line.split("|", 2)
            current = {"sha": sha[:10], "date": iso[:10], "subject": subject}
            continue
        if current is None:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status, path = parts[0], parts[1]
        if not path.startswith("src/data/horizon/"):
            continue
        lane = Path(path).stem  # past / now / next / debates / scenarios / shifts
        if lane == "shifts":
            continue  # don't log shifts about the shift log itself
        verb = {"A": "added", "M": "updated", "D": "removed"}.get(status[:1], status)
        shifts.append({
            "date": current["date"],
            "lane": lane,
            "verb": verb,
            "subject": current["subject"],
            "sha": current["sha"],
        })
    return shifts


def write_shifts_log(shifts: list[dict]) -> bool:
    """Write shifts.json only if content changed. Returns True if written."""
    existing = _read_json(SHIFTS_FILE, None)
    if existing == shifts:
        return False
    SHIFTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SHIFTS_FILE.write_text(json.dumps(shifts, indent=2) + "\n")
    return True


# --------------------------------------------------------------------------- #
# Staging + Discord                                                           #
# --------------------------------------------------------------------------- #

def write_staging(now_proposals, next_flags, past_candidates):
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "now_proposals": now_proposals,
        "next_flags": next_flags,
        "past_candidates": past_candidates,
    }
    STAGING_FILE.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"[horizon_bot] Staging written: {STAGING_FILE}")


def post_to_discord(now_n, next_n, past_n, pr_url=None):
    webhook = os.environ.get("DISCORD_WEBHOOK_HORIZON")
    if not webhook:
        return
    if now_n == 0 and next_n == 0 and past_n == 0:
        return  # nothing to say; silence is fine
    content = (
        f"**Horizon bot:** {now_n} Now proposal{'s' if now_n != 1 else ''}, "
        f"{next_n} Next flag{'s' if next_n != 1 else ''}, "
        f"{past_n} Past candidate{'s' if past_n != 1 else ''}."
    )
    if pr_url:
        content += f"\nReview PR: {pr_url}"
    else:
        content += f"\nStaging file: `{STAGING_FILE}`."
    try:
        httpx.post(webhook, json={"content": content,
                                   "username": "SOFT CAT Horizon"}, timeout=15)
    except Exception as e:
        print(f"[horizon_bot] Discord post failed: {e}")


def ping_healthcheck(status="success"):
    url = os.environ.get("HC_PING_HORIZON")
    if not url:
        return
    try:
        suffix = "/fail" if status == "fail" else ""
        httpx.get(f"{url}{suffix}", timeout=10)
    except Exception as e:
        print(f"[horizon_bot] Healthcheck ping failed: {e}")


# --------------------------------------------------------------------------- #
# Commit (only for shifts.json; never for lane JSONs)                         #
# --------------------------------------------------------------------------- #

def commit_shifts(shifts_changed: bool):
    """Commit shifts.json + runs.json if the shift log moved. The proposals
    file is never committed — it lives outside the repo in ~/.softcat-bot-staging/
    """
    if not shifts_changed:
        return
    os.chdir(REPO_DIR)
    stash = subprocess.run(["git", "stash", "--include-untracked"],
                           capture_output=True, text=True)
    stashed = "No local changes" not in stash.stdout
    subprocess.run(["git", "pull", "--rebase"], check=True)
    if stashed:
        subprocess.run(["git", "stash", "pop"], check=True)

    subprocess.run([
        "git", "add",
        "src/data/horizon/shifts.json",
        "src/data/pipeline/runs.json",
    ], check=True)

    result = subprocess.run(["git", "diff", "--cached", "--quiet"])
    if result.returncode == 0:
        print("[horizon_bot] Nothing staged after shift update.")
        return

    today = date.today().isoformat()
    msg = f"bot: refresh horizon shifts ({today})"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    subprocess.run(["git", "push"], check=True)
    print(f"[horizon_bot] Pushed: {msg}")


# --------------------------------------------------------------------------- #
# Proposal PR                                                                 #
# --------------------------------------------------------------------------- #

PROPOSAL_BRANCH_PREFIX = "horizon-bot/proposals-"


def _proposal_to_entry(p: dict) -> dict:
    """Convert a bot proposal dict into a valid Now-lane data entry."""
    entry = {
        "id": p["id"],
        "lane": "now",
        "title": p["title"],
        "date": p["added"],
        "themes": p["themes"],
        "signal_type": p["signal_type"],
        "confidence": p["confidence"],
        "why_it_matters": p["why_it_matters"],
        "implication": p.get("implication", ""),
        "evidence": p.get("evidence", []),
        "added": p["added"],
    }
    return entry


def create_proposal_pr(now_proposals: list[dict]) -> str | None:
    """Write Now proposals into now.json on a branch and open (or update) a PR.

    Returns the PR URL on success, None if nothing to propose.
    """
    if not now_proposals:
        return None

    os.chdir(REPO_DIR)
    today = date.today().isoformat()
    branch = f"{PROPOSAL_BRANCH_PREFIX}{today}"

    # Check for an existing open PR from a previous run today
    existing_pr = None
    try:
        result = subprocess.run(
            ["gh", "pr", "list", "--head", branch, "--state", "open",
             "--json", "number,url", "--limit", "1"],
            capture_output=True, text=True, check=True,
        )
        prs = json.loads(result.stdout)
        if prs:
            existing_pr = prs[0]
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        pass

    # Make sure we're starting from latest main
    subprocess.run(["git", "fetch", "origin", "main"], check=True,
                   capture_output=True)

    # Create or reset the branch from origin/main
    subprocess.run(["git", "checkout", "-B", branch, "origin/main"],
                   check=True, capture_output=True)

    # Load current now.json and append proposals
    now_file = HORIZON_DIR / "now.json"
    current = _read_json(now_file, [])
    existing_ids = {e.get("id") for e in current}

    new_entries = []
    for p in now_proposals:
        if p["id"] not in existing_ids:
            new_entries.append(_proposal_to_entry(p))

    if not new_entries:
        # All proposals already exist, nothing to do
        subprocess.run(["git", "checkout", "main"], capture_output=True)
        return None

    current.extend(new_entries)
    now_file.write_text(json.dumps(current, indent=2) + "\n")

    # Commit and push
    subprocess.run(["git", "add", str(now_file)], check=True)
    titles = ", ".join(e["title"][:50] for e in new_entries)
    msg = f"bot(horizon): propose {len(new_entries)} Now entries\n\n{titles}"
    subprocess.run(["git", "commit", "-m", msg], check=True,
                   capture_output=True)
    subprocess.run(["git", "push", "-u", "origin", branch, "--force"],
                   check=True, capture_output=True)

    pr_url = None
    if existing_pr:
        # PR already exists, force-push updated the branch
        pr_url = existing_pr["url"]
        print(f"[horizon_bot] Updated existing PR: {pr_url}")
    else:
        # Create new PR
        body_lines = ["## Horizon bot proposals\n"]
        for e in new_entries:
            themes = ", ".join(e["themes"])
            evidence_count = len(e.get("evidence", []))
            body_lines.append(
                f"- **{e['title']}** ({e['confidence']}, {themes}) "
                f"— {evidence_count} sources"
            )
        body_lines.append(
            "\n---\nGenerated by `horizon_bot.py`. Review, edit, then merge."
        )
        body = "\n".join(body_lines)

        try:
            result = subprocess.run(
                ["gh", "pr", "create",
                 "--title", f"Horizon: {len(new_entries)} Now proposals ({today})",
                 "--body", body,
                 "--base", "main",
                 "--head", branch],
                capture_output=True, text=True, check=True,
            )
            pr_url = result.stdout.strip()
            print(f"[horizon_bot] Created PR: {pr_url}")
        except subprocess.CalledProcessError as e:
            print(f"[horizon_bot] gh pr create failed: {e.stderr}")

    # Return to main
    subprocess.run(["git", "checkout", "main"], capture_output=True)
    return pr_url


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #

def main():
    print(f"[{datetime.now().isoformat()}] Horizon bot starting")
    t0 = time.time()
    items_found = 0
    items_published = 0
    cost = 0.0
    input_tokens = 0
    output_tokens = 0

    try:
        now_entries = load_lane("now")
        next_entries = load_lane("next")
        past_entries = load_lane("past")

        radar_items = load_recent_radar(days=7)
        thoughts = load_recent_markdown(THOUGHTS_DIR, days=7)
        news = load_recent_markdown(NEWS_DIR, days=7)
        items_found = len(radar_items) + len(thoughts) + len(news)

        print(f"[horizon_bot] Evidence: {len(radar_items)} radar, "
              f"{len(thoughts)} thoughts, {len(news)} news")

        # Job 1 — Now proposals (LLM, grounded)
        now_proposals: list[dict] = []
        usage = None
        if items_found > 0:
            now_proposals, usage = propose_now_entries(
                radar_items, thoughts, news, now_entries,
            )
            if usage is not None:
                input_tokens = usage.input_tokens
                output_tokens = usage.output_tokens
                cost = (input_tokens * INPUT_COST_PER_MTOK
                        + output_tokens * OUTPUT_COST_PER_MTOK) / 1_000_000
        print(f"[horizon_bot] Now proposals: {len(now_proposals)}")

        # Job 2 — Next shift flags (deterministic)
        next_flags = flag_next_shifts(next_entries, radar_items, thoughts)
        print(f"[horizon_bot] Next flags: {len(next_flags)}")

        # Job 3 — Past candidates (deterministic)
        past_candidates = score_past_candidates(past_entries)
        print(f"[horizon_bot] Past candidates: {len(past_candidates)}")

        # Staging (backup, always written)
        write_staging(now_proposals, next_flags, past_candidates)
        items_published = len(now_proposals) + len(next_flags) + len(past_candidates)

        # Proposal PR (Now entries only for now; Next/Past still staging-only)
        pr_url = create_proposal_pr(now_proposals)

        # Shifts.json (committed if changed)
        shifts = build_shifts_log()
        shifts_changed = write_shifts_log(shifts)
        print(f"[horizon_bot] Shifts: {len(shifts)} entries, "
              f"{'changed' if shifts_changed else 'unchanged'}")

        # Discord ping (opt-in)
        post_to_discord(len(now_proposals), len(next_flags), len(past_candidates),
                        pr_url=pr_url)

        # Log BEFORE commit so the runs.json entry lands in the same commit
        # as the shifts change (fix for issue #97).
        _log_run(
            "horizon_bot", status="success",
            duration_s=time.time() - t0,
            feeds_scanned=0,
            items_found=items_found,
            items_published=items_published,
            model=MODEL if usage is not None else "",
            cost_usd=cost if usage is not None else None,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            output_files=(
                ["src/data/horizon/shifts.json"] if shifts_changed else []
            ),
        )

        commit_shifts(shifts_changed)

        ping_healthcheck()
        print("[horizon_bot] Done.")

    except Exception as e:
        print(f"[horizon_bot] Failed: {e}")
        _log_run(
            "horizon_bot", status="error",
            duration_s=time.time() - t0,
            error_msg=str(e),
        )
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
