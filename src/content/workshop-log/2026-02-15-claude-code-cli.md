---
title: "Using Claude Code as a development partner"
date: 2026-02-15
tags: [ai, claude-code, workflow]
summary: "Switched to Claude Code CLI for most of my coding work. Here's how it's going."
draft: false
---

Been using Claude Code CLI for a couple of weeks now and it's changed how I work. Instead of jumping between a browser, an editor, and a terminal, I just talk to it in the terminal and it does the lot. Reads files, writes code, runs tests, commits.

## What works well

The thing I like most is that it understands context. I can say "add error handling to this function" and it reads the file, understands the pattern, and makes the change. No copy-pasting code into a chat window.

It's also good at the boring stuff. Writing tests, fixing linting errors, updating config files. Things I'd put off for days, it does in seconds.

## What takes getting used to

You have to be specific. "Make it better" doesn't work. "Add retry logic with exponential backoff to the API call on line 45" does. The more precise the instruction, the better the output.

It's a tool, not a replacement. I still need to know what I want. But once I know what I want, it gets me there faster.
