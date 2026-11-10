import json
from types import SimpleNamespace
import pytest
from tool_drafts import prepare_tool_draft, assert_tool_draft

SOURCE = "https://example.com/reported-discovery"


def proposal():
    return {"title": "A small discovery", "description": "A reported feature to investigate.", "tags": ["testing", "discovery"], "url": SOURCE, "body": "The [supplied report](" + SOURCE + ") describes a candidate tool for a small workflow. " + "A reviewer should inspect primary documentation and reproduce a bounded example before deciding whether this belongs in the collection. " * 3}


def draft():
    return prepare_tool_draft(json.dumps(proposal()), {SOURCE}, "2026-09-13")


def test_tool_proposal_owns_the_date_source_and_unpublished_state():
    text = draft()
    assert '\ndraft: true\ngenerated_by: "tool_bot"\n' in text
    assert "review:" not in text and "last_verified:" not in text
    assert assert_tool_draft(text)["url"] == SOURCE


@pytest.mark.parametrize("change", [{"draft": False}, {"review": {"reviewedAt": "2026-09-13"}}, {"status": "active"}, {"last_verified": "2026-09-13"}, {"date": "2026-09-13"}, {"url": "https://other.example.com"}, {"body": "<script>alert(1)</script>"}, {"description": "two\nlines"}])
def test_generated_review_state_or_unsupported_content_is_rejected(change):
    with pytest.raises(ValueError):
        prepare_tool_draft(json.dumps(dict(proposal(), **change)), {SOURCE}, "2026-09-13")


def test_duplicate_keys_truncation_and_invented_body_links_are_rejected():
    texts = ['{"title":"one","title":"two"}', '{', json.dumps(dict(proposal(), body=proposal()["body"] + " See [another claim](https://other.example.com)."))]
    for text in texts:
        with pytest.raises(ValueError):
            prepare_tool_draft(text, {SOURCE}, "2026-09-13")


def fixture(tmp_path, monkeypatch):
    import tool_of_the_week as bot
    directory = tmp_path / "src/content/tools"
    directory.mkdir(parents=True)
    retirement = tmp_path / "retirements.json"
    retirement.write_text(json.dumps({"entries": [{"title": "Retired tool", "sourceLink": "https://example.com/retired"}]}))
    style = tmp_path / "STYLE.md"
    style.write_text("Use British English. Attribute reported claims.")
    monkeypatch.setattr(bot, "REPO_DIR", tmp_path)
    monkeypatch.setattr(bot, "CONTENT_DIR", directory)
    monkeypatch.setattr(bot, "RETIREMENTS_FILE", retirement)
    monkeypatch.setattr(bot, "HISTORY_FILE", tmp_path / "history.json")
    monkeypatch.setattr(bot, "STYLE_GUIDE", style)
    monkeypatch.setattr(bot.subprocess, "run", lambda *args, **kwargs: None)
    return bot, directory


def test_writer_preserves_existing_files_and_rejects_retired_sources(tmp_path, monkeypatch):
    bot, directory = fixture(tmp_path, monkeypatch)
    path = directory / "2026-09-13-a-small-discovery.md"
    path.write_text("Existing work")
    with pytest.raises(FileExistsError):
        bot.save_tool_proposal(draft(), {})
    assert path.read_text() == "Existing work"
    for change in [{"title": "Retired tool"}, {"url": "https://example.com/retired"}]:
        text = draft().replace('title: "A small discovery"', 'title: ' + json.dumps(change["title"])) if "title" in change else draft().replace(SOURCE, change["url"])
        with pytest.raises(ValueError, match="retired"):
            bot.save_tool_proposal(text, {})
    assert len(list(directory.iterdir())) == 1


def test_writer_rejects_published_or_injected_frontmatter_before_writing(tmp_path, monkeypatch):
    bot, directory = fixture(tmp_path, monkeypatch)
    for text in [draft().replace("draft: true", "draft: false"), draft().replace("draft: true", "review: {}\ndraft: true")]:
        with pytest.raises(ValueError):
            bot.save_tool_proposal(text, {})
    assert list(directory.iterdir()) == []


def test_validation_failure_removes_the_draft_without_history(tmp_path, monkeypatch):
    bot, directory = fixture(tmp_path, monkeypatch)
    def fail(*args, **kwargs):
        raise bot.subprocess.CalledProcessError(1, "validate-content")
    monkeypatch.setattr(bot.subprocess, "run", fail)
    history = {}
    with pytest.raises(bot.subprocess.CalledProcessError):
        bot.save_tool_proposal(draft(), history)
    assert list(directory.iterdir()) == []
    assert history == {} and not bot.HISTORY_FILE.exists()


def test_successful_proposal_is_canonical_and_history_tracks_its_source(tmp_path, monkeypatch):
    bot, directory = fixture(tmp_path, monkeypatch)
    history = {}
    filename = bot.save_tool_proposal(draft(), history)
    assert assert_tool_draft((directory / filename).read_text())["title"] == "A small discovery"
    assert history["featured"] == [SOURCE]
    assert json.loads(bot.HISTORY_FILE.read_text()) == history


def test_truncated_generation_does_not_write_or_update_history(tmp_path, monkeypatch):
    bot, directory = fixture(tmp_path, monkeypatch)
    response = SimpleNamespace(stop_reason="max_tokens", usage=SimpleNamespace(input_tokens=1, output_tokens=1), content=[SimpleNamespace(text=json.dumps(proposal()))])
    monkeypatch.setattr(bot, "Anthropic", lambda: SimpleNamespace(messages=SimpleNamespace(create=lambda **kwargs: response)))
    entries = [{"title": "A report", "link": SOURCE, "source": "Fixture", "summary": "A supplied description."}]
    with pytest.raises(ValueError, match="truncated"):
        bot.pick_and_write(entries, {})
    assert list(directory.iterdir()) == [] and not bot.HISTORY_FILE.exists()


def test_link_verifier_skips_unreviewed_drafts(tmp_path, monkeypatch):
    bot, directory = fixture(tmp_path, monkeypatch)
    (directory / "draft.md").write_text(draft())
    monkeypatch.setattr(bot, "VERIFY_HISTORY", tmp_path / "verify.json")
    checked, runs = [], []
    monkeypatch.setattr(bot, "check_url", lambda url: checked.append(url) or "ok")
    monkeypatch.setattr(bot, "log_run", lambda *args, **kwargs: runs.append(kwargs))
    bot.run_verify_job(0)
    assert checked == []
    assert "last_verified:" not in (directory / "draft.md").read_text()
    assert runs[0]["items_found"] == runs[0]["items_published"] == 0


def test_main_records_one_proposal_and_zero_publications(tmp_path, monkeypatch):
    bot, _ = fixture(tmp_path, monkeypatch)
    monkeypatch.setattr(bot, "fetch_feed_entries", lambda: [{"link": SOURCE}])
    monkeypatch.setattr(bot, "pick_and_write", lambda *args: "example.md")
    monkeypatch.setattr(bot, "run_verify_job", lambda *args: None)
    monkeypatch.setattr(bot, "ping_healthcheck", lambda *args: None)
    runs, commits = [], []
    monkeypatch.setattr(bot, "log_run", lambda *args, **kwargs: runs.append(kwargs))
    monkeypatch.setattr(bot, "git_commit_and_push", lambda filename: commits.append(filename))
    bot.main()
    assert runs[0]["items_published"] == 0 and runs[0]["items_drafted"] == 1
    assert commits == ["example.md"]
