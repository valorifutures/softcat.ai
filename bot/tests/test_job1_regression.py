"""CRITICAL regression tests (eng E1): the models.json-as-roster refactor
must not change Job 1's merge behaviour for existing entries.

Pinned behaviours: lockedFields honoured, >MAX_AUTO_DELTA swings routed to
suspects (not landed), openSource entries skip price updates, and the old
bootstrap path is GONE (an OpenRouter id absent from models.json is never
added by Job 1).
"""
import model_data_bot as bot


def api_model(prompt="0.000003", completion="0.000015", ctx=200000, modalities=None):
    return {
        "pricing": {"prompt": prompt, "completion": completion},
        "context_length": ctx,
        "architecture": {"input_modalities": modalities or ["text"]},
    }


BASE = {
    "id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4.5",
    "provider": "Anthropic", "released": "2025-10", "contextK": 200,
    "inputPrice": 3, "outputPrice": 15, "openSource": False,
    "multimodal": False, "coding": 92, "reasoning_score": 93, "speed": 70,
}


def test_price_refresh_lands_small_changes():
    existing = [dict(BASE)]
    api = {"anthropic/claude-sonnet-4": api_model(prompt="0.0000035")}  # 3.0 -> 3.5
    updated, changed, suspects = bot.update_models(existing, api)
    assert changed is True
    assert suspects == []
    assert updated[0]["inputPrice"] == 3.5


def test_locked_fields_never_change():
    existing = [dict(BASE, lockedFields=["contextK"])]
    api = {"anthropic/claude-sonnet-4": api_model(ctx=1000000)}
    updated, _, suspects = bot.update_models(existing, api)
    assert updated[0]["contextK"] == 200
    assert all(s["field"] != "contextK" for s in suspects)


def test_big_delta_goes_to_suspects_not_data():
    existing = [dict(BASE)]
    api = {"anthropic/claude-sonnet-4": api_model(prompt="0.00002")}  # 3 -> 20 (>50%)
    updated, changed, suspects = bot.update_models(existing, api)
    assert updated[0]["inputPrice"] == 3
    assert len(suspects) == 1
    assert suspects[0]["field"] == "inputPrice"
    assert suspects[0]["proposed"] == 20.0


def test_open_source_skips_prices():
    existing = [dict(BASE, id="z-ai/glm-5", openSource=True, inputPrice=0, outputPrice=0)]
    api = {"z-ai/glm-5": api_model(prompt="0.0000006", completion="0.00000192")}
    updated, changed, _ = bot.update_models(existing, api)
    assert updated[0]["inputPrice"] == 0
    assert updated[0]["outputPrice"] == 0


def test_no_bootstrap_of_untracked_ids():
    """THE E1 invariant: Job 1 never adds entries, even when OpenRouter
    has a model that models.json lacks."""
    existing = [dict(BASE)]
    api = {
        "anthropic/claude-sonnet-4": api_model(),
        "some-lab/brand-new-model": api_model(),
    }
    updated, _, _ = bot.update_models(existing, api)
    assert len(updated) == 1
    assert {m["id"] for m in updated} == {"anthropic/claude-sonnet-4"}


def test_missing_api_data_keeps_entry_untouched():
    existing = [dict(BASE)]
    updated, changed, suspects = bot.update_models(existing, {})
    assert updated == existing
    assert changed is False
    assert suspects == []
