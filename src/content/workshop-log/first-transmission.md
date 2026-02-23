---
title: "First transmission"
date: 2026-02-23
tags: [meta, launch]
summary: "The workshop is online. Content pipeline under construction."
draft: false
---

Systems initialised. The workshop is live.

This site is built with Astro, styled with Tailwind, and deployed via Cloudflare Pages. Every push to `main` triggers a rebuild. No CMS, no database — the Git repo is the site.

## What's coming

An automated content pipeline is under construction. A Python bot running on a Beelink server will:

- Scan raw material — commit logs, trade data, experiment notes
- Call the Anthropic API to generate content in the house style
- Commit markdown files and push — the site rebuilds itself

The human does the interesting work. The machines handle the paperwork.

Stand by for more transmissions.
