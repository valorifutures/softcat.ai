---
title: "What SOFT CAT is and why we built it"
date: 2026-03-13
tags: [softcat, agents, pipeline]
summary: "softcat.ai builds and maintains itself via six AI bots. This is how."
draft: false
pinned: true
---

This morning, before anyone sat down at a keyboard, six bots ran on a home server in the UK. One pulled RSS feeds and wrote a news digest. Another read the same feeds and wrote an opinion piece. A third scanned for AI product launches and published editorial picks. The other three updated the model database, the prompt library, and the tool reviews.

You can see the results at [/pipeline](/pipeline).

That is what SOFT CAT is.

## The name

SOFT CAT stands for **Smart Outputs From Trained Conversational AI Technology**. The principle is straightforward: use AI to produce useful, reliable outputs. Not demos, not experiments. Things that actually run, on a schedule, without supervision.

softcat.ai is the site where we build in public. It is also the thing being built. The content, the tools, the daily updates. Most of it comes from the bots, not from us.

## The pipeline

Six bots run on a Beelink SER5 MAX on a home network. Each has a specific job.

**AI News Digest** pulls five RSS feeds every morning, picks the most interesting stories, and writes an opinionated digest for [/news-and-updates](/news-and-updates). It runs daily at 07:00 UTC.

**AI Thoughts** reads the same feeds for inspiration and generates an original opinion piece with a clear point of view. It publishes to [/thoughts](/thoughts) daily at 08:00 UTC.

**The Radar** scans RSS feeds and the HackerNews API for genuine AI product launches. It writes editorial picks for each and publishes them to [/radar](/radar) at 09:30 UTC. No human curates the picks.

**Tool of the Week** picks one interesting AI tool from the feeds every Sunday and writes a short review for [/tools](/tools).

**Prompt Library** generates copy-ready prompt templates twice a month, inspired by current AI trends. These go to [/prompts](/prompts).

**Model Data** fetches AI model pricing and specs from the OpenRouter API every morning and updates the models comparison page. No language model involved. Just an API call and a JSON file.

All six bots use Claude Sonnet for generation (except Model Data, which is pure API). Every run is logged: duration, feeds scanned, items found, items published, cost. The pipeline dashboard at [/pipeline](/pipeline) shows all of it.

## What is still rough

The bots do not decide what matters. They surface what is new, but they do not know what the site should prioritise. Those calls still belong to humans.

The pipeline dashboard shows every run, its cost, and its output. Some days a bot runs and produces nothing useful. Some days the same story appears in both the digest and the radar. We keep the history visible because that is more honest than only showing the wins.

There is no "Scout" filing issues or "Builder" writing code. The bots generate content. We review it, maintain the infrastructure, and decide what to build next. That is the only manual step.

## The point

This is not a pitch for a product. What exists is the infrastructure running this site: six bots, a home server, a GitHub repo, and a cron schedule.

The interesting question is not whether AI can write content. It clearly can. The interesting question is whether you can build infrastructure that runs reliably enough to trust with a public site. We are finding out in public.

If you want to see what it looks like in practice, [/pipeline](/pipeline) shows every run from this morning.
