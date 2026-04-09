---
title: "Tool Use"
description: "The ability of a model to call external functions or APIs to complete a task."
tags: [agents, tooling, architecture]
date: 2026-04-03
related: [agentic-loop, model-context-protocol, grounding]
draft: false
---

Tool use is when a language model calls external functions, APIs, or services as part of generating a response. Instead of guessing at a calculation, the model calls a calculator. Instead of making up the weather, it calls a weather API. The model decides when to use a tool, formats the call, and incorporates the result into its response.

**How it works:** The developer defines a set of available tools with descriptions and parameter schemas. The model receives these definitions as part of its context. When it determines a tool would help, it outputs a structured tool call instead of regular text. The application executes the call, returns the result, and the model continues generating with that information.

**Why it matters:** Tool use is what turns a text generator into a capable agent. It bridges the gap between what the model knows (training data) and what is happening right now (live data, real systems). Code execution, web search, database queries, file operations, and API calls all become possible.

**Standards and protocols:** MCP (Model Context Protocol) is emerging as a universal standard for tool integration. Before MCP, every framework had its own way of defining and calling tools. A shared protocol means tools built once work across multiple models and frameworks.
