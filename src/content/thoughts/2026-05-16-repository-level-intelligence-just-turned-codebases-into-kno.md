---
title: "Repository-level intelligence just turned codebases into knowledge graphs nobody knows how to query"
date: 2026-05-16
tags: [code-intelligence, graph-analysis, repository-tooling, ai-development]
summary: "We're building sophisticated graph representations of our code but still asking LLMs to read files one at a time like it's 1995."
draft: false
pinned: false
---

Every major AI coding tool now promises repository-level understanding. They build elaborate graphs of your codebase, map dependencies, track data flows, and index every function call. Then they promptly ignore all of it and ask Claude to read your files sequentially like a very expensive intern.

## The graph is not the territory

Repository intelligence tools are generating beautiful network representations of codebases. Dead code detection, call graphs, semantic relationships between modules. We can visualise how every piece of code connects to every other piece. The problem is we're treating these graphs like fancy documentation instead of queryable knowledge bases. Most tools still fall back to stuffing raw source files into context windows when you ask a question about your code.

## Context injection is just grep with extra steps

The real issue is that we've solved the hard problem of understanding code structure but not the easy problem of using that understanding effectively. Current systems can tell you exactly which functions call which other functions, but when you ask "why is this API endpoint slow", they still dump the entire request handler into an LLM context window. We're building knowledge graphs and then querying them like search engines.

Repository-level intelligence will only matter when we stop treating code as text and start treating it as a queryable semantic network. Until then, we're just building very expensive IDEs that happen to talk.
