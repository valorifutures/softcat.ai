"""Shared safe-git plumbing for SOFT CAT bots.

Every bot mutates the SAME working tree (this repo) on overlapping systemd
timers, and `scripts/auto-build.sh` checks out feature branches in it too.
Nothing coordinated those git operations: two concurrent ref/index writes — or
a single write interrupted midway (dropped SSH session, killed process, power
loss) — can leave the repository corrupt. This module exists because exactly
that happened: an interrupted ref write left `.git/HEAD` and two branch refs as
zero-byte files, which made the whole tree look like a fresh repo and silently
broke every bot that ran afterwards.

`safe_commit_and_push()` is the single entry point bots should use to land a
commit on `main`. It:

  1. Takes a process-wide exclusive ``flock`` (``/tmp/softcat-git.lock``) so no
     two git-mutating runs — bot vs bot, bot vs auto-build — ever overlap.
  2. Verifies repo health (HEAD resolves, no zero-byte refs) BEFORE touching
     anything, and raises :class:`RepoCorruptError` instead of piling commits on
     top of a broken repo. A bot that catches this should ping its failure URL
     and exit, so a human is alerted while the damage is still small.
  3. Runs ``stash -> pull --rebase -> stash pop -> add -> commit -> push``, with
     the push retried after a fresh rebase on a non-fast-forward.

For branch-based work (e.g. opening a proposal PR) use :func:`git_lock` directly
to wrap the git operations under the same lock.
"""

from __future__ import annotations

import errno
import fcntl
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

# bot/ -> repo root
REPO_DIR = Path(__file__).resolve().parent.parent
LOCK_PATH = "/tmp/softcat-git.lock"
LOCK_TIMEOUT = 300  # seconds a bot will wait for the lock before giving up
PUSH_RETRIES = 3


class RepoCorruptError(RuntimeError):
    """The working tree's git metadata is in an unusable state.

    Raised before any mutation, so callers can alert and abort without making
    the corruption worse.
    """


class GitLockTimeout(RuntimeError):
    """Could not acquire the shared git lock within the timeout."""


class WrongBranchError(RuntimeError):
    """The working tree is not on the branch the bot expected to commit to."""


def _git(args, *, check=True, capture=True):
    """Run a git command in REPO_DIR."""
    return subprocess.run(
        ["git", "-C", str(REPO_DIR), *args],
        check=check,
        capture_output=capture,
        text=True,
    )


@contextmanager
def git_lock(timeout: int = LOCK_TIMEOUT):
    """Hold an exclusive, process-wide lock on the shared working tree.

    Serializes every git-mutating sequence across all bots and auto-build so
    their ref/index writes can never interleave. Blocks (polling) up to
    ``timeout`` seconds, then raises :class:`GitLockTimeout` rather than risk a
    concurrent run.
    """
    fd = open(LOCK_PATH, "w")
    deadline = time.monotonic() + timeout
    try:
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError as exc:
                if exc.errno not in (errno.EAGAIN, errno.EACCES):
                    raise
                if time.monotonic() >= deadline:
                    raise GitLockTimeout(
                        f"git lock held by another process for >{timeout}s"
                    ) from exc
                time.sleep(1.0)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            fd.close()


def _zero_byte_refs() -> list[str]:
    """Return any loose ref files that are empty — the classic interrupted-write
    corruption signature."""
    heads = REPO_DIR / ".git" / "refs" / "heads"
    bad = []
    if heads.is_dir():
        for ref in heads.rglob("*"):
            if ref.is_file() and ref.stat().st_size == 0:
                bad.append(str(ref.relative_to(REPO_DIR / ".git")))
    return bad


def _local_ref_targets() -> dict:
    """Map every local branch ref -> the raw SHA (or ``ref:`` target) it records.

    Read straight from the filesystem (loose refs + packed-refs) rather than via
    ``git for-each-ref``, because git's own ref enumeration can choke once a ref
    is already broken — exactly when we most need to inspect it.
    """
    git_dir = REPO_DIR / ".git"
    targets: dict[str, str] = {}
    heads = git_dir / "refs" / "heads"
    if heads.is_dir():
        for ref in heads.rglob("*"):
            if ref.is_file():
                name = "refs/heads/" + str(ref.relative_to(heads)).replace("\\", "/")
                targets[name] = ref.read_text(errors="replace").strip()
    packed = git_dir / "packed-refs"
    if packed.is_file():
        for line in packed.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line or line[0] in "#^":
                continue
            parts = line.split(" ", 1)
            if len(parts) == 2 and parts[1].startswith("refs/heads/"):
                targets.setdefault(parts[1], parts[0])
    return targets


def _bad_object_refs() -> list[str]:
    """Local branch refs whose recorded SHA does not resolve to an existing
    object.

    This is the corruption that silently broke radar_bot for a month: a stray
    ``refs/heads/add/horizon-ci-validator`` pointed at a missing object, so every
    ``git pull --rebase`` died with ``fatal: bad object refs/heads/...`` and no
    content could be pushed. A zero-byte scan misses it (the ref file has a
    plausible 40-char SHA), so check it explicitly.
    """
    bad = []
    for name, target in _local_ref_targets().items():
        if not target or target.startswith("ref:"):
            continue  # empty -> covered by zero-byte scan; symref -> not an object
        if _git(["cat-file", "-e", target], check=False).returncode != 0:
            bad.append(name)
    return bad


def check_repo_health() -> None:
    """Raise :class:`RepoCorruptError` if the repo is in a broken state this
    module guards against.

    Cheap and targeted (no full ``fsck``): confirms HEAD resolves, no loose ref
    file is zero bytes, and no local branch ref points at a missing object.
    Catches both the interrupted-write signature that motivated this module and
    the bad-object ref that stalled radar_bot for a month.
    """
    if not (REPO_DIR / ".git").exists():
        raise RepoCorruptError(f"{REPO_DIR} is not a git repository")

    empty = _zero_byte_refs()
    if empty:
        raise RepoCorruptError(
            "zero-byte (corrupt) ref file(s): " + ", ".join(empty)
        )

    head = _git(["rev-parse", "--verify", "-q", "HEAD"], check=False)
    if head.returncode != 0 or not head.stdout.strip():
        raise RepoCorruptError(
            "HEAD does not resolve to a valid commit "
            f"(git rev-parse exited {head.returncode})"
        )

    broken = _bad_object_refs()
    if broken:
        raise RepoCorruptError(
            "branch ref(s) pointing at a missing object: " + ", ".join(broken)
        )


def current_branch() -> str:
    """Return the checked-out branch name (empty string if detached)."""
    res = _git(["symbolic-ref", "--quiet", "--short", "HEAD"], check=False)
    return res.stdout.strip()


def _stash_push() -> bool:
    """Stash stray changes (incl. untracked) so pull --rebase can't fail on a
    dirty tree. Returns True if something was stashed."""
    res = _git(["stash", "--include-untracked"])
    return "No local changes" not in res.stdout


def safe_commit_and_push(
    paths: list[str],
    message: str,
    *,
    push: bool = True,
    retries: int = PUSH_RETRIES,
    expected_branch: str = "main",
) -> bool:
    """Land ``paths`` on ``expected_branch`` as one commit, safely.

    Serialized under the shared lock and gated on a health check. Returns True
    if a commit was created, False if there was nothing to commit. Raises
    :class:`RepoCorruptError` if the repo is broken before we start.

    If ``expected_branch`` is set (the default ``"main"``) and the working tree
    is on a different branch, raises :class:`WrongBranchError` rather than
    committing content to the wrong place. This guards against landing on a
    transient build/proposal branch that auto-build or horizon left checked out
    (the very situation this incident left HEAD in). Pass ``expected_branch=""``
    to skip the check.

    ``paths`` are repo-relative; they are staged explicitly (never ``git add
    .``). The push is retried after a fresh rebase on non-fast-forward.
    """
    with git_lock():
        check_repo_health()

        if expected_branch:
            on = current_branch()
            if on != expected_branch:
                raise WrongBranchError(
                    f"refusing to commit: on '{on or '(detached)'}', "
                    f"expected '{expected_branch}'"
                )

        stashed = _stash_push()
        try:
            _git(["pull", "--rebase"])
        except subprocess.CalledProcessError:
            # Leave the repo in a clean state rather than mid-rebase.
            _git(["rebase", "--abort"], check=False)
            raise
        finally:
            if stashed:
                _git(["stash", "pop"])

        _git(["add", "--", *paths])

        if _git(["diff", "--cached", "--quiet"], check=False).returncode == 0:
            print("[git_safe] Nothing staged to commit.")
            return False

        _git(["commit", "-m", message])

        if not push:
            print(f"[git_safe] Committed (no push): {message.splitlines()[0]}")
            return True

        last_err = None
        for attempt in range(1, retries + 1):
            res = _git(["push"], check=False)
            if res.returncode == 0:
                print(f"[git_safe] Pushed: {message.splitlines()[0]}")
                return True
            last_err = res.stderr.strip()
            print(
                f"[git_safe] push attempt {attempt}/{retries} failed "
                f"({last_err}); rebasing and retrying"
            )
            _git(["pull", "--rebase"], check=False)

        raise RuntimeError(f"git push failed after {retries} attempts: {last_err}")


def main(argv: list[str]) -> int:
    """CLI health check — used by auto-build.sh and ad-hoc pre-flight.

    ``python3 bot/git_safe.py --check`` exits 0 if healthy, 1 if corrupt.
    """
    try:
        check_repo_health()
    except RepoCorruptError as exc:
        print(f"REPO CORRUPT: {exc}", file=sys.stderr)
        return 1
    print(f"repo healthy: {REPO_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
