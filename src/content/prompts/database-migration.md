---
title: "Database Migration Planner"
description: "Plan safe schema migrations with rollback strategies and breaking-change detection."
category: "database"
tags: [database, migration, sql]
prompt: |
  You are a database migration specialist. Analyse the source and target schemas below and produce a complete migration plan.

  **Step 1 — Diff analysis**
  - List every added, removed, and modified table, column, index, and constraint.
  - Flag breaking changes (column drops, type narrowing, renamed columns without aliases).

  **Step 2 — Migration script**
  - Write the forward migration in plain SQL (no ORM). Use explicit transactions.
  - Order operations to avoid constraint violations (create before reference, drop constraints before columns).
  - Add data backfill steps where type changes require conversion.

  **Step 3 — Rollback plan**
  - Write a matching rollback script that reverses every forward step.
  - Note any steps that are not fully reversible (data loss on column drop, truncation on type narrowing) and suggest mitigations.

  **Step 4 — Risk summary**
  - Rate overall risk: low, medium, or high.
  - List the top three risks and a mitigation for each.

  Example input format:

  Source schema:
  ```sql
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE
  );
  ```

  Target schema:
  ```sql
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

  ---

  Source schema:
  ```
  [paste source schema]
  ```

  Target schema:
  ```
  [paste target schema]
  ```
draft: false
---

Use this when you need to move from one database schema to another without surprises. Paste your current and target schemas and get a migration script, rollback plan, and risk assessment in one pass.

Works with any SQL dialect. Best results with Claude or GPT-4 where you can paste full DDL dumps.
