import json
import pytest
from prompt_drafts import prepare_prompt_drafts, assert_prompt_draft


def proposal(title="A small request"):
    return {"title": title, "description": "Check a supplied example.", "category": "testing", "tags": ["testing", "evidence"], "prompt": "Review {{code}} and state one check.\n```text\ndraft: false\n```", "notes": "Example input: a boundary value. Expected result: identify the relevant assertion. Do not claim an executed test."}


def test_canonical_drafts_preserve_prompt_text_but_own_the_review_state():
    drafts = prepare_prompt_drafts(json.dumps([proposal('A "quoted" request'), proposal("Another request")]))
    assert len(drafts) == 2
    assert '  draft: false' in drafts[0]
    assert '\ndraft: true\ngenerated_by: "prompt_bot"\n---' in drafts[0]
    assert assert_prompt_draft(drafts[0])["title"] == 'A "quoted" request'


@pytest.mark.parametrize("change", [{"draft": False}, {"recipe": {"version": 1}}, {"tags": ["bad tag"]}, {"category": "Bad category"}, {"prompt": "No variables"}, {"notes": "<script>alert(1)</script>"}, {"title": "two\nlines"}])
def test_invalid_or_self_reviewed_proposals_are_rejected(change):
    with pytest.raises(ValueError):
        prepare_prompt_drafts(json.dumps([dict(proposal(), **change), proposal("Another request")]))


def test_duplicate_keys_titles_and_truncated_batches_are_rejected():
    for text in ['[{"title":"one","title":"two"}]', json.dumps([proposal(), proposal()]), json.dumps([proposal()]), '[']:
        with pytest.raises(ValueError):
            prepare_prompt_drafts(text)


def test_writer_guard_rejects_public_drafts_and_extra_top_level_metadata():
    draft = prepare_prompt_drafts(json.dumps([proposal(), proposal("Another request")]))[0]
    for text in [draft.replace('\ndraft: true\n', '\ndraft: false\n'), draft.replace('\ndraft: true\n', '\nrecipe: {version: 1}\ndraft: true\n'), draft.replace('  Review', 'reviewedAt: 2026-09-13\n  Review')]:
        with pytest.raises(ValueError):
            assert_prompt_draft(text)


def writer_fixture(tmp_path, monkeypatch):
    import prompt_library_bot as bot
    directory = tmp_path / "src" / "content" / "prompts"
    directory.mkdir(parents=True)
    retired = tmp_path / "retired.json"
    retired.write_text(json.dumps({"entries": [{"id": "retired-task", "title": "Retired task"}]}))
    monkeypatch.setattr(bot, "REPO_DIR", tmp_path)
    monkeypatch.setattr(bot, "CONTENT_DIR", directory)
    monkeypatch.setattr(bot, "RETIREMENTS_FILE", retired)
    monkeypatch.setattr(bot, "HISTORY_FILE", tmp_path / "history.json")
    commits, runs = [], []
    monkeypatch.setattr(bot.subprocess, "run", lambda *args, **kwargs: None)
    monkeypatch.setattr(bot.git_safe, "safe_commit_and_push", lambda *args, **kwargs: commits.append((args, kwargs)))
    monkeypatch.setattr(bot, "log_run", lambda *args, **kwargs: runs.append(kwargs))
    return bot, directory, commits, runs


def test_writer_rejects_the_entire_batch_before_writing_a_public_item(tmp_path, monkeypatch):
    bot, directory, commits, _ = writer_fixture(tmp_path, monkeypatch)
    drafts = prepare_prompt_drafts(json.dumps([proposal(), proposal("Another request")]))
    drafts[1] = drafts[1].replace('\ndraft: true\n', '\ndraft: false\n')
    with pytest.raises(ValueError):
        bot.save_and_push(drafts, {}, push=False)
    assert list(directory.iterdir()) == []
    assert commits == []


def test_writer_preserves_existing_work_and_does_not_recreate_a_retired_title(tmp_path, monkeypatch):
    bot, directory, commits, _ = writer_fixture(tmp_path, monkeypatch)
    existing = directory / "a-small-request.md"
    existing.write_text("Existing human work")
    for title in ["A small request", "Retired task"]:
        drafts = prepare_prompt_drafts(json.dumps([proposal(title), proposal("Another request")]))
        with pytest.raises(ValueError):
            bot.save_and_push(drafts, {}, push=False)
    assert existing.read_text() == "Existing human work"
    assert len(list(directory.iterdir())) == 1
    assert commits == []


def test_validated_drafts_log_zero_publications_and_keep_their_unpublished_state(tmp_path, monkeypatch):
    bot, directory, commits, runs = writer_fixture(tmp_path, monkeypatch)
    drafts = prepare_prompt_drafts(json.dumps([proposal(), proposal("Another request")]))
    history = {}
    bot.save_and_push(drafts, history, push=False, run_details={"duration_s": 1})
    assert len(list(directory.iterdir())) == 2
    assert all(assert_prompt_draft(path.read_text()) for path in directory.iterdir())
    assert runs[0]["items_published"] == 0
    assert runs[0]["items_drafted"] == 2
    assert all(entry["status"] == "draft" for entry in history["prompts"])
    assert len(commits) == 1
    assert commits[0][1]["push"] is False


def test_failed_content_validation_leaves_no_batch_files_or_history(tmp_path, monkeypatch):
    bot, directory, commits, runs = writer_fixture(tmp_path, monkeypatch)
    def fail(*args, **kwargs):
        raise bot.subprocess.CalledProcessError(1, "validate-content")
    monkeypatch.setattr(bot.subprocess, "run", fail)
    drafts = prepare_prompt_drafts(json.dumps([proposal(), proposal("Another request")]))
    history = {}
    with pytest.raises(bot.subprocess.CalledProcessError):
        bot.save_and_push(drafts, history, push=False, run_details={"duration_s": 1})
    assert list(directory.iterdir()) == []
    assert history == {}
    assert commits == runs == []


def test_failed_exclusive_create_cleans_our_first_file_but_keeps_competing_work(tmp_path, monkeypatch):
    bot, directory, commits, runs = writer_fixture(tmp_path, monkeypatch)
    original_open = bot.Path.open
    def race(path, mode="r", *args, **kwargs):
        if path.name == "another-request.md" and mode == "x":
            with original_open(path, "w") as handle:
                handle.write("Competing work")
        return original_open(path, mode, *args, **kwargs)
    monkeypatch.setattr(bot.Path, "open", race)
    drafts = prepare_prompt_drafts(json.dumps([proposal(), proposal("Another request")]))
    history = {}
    with pytest.raises(FileExistsError):
        bot.save_and_push(drafts, history, push=False, run_details={"duration_s": 1})
    assert [path.name for path in directory.iterdir()] == ["another-request.md"]
    assert (directory / "another-request.md").read_text() == "Competing work"
    assert history == {}
    assert commits == runs == []


def test_partial_write_failure_removes_only_the_created_batch(tmp_path, monkeypatch):
    bot, directory, commits, runs = writer_fixture(tmp_path, monkeypatch)
    original_open = bot.Path.open
    class FailingWriter:
        def __init__(self, handle):
            self.handle = handle
        def __enter__(self):
            return self
        def __exit__(self, *args):
            self.handle.close()
        def write(self, value):
            self.handle.write(value[:5])
            raise OSError("Simulated storage failure")
    def fail_write(path, mode="r", *args, **kwargs):
        handle = original_open(path, mode, *args, **kwargs)
        return FailingWriter(handle) if path.name == "another-request.md" and mode == "x" else handle
    monkeypatch.setattr(bot.Path, "open", fail_write)
    drafts = prepare_prompt_drafts(json.dumps([proposal(), proposal("Another request")]))
    history = {}
    with pytest.raises(OSError, match="Simulated storage failure"):
        bot.save_and_push(drafts, history, push=False, run_details={"duration_s": 1})
    assert list(directory.iterdir()) == []
    assert history == {}
    assert commits == runs == []
