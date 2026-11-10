---
title: "Building an agent loop with Claude and tool use"
date: 2026-02-07
tags: [claude, agents, tool-use, anthropic-api]
summary: "Wired up Claude with tool calling to build a basic autonomous agent. Simpler than expected."
draft: false
---

Wanted to see how far you can push Claude's tool use to build something that actually acts on its own. Not a chatbot. An agent that decides what to do, does it, checks the result, and keeps going.

## The setup

Python script with a handful of tools: read files, search the web, run shell commands, write files. Claude gets the tools and a goal, then loops until it thinks it's done. Each iteration it picks a tool, uses it, reads the result, and decides what's next.

## What worked

The decision-making is surprisingly good. Give it "find out what version of Python is installed and write it to a file" and it chains the right tools together without hand-holding. It even handles errors sensibly, trying a different approach if something fails.

## What didn't

It sometimes gets stuck in loops. Tries the same thing three times, gets the same error, tries it again. Had to add a max-iterations cap and a "you already tried this" check to stop it spinning.

## Takeaway

Tool use is the real unlock for Claude. The chat interface is useful but the ability to wire it into actual systems is where it gets powerful. Planning to use this pattern for the content bot that'll run this site.
