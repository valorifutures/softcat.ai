---
title: "Technical Doc Writer"
description: "Turn rough notes or code into clean, developer-facing documentation."
category: "writing"
tags: [writing, documentation, technical]
prompt: |
  Write developer documentation for the following. Audience: engineers who are competent but unfamiliar with this specific system.

  Rules:
  - Lead with what it does, not how it works.
  - Use short paragraphs. Two to three sentences max.
  - Use bullet points for steps and lists.
  - Include a quick-start example first, details after.
  - No marketing language. No "seamless", "powerful", or "robust".

  Structure:
  1. One-line summary (what it does)
  2. When to use it (and when not to)
  3. Quick start (minimal working example)
  4. Key options or parameters
  5. Common errors and how to fix them

  Here is the thing to document:

  [paste code, API spec, or rough notes here]
draft: false
---

Takes rough notes, code, or a spec and turns it into structured developer docs. Enforces a consistent format and keeps the language plain.

Good for internal docs, README sections, or API references.
