---
title: "What SOFT CAT is and why we built it"
date: 2026-02-25
tags: [softcat, agents, announcement]
summary: "The mantra, the site, and the CLI that turns plain English into deployed AI agents."
draft: false
pinned: true
---

SOFT CAT stands for **Smart Outputs From Trained Conversational AI Technology**. It's the principle behind everything we do here: use AI to produce useful, reliable outputs. Not demos, not experiments, but things that actually run.

The name covers three things:

- **SOFT CAT** the idea. AI should produce smart outputs, autonomously, on a schedule, without babysitting.
- **softcat.ai** the site. Where we document what we build, powered by its own AI agents.
- **The softcat CLI**. A command line tool that turns plain English into deployed, scheduled, self-monitoring AI agents.

This post is mostly about the CLI, because that's the part that makes the rest possible.

## The CLI

The softcat CLI takes a plain English description of what you want an agent to do, builds it, tests it, deploys it on a schedule, and monitors it. The whole thing takes about two minutes.

```
softcat spawn "watch HackerNews for AI agent news, summarise the top 5 daily"
```

That one command runs a seven-stage pipeline, one for each letter in the name:

- **Scan** parses your description using Claude to extract intent, data sources, schedule, and output format
- **Orchestrate** selects the right model, dependencies, and tools
- **Fabricate** generates the agent code and prompt template in a single Claude call
- **Test** runs syntax checks and a dry-run with mock data
- **Configure** sets up cron scheduling and health monitoring
- **Activate** creates an isolated virtual environment, installs dependencies, registers the cron job
- **Track** wires up monitoring so you know when something breaks

The output is a self-contained directory with a Python script, prompt template, config file, and its own virtual environment. It runs on cron. It pings a health check on success. It writes its outputs to a local directory. No cloud platform, no containers, no YAML sprawl.

## Why agents fail in production

We've watched dozens of agent projects die the same way. The demo works. The prototype works. Then someone tries to run it every day and it falls apart.

The problems are always the same:

- **No isolation.** One agent's dependencies break another's.
- **No scheduling.** Someone has to remember to run it, or hack together a cron job.
- **No monitoring.** When it fails at 3am, nobody knows until someone asks "where's that report?"
- **No testing.** The code was generated once and never validated.
- **No update path.** When the framework changes, you rewrite from scratch.

The softcat CLI handles all of these by default. Each agent gets its own virtual environment. Scheduling is automatic. Health checks are built in. The tester validates both syntax and runtime behaviour. And `softcat groom` regenerates the code while keeping your config and outputs intact.

## How we actually use it

This site runs on agents built with the CLI. The AI news digests that appear in our news section are written by an agent that checks HackerNews every morning, filters for AI-related stories, and generates a summary with Claude. The tool reviews come from an agent monitoring Product Hunt for developer tools.

We didn't write those agents by hand. We described what we wanted and the CLI built them.

When we need to iterate, we use `softcat meow` for a conversational design session where Claude asks questions to understand exactly what we need. When we want to update an agent's code without losing its configuration, `softcat groom` regenerates it. When we want to test something right now, `softcat trigger` runs it immediately.

The full command set follows the cat theme:

- `spawn` creates an agent
- `meow` designs one through conversation
- `litter` lists them all
- `purr` checks status
- `feed` shows recent outputs
- `trigger` runs one immediately
- `nap` and `wake` pause and resume
- `groom` regenerates code
- `hiss` kills one permanently

## What's under the hood

Every agent is a standalone Python script that:

- Reads its own config from a sibling YAML file
- Loads a prompt template and substitutes runtime data using simple string replacement
- Calls Claude via the Anthropic SDK to process or generate content
- Writes outputs to a local directory with timestamps
- Pings a health check URL on success
- Handles dry-run mode for testing without making real API calls
- Skips health pings on manual triggers so scheduled monitoring stays clean

The fabrication is the interesting part. A single Claude call generates both the agent code and its prompt template together. We validate that every placeholder in the prompt has a corresponding replacement in the code. If they don't match, we catch it before deployment.

## What the CLI is not

The softcat CLI is not an agent framework. It doesn't manage agent memory, tool registries, or multi-agent coordination. It's an agent *factory*. You describe what you want, it builds and deploys a specialist.

It's also not a hosted platform. Agents run on your machine, on your cron, with your API keys. There's no dashboard, no SaaS, no monthly fee. Just a CLI and a directory of agents.

## What's next

The core pipeline works. We use it daily. The focus now is on making it easier to share and discover agent patterns. Community templates, better output routing, and tighter integration with tools like MCP are all on the roadmap.

If you've been building agents and getting stuck at the "ok but how do I actually run this every day" stage, this is for you.
