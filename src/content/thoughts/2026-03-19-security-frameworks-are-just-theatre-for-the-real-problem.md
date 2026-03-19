---
title: "Security frameworks are just theatre for the real problem"
date: 2026-03-19
tags: [agent-security, runtime-safety, infrastructure]
summary: "All the security frameworks in the world won't fix the fact that we're giving black boxes root access."
draft: false
pinned: false
---

Every week brings another security framework for AI agents. Five-layer lifecycle models, secure runtime environments, trusted computing bases. We're building elaborate safety theatres around the fundamental problem: nobody knows what these models are actually thinking.

## The black box with sudo privileges

The issue isn't that agents can access file systems or network endpoints. The issue is that we have no idea why they're making those access requests. A human developer with shell access is predictable. You can read their code, understand their logic, debug their mistakes. An LLM agent is a statistical pattern matcher that sometimes decides to delete your database for reasons that would take a PhD thesis to partially explain.

All these security frameworks are just fancy ways of saying "let's put the unpredictable thing in a slightly smaller box". But the box isn't the problem. The unpredictability is.

## Sandboxes don't fix intent alignment

OpenShell and similar runtime environments are solving the wrong layer. They're making it harder for agents to break things accidentally, but they're not making agents more trustworthy. A malicious or confused agent will find ways around sandboxes. A well-intentioned but poorly aligned agent might spend hours trying to break out of necessary constraints to "help" you better.

The real solution isn't better cages. It's interpretable models that can explain their reasoning before they act. Until then, every security framework is just expensive wishful thinking.
