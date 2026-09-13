---
title: "Document parsing still needs tests"
date: 2026-06-25
tags: [ocr, document-intelligence, evaluation, corrections]
summary: "Correction: our original post called document parsing solved without presenting an evaluation. Here is the standard that claim should have met."
draft: false
pinned: false
correction:
  date: 2026-09-12
  summary: "Withdrew the solved-problem claim and the unsupported claim of equal cost and latency across document lengths."
---

**Correction, 12 September 2026.** We have withdrawn the original claim that document parsing had become a solved problem. The post provided no dataset, measured error rate or reproducible comparison. It also claimed that a fifty-page contract could be processed at the same cost and latency as one page, without evidence.

The original publication date remains above. The earlier text is preserved in [Git history](https://github.com/valorifutures/softcat.ai/blob/a70ce36196b98d790d77b49d6a7d2511c36eb38d/src/content/thoughts/2026-06-25-document-parsing-just-became-a-solved-problem-nobody-noticed.md), not presented here as advice.

## Extraction is a set of separate tests

Reading characters, recovering table structure and deciding what a field means are different tasks. Producing valid JSON only establishes that the result has the expected syntax. A plausible invoice total can still be wrong.

Before trusting an extraction workflow, build an evaluation set from the documents it will actually encounter. Include poor scans, rotated pages, missing fields, repeated headers, multi-page tables and unfamiliar layouts.

- Write the expected values before running the system.
- Count wrong values, missing values and invented values separately.
- Check which page or region supports each extracted value.
- Measure cost and latency across document lengths.
- Decide which failures must go to a person before the result is used.

An explicit `null` can be the correct answer when a value is absent. It can also hide a missed value. Only a known answer lets us tell the difference.

Better tools are welcome. A release announcement cannot replace that evaluation.
