#!/usr/bin/env bash
#
# feral-run.sh — run one feral cycle locally, by hand.
#
# This is step 1 of the build order from the loops article: get ONE manual run
# reliable before you ever put it on a schedule. Run this a few times, watch what
# the council does, confirm the gate holds. Only then turn on the workflow.
#
# Usage:
#   ./scripts/feral-run.sh            # run a cycle on a new branch, stop before merge
#   FERAL_MODE=ship ./scripts/feral-run.sh   # (after you trust it) merge if gate passes
#
set -euo pipefail

MODE="${FERAL_MODE:-propose}"
BASE="$(git rev-parse --abbrev-ref HEAD)"
BASE_SHA="$(git rev-parse HEAD)"
GATE_COPY="$(mktemp --suffix=.mjs)"
trap 'rm -f "$GATE_COPY"' EXIT
git show "$BASE_SHA:scripts/feral-gate.mjs" > "$GATE_COPY"

if [ -n "$(git status --porcelain)" ]; then
  echo "Start from a clean working tree so this cycle cannot absorb other work."
  exit 1
fi
node scripts/validate-content.mjs
node scripts/validate-tools-data.mjs
node scripts/validate-horizon-refs.mjs
npm run build
STAMP="$(date +%Y%m%d-%H%M%S)"
BRANCH="feral/cycle-${STAMP}"

echo "── feral cycle ──────────────────────────────────────"
echo "  mode:   ${MODE}"
echo "  base:   ${BASE}"
echo "  branch: ${BRANCH}"
echo "─────────────────────────────────────────────────────"

git checkout -b "${BRANCH}"

# Local runs inherit this shell's access. Use the GitHub workflow for the
# separated generation, validation and publication jobs.
claude -p "/feral-cycle" \
  --dangerously-skip-permissions \
  --max-turns "${FERAL_MAX_TURNS:-60}" \
  --allowedTools "Read,Write,Edit,Glob,Grep,Bash,Task"

git add -A
if git diff --cached --quiet; then
  echo "  cycle produced no changes (deadlock or no-op). nothing to commit."
  git checkout "${BASE}"
  git branch -D "${BRANCH}"
  exit 0
fi
git commit -m "feral: cycle ${STAMP}"

# The gate decides whether this is allowed to ship.
set +e
node "$GATE_COPY" "$BASE_SHA" HEAD
GATE=$?
set -e

if [ "${GATE}" -ne 0 ]; then
  echo "  gate blocked this cycle. branch ${BRANCH} kept for inspection."
  git checkout "${BASE}"
  exit "${GATE}"
fi

node scripts/validate-content.mjs
npm run build

if [ "${MODE}" = "ship" ]; then
  git checkout "${BASE}"
  git merge --no-ff "${BRANCH}" -m "feral: ship cycle ${STAMP}"
  echo "  SHIPPED to ${BASE}."
else
  echo "  PROPOSE mode: gate passed. branch ${BRANCH} is ready."
  echo "  review it, then:  git checkout ${BASE} && git merge --no-ff ${BRANCH}"
  git checkout "${BASE}"
fi
