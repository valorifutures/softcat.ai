#!/usr/bin/env bash
# auto-build.sh — Pick the oldest open auto-improve issue and implement it as a PR
# Runs via cron 3x daily. Uses Claude Code headless.
set -euo pipefail

# Allow running from within another Claude Code session or cron
unset CLAUDECODE 2>/dev/null || true

REPO_DIR="/home/coxy412/websites/softcat"
CLAUDE="/home/coxy412/.npm-global/bin/claude"
LOG_DIR="/home/coxy412/logs/auto-improve"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/build-${TIMESTAMP}.log"
LOCK_FILE="/tmp/softcat-build.lock"

mkdir -p "$LOG_DIR"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[$(date)] Build already running (PID $PID), skipping" >> "$LOG_FILE"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"; cd "$REPO_DIR" && git checkout main 2>/dev/null || true' EXIT

cd "$REPO_DIR"

# Start clean on main
git checkout main 2>/dev/null
git pull --ff-only origin main 2>/dev/null || true

# Find the oldest open auto-improve issue (sort by number via jq since gh doesn't support --sort)
ISSUE_JSON=$(gh issue list --label "auto-improve" --state open --json number,title,body,labels -R valorifutures/softcat.ai 2>/dev/null || echo "[]")
ISSUE_NUMBER=$(echo "$ISSUE_JSON" | jq -r 'sort_by(.number) | .[0].number // empty')
ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r 'sort_by(.number) | .[0].title // empty')
ISSUE_BODY=$(echo "$ISSUE_JSON" | jq -r 'sort_by(.number) | .[0].body // empty')

if [ -z "$ISSUE_NUMBER" ]; then
    echo "[$(date)] No open auto-improve issues. Nothing to build." >> "$LOG_FILE"
    exit 0
fi

# Skip if a PR already exists for this issue
EXISTING_PR=$(gh pr list --state open --search "auto/${ISSUE_NUMBER}" -R valorifutures/softcat.ai --json number --jq 'length' 2>/dev/null || echo "0")
if [ "$EXISTING_PR" -gt 0 ]; then
    echo "[$(date)] PR already exists for issue #${ISSUE_NUMBER}, skipping" >> "$LOG_FILE"
    exit 0
fi

# Create branch name from issue
SLUG=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-40)
BRANCH_NAME="auto/${ISSUE_NUMBER}-${SLUG}"

echo "[$(date)] Building issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}" >> "$LOG_FILE"
echo "[$(date)] Branch: ${BRANCH_NAME}" >> "$LOG_FILE"

git checkout -b "$BRANCH_NAME" 2>/dev/null

BUILD_PROMPT="You are the SOFT CAT Builder. Implement the site improvement described below, verify it builds, and create a PR.

## The Issue

**Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}**

${ISSUE_BODY}

## Your Process

1. READ the issue carefully. Understand exactly what needs to change.

2. READ relevant existing files to understand patterns:
   - Read STYLE.md before writing any content
   - Read similar existing files for patterns (layouts, components, content)
   - Read src/styles/global.css for available CSS classes and theme colors
   - Read src/content.config.ts if adding content

3. IMPLEMENT the changes:
   - Follow existing patterns exactly (look at similar files)
   - Follow STYLE.md for all written content
   - Use the existing color scheme and design system
   - Use font-mono for headings and UI elements
   - For new pages: use BaseLayout or PostLayout as wrapper
   - For new content: use correct frontmatter schema from content.config.ts
   - For new lab tools: create Preact TSX component in src/components/lab/ + Astro page in src/pages/lab/

4. VERIFY the build:
   Run: npm run build
   If it fails, fix the errors and try again. Do NOT proceed with a broken build.

5. COMMIT the changes:
   - Stage only the files you changed or created (git add specific files, not git add .)
   - Write a clear commit message
   - Do NOT commit node_modules, dist, .env, or generated files

6. PUSH and create a PR:
   Run: git push -u origin ${BRANCH_NAME}
   Then create a PR:
   gh pr create -R valorifutures/softcat.ai --title \"auto: short description\" --label \"auto-pr\" --body \"Closes #${ISSUE_NUMBER}

## Changes
- bullet list of what changed

## Verification
- Build passes: yes
- Follows STYLE.md: yes

---
*Automated PR by SOFT CAT Builder*\"

## Hard Rules
- Do NOT modify: service/, bot/, .github/workflows/, package.json, package-lock.json
- Do NOT add npm dependencies
- Do NOT push to main
- Do NOT create files outside src/ and public/
- All lab tools must be 100% client-side (no server calls)
- Keep changes minimal and focused on the issue"

$CLAUDE -p "$BUILD_PROMPT" \
    --permission-mode "bypassPermissions" \
    --model sonnet \
    --max-budget-usd 1.00 \
    --allowed-tools "Read Write Edit Glob Grep Bash(git:*) Bash(npm run build:*) Bash(gh pr create:*) Bash(gh issue:*) Bash(ls:*) Bash(cat:*) Bash(node:*)" \
    --no-session-persistence \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "[$(date)] Build finished with exit code $EXIT_CODE" >> "$LOG_FILE"

# Clean up if no PR was created
PR_EXISTS=$(gh pr list --head "$BRANCH_NAME" --state open -R valorifutures/softcat.ai --json number --jq 'length' 2>/dev/null || echo "0")
if [ "$PR_EXISTS" -eq 0 ]; then
    echo "[$(date)] No PR created. Cleaning up branch." >> "$LOG_FILE"
    git checkout main 2>/dev/null
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    git push origin --delete "$BRANCH_NAME" 2>/dev/null || true
fi

# Return to main
git checkout main 2>/dev/null

# Clean up old logs
find "$LOG_DIR" -name "build-*.log" -mtime +30 -delete 2>/dev/null || true
