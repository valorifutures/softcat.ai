---
title: "Documentation Generator"
description: "Generate README files, API documentation, and inline docstrings from source code."
category: "documentation"
tags: [documentation, writing, productivity]
prompt: |
  Generate documentation for the following code. Produce all three outputs below.

  **1. README Section**
  Write a clear README section covering:
  - What this code does (one paragraph, no fluff)
  - Installation or setup steps (if applicable)
  - Usage examples with realistic inputs and outputs
  - Configuration options or environment variables
  - Any gotchas or limitations worth knowing

  **2. API Documentation**
  For each public function, method, or endpoint:
  - Name and signature
  - What it does (one sentence)
  - Parameters: name, type, required/optional, description
  - Return value: type and description
  - Errors or exceptions it can throw
  - A short usage example

  **3. Inline Documentation**
  Add JSDoc (JavaScript/TypeScript), docstrings (Python), or the appropriate format for the language:
  - Every public function and class gets a doc comment
  - Include @param, @returns, @throws (or equivalent)
  - Skip obvious getters/setters
  - Add brief comments for any non-obvious logic

  Keep the tone technical and direct. No marketing language. Write for a developer who needs to use this code tomorrow.

  ```
  {{code}}
  ```
draft: false
---

Generates three layers of documentation from source code: a README section, API reference, and inline docstrings. Replace `{{code}}` with your source file.

Handles most languages. For best results, include the full file rather than snippets, so the model can see the full public API surface.
