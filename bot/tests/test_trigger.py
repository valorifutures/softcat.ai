"""Roster trigger gate tests (B4/D4): on OpenRouter AND radar-featured AND
not already tracked. Plus the loud-failure contract for radar data (D5/1A).
"""
import json

import pytest

import model_data_bot as bot


API = {
    "anthropic/claude-fable-5": {"name": "Anthropic: Claude Fable 5",
                                 "pricing": {"prompt": "0.00001", "completion": "0.00005"},
                                 "context_length": 1000000,
                                 "architecture": {"input_modalities": ["text", "image"]}},
    "anthropic/claude-fable-5:free": {"name": "Anthropic: Claude Fable 5 (free)",
                                      "pricing": {}, "context_length": 1000000,
                                      "architecture": {}},
    "openai/gpt-5.5": {"name": "OpenAI: GPT-5.5", "pricing": {},
                       "context_length": 1050000, "architecture": {}},
}
RADAR = [
    {"name": "Claude Fable 5", "date": "2026-06-10", "entry_id": "ph-claude-fable-5"},
    {"name": "Some Unrelated Product", "date": "2026-06-09", "entry_id": "ph-x"},
]


def test_gate_proposes_radar_and_openrouter_match():
    cands = bot.find_roster_candidates(set(), API, RADAR)
    ids = [c["model_id"] for c in cands]
    assert "anthropic/claude-fable-5" in ids
    # :free variant suppressed in favour of the base id
    assert "anthropic/claude-fable-5:free" not in ids
    # on OpenRouter but never on radar -> not proposed
    assert "openai/gpt-5.5" not in ids


def test_gate_skips_already_tracked():
    cands = bot.find_roster_candidates({"anthropic/claude-fable-5"}, API, RADAR)
    assert cands == []


def test_gate_keeps_latest_radar_date():
    radar = RADAR + [{"name": "Claude Fable 5", "date": "2026-06-01", "entry_id": "ph-old"}]
    cands = bot.find_roster_candidates(set(), API, radar)
    assert cands[0]["radar_date"] == "2026-06-10"
    assert cands[0]["radar_entry_id"] == "ph-claude-fable-5"


def test_proposal_entry_is_placeholder_marked():
    cand = bot.find_roster_candidates(set(), API, RADAR)[0]
    entry = bot.build_proposal_entry(cand, API)
    assert entry["id"] == "anthropic/claude-fable-5"
    assert "PLACEHOLDER" in entry["description"]
    assert entry["radarRef"] == "2026-06-10#ph-claude-fable-5"
    assert entry["contextK"] == 1000
    assert entry["multimodal"] is True


def test_radar_scan_loud_on_malformed_file(tmp_path, monkeypatch):
    (tmp_path / "2026-06-10.json").write_text("{not json")
    monkeypatch.setattr(bot, "RADAR_DIR", tmp_path)
    with pytest.raises(bot.RadarDataError):
        bot.scan_radar_entries()


def test_radar_scan_loud_on_zero_files(tmp_path, monkeypatch):
    monkeypatch.setattr(bot, "RADAR_DIR", tmp_path)
    with pytest.raises(bot.RadarDataError):
        bot.scan_radar_entries()


def test_radar_scan_loud_on_zero_entries(tmp_path, monkeypatch):
    (tmp_path / "2026-06-10.json").write_text(json.dumps({"date": "2026-06-10", "featured": []}))
    monkeypatch.setattr(bot, "RADAR_DIR", tmp_path)
    with pytest.raises(bot.RadarDataError):
        bot.scan_radar_entries()


def test_radar_scan_reads_real_repo_data():
    entries = bot.scan_radar_entries()
    assert len(entries) > 50
    assert any(e["entry_id"] == "ph-claude-fable-5" for e in entries)
