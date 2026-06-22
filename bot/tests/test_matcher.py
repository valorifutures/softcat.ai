"""Table-driven tests for the radar↔OpenRouter name matcher (eng E4).

The matcher is the join key for roster discovery. Known-tricky real cases
are pinned here, including the documented miss (Gemini Live Translate is a
product entry, not a model entry — it must NOT match gemini-3.5-flash; that
addition was editorial, not bot-discovered).
"""
import pytest

from model_data_bot import normalize_name, names_match


@pytest.mark.parametrize("raw,expected", [
    ("Claude Fable 5", "claudefable5"),
    ("GPT-5.5 Instant", "gpt55instant"),
    ("Qwen3.6-27B", "qwen3627b"),
    ("  MiniMax  M2.7 ", "minimaxm27"),
    ("", ""),
])
def test_normalize_name(raw, expected):
    assert normalize_name(raw) == expected


@pytest.mark.parametrize("radar,openrouter,match", [
    # real hits from production data (2026-06-10 run)
    ("Claude Fable 5", "Anthropic: Claude Fable 5", True),
    ("GPT-5.5 Instant", "OpenAI: GPT-5.5", True),
    ("Grok 4.3", "xAI: Grok 4.3", True),
    ("Claude Opus 4.7", "Anthropic: Claude Opus 4.7", True),
    ("Kimi K2.6", "MoonshotAI: Kimi K2.6", True),
    ("Mistral Small 4", "Mistral: Mistral Small 4", True),
    # documented miss: product entry vs model name — editorial add only
    ("Gemini 3.5 Live Translate", "Google: Gemini 3.5 Flash", False),
    # junk-match guards: too short after normalization
    ("GPT", "OpenAI: GPT-5.5", False),  # 3 chars, junk guard
    ("AI", "Mistral: Mistral Small 4", False),
    # unrelated
    ("Claude Fable 5", "OpenAI: GPT-5.5", False),
])
def test_names_match(radar, openrouter, match):
    assert names_match(radar, openrouter) is match


# --------------------------------------------------------------------------- #
# Roster denylist (added 2026-06-22). Guards against re-proposing the same     #
# non-models that were hand-rejected from PRs #163 and #169 every run.         #
# --------------------------------------------------------------------------- #
from model_data_bot import is_denied


@pytest.mark.parametrize("model_id,denied", [
    # explicit denylist (the three rejected in #163/#169)
    ("anthropic/claude-opus-4.7-fast", True),
    ("google/lyria-3-pro-preview", True),
    ("openrouter/fusion", True),
    # pattern: any "-fast" variant is a speed flag, not a separate SKU
    ("anthropic/claude-opus-4.8-fast", True),
    ("openai/gpt-5.5-fast", True),
    # pattern: lyria = music models; openrouter = router meta-models
    ("google/lyria-2", True),
    ("openrouter/auto", True),
    # real roster models must pass through
    ("minimax/minimax-m2.7", False),
    ("anthropic/claude-sonnet-4-6", False),
    ("openai/gpt-5.5", False),
    ("anthropic/claude-opus-4.8", False),  # base id, not the -fast flag
])
def test_is_denied(model_id, denied):
    assert is_denied(model_id) is denied
