---
title: "Refactor without changing the contract"
description: "Request a small rewrite with explicit behaviour-preservation checks, including awkward inputs already allowed by the code."
category: "refactoring"
tags: ["refactoring","testing","code"]
prompt: |
  Refactor only the supplied function for readability. Preserve its current externally visible behaviour, including whitespace, truthiness and existing error behaviour unless the contract explicitly permits a change.

  Return the revised function and a short before/after check table. Do not add validation, trim text, rename public fields or introduce dependencies. Distinguish checks you ran from checks you propose. If a cleaner rewrite requires a behaviour change, explain it instead of making that change silently.

  Contract:
  {{contract}}

  Code:
  {{code}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "You want a readability change with a deliberately narrow scope."
  inputs:
    contract: "The behaviours that must remain stable."
    code: "The function to refactor."
  exampleValues:
    contract: |
      Truthy active values use name.toUpperCase(). Falsy active values return Inactive without reading name. Keep spaces in names. Do not add input validation.
    code: |
      export function label(record) {
        if (record.active) {
          return record.name.toUpperCase();
        }
        return 'Inactive';
      }
  expected: |
    export const label = record => record.active ? record.name.toUpperCase() : 'Inactive';

    { active: true, name: ' Juniper ' } => ' JUNIPER '
    { active: false, name: null } => 'Inactive'
    { active: 1, name: 'hello' } => 'HELLO'
    { active: 0, name: 'unused' } => 'Inactive'
  checks:
    - "The surrounding spaces remain in the active name."
    - "A falsy active value does not read or convert name."
    - "Truthy values such as 1 retain their existing behaviour."
  limits: "These four examples were checked against both functions. They do not prove equivalence for every possible JavaScript object or side effect."
  tool: "/lab/prompt-diff"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/refactoring.md) remains in Git history.
