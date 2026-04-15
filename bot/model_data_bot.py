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

# OpenRouter model IDs we track. Add new IDs here to have the bot
# pick them up automatically. Remove IDs to stop tracking.
TRACKED_IDS = [
    "anthropic/claude-opus-4",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-haiku-4.5",
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-5-nano",
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "openai/o3",
    "openai/o3-mini",
    "google/gemini-2.5-pro-preview",
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-4-scout",
    "meta-llama/llama-4-maverick",
    "deepseek/deepseek-chat-v3-0324",
    "deepseek/deepseek-r1",
    "mistralai/mistral-large-2512",
    "mistralai/mistral-small-3.1-24b-instruct",
    "qwen/qwen-2.5-72b-instruct",
    "moonshotai/kimi-k2",
]

# Defaults for newly discovered models (manual fields)
NEW_MODEL_DEFAULTS = {
    "family": "Unknown",
    "reasoning": False,
    "openSource": False,
    "coding": 70,
    "reasoning_score": 70,
    "speed": 70,
    "description": "Newly added model. Capability scores are placeholder.",
    "strengths": "Newly added",
}

PROVIDER_MAP = {
    "anthropic": "Anthropic",
    "openai": "OpenAI",
    "google": "Google",
    "meta-llama": "Meta",
    "deepseek": "DeepSeek",
    "mistralai": "Mistral",
    "qwen": "Alibaba",
    "moonshotai": "Moonshot AI",
}


def load_models():
    if MODELS_FILE.exists():
        return json.loads(MODELS_FILE.read_text())
    return []


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

    # Add new tracked models not yet in our data
    existing_ids = {m.get("id", "") for m in existing}
    for model_id in TRACKED_IDS:
        if model_id not in existing_ids and model_id in api_models:
            api_model = api_models[model_id]
            # Strip "Provider: " prefix if present
            raw_name = api_model.get("name", model_id)
            name = raw_name.split(": ", 1)[-1] if ": " in raw_name else raw_name

            auto_fields = extract_auto_fields(api_model)
            new_model = {
                "id": model_id,
                "name": name,
                "provider": derive_provider(model_id),
                "released": date.today().strftime("%Y-%m"),
                **NEW_MODEL_DEFAULTS,
                **auto_fields,
            }
            print(f"  Added new model: {new_model['name']}")
            updated.append(new_model)
            changed = True

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
    os.chdir(REPO_DIR)
    # Stash any stray uncommitted files (from other bots mid-run, etc.) so
    # pull --rebase cannot fail on dirty worktree, then restore them after.
    stash_result = subprocess.run(
        ["git", "stash", "--include-untracked", "--keep-index"],
        capture_output=True, text=True,
    )
    stashed = "No local changes" not in stash_result.stdout
    subprocess.run(["git", "pull", "--rebase"], check=True)
    if stashed:
        subprocess.run(["git", "stash", "pop"], check=True)
    subprocess.run(["git", "add", "src/data/models.json", "src/data/pipeline/runs.json"], check=True)

    # Check if there are actually staged changes after pull
    result = subprocess.run(["git", "diff", "--cached", "--quiet"])
    if result.returncode == 0:
        print("No staged changes after pull. Exiting.")
        return

    today = date.today().isoformat()
    msg = f"bot: update model data ({today})"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    subprocess.run(["git", "push"], check=True)
    print(f"Pushed: {msg}")


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

        if not changed:
            print("No changes detected. Exiting.")
            # Log BEFORE any commit step so the runs.json entry lands with
            # any concurrent bot's commit instead of a future one (#97).
            log_run("model_bot", status="success", duration_s=_time.time() - t0,
                    items_found=len(api_models), items_published=0)
            ping_healthcheck()
            sys.exit(0)

        print(f"Saving {len(updated)} models...")
        save_models(updated)

        # Log BEFORE commit so the runs.json entry lands in the same commit
        # as models.json (#97 fix). If commit fails, the log still reflects
        # what we tried to ship and surfaces the problem on the dashboard.
        log_run("model_bot", status="success", duration_s=_time.time() - t0,
                items_found=len(api_models), items_published=len(updated),
                output_files=["src/data/models.json"])

        print("Committing and pushing...")
        git_commit_and_push()

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        log_run("model_bot", status="error", duration_s=_time.time() - t0,
                error_msg=str(e))
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
