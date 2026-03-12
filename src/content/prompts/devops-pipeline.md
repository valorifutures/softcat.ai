---
title: "CI/CD Pipeline Reviewer"
description: "Review or generate a CI/CD pipeline config. Catches common mistakes in build, test, and deploy stages."
category: "devops"
tags: [devops, ci-cd, automation, github-actions]
prompt: |
  Review this CI/CD pipeline config and flag any issues.

  Check for:

  1. Steps that run in the wrong order (e.g. deploy before tests pass).
  2. Missing environment variable declarations or hard-coded secrets.
  3. Jobs that could run in parallel but are sequential.
  4. Caching opportunities for dependencies or build artefacts.
  5. Missing rollback or failure-handling steps.

  For each issue, give a one-line explanation and a suggested fix.

  If the config looks solid, say so and suggest one optimisation.

  Here is the pipeline config:

  ```
  [paste YAML or config here]
  ```
draft: false
---

Good for auditing GitHub Actions workflows, GitLab CI files, or any YAML-based pipeline. Works best when you paste the full config rather than a snippet.

Pairs well with the Code Review prompt for catching logic errors before they reach CI.
