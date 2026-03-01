---
title: "Step-by-Step Debugger"
description: "Walk through a bug methodically. Forces the model to reason before guessing."
category: "debugging"
tags: [debugging, root-cause, reasoning]
prompt: |
  I have a bug. Walk through it with me step by step.

  Do not guess the fix straight away. First:

  1. Restate the problem in your own words so we both agree on what's broken.
  2. List the top three possible root causes, ranked by likelihood.
  3. For the most likely cause, describe what evidence would confirm or rule it out.
  4. Ask me any questions you need answered before suggesting a fix.

  Only propose a fix once we've confirmed the root cause.

  Here is the bug:

  **What I expected:** [describe expected behaviour]
  **What actually happened:** [describe actual behaviour]
  **Relevant code or logs:**
  ```
  [paste here]
  ```
draft: false
---

Stops the model from jumping to a fix before understanding the problem. Useful for bugs that aren't immediately obvious.

Works best as an interactive conversation. Fill in the three fields and go from there.
