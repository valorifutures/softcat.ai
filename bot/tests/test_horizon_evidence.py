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


def test_duplicate_refs_cannot_inflate_the_count():
    out = sanitize([{"type": "news", "ref": "2026-06-22-ai-digest", "label": label} for label in ("One", "Another label")])
    assert len(out) == 1


def test_only_exact_provided_external_urls_are_kept():
    news = [{"slug": "2026-06-22-ai-digest", "source_urls": ["https://source.example/report"]}]
    p = {"evidence": [
        {"type": "external", "ref": "https://source.example/report#section", "label": "Provided"},
        {"type": "external", "ref": "https://invented.example/story", "label": "Invented"},
    ]}
    out = bot._sanitize_evidence(p, RADAR, THOUGHTS, news)["evidence"]
    assert [x["ref"] for x in out] == ["https://source.example/report"]


def test_repeated_summaries_and_same_host_do_not_establish_reporting_basis():
    assert not bot._proposal_has_reporting_basis({"evidence": [
        {"type": "news", "ref": "2026-06-22-ai-digest"},
        {"type": "thought", "ref": "2026-06-22-government-bans-are-free-marketing"},
    ]})
    assert not bot._proposal_has_reporting_basis({"evidence": [
        {"type": "external", "ref": "https://example.com/one"},
        {"type": "external", "ref": "https://www.example.com/two"},
    ]})
    assert bot._proposal_has_reporting_basis({"evidence": [
        {"type": "external", "ref": "https://one.example/report"},
        {"type": "external", "ref": "https://two.example/report"},
    ]})


def test_bot_cannot_award_confirmed_or_treat_own_site_as_external():
    p = {"confidence": "confirmed", "evidence": []}
    assert bot._sanitize_evidence(p, [], [], [])["confidence"] == "emerging"
    assert bot._provided_source_urls([
        {"ph_url": "https://softcat.ai/thoughts/example"},
        {"url": "https://github.com/valorifutures/softcat.ai/blob/main/README.md"},
        {"url": "https://vendor.example/product"},
    ], []) == {"https://vendor.example/product"}


def test_future_and_draft_content_cannot_enter_proposal_context(tmp_path):
    from datetime import date
    def write(name, date_value, draft):
        (tmp_path / name).write_text(f'---\ntitle: Example\ndate: {date_value}\nsummary: Example\ndraft: {draft}\n---\n[Source](https://source.example/report)\n')
    write('current.md', date.today().isoformat(), 'false')
    write('draft.md', date.today().isoformat(), 'true')
    write('future.md', '2099-12-31', 'false')
    records = bot.load_recent_markdown(tmp_path)
    assert [item['slug'] for item in records] == ['current']
    assert records[0]['source_urls'] == ['https://source.example/report']


def test_opinion_only_context_does_not_spend_a_model_call(monkeypatch):
    def unexpected_call():
        raise AssertionError('An opinion-only input must not call the provider')
    monkeypatch.setattr(bot, 'Anthropic', unexpected_call)
    proposals, usage = bot.propose_now_entries([], THOUGHTS, [], [])
    assert proposals == []
    assert usage is None
