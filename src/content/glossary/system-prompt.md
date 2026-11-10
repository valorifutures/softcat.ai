---
title: "System Prompt"
description: "Instructions given to a model before the user's message, usually hidden from the user."
tags: [prompting, concept, agents]
date: 2026-04-03
related: [prompt-engineering, in-context-learning, llm]
draft: false
---

A system prompt is a set of instructions provided to the model at the start of a conversation, before the user's first message. It defines how the model should behave: its role, tone, constraints, output format, and what it should or should not do. The user typically does not see the system prompt, though its effects are obvious in how the model responds.

**Why it matters:** The system prompt is the primary way developers control model behaviour in production applications. It is the difference between a generic chatbot and a focused coding assistant, customer support agent, or research tool. A well-written system prompt eliminates entire categories of unwanted behaviour.

**What goes in one:** Role definition ("you are a financial analyst"), output constraints ("respond in JSON"), safety rules ("never provide medical advice"), tone guidance ("be concise and direct"), and any context the model needs for every interaction. Some system prompts run to thousands of tokens for complex applications.

**Practical notes:** Models follow system prompts more reliably than they used to, but they are not absolute. A determined user can sometimes override system prompt instructions through creative prompting. For high-stakes applications, enforce critical rules at the application layer rather than relying solely on the system prompt.
