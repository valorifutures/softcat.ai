---
title: "Code Explainer"
description: "Get a plain-English explanation of unfamiliar code, layered from overview to detail."
category: "explaining-code"
tags: [explaining-code, onboarding, learning]
prompt: |
  Explain the following code to me. I'm a competent developer but I haven't worked with this codebase before.

  Give me three layers:

  **Layer 1: What it does**
  One paragraph. What is the purpose of this code? What problem does it solve?

  **Layer 2: How it works**
  Walk through the main logic in order. Name the key steps. Point out anything non-obvious.

  **Layer 3: What to watch out for**
  - Are there hidden assumptions or preconditions?
  - Are there known footguns or edge cases I should know about?
  - Is anything here likely to cause confusion for someone new to the code?

  After explaining, answer: if I wanted to change [specific thing], where would I start?

  ```
  [paste code here]
  ```
draft: false
---

Gets you up to speed on unfamiliar code fast. Useful for onboarding, code reviews, or diving into open-source libraries.

Replace `[specific thing]` with whatever change you're considering. That last question keeps it practical.
