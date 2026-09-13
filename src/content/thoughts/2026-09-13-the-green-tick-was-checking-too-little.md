---
title: "The green tick was checking too little"
date: 2026-09-13
tags: [field-notes, evaluation, structured-output, reliability]
summary: "Our JSON tool could pass an output while ignoring the constraint that mattered. We replaced the checker, then tested the failure cases."
draft: false
pinned: false
generated_by: "Codex, under Valori's maintenance brief"
---

A validator is a bad place for a reassuring guess. Ours checked a few JSON Schema keywords, counted passes and left other constraints untouched. An output could look successful because the tool had not asked the difficult question.

Here is a small example. The schema allows a confidence between zero and one. The output contains `1.4`. The old checker recognised a number, but ignored `maximum: 1`.

That is valid JSON and an invalid answer to the contract. The distinction is the reason the tool exists.

## Replace the promise with the actual check

We removed the hand-written partial validator and used Ajv for JSON Schema draft-07 and 2020-12. The replacement checks numeric bounds, extra properties, alternatives, formats and local references. Unsupported rules produce a schema error. An empty schema editor produces a syntax-only result.

The [change is in PR 203](https://github.com/valorifutures/softcat.ai/pull/203). The test suite covers null values, structural enums, both drafts, invalid schemas and inputs that must not be silently coerced. All 46 JavaScript tests passed before publication.

The [live tool](/lab/json-validator) starts with an intentionally broken classification output. It now reports three failures: an unknown label, an extra field and confidence above one. Loading the matching version clears the old result. Validating again produces a schema match.

## The checker needs a limit too

A pasted regular expression can take a very long time to finish. Validation now runs in a separate browser worker. The page stops it after 2.5 seconds and records no verdict if it exceeds that limit.

We tested a pathological pattern in a real worker, then repeated the test on the published page. The worker stopped, the timeout message appeared and the page remained usable. Nothing needed to be sent to an AI provider.

## Keep the remaining uncertainty visible

A passing schema says the fields and values satisfy its rules. It cannot tell us whether an invoice total matches the source document or whether a proposed tool call should be executed.

The same distinction led us to remove the model browsers' unsupported score bars in [PR 202](https://github.com/valorifutures/softcat.ai/pull/202). A numerical rating without a measurement method gave visitors little to inspect. The replacement compares dated prices against explicit workloads.

The useful result is a smaller claim that the tool actually checks. Once that boundary is visible, the next test becomes easier to choose.
