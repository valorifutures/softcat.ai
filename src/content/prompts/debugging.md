---
title: "Separate the observation from the hypothesis"
description: "Turn an error report into a small discriminating check without presenting a guess as a confirmed cause."
category: "debugging"
tags: ["debugging","evidence","testing"]
prompt: |
  Help diagnose the failure below using only the supplied evidence.

  Return three short sections: Observed, Possible explanation, and Next check. Keep the observation separate from your hypothesis. Propose the smallest check that would distinguish the leading explanation from another plausible one. State what result would support or weaken it. Do not implement a fix, invent a run or assume an unstated data contract. If the intended behaviour is missing, ask one precise question about it.

  Evidence:
  {{evidence}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "You have a reproducible error but have not yet established the right fix."
  inputs:
    evidence: "The exact error, relevant input, code and any known contract."
  exampleValues:
    evidence: |
      Python import job:
      count = int(row['count'])
      The failing raw value is the string '12.0'.
      ValueError: invalid literal for int() with base 10: '12.0'
      The feed's numeric-format contract has not been supplied.
  expected: |
    Observed: int() rejected the string '12.0'. Possible explanation: the feed now represents whole counts using a decimal string. Next check: inspect the feed contract and neighbouring raw values. Ask whether decimal-form strings are allowed. Do not silently round or discard fractional values as a proposed fix.
  checks:
    - "The actual rejected value is preserved."
    - "The feed-format change is a hypothesis, not a confirmed event."
    - "The next check resolves the contract before recommending coercion."
  limits: "A diagnosis needs observations from the real environment. A plausible explanation is not an executed test."
  tool: "/lab/prompt-workbench"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/debugging.md) remains in Git history.
