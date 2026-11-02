---
title: "Tool Use"
description: "The ability of a model to call external functions or APIs to complete a task."
tags: [agents, tooling, architecture]
date: 2026-04-03
related: [agentic-loop, model-context-protocol, grounding]
draft: false
---

Tool use is when an application lets a language model request an external function, API or service as part of its work. Instead of guessing at a calculation, the model can request a calculator. Instead of making up the weather, it can request a weather service. The host decides which tools are available, validates the request, executes it and returns the result.

**How it works:** The developer defines tools with descriptions and parameter schemas. The model receives those definitions in context. When it determines that a tool would help, it emits a structured request. The surrounding application still owns validation, authorisation, execution and the outcome check.

**Why it matters:** Tool use lets a model work with live data and act through real systems. Code execution, web search, database queries, file operations and API calls become possible. It also creates real side effects, so a plausible tool request is never enough by itself.

**Protocol is not permission:** MCP standardises messages between hosts, clients and servers. It can make a tool easier to expose across compatible systems, but it does not make every tool portable or safe. The [MCP authorisation specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) says authorisation is optional and transport-specific. HTTP deployments can use OAuth, while local standard-input deployments obtain credentials from their environment.

**Check the action boundary:** Authentication establishes which caller presented a credential. Authorisation decides whether that caller may perform this action on this resource. The service that owns the effect should enforce the decision, restrict tokens to their intended audience and reject token passthrough. A successful call still needs an outcome check because a valid request can produce the wrong state.

*Editorial review, 2 November 2026: separated model requests, protocol transport, authorisation and verified outcomes. The original publication date is preserved.*
