"""Link-verification tests (B7/E3 per D6/D12): the dead-link classifier is
the function that can vandalise the public catalogue, so it gets the
hostile-QA table. The 2am-Friday case: marktechpost 403s the bot for three
straight weeks — the write-up must NOT archive.
"""
import httpx
import pytest

import tool_of_the_week as bot


# ---- classifier ------------------------------------------------------------

@pytest.mark.parametrize("code,verdict", [
    (200, "ok"), (301, "ok"), (308, "ok"),
    (404, "dead"), (410, "dead"),
    (403, "unverifiable"),   # bot-blocking is NOT death
    (429, "unverifiable"),   # rate limiting is NOT death
    (500, "unverifiable"), (503, "unverifiable"),
    (None, "unverifiable"),
])
def test_classify_status_codes(code, verdict):
    assert bot.classify_status(code) == verdict


def test_classify_dns_failure_is_dead():
    exc = httpx.ConnectError("[Errno -2] Name or service not known")
    assert bot.classify_status(None, exc) == "dead"


def test_classify_connection_refused_is_dead():
    exc = httpx.ConnectError("All connection attempts failed: connection refused")
    assert bot.classify_status(None, exc) == "dead"


def test_classify_timeout_is_unverifiable():
    assert bot.classify_status(None, httpx.ReadTimeout("timed out")) == "unverifiable"


def test_classify_tls_error_is_unverifiable():
    assert bot.classify_status(None, httpx.ConnectError("TLS handshake failed")) == "unverifiable"


# ---- streak logic -----------------------------------------------------------

def test_streak_archives_after_three_consecutive_dead():
    h = {}
    for i in range(1, 4):
        h, archive = bot.update_streak(h, "x.md", "dead")
        assert h["x.md"]["streak"] == i
        assert archive is (i >= bot.ARCHIVE_AFTER)


def test_ok_resets_streak():
    h, _ = bot.update_streak({}, "x.md", "dead")
    h, _ = bot.update_streak(h, "x.md", "dead")
    h, archive = bot.update_streak(h, "x.md", "ok")
    assert h["x.md"]["streak"] == 0
    assert archive is False
    h, archive = bot.update_streak(h, "x.md", "dead")
    assert h["x.md"]["streak"] == 1
    assert archive is False


def test_unverifiable_never_archives_and_preserves_streak():
    """The marktechpost-403-for-a-month case: streak frozen, no archive."""
    h, _ = bot.update_streak({}, "x.md", "dead")
    h, _ = bot.update_streak(h, "x.md", "dead")
    for _ in range(10):
        h, archive = bot.update_streak(h, "x.md", "unverifiable")
        assert archive is False
    assert h["x.md"]["streak"] == 2  # untouched, not evidence either way


# ---- frontmatter stamping ----------------------------------------------------

FRONT = """---
title: "Example"
description: "x"
date: 2026-06-07
url: "https://example.com/article"
status: experimental
tags: [a]
draft: false
---

Body.
"""


def test_stamp_ok_inserts_last_verified(tmp_path):
    f = tmp_path / "t.md"
    f.write_text(FRONT)
    assert bot.stamp_file(f, "ok", False, "2026-06-10") is True
    txt = f.read_text()
    assert "last_verified: 2026-06-10" in txt
    assert "status: experimental" in txt


def test_stamp_ok_updates_existing_last_verified(tmp_path):
    f = tmp_path / "t.md"
    f.write_text(FRONT.replace("date: 2026-06-07", "date: 2026-06-07\nlast_verified: 2026-06-01"))
    bot.stamp_file(f, "ok", False, "2026-06-10")
    txt = f.read_text()
    assert txt.count("last_verified") == 1
    assert "last_verified: 2026-06-10" in txt


def test_stamp_archive_flips_status(tmp_path):
    f = tmp_path / "t.md"
    f.write_text(FRONT)
    assert bot.stamp_file(f, "dead", True, "2026-06-10") is True
    assert "status: archived" in f.read_text()


def test_stamp_noop_returns_false(tmp_path):
    f = tmp_path / "t.md"
    archived = FRONT.replace("status: experimental", "status: archived")
    f.write_text(archived)
    assert bot.stamp_file(f, "dead", True, "2026-06-10") is False


# ---- corrupt history guard ----------------------------------------------------

def test_corrupt_history_resets(tmp_path, monkeypatch):
    bad = tmp_path / "tool_verify_history.json"
    bad.write_text("{broken")
    monkeypatch.setattr(bot, "VERIFY_HISTORY", bad)
    assert bot.load_verify_history() == {}


def test_urlless_writeups_are_skipped():
    """The 3 site-authored write-ups have no url field — the verify loop's
    frontmatter regex must not match them."""
    for name in ("context-window-viz.md", "softcat-site.md", "token-cost-calculator.md"):
        txt = (bot.CONTENT_DIR / name).read_text()
        assert bot.FRONT_URL.search(txt) is None, name
