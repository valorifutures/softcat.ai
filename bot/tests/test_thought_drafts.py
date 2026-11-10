import json
from types import SimpleNamespace

import pytest

import ai_thoughts_bot as bot
from thought_drafts import prepare_thought_draft, source_url

URL = "https://example.com/report"
BODY = "The [reported result](https://example.com/report) describes one bounded test. " + "A wider claim would need repeated measurements on representative examples. " * 20
PROPOSAL = {"title": 'A model\'s "confidence" needs a test', "summary": "A source claim is a starting point for a defined evaluation.", "tags": ["evaluation", "model-behaviour"], "body": BODY}


def test_sourced_response_becomes_canonical_unpublished_draft():
    draft = prepare_thought_draft(json.dumps(PROPOSAL), {URL}, "2026-09-13")
    assert "\ndraft: true\n" in draft
    assert 'generated_by: "thoughts_bot"' in draft
    assert bot.extract_title(draft) == PROPOSAL["title"]
    assert draft.endswith(BODY.strip() + "\n")
    assert prepare_thought_draft("```json\n" + json.dumps(PROPOSAL) + "\n```", {URL}, "2026-09-13") == draft


@pytest.mark.parametrize("update", [
    {"body": BODY.replace(URL, "https://invented.example/report")},
    {"body": BODY.replace("[reported result](https://example.com/report)", "reported result")},
    {"body": BODY + " https://invented.example/claim"},
    {"body": BODY + " <script>alert(1)</script>"},
    {"body": "too short"}, {"title": "invalid\ntitle"},
    {"tags": ["field-notes", "evaluation"]}, {"tags": ["corrections", "evaluation"]},
    {"tags": ["UPPERCASE", "evaluation"]}, {"draft": False},
])
def test_incomplete_unsourced_or_mislabelled_proposals_are_rejected(update):
    with pytest.raises(ValueError):
        prepare_thought_draft(json.dumps({**PROPOSAL, **update}), {URL}, "2026-09-13")


def test_source_urls_exclude_self_references_and_credentials():
    assert source_url(URL + "#section") == URL
    for url in [None, "javascript:alert(1)", "https://softcat.ai/thoughts/test", "https://user:secret@example.com/report"]:
        assert source_url(url) is None


def test_insufficient_source_inputs_do_not_start_a_provider_call(monkeypatch):
    def fail():
        raise AssertionError("Provider must not be initialised")
    monkeypatch.setattr(bot, "Anthropic", fail)
    assert bot.generate_thought([{"link": ""}] * 20, {}) is None


def test_generation_supplies_sources_and_rejects_truncated_output(monkeypatch):
    calls = []
    response = SimpleNamespace(content=[SimpleNamespace(text=json.dumps(PROPOSAL))], usage=object(), stop_reason="end_turn")
    def create(**kwargs):
        calls.append(kwargs)
        return response
    monkeypatch.setattr(bot, "Anthropic", lambda: SimpleNamespace(messages=SimpleNamespace(create=create)))
    monkeypatch.setenv("THOUGHT_DATE", "2026-09-13")
    entries = [{"title": "Source report", "link": URL, "source": "Example", "summary": "Reported claim"}] * 5
    content, usage = bot.generate_thought(entries, {})
    assert "\ndraft: true\n" in content
    assert URL in calls[0]["messages"][0]["content"]
    assert "Never invent a first-person test" in calls[0]["messages"][0]["content"]
    response.stop_reason = "max_tokens"
    with pytest.raises(ValueError, match="truncated"):
        bot.generate_thought(entries, {})


def test_writer_refuses_public_content_and_existing_files(tmp_path, monkeypatch):
    monkeypatch.setattr(bot, "CONTENT_DIR", tmp_path)
    monkeypatch.setattr(bot, "HISTORY_FILE", tmp_path / "history.json")
    monkeypatch.setenv("THOUGHT_DATE", "2026-09-13")
    committed = []
    monkeypatch.setattr(bot.git_safe, "safe_commit_and_push", lambda *args, **kwargs: committed.append((args, kwargs)))
    draft = prepare_thought_draft(json.dumps(PROPOSAL), {URL}, "2026-09-13")
    with pytest.raises(ValueError, match="unpublished"):
        bot.save_and_push(draft.replace("draft: true", "draft: false"), {}, push=False)
    history = {}
    bot.save_and_push(draft, history, push=False)
    assert history["thoughts"][0]["status"] == "draft"
    assert len(committed) == 1
    with pytest.raises(FileExistsError):
        bot.save_and_push(draft, history, push=False)
    assert len(committed) == 1
