#!/usr/bin/env bash
# glossary-scout.sh — Scan AI news for new terminology and raise glossary issues
# Runs weekly Monday 09:00 UTC via cron. Uses Claude Code headless.
set -euo pipefail

unset CLAUDECODE 2>/dev/null || true

REPO_DIR="/home/coxy412/websites/softcat"
CLAUDE="/home/coxy412/.npm-global/bin/claude"
LOG_DIR="/home/coxy412/logs/auto-improve"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/glossary-scout-${TIMESTAMP}.log"
LOCK_FILE="/tmp/softcat-glossary-scout.lock"

mkdir -p "$LOG_DIR"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[$(date)] Glossary scout already running (PID $PID), skipping" >> "$LOG_FILE"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

cd "$REPO_DIR"

git checkout main 2>/dev/null
git pull --ff-only origin main 2>/dev/null || true

# Cap open glossary issues at 10
OPEN_COUNT=$(gh issue list --label "glossary" --state open -R valorifutures/softcat.ai --json number --jq 'length' 2>/dev/null || echo "0")
if [ "$OPEN_COUNT" -ge 10 ]; then
    echo "[$(date)] Too many open glossary issues ($OPEN_COUNT), skipping" >> "$LOG_FILE"
    exit 0
fi

echo "[$(date)] Starting glossary scout. Open glossary issues: $OPEN_COUNT" >> "$LOG_FILE"

$CLAUDE -p 'You are the SOFT CAT Glossary Scout. Your job is to find 5 new AI terms worth defining and raise GitHub issues for each.

## Step 1: Check existing glossary
Run: ls src/content/glossary/
These terms already exist. Do NOT create duplicates.

Also check open issues: gh issue list --label "glossary" --state open -R valorifutures/softcat.ai
Do NOT duplicate any open issue.

## Step 2: Research new terms
Search the web for AI news, model releases, and developer discussions from the past 7 days. Look for:
- New model names or families (e.g. a new model release)
- New techniques or methods (e.g. a newly published approach)
- New frameworks or tools gaining traction
- Jargon that developers are using but may not understand

Prefer terms with clear, stable definitions over hype or buzzwords. Skip terms that are just product names with no conceptual substance.

## Step 3: Create issues
For each term, run:

gh issue create -R valorifutures/softcat.ai \
  --title "Add glossary entry: [Term Name]" \
  --label "glossary" --label "content" --label "auto-improve" \
  --body "## Term
[Term name]

## Definition
[2-3 sentence plain-English definition]

## Why now
[Why this term is relevant this week — what happened, what was released, what changed]

## Source
[Link or reference to where this term appeared]

## Suggested tags
[comma-separated tags for the entry]

## Related terms
[other glossary terms this relates to]"

Create exactly 5 issues. Each term must be distinct and genuinely useful to define.' \
    --model sonnet \
    --max-budget-usd 0.50 \
    --permission-mode bypassPermissions \
    --allowed-tools "Read Glob Grep WebSearch WebFetch Bash(gh:*) Bash(ls:*) Bash(git log:*)" \
    --no-session-persistence \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "[$(date)] Glossary scout finished with exit code $EXIT_CODE" >> "$LOG_FILE"

find "$LOG_DIR" -name "glossary-scout-*.log" -mtime +30 -delete 2>/dev/null || true
