#!/usr/bin/env python3
"""
SOFT CAT data bot: Model Data Updater

Fetches current AI model pricing and specs from the OpenRouter API,
merges with manually curated capability scores in models.json,
and pushes if anything changed.

Auto-updated fields: contextK, inputPrice, outputPrice, multimodal
Manual fields (preserved): family, reasoning, coding, reasoning_score,
    speed, description, strengths, openSource, released

Trust model (issue #96):
  - Every change is gated by MAX_AUTO_DELTA. Anything larger is rejected
    from the auto-commit and written to a staging file for Valori review.
    OpenRouter sometimes reports beta/max values (e.g. Claude Sonnet's 1M
    beta context instead of the 200K default), and has had stale pricing
    for Mistral Small. A 6x swing should never auto-land.
  - Per-model `lockedFields` let us freeze a field that OpenRouter keeps
    getting wrong without editing bot code.
  - On start we reset models.json from HEAD if it has drifted. Stops a
    prior failed commit from leaving uncommitted garbage that silently
    becomes the new baseline and makes later runs log `0 published`.
"""

import os
import sys
import json
import subprocess
import time as _time
from datetime import datetime, date
from pathlib import Path

import httpx
from dotenv import load_dotenv

from pipeline_log import log_run
import git_safe

BOT_DIR = Path(__file__).parent
load_dotenv(BOT_DIR / ".env")
REPO_DIR = BOT_DIR.parent
MODELS_FILE = REPO_DIR / "src" / "data" / "models.json"
STAGING_DIR = Path.home() / ".softcat-bot-staging"
SUSPECTS_FILE = STAGING_DIR / "model-bot-suspects.json"

# Sanity guardrail: reject any auto-update where a numeric field swings by
# more than this fraction of the current value (up or down). Suspect changes
# are written to SUSPECTS_FILE for human review instead of landing.
MAX_AUTO_DELTA = 0.5

# Fields eligible for the delta check. Non-numeric fields skip the guardrail.
GUARDED_NUMERIC_FIELDS = {"contextK", "inputPrice", "outputPrice"}

# The roster IS src/data/models.json (eng review E1). Job 1 refreshes
# prices/specs for whatever ids that file contains. New models enter the
# roster only through Job 2's proposal PRs (radar-gated), reviewed by Valori.
# There is deliberately NO bootstrap path that can publish placeholder
# entries to main.

# Defaults for PROPOSED models (Job 2). These land only on a proposal
# branch, clearly placeholder-marked, and are edited during PR review.
# They are never committed to main by the bot.
NEW_MODEL_DEFAULTS = {
    "family": "Unknown",
    "reasoning": False,
    "openSource": False,
    "coding": 70,
    "reasoning_score": 70,
    "speed": 70,
    "description": "PLACEHOLDER - edit before merge. Capability scores are editorial; set them during PR review.",
    "strengths": "PLACEHOLDER - edit before merge",
}

PROPOSAL_BRANCH = "model-bot/roster-proposals"
RADAR_DIR = REPO_DIR / "src" / "data" / "radar"


class RadarDataError(RuntimeError):
    """Radar day-files were missing or unparseable. Loud by design (D5/1A):
    a broken trigger must never look like 'no notable models this month'."""

PROVIDER_MAP = {
    "anthropic": "Anthropic",
    "openai": "OpenAI",
    "google": "Google",
    "meta-llama": "Meta",
    "deepseek": "DeepSeek",
    "mistralai": "Mistral",
    "qwen": "Alibaba",
    "moonshotai": "Moonshot AI",
    "x-ai": "xAI",
    "z-ai": "Z.ai",
}


# Roster denylist (added 2026-06-22). Ids the bot must NEVER propose because
# they are not standalone text/coding roster models. Each was hand-rejected
# from a prior proposal PR (#163, #169); because rejected models are dropped
# rather than tracked, the radar gate keeps re-surfacing the same non-models
# every run. This guard stops the re-proposal loop.
DENYLIST_IDS = {
    "anthropic/claude-opus-4.7-fast",   # "Fast" is a speed flag, not a SKU
    "google/lyria-3-pro-preview",       # music-generation model, out of scope
    "openrouter/fusion",                # router meta-model / feature, not a model
}


def is_denied(model_id: str) -> bool:
    """True if model_id must never enter the roster. Covers the explicit
    denylist plus pattern families: a '-fast' suffix (a speed flag on an
    existing model, e.g. claude-opus-4.7-fast — the base id is already
    tracked), 'lyria' (Google music models), and the 'openrouter/' provider
    (router meta-models / features, not real models)."""
    mid = model_id.lower()
    if mid in DENYLIST_IDS:
        return True
    base = mid.split("/", 1)[-1]
    if base.endswith("-fast"):
        return True
    if "lyria" in mid:
        return True
    if mid.startswith("openrouter/"):
        return True
    return False


def load_models():
    """Load the roster. Missing or empty models.json is a LOUD failure
    (eng E6.1) - with no TRACKED_IDS fallback an empty roster would
    otherwise become a valid silent no-op."""
    if not MODELS_FILE.exists():
        raise RuntimeError(f"{MODELS_FILE} missing - roster is gone, refusing to run")
    models = json.loads(MODELS_FILE.read_text())
    if not isinstance(models, list) or not models:
        raise RuntimeError(f"{MODELS_FILE} is empty or malformed - refusing to run")
    return models


def save_models(models):
    models.sort(key=lambda m: (m.get("provider", ""), m.get("name", "")))
    MODELS_FILE.write_text(json.dumps(models, indent=2) + "\n")


def fetch_openrouter():
    """Fetch model list from OpenRouter (public, no auth required)."""
    resp = httpx.get("https://openrouter.ai/api/v1/models", timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return {m["id"]: m for m in data.get("data", [])}


def extract_auto_fields(api_model):
    """Pull auto-updatable fields from an OpenRouter API entry."""
    pricing = api_model.get("pricing", {})

    # OpenRouter prices are per-token strings; convert to per-1M-token numbers
    input_per_tok = float(pricing.get("prompt", "0") or "0")
    output_per_tok = float(pricing.get("completion", "0") or "0")
    input_price = round(input_per_tok * 1_000_000, 2)
    output_price = round(output_per_tok * 1_000_000, 2)

    context_length = api_model.get("context_length", 0)
    context_k = context_length // 1000 if context_length else 0

    modalities = api_model.get("architecture", {}).get("input_modalities", [])
    multimodal = "image" in modalities

    return {
        "contextK": context_k,
        "inputPrice": input_price,
        "outputPrice": output_price,
        "multimodal": multimodal,
    }


def derive_provider(model_id):
    prefix = model_id.split("/")[0]
    return PROVIDER_MAP.get(prefix, prefix.title())


def _is_suspect(field, old, new):
    """True when a numeric field swings more than MAX_AUTO_DELTA either way."""
    if field not in GUARDED_NUMERIC_FIELDS:
        return False
    if not isinstance(old, (int, float)) or not isinstance(new, (int, float)):
        return False
    if old == 0:
        return new != 0  # going from 0 to anything is a big relative move
    return abs(new - old) / abs(old) > MAX_AUTO_DELTA


def update_models(existing, api_models):
    """Merge API data into existing models.

    Returns (models, changed, suspects) where suspects is a list of rejected
    field changes (delta > MAX_AUTO_DELTA) that should go to human review,
    not the commit."""
    changed = False
    updated = []
    suspects = []

    # Update existing models
    for model in existing:
        model_id = model.get("id", "")
        api_model = api_models.get(model_id)

        if api_model:
            copy = model.copy()
            auto = extract_auto_fields(api_model)
            locked = set(copy.get("lockedFields") or [])

            # Skip price updates for open-source models (we show "Free*" for self-hosting)
            if copy.get("openSource"):
                auto.pop("inputPrice", None)
                auto.pop("outputPrice", None)

            for key, value in auto.items():
                old = copy.get(key)
                if old == value:
                    continue
                if key in locked:
                    print(f"  Locked {copy['name']}.{key}: {old} -> {value} (kept {old})")
                    continue
                if _is_suspect(key, old, value):
                    print(f"  SUSPECT {copy['name']}.{key}: {old} -> {value} (> "
                          f"{int(MAX_AUTO_DELTA * 100)}% delta, not landing)")
                    suspects.append({
                        "id": model_id,
                        "name": copy.get("name", model_id),
                        "field": key,
                        "current": old,
                        "proposed": value,
                        "source": "openrouter",
                    })
                    continue
                print(f"  Updated {copy['name']}.{key}: {old} -> {value}")
                copy[key] = value
                changed = True
            updated.append(copy)
        else:
            # No API data for this model, keep as-is
            updated.append(model)

    # NOTE: there is intentionally no "add new models" branch here (eng E1).
    # Job 1 only refreshes entries already in models.json. New entries arrive
    # via Job 2's reviewed proposal PRs.
    return updated, changed, suspects


def reset_drifted_baseline():
    """Discard any uncommitted drift in models.json before we start so a
    previously failed commit does not become the new silent baseline."""
    os.chdir(REPO_DIR)
    result = subprocess.run(
        ["git", "diff", "--quiet", "HEAD", "--", "src/data/models.json"],
    )
    if result.returncode != 0:
        print("[model_bot] models.json drifted from HEAD; resetting before run.")
        subprocess.run(
            ["git", "checkout", "HEAD", "--", "src/data/models.json"],
            check=True,
        )


def write_suspects(suspects):
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now().astimezone().isoformat(),
        "threshold": MAX_AUTO_DELTA,
        "suspects": suspects,
    }
    SUSPECTS_FILE.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"[model_bot] Wrote {len(suspects)} suspect(s) to {SUSPECTS_FILE}")


def post_suspects_to_discord(suspects):
    webhook = os.environ.get("DISCORD_WEBHOOK_MODEL_DATA")
    if not webhook or not suspects:
        return
    lines = [f"**Model bot:** {len(suspects)} suspect change(s) rejected "
             f"(> {int(MAX_AUTO_DELTA * 100)}% delta):"]
    for s in suspects[:10]:
        lines.append(f"- {s['name']}.{s['field']}: "
                     f"{s['current']} -> {s['proposed']}")
    lines.append(f"Review: `{SUSPECTS_FILE}`")
    try:
        httpx.post(webhook, json={"content": "\n".join(lines),
                                   "username": "SOFT CAT Model Data"},
                   timeout=15)
    except Exception as e:
        print(f"[model_bot] Discord post failed: {e}")


def git_commit_and_push():
    # Serialized under the shared git lock, health-checked, and rebased before
    # push by git_safe (which also stashes any stray files from other bots).
    today = date.today().isoformat()
    msg = f"bot: update model data ({today})"
    git_safe.safe_commit_and_push(
        ["src/data/models.json", "src/data/pipeline/runs.json"],
        msg,
    )


# --------------------------------------------------------------------------- #
# Job 2: radar-gated roster proposals (B4 / D4 / D11 / E4)                     #
#                                                                              #
#   radar day-files ──▶ normalized-name match ──▶ OpenRouter id               #
#        │ (loud fail on        │ (pure fn,            │ not in models.json   #
#        │  malformed/0 files)  │  table-tested)       ▼                      #
#        │                      │              proposal entry (placeholder-   #
#        ▼                      ▼              marked) ──▶ commit on top of   #
#   RadarDataError       no match = no       existing PR branch (never        #
#   + exit non-zero      proposal (fine)     force-push) ──▶ gh pr outside    #
#                                            git lock ──▶ Discord ping        #
# --------------------------------------------------------------------------- #

def normalize_name(s: str) -> str:
    """Lowercase, strip everything but [a-z0-9]. Deterministic join key
    between radar entry names and OpenRouter model names (eng E4)."""
    import re
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def names_match(radar_name: str, or_name: str) -> bool:
    """Bidirectional substring on normalized names. >=6 chars to avoid
    junk matches like 'ai' or 'gpt'."""
    rn, on = normalize_name(radar_name), normalize_name(or_name.split(": ", 1)[-1])
    # >=5 chars on both sides: blocks junk ("ai", "o3", "gpt") while letting
    # short real names ("gpt55") through. Every match is still human-reviewed.
    if len(rn) < 5 or len(on) < 5:
        return False
    return rn in on or on in rn


def scan_radar_entries() -> list[dict]:
    """Read all radar day-files. Returns [{name, date, entry_id}, ...].
    LOUD on malformed JSON or zero readable files (D5/1A)."""
    files = sorted(RADAR_DIR.glob("2026-*.json")) + sorted(RADAR_DIR.glob("202[7-9]-*.json"))
    if not files:
        raise RadarDataError(f"no radar day-files found in {RADAR_DIR}")
    out = []
    for f in files:
        try:
            day = json.loads(f.read_text())
        except (json.JSONDecodeError, ValueError) as e:
            raise RadarDataError(f"radar file {f.name} unparseable: {e}")
        if not isinstance(day, dict):
            raise RadarDataError(f"radar file {f.name} is not an object")
        date_str = day.get("date", f.stem)
        for section in ("featured", "items", "launches"):
            for item in day.get(section) or []:
                if isinstance(item, dict) and item.get("name"):
                    out.append({"name": item["name"], "date": date_str,
                                "entry_id": item.get("id", "")})
    if not out:
        raise RadarDataError("radar files parsed but contained zero entries")
    return out


def find_roster_candidates(existing_ids: set, api_models: dict,
                           radar_entries: list[dict]) -> list[dict]:
    """The gate: on OpenRouter AND radar-featured AND not already tracked.
    Skips :free/-fast variant ids when the base id also matches."""
    candidates = {}
    for r in radar_entries:
        for mid, api_model in api_models.items():
            if mid in existing_ids or ":" in mid or is_denied(mid):
                continue
            if names_match(r["name"], api_model.get("name", mid)):
                prev = candidates.get(mid)
                if not prev or r["date"] > prev["radar_date"]:
                    candidates[mid] = {"model_id": mid, "radar_name": r["name"],
                                       "radar_date": r["date"], "radar_entry_id": r["entry_id"]}
    # prefer base ids over longer variants of the same family (e.g. -fast)
    ids = set(candidates)
    return [c for mid, c in sorted(candidates.items())
            if not any(other != mid and mid.startswith(other) for other in ids)]


def build_proposal_entry(cand: dict, api_models: dict) -> dict:
    api_model = api_models[cand["model_id"]]
    raw_name = api_model.get("name", cand["model_id"])
    name = raw_name.split(": ", 1)[-1] if ": " in raw_name else raw_name
    return {
        "id": cand["model_id"],
        "name": name,
        "provider": derive_provider(cand["model_id"]),
        "released": date.today().strftime("%Y-%m"),
        **NEW_MODEL_DEFAULTS,
        **extract_auto_fields(api_model),
        "trackedSince": date.today().isoformat(),
        "radarRef": f"{cand['radar_date']}#{cand['radar_entry_id']}",
    }


def post_roster_pr_to_discord(pr_url: str, entries: list[dict]):
    webhook = os.environ.get("DISCORD_WEBHOOK_MODEL_DATA")
    if not webhook:
        return
    names = ", ".join(e["name"] for e in entries)
    try:
        httpx.post(webhook, json={
            "content": f"**Model bot:** roster proposal PR for {names}\n"
                       f"Edit the placeholder scores before merging: {pr_url}",
            "username": "SOFT CAT Model Data"}, timeout=15)
    except Exception as e:
        print(f"[model_bot] Discord post failed: {e}")


def propose_roster_pr(entries: list[dict]) -> str | None:
    """Open or update the single roster proposal PR.

    D11/E6.5: new proposals land as commits ON TOP of the existing open PR
    branch (preserves human edits + review discussion). Never checkout -B
    over a remote branch, never force-push. gh network calls run OUTSIDE
    the git lock (E6.6). The tree is ALWAYS checked back to main (E6.4).
    """
    if not entries:
        return None
    os.chdir(REPO_DIR)

    # gh queries outside the lock
    existing_pr = None
    try:
        result = subprocess.run(
            ["gh", "pr", "list", "--head", PROPOSAL_BRANCH, "--state", "open",
             "--json", "number,url", "--limit", "1"],
            capture_output=True, text=True, check=True)
        prs = json.loads(result.stdout)
        if prs:
            existing_pr = prs[0]
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        pass

    pushed = False
    added = []
    with git_safe.git_lock():
        git_safe.check_repo_health()
        try:
            subprocess.run(["git", "fetch", "origin", "main", PROPOSAL_BRANCH],
                           capture_output=True)  # branch may not exist yet
            remote_branch = subprocess.run(
                ["git", "rev-parse", "--verify", f"origin/{PROPOSAL_BRANCH}"],
                capture_output=True).returncode == 0
            if remote_branch and existing_pr:
                # continue the open PR's branch - append, never rewrite
                subprocess.run(["git", "checkout", "-B", PROPOSAL_BRANCH,
                                f"origin/{PROPOSAL_BRANCH}"], check=True, capture_output=True)
            else:
                subprocess.run(["git", "checkout", "-B", PROPOSAL_BRANCH,
                                "origin/main"], check=True, capture_output=True)

            current = json.loads(MODELS_FILE.read_text())
            branch_ids = {m.get("id") for m in current}
            added = [e for e in entries if e["id"] not in branch_ids]
            if not added:
                print("[model_bot] all candidates already proposed on branch")
                return existing_pr["url"] if existing_pr else None

            current.extend(added)
            current.sort(key=lambda m: (m.get("provider", ""), m.get("name", "")))
            MODELS_FILE.write_text(json.dumps(current, indent=2) + "\n")
            names = ", ".join(e["name"] for e in added)
            subprocess.run(["git", "add", str(MODELS_FILE)], check=True, capture_output=True)
            subprocess.run(["git", "commit", "-m",
                            f"bot(model): propose roster addition - {names}"],
                           check=True, capture_output=True)
            subprocess.run(["git", "push", "origin", PROPOSAL_BRANCH],
                           check=True, capture_output=True)
            pushed = True
        finally:
            # the shared working tree must NEVER be left on a branch (E6.4)
            subprocess.run(["git", "checkout", "main"], capture_output=True)

    if not pushed:
        return existing_pr["url"] if existing_pr else None

    # gh mutations outside the lock (E6.6)
    if existing_pr:
        body = "New roster candidate(s) appended: " + ", ".join(e["name"] for e in added)
        subprocess.run(["gh", "pr", "comment", str(existing_pr["number"]),
                        "--body", body], capture_output=True)
        pr_url = existing_pr["url"]
    else:
        lines = [f"- **{e['name']}** (`{e['id']}`) - radar: {e['radarRef']}" for e in added]
        body = ("## Roster proposal (radar-gated)\n\n" + "\n".join(lines) +
                "\n\nScores are PLACEHOLDER - assign editorial scores during review, "
                "then merge. Trigger: model on OpenRouter AND featured on Radar AND "
                "not in models.json.\n\n---\nGenerated by `model_data_bot.py` Job 2.")
        result = subprocess.run(
            ["gh", "pr", "create", "--base", "main", "--head", PROPOSAL_BRANCH,
             "--title", f"Model roster: {', '.join(e['name'] for e in added)}",
             "--body", body], capture_output=True, text=True, check=True)
        pr_url = result.stdout.strip().splitlines()[-1]

    post_roster_pr_to_discord(pr_url, added)
    return pr_url


def run_roster_job(existing: list[dict], api_models: dict, t0: float):
    """Job 2 entry point. Loud on radar data errors; quiet when there is
    simply nothing to propose."""
    radar_entries = scan_radar_entries()
    existing_ids = {m.get("id", "") for m in existing}
    candidates = find_roster_candidates(existing_ids, api_models, radar_entries)
    if not candidates:
        print("[model_bot] roster: no new radar-gated candidates")
        log_run("model_bot", status="success", duration_s=_time.time() - t0,
                items_found=len(radar_entries), items_published=0, job="roster")
        return
    entries = [build_proposal_entry(c, api_models) for c in candidates]
    pr_url = propose_roster_pr(entries)
    print(f"[model_bot] roster proposal: {pr_url}")
    log_run("model_bot", status="success", duration_s=_time.time() - t0,
            items_found=len(radar_entries), items_published=len(entries),
            output_files=[pr_url or ""], job="roster")


def ping_healthcheck(status="success"):
    """Ping Healthchecks.io to report bot status."""
    url = os.environ.get("HC_PING_MODEL_DATA")
    if not url:
        return
    try:
        suffix = "/fail" if status == "fail" else ""
        httpx.get(f"{url}{suffix}", timeout=10)
    except Exception as e:
        print(f"Healthcheck ping failed: {e}")


def main():
    print(f"[{datetime.now().isoformat()}] Model Data bot starting")
    t0 = _time.time()

    try:
        # Self-heal: clear any uncommitted drift before we read baseline.
        # Under the shared git lock (eng E6.3) so it can't race another
        # bot's branch work in the same working tree.
        with git_safe.git_lock():
            reset_drifted_baseline()

        existing = load_models()
        print(f"Loaded {len(existing)} existing models")

        print("Fetching from OpenRouter API...")
        api_models = fetch_openrouter()

        if not api_models:
            print("API returned no models. Bailing out to avoid data loss.")
            log_run("model_bot", status="error", duration_s=_time.time() - t0,
                    error_msg="OpenRouter API returned no models")
            ping_healthcheck("fail")
            sys.exit(1)

        print(f"Got {len(api_models)} models from OpenRouter")

        print("Merging data...")
        updated, changed, suspects = update_models(existing, api_models)

        if suspects:
            write_suspects(suspects)
            post_suspects_to_discord(suspects)

        if changed:
            print(f"Saving {len(updated)} models...")
            save_models(updated)

            # Log BEFORE commit so the runs.json entry lands in the same commit
            # as models.json (#97 fix). If commit fails, the log still reflects
            # what we tried to ship and surfaces the problem on the dashboard.
            log_run("model_bot", status="success", duration_s=_time.time() - t0,
                    items_found=len(api_models), items_published=len(updated),
                    output_files=["src/data/models.json"], job="prices")

            print("Committing and pushing...")
            git_commit_and_push()
        else:
            print("No price/spec changes detected.")
            log_run("model_bot", status="success", duration_s=_time.time() - t0,
                    items_found=len(api_models), items_published=0, job="prices")

    except Exception as e:
        print(f"Bot failed (prices job): {e}")
        log_run("model_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e), job="prices")
        ping_healthcheck("fail")
        sys.exit(1)

    # ---- Job 2: roster proposals (failures are loud but independent of Job 1)
    try:
        run_roster_job(updated if changed else existing, api_models, t0)
    except Exception as e:
        print(f"Bot failed (roster job): {e}")
        log_run("model_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e), job="roster")
        ping_healthcheck("fail")
        sys.exit(1)

    print("Done.")
    ping_healthcheck()


if __name__ == "__main__":
    main()
