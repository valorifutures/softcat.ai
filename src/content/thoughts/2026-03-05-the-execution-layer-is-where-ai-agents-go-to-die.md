---
title: "The execution layer is where AI agents go to die"
date: 2026-03-05
tags: [agents, infrastructure, execution, sandboxing]
summary: "Every AI company is building the same execution sandbox whilst ignoring the real problem: agents don't need safer cages, they need better judgement."
draft: false
pinned: false
---

We're watching the great sandbox gold rush. Every major AI company is suddenly obsessed with building secure execution environments for their agents. The pitch is always the same: give your AI a safe playground to run code, browse the web, and fiddle with data without burning down your infrastructure.

## Building prettier prisons

The execution layer has become the new blockchain. Everyone's convinced they need their own special sauce for running agent code safely. Alibaba drops OpenSandbox. Google ships Canvas. Every startup pitches their "unified execution API" as the missing piece of the agent puzzle.

These aren't solutions, they're expensive plasters. We're building increasingly sophisticated cages for fundamentally stupid prisoners.

## The real bottleneck isn't safety

The problem with AI agents isn't that they might delete your database. It's that they're rubbish at deciding when to run code in the first place. They'll happily execute seventeen different approaches to a simple task, crash through edge cases like drunk drivers, and confidently produce outputs that any junior developer would bin immediately.

Sandboxing doesn't fix the core issue. It just makes the failures more expensive and harder to debug. You can make the safest execution environment in the world, but if your agent decides to recursively parse the entire internet, your beautifully secure sandbox becomes a very expensive way to achieve nothing.

Focus on the decision layer, not the execution layer. Better judgement beats better cages.
