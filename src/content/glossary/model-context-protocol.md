---
title: Model Context Protocol (MCP)
description: An open standard for connecting AI models to external tools, databases, and data sources through a universal interface.
tags:
  - tooling
  - standards
  - interoperability
  - agents
  - anthropic
date: 2026-04-03
related:
  - retrieval-augmented-generation
  - langgraph
draft: false
---

Model Context Protocol (MCP) is an open standard introduced by Anthropic that lets AI models connect to external tools, databases, and data sources through a single, shared interface. Instead of each application building bespoke integrations for every tool it needs, developers build one MCP-compatible server and any supporting model can use it immediately. The standard reached 97 million installs in early 2026, with OpenAI, Google, and Microsoft all shipping native support.

In practice, a developer building an AI assistant can expose a company database via an MCP server once, then use that same server across Claude, GPT-4, and Gemini without rewriting the integration for each.

Related terms: retrieval-augmented-generation (an approach MCP often enables), langgraph (a framework that can act as the orchestration layer over MCP-connected tools).
