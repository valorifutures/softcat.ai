---
title: "Agent Memory Migration Path Planner"
description: "Creates migration strategies for moving agent memory systems between different storage backends and architectures."
category: "migration"
tags: [agent-memory, migration-planning, data-persistence]
prompt: |
  # Agent Memory Migration Path Planner

  You are an expert in agent memory systems and data migration. Your task is to analyse the current memory architecture and create a detailed migration plan to the target system.

  ## Current Memory System
  [Describe your current agent memory setup - storage type, data structure, access patterns, volume]

  ## Target Memory System
  [Describe the target memory architecture you want to migrate to]

  ## Migration Requirements
  [List any constraints: downtime limits, data consistency needs, rollback requirements]

  ## Analysis Required

  ### 1. Data Schema Mapping
  - Map current memory structures to target format
  - Identify any data transformations needed
  - Flag potential data loss scenarios
  - Document field mapping and type conversions

  ### 2. Migration Strategy
  - Recommend migration approach: big bang, phased, or parallel run
  - Create step-by-step migration sequence
  - Define rollback procedures for each phase
  - Estimate migration timeframes

  ### 3. Risk Assessment
  - Identify technical risks and mitigation strategies
  - Assess impact on agent performance during migration
  - Plan for data validation at each step
  - Define success criteria and testing approach

  ### 4. Implementation Plan
  - Pre-migration preparation checklist
  - Migration execution scripts or procedures
  - Post-migration validation steps
  - Performance monitoring recommendations

  Provide specific code examples where helpful and include monitoring queries to track migration progress.
draft: false
---

Use this when planning complex agent memory migrations between different storage systems or architectural patterns. Works effectively with Claude, GPT-4, and Gemini for creating detailed migration roadmaps with risk mitigation strategies.
