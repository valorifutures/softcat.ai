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
STAMP="$(date +%Y%m%d-%H%M%S)"
BRANCH="feral/cycle-${STAMP}"

echo "── feral cycle ──────────────────────────────────────"
echo "  mode:   ${MODE}"
echo "  base:   ${BASE}"
echo "  branch: ${BRANCH}"
echo "─────────────────────────────────────────────────────"

git checkout -b "${BRANCH}"

# The heartbeat: invoke Claude Code headless to run one full council cycle.
# --dangerously-skip-permissions lets it work unattended; the gate, not
# permissions, is what contains it. It can do anything — but only inside the
# walls, because anything outside fails feral-gate and never merges.
claude -p "/feral-cycle" \
  --dangerously-skip-permissions \
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
node scripts/feral-gate.mjs "${BASE}"
GATE=$?
set -e

if [ "${GATE}" -ne 0 ]; then
  echo "  gate blocked this cycle. branch ${BRANCH} kept for inspection."
  git checkout "${BASE}"
  exit "${GATE}"
fi

if [ "${MODE}" = "ship" ]; then
  git checkout "${BASE}"
  git merge --no-ff "${BRANCH}" -m "feral: ship cycle ${STAMP}"
  echo "  SHIPPED to ${BASE}."
else
  echo "  PROPOSE mode: gate passed. branch ${BRANCH} is ready."
  echo "  review it, then:  git checkout ${BASE} && git merge --no-ff ${BRANCH}"
  git checkout "${BASE}"
fi
