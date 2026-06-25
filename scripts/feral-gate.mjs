#!/usr/bin/env node
/**
 * feral-gate.mjs — the hard wall.
 *
 * The agents run unconstrained inside their cycle. This script is what actually
 * decides whether their work is allowed to ship. It checks two things the makers
 * cannot talk their way past:
 *
 *   1. SCOPE  — every changed file is inside the feral walls. This is the
 *               locked-door-to-everyone-else's-room guarantee. Even a fully
 *               autonomous, permission-skipping agent physically cannot ship a
 *               change outside its territory, because this fails the run.
 *   2. VERDICT — the critic's latest ledger verdict is PASS.
 *
 * Build success and link checks are run by the workflow around this script.
 *
 * Usage:  node scripts/feral-gate.mjs <base_ref>
 *         exits 0 = ship,  non-zero = block.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ALLOWED = [
  /^src\/pages\/feral\//,
  /^src\/content\/feral\//,
  /^public\/feral\//,
];

const baseRef = process.argv[2] || "origin/main";

function fail(msg) {
  console.error(`\n  FERAL GATE: BLOCKED\n  ${msg}\n`);
  process.exit(1);
}

// 1. SCOPE -----------------------------------------------------------------
let changed = [];
try {
  const out = execSync(`git diff --name-only ${baseRef}...HEAD`, {
    encoding: "utf8",
  });
  changed = out.split("\n").map((l) => l.trim()).filter(Boolean);
} catch (e) {
  fail(`could not diff against ${baseRef}: ${e.message}`);
}

if (changed.length === 0) {
  // No changes at all this cycle is a clean no-op (e.g. a deadlocked cycle).
  console.log("  FERAL GATE: no changes this cycle. Nothing to ship.");
  process.exit(78); // neutral: nothing to do
}

const escapees = changed.filter((f) => !ALLOWED.some((re) => re.test(f)));
if (escapees.length > 0) {
  fail(
    `${escapees.length} file(s) outside the feral walls:\n  - ` +
      escapees.join("\n  - ") +
      `\n\n  Agents may only write under src/pages/feral, src/content/feral, public/feral.`
  );
}
console.log(`  scope ok — ${changed.length} file(s), all inside the walls`);

// 2. VERDICT ---------------------------------------------------------------
let ledger;
try {
  ledger = JSON.parse(readFileSync("src/content/feral/ledger.json", "utf8"));
} catch (e) {
  fail(`could not read ledger: ${e.message}`);
}
const latest = ledger[ledger.length - 1];
if (!latest) fail("ledger is empty — no cycle to verify");

const verdict = latest?.critic?.verdict;
if (verdict !== "PASS") {
  fail(
    `critic verdict on cycle ${latest.cycle} is "${verdict ?? "missing"}", not PASS.\n` +
      `  reasons: ${latest?.critic?.reasons ?? "(none recorded)"}`
  );
}
console.log(`  critic verdict ok — cycle ${latest.cycle}: PASS`);

console.log("\n  FERAL GATE: CLEAR — safe to ship.\n");
process.exit(0);
