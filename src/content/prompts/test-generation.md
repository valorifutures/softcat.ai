---
title: "Test Suite Generator"
description: "Generate unit tests, integration tests, edge cases, and mock suggestions for any function or module."
category: "testing"
tags: [testing, unit-tests, tdd, developer-tools]
prompt: |
  Generate a test suite for the code below.

  Work through it in four steps:

  1. **Identify what needs testing**
     - List every function, method, or exported value.
     - Note which paths through the code are non-trivial and need coverage.

  2. **Write unit tests**
     - Cover the happy path first.
     - Then cover edge cases: empty inputs, boundary values, null/undefined, unexpected types.
     - Each test should have a clear name that describes what it checks.

  3. **Suggest mocks and stubs**
     - Identify external dependencies (databases, APIs, file system, timers, random).
     - For each, describe what to mock and why.
     - If a dependency is hard to mock cleanly, flag it as a testing risk.

  4. **Flag untestable patterns**
     - Identify any code that is difficult to test: hidden state, tight coupling, missing dependency injection.
     - Suggest the minimal refactor needed to make it testable, if any.

  Use the test framework I specify. If I don't specify one, use the most common choice for the language.

  Format: one test block per function. Include import/setup boilerplate at the top.

  **Language / framework:** [e.g. TypeScript + Vitest, Python + pytest]
  **Code to test:**
  ```
  [paste here]
  ```
draft: false
---

Covers the full testing workflow in one prompt: test discovery, edge case generation, mock suggestions, and testability feedback.

Good for getting a first-pass test suite quickly. Review the output and delete tests that don't add value. The mock suggestions are especially useful for spotting hidden dependencies.
