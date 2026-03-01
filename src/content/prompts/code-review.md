---
title: "Thorough Code Review"
description: "Get a structured code review covering correctness, security, performance, and readability."
category: "code-review"
tags: [code-review, quality, security]
prompt: |
  Review the following code and give structured feedback across four areas:

  **Correctness**
  - Are there bugs, edge cases, or off-by-one errors?
  - Does error handling cover realistic failure modes?

  **Security**
  - Is there any risk of injection, data exposure, or unsafe operations?
  - Are inputs validated at the right boundaries?

  **Performance**
  - Are there unnecessary allocations, N+1 queries, or blocking operations?
  - What is the likely bottleneck under load?

  **Readability**
  - Is the intent clear without reading every line?
  - Are variable and function names descriptive?
  - Is there anything that needs a comment to be understood?

  For each issue, state: what it is, why it matters, and a concrete fix. Skip praise. Focus on what needs changing.

  ```
  [paste code here]
  ```
draft: false
---

Use this when you want a code review that goes beyond "looks good". Covers correctness, security, performance, and readability in one pass.

Works well with Claude, GPT-4, and Gemini. Paste your code at the bottom and send.
