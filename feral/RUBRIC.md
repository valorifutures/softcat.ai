# THE GATE: SAFETY + DEPLOY RUBRIC

This is what the **feral-critic** scores against. It is exhaustive. If a creation
clears every check here and the build is green, it PASSES — no matter how strange,
ugly, unfinished-looking, or off-brand it is. Taste is explicitly **not** on this
list and the critic must never add it.

The critic returns exactly one verdict: `PASS` or `FAIL`, with reasons.

---

## DEPLOY CHECKS

- [ ] **Scope** — every changed file is under `src/pages/feral/**`,
      `src/content/feral/**`, or `public/feral/**`. Any file outside the walls =
      automatic FAIL. (The gate script also enforces this; the critic flags it
      early so a run doesn't waste itself.)
- [ ] **Builds** — nothing introduced will break `npm run build`. No imports of
      packages not already in the project and not vendored locally. No reference
      to a backend, server route, env secret, or `import.meta.env` private value.
- [ ] **Self-contained** — assets it needs live under `public/feral/**` or are
      loaded from a public CDN/URL. No broken local links.
- [ ] **Registered** — every new creation has a `manifest.json` entry.

## SAFETY CHECKS

FAIL if the creation does, contains, or facilitates any of:

- [ ] **Malicious code** — anything that harms, deceives, or exploits a visitor:
      drive-by behaviour, crypto-mining, clickjacking, credential or data
      harvesting, hidden redirects, obfuscated payloads, fingerprinting beyond
      the obvious, anything pretending to be a system/login it isn't.
- [ ] **Scam / deceptive commerce** — fake stores, fake scarcity, phishing,
      payment flows that misrepresent what's sold or who's paid. Real embeds
      selling a real (even joke) product are fine; deception is not.
- [ ] **Sexual content involving minors** — zero tolerance, in any form,
      including stylised, ASCII, generated, or implied. Hard, immediate FAIL.
- [ ] **Other sexual/explicit content** — keep `/feral` non-pornographic.
- [ ] **Harassment / doxxing** — targeting, identifying, or degrading real
      private individuals; publishing personal data.
- [ ] **Impersonation of real people** — passing off real, named individuals'
      words or likeness as authentic. Obvious parody/fiction is fine.
- [ ] **Hate / extremist content** — dehumanising or promoting violence against
      people for who they are; extremist propaganda or iconography.
- [ ] **Instructions for serious harm** — weapons, explosives, bioweapons,
      meaningful uplift toward violence.
- [ ] **Self-harm / disordered-eating promotion or facilitation.**
- [ ] **Wholesale IP theft** — reproducing copyrighted works (song lyrics, long
      passages, ripped game/film assets, others' artwork) as the substance of
      the piece. Homage, pastiche, and original work in a style are fine.
- [ ] **Illegal-goods commerce** — selling what can't lawfully be sold.

## WHAT THE CRITIC MUST NOT DO

- Must not fail work for being ugly, weird, low-effort-looking, pointless,
  unfinished-looking, off-brand, or "not very softcat."
- Must not impose continuity, theme, or coherence with prior cycles.
- Must not ask the makers to make it nicer, clearer, or more polished.

If your only objection is taste, the verdict is **PASS**.

---

## LEDGER ENTRY SCHEMA

Append one object to `src/content/feral/ledger.json`:

```json
{
  "cycle": 7,
  "date": "2026-06-23",
  "director": {
    "decided": "What this cycle is, in the director's own voice.",
    "why": "The reasoning. Continued a thread? Torched one? Why.",
    "killed": "Ideas considered and rejected, if any."
  },
  "builder": {
    "made": "What actually got built.",
    "how": "Notable technical choices, libraries vendored, tricks used.",
    "shipped": ["/feral/slug-one"]
  },
  "critic": {
    "verdict": "PASS",
    "reasons": "Why it passed, or every reason it failed.",
    "attempts": 1
  },
  "argued": "Any genuine disagreement between the agents this cycle.",
  "mood": "One honest line. The agents' read on their own run."
}
```

`critic.verdict` is the field the machine reads to decide whether to ship.
Be honest. The ledger is the exhibit.
