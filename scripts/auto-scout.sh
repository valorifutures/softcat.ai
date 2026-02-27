#!/usr/bin/env bash
# auto-scout.sh — Analyze softcat.ai and create GitHub Issues for improvements
# Runs via cron 2x daily. Uses Claude Code headless.
set -euo pipefail

# Allow running from within another Claude Code session or cron
unset CLAUDECODE 2>/dev/null || true

REPO_DIR="/home/coxy412/websites/softcat"
CLAUDE="/home/coxy412/.npm-global/bin/claude"
LOG_DIR="/home/coxy412/logs/auto-improve"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/scout-${TIMESTAMP}.log"
LOCK_FILE="/tmp/softcat-scout.lock"

mkdir -p "$LOG_DIR"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[$(date)] Scout already running (PID $PID), skipping" >> "$LOG_FILE"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

cd "$REPO_DIR"

# Stay on main and up to date
git checkout main 2>/dev/null
git pull --ff-only origin main 2>/dev/null || true

# Don't flood — cap at 10 open issues
OPEN_COUNT=$(gh issue list --label "auto-improve" --state open -R valorifutures/softcat.ai --json number --jq 'length' 2>/dev/null || echo "0")
if [ "$OPEN_COUNT" -ge 10 ]; then
    echo "[$(date)] Too many open auto-improve issues ($OPEN_COUNT), skipping scout" >> "$LOG_FILE"
    exit 0
fi

echo "[$(date)] Starting scout run. Open issues: $OPEN_COUNT" >> "$LOG_FILE"

$CLAUDE -p 'You are the SOFT CAT Scout. Create exactly 2 GitHub issues for improvements to softcat.ai.

1. First, read src/pages/ listing, TODO.md, and STYLE.md to understand the site.
2. Check existing issues: gh issue list --label "auto-improve" --state open -R valorifutures/softcat.ai
   Do NOT create duplicates of existing issues.
3. Search the web for "trending AI developer tools this week" and "AI site SEO best practices 2026".
4. Create 2 issues. For each, run:

gh issue create -R valorifutures/softcat.ai --title "the title" --label "auto-improve" --label "CATEGORY" --body "## What
description of the change

## Why
why this matters

## How
1. step by step plan
2. with specific files

## Files to touch
- path/to/file"

Pick CATEGORY from: content, design, seo, lab-tool, feature.

Rules:
- Issues must be specific and actionable (not vague like "improve SEO")
- Each must be completable in one PR by an AI worker with no human input
- Do NOT require new npm dependencies, server changes, API keys, or changes to service/bot/.github
- Rotate between categories. Prioritise things that drive traffic and engagement.
- Check TODO.md first for ready-to-go ideas.' \
    --model sonnet \
    --max-budget-usd 0.50 \
    --permission-mode bypassPermissions \
    --allowed-tools "Read Glob Grep WebSearch WebFetch Bash(gh:*) Bash(ls:*) Bash(git log:*)" \
    --no-session-persistence \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "[$(date)] Scout finished with exit code $EXIT_CODE" >> "$LOG_FILE"

# Clean up old logs
find "$LOG_DIR" -name "scout-*.log" -mtime +30 -delete 2>/dev/null || true
