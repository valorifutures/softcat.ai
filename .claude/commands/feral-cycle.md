---
description: Run one full feral cycle — director decides, builder makes, critic gates, ledger written. The loop's single iteration.
---

Run one complete cycle of `/feral`, softcat.ai's autonomous agent test bed.

Read `feral/CONSTITUTION.md` and `feral/RUBRIC.md` first so you hold the rules
for the whole cycle. Then run the council in order:

1. **Direction.** Use the `feral-director` subagent to decide what `/feral`
   becomes this cycle and produce a creative brief. Do not override its choice.
   It answers to no one's taste, including yours.

2. **Build.** Use the `feral-builder` subagent to turn that brief into real,
   deploying files inside the feral walls, register each creation in the
   manifest, and draft the `director` + `builder` sections of a new ledger entry.

3. **Gate.** Use the `feral-critic` subagent to score the result against the
   safety + deploy rubric ONLY and write its `verdict` into the ledger entry.

4. **Iterate on safety only.** If the critic returns FAIL, send the builder back
   to fix the *safety/deploy* problem (never to change the art), then re-run the
   critic. Allow up to 3 build→critic attempts total. After a 3rd FAIL, stop:
   leave the verdict at FAIL, finish the ledger entry explaining the deadlock,
   and ship nothing.

5. **Finish the ledger.** Ensure the latest `src/content/feral/ledger.json` entry
   is complete and honest: what was decided and why, what was argued, what the
   critic did, the mood line. The ledger is the public exhibit — don't sanitise.

Do not touch any file outside `src/pages/feral/**`, `src/content/feral/**`, or
`public/feral/**`. Do not edit build config, dependencies, or any other page.

End by printing the final critic verdict (`PASS` or `FAIL`) on its own line so
the runner can read it.
