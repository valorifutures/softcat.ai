---
title: "Investigate a slow query with its plan"
description: "Use the actual database engine, schema and query plan to propose a testable optimisation without inventing a speed-up."
category: "database"
tags: ["sql","performance","testing"]
prompt: |
  Review the query using the supplied engine, schema and plan.

  Identify a specific source of unnecessary work supported by the plan. Propose the smallest candidate change, explain its trade-offs and define a before/after check for result equivalence and execution behaviour. Preserve ordering, ties, null handling and limits. Do not invent timings, claim a percentage speed-up or assume an index will be chosen without checking the new plan.

  Engine:
  {{engine}}

  Schema:
  {{schema}}

  Query:
  {{query}}

  Current plan:
  {{plan}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "A query has a reproducible plan and you can test a small change safely."
  inputs:
    engine: "The database engine and version."
    schema: "Relevant table definitions and existing indexes."
    query: "The complete query, including ordering and limits."
    plan: "The actual EXPLAIN or equivalent output."
  exampleValues:
    engine: |
      SQLite 3.53.1, an in-memory fixture with 1,000 orders.
    schema: |
      CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, created_at TEXT NOT NULL);
    query: |
      SELECT id, created_at FROM orders WHERE customer_id = 7 ORDER BY created_at DESC, id DESC LIMIT 20;
    plan: |
      SCAN orders
      USE TEMP B-TREE FOR ORDER BY
  expected: |
    Candidate: CREATE INDEX orders_customer_date ON orders (customer_id, created_at DESC, id DESC).
    The review fixture then reported: SEARCH orders USING COVERING INDEX orders_customer_date (customer_id=?).
    The same 20 result rows were returned in the same order. No latency improvement was measured. The index has storage and write-maintenance costs.
  checks:
    - "The proposed index follows the filter and both ordering terms."
    - "The id tie-breaker and LIMIT 20 remain unchanged."
    - "The response asks for a new plan and equivalent results rather than claiming an unmeasured speed-up."
  limits: "This exact fixture was checked during review. A different engine, data distribution, index set or write workload can produce a different trade-off."
  tool: "/lab/prompt-workbench"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/sql-query-optimisation.md) remains in Git history.
