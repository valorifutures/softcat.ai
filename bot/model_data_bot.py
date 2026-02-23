#!/usr/bin/env python3
"""
SOFT CAT data bot: Model Data Updater

Fetches current AI model pricing and specs from the OpenRouter API,
merges with manually curated capability scores in models.json,
and pushes if anything changed.

Auto-updated fields: contextK, inputPrice, outputPrice, multimodal
Manual fields (preserved): family, reasoning, coding, reasoning_score,
    speed, description, strengths, openSource, released
"""

import os
import sys
import json
import subprocess
from datetime import datetime, date
from pathlib import Path

import httpx
from dotenv import load_dotenv

BOT_DIR = Path(__file__).parent
load_dotenv(BOT_DIR / ".env")
REPO_DIR = BOT_DIR.parent
MODELS_FILE = REPO_DIR / "src" / "data" / "models.json"

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


def update_models(existing, api_models):
    """Merge API data into existing models. Returns (models, changed)."""
    existing_by_id = {m["id"]: m for m in existing if "id" in m}
    changed = False
    updated = []

    # Update existing models
    for model in existing:
        model_id = model.get("id", "")
        api_model = api_models.get(model_id)

        if api_model:
            copy = model.copy()
            auto = extract_auto_fields(api_model)

            # Skip price updates for open-source models (we show "Free*" for self-hosting)
            if copy.get("openSource"):
                auto.pop("inputPrice", None)
                auto.pop("outputPrice", None)

            for key, value in auto.items():
                if copy.get(key) != value:
                    print(f"  Updated {copy['name']}.{key}: {copy.get(key)} -> {value}")
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

    return updated, changed


def git_commit_and_push():
    os.chdir(REPO_DIR)
    subprocess.run(["git", "pull", "--rebase"], check=True)
    subprocess.run(["git", "add", "src/data/models.json"], check=True)

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

    try:
        existing = load_models()
        print(f"Loaded {len(existing)} existing models")

        print("Fetching from OpenRouter API...")
        api_models = fetch_openrouter()

        if not api_models:
            print("API returned no models. Bailing out to avoid data loss.")
            ping_healthcheck("fail")
            sys.exit(1)

        print(f"Got {len(api_models)} models from OpenRouter")

        print("Merging data...")
        updated, changed = update_models(existing, api_models)

        if not changed:
            print("No changes detected. Exiting.")
            ping_healthcheck()
            sys.exit(0)

        print(f"Saving {len(updated)} models...")
        save_models(updated)

        print("Committing and pushing...")
        git_commit_and_push()

        print("Done.")
        ping_healthcheck()

    except Exception as e:
        print(f"Bot failed: {e}")
        ping_healthcheck("fail")
        sys.exit(1)


if __name__ == "__main__":
    main()
