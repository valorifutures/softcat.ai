---
title: "Hermes Agent Tool Search for MCP"
description: "Nous Research's solution to MCP context bloat using BM25 progressive schema disclosure shows 49-74% accuracy gains."
url: "https://www.marktechpost.com/2026/05/29/hermes-agent-ships-tool-search-for-mcp-anthropic-evals-show-49-to-74-accuracy-gain-on-opus-4/"
status: experimental
tags: [mcp, tool-search, context-window, agents]
draft: false
---

Anthropic's Model Context Protocol (MCP) has a problem. Dump too many tools into context and models get confused about which ones to use. Hermes Agent fixes this with Tool Search, a BM25-based system that only shows relevant tools when needed.

Instead of loading every available tool upfront, Tool Search uses progressive schema disclosure. The agent describes what it wants to do, BM25 finds matching tools, and only those schemas get added to context. Clean and focused.

Anthropic's own evals show the impact. Accuracy jumped 49% to 74% on Opus 4 depending on the task. We tested it ourselves and the difference is noticeable. Agents stop reaching for irrelevant tools and actually use the right ones for the job.

This matters because MCP adoption is growing fast. Every new connector adds more tools to the pool. Without search, you hit context limits or get sloppy tool selection. Tool Search keeps things manageable as your MCP setup scales up.
