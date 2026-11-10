---
title: "Review accessibility evidence without inventing a pass"
description: "Identify what supplied markup shows and what still needs keyboard, visual or assistive-technology checks."
category: "accessibility"
tags: ["accessibility","testing","evidence"]
prompt: |
  Review the supplied interface evidence for accessibility concerns.

  Separate findings visible in the evidence from checks that still need to be performed. For each finding, identify the element, the supporting evidence and a small remedy. Do not claim a conformance level, keyboard result, contrast ratio or screen-reader behaviour that has not been tested. Do not treat an automated check as a complete audit. If you cite a standard, verify the exact criterion from its primary source.

  Supplied evidence:
  {{evidence}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "You have markup or a small interaction record and need an honest starting point for testing."
  inputs:
    evidence: "The markup and any actual keyboard, visual or assistive-technology observations."
  exampleValues:
    evidence: |
      Markup only, with no browser or assistive-technology results:
      <button><svg aria-hidden="true"><path d="M0 0h8v8H0z" /></svg></button>
      <input type="email" placeholder="Email">
      No CSS or surrounding labels have been supplied.
  expected: |
    The icon-only button has no name in the supplied markup. Add an appropriate visible label or accessible name. The input lacks a persistent visible label in this excerpt, so add or verify its associated label. Keyboard focus, contrast, reflow and screen-reader behaviour remain untested. Do not award a WCAG conformance level.
  checks:
    - "Findings point to the actual button and input in the excerpt."
    - "No fabricated contrast measurement or keyboard test appears."
    - "Missing surrounding context and the need for real interaction checks are explicit."
  limits: "This prompt helps organise evidence. It is not a replacement for an accessibility audit or testing with disabled users."
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/accessibility-audit.md) remains in Git history.
