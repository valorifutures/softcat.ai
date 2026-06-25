"""Regression tests for horizon_bot evidence sanitisation.

Pins the fix for the 48 dangling evidence refs (2026-06-23): the model used to
abbreviate thought/news slugs to a bare date or invent them. _sanitize_evidence
must rewrite a recoverable ref to its real slug and DROP anything that resolves
to nothing, so a broken ref can never reach now.json again.
"""
import horizon_bot as bot

RADAR = [{"_radar_date": "2026-06-22"}, {"_radar_date": "2026-06-21"}]
THOUGHTS = [
    {"slug": "2026-06-22-government-bans-are-free-marketing", "date": "2026-06-22"},
    {"slug": "2026-06-10-real-time-streaming-arms-race", "date": "2026-06-10"},
]
NEWS = [
    {"slug": "2026-06-22-ai-digest", "date": "2026-06-22"},
    {"slug": "2026-06-21-ai-digest", "date": "2026-06-21"},
]


def sanitize(evidence):
    p = {"id": "now-test", "evidence": evidence}
    return bot._sanitize_evidence(p, RADAR, THOUGHTS, NEWS)["evidence"]


def test_exact_slug_is_kept():
    out = sanitize([{"type": "thought", "ref": "2026-06-10-real-time-streaming-arms-race", "label": "x"}])
    assert out[0]["ref"] == "2026-06-10-real-time-streaming-arms-race"


def test_bare_date_thought_is_rewritten_to_full_slug():
    out = sanitize([{"type": "thought", "ref": "2026-06-10", "label": "x"}])
    assert out[0]["ref"] == "2026-06-10-real-time-streaming-arms-race"


def test_overlong_slug_is_rewritten_via_leading_date():
    out = sanitize([{"type": "news", "ref": "2026-06-22-ai-digest-money-agents-and-grade-inflation", "label": "x"}])
    assert out[0]["ref"] == "2026-06-22-ai-digest"


def test_valid_radar_date_is_kept():
    out = sanitize([{"type": "radar", "ref": "2026-06-21", "label": "x"}])
    assert out[0]["ref"] == "2026-06-21"


def test_unknown_radar_date_is_dropped():
    out = sanitize([{"type": "radar", "ref": "2026-01-01", "label": "x"}])
    assert out == []


def test_unresolvable_thought_is_dropped():
    out = sanitize([{"type": "thought", "ref": "2099-12-31", "label": "x"}])
    assert out == []


def test_ambiguous_date_is_dropped():
    # Two thoughts share a date -> a bare-date ref is ambiguous, so dropped.
    thoughts = [
        {"slug": "2026-06-15-first", "date": "2026-06-15"},
        {"slug": "2026-06-15-second", "date": "2026-06-15"},
    ]
    p = {"id": "now-test", "evidence": [{"type": "thought", "ref": "2026-06-15", "label": "x"}]}
    assert bot._sanitize_evidence(p, RADAR, thoughts, NEWS)["evidence"] == []


def test_label_is_preserved_on_rewrite():
    out = sanitize([{"type": "thought", "ref": "2026-06-10", "label": "Streaming"}])
    assert out[0]["label"] == "Streaming"
