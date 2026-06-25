---
title: "SQL Query Optimisation"
description: "Analyse a SQL query for performance problems, get index recommendations, a rewritten query if warranted, and a flag on any correctness issues."
category: "database"
tags: [sql, database, performance, optimisation]
prompt: |
  Analyse the SQL query below and give structured feedback across four areas:

  **Slow operations**
  - Are there full table scans where an index would help?
  - Any N+1 patterns, correlated subqueries, or repeated work?
  - What is the likely bottleneck as the table grows?

  **Index recommendations**
  - Which indexes are missing? State the column(s), index type, and why.
  - Are any existing indexes unlikely to be used (wrong column order, low cardinality)?

  **Query rewrite**
  - If a meaningfully faster form exists, rewrite it and explain what changed.
  - If the original is already optimal, say so.

  **Correctness issues**
  - Any implicit type coercions that could silently mismatch?
  - NULL handling that might drop rows unexpectedly?
  - Ambiguous joins or column references that could produce wrong results?

  For each issue, state: what it is, why it matters, and the concrete fix. Skip praise.

  ```sql
  [paste query here]
  ```

  Schema (optional but helpful):
  ```sql
  [paste CREATE TABLE statements or describe columns and approximate row counts]
  ```
draft: false
---

Use this when a query is running slower than expected or before shipping something that will run at scale. Paste the query and, if you have it, the table schema and approximate row counts.

Works well with Claude and GPT-4o. Adding row counts and existing indexes gives the model enough context to produce concrete index recommendations rather than generic advice.
