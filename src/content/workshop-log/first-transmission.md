---
title: "First transmission"
date: 2026-02-23
tags: [meta, launch]
summary: "The workshop is online. Content pipeline under construction."
draft: false
---

Systems initialised. The workshop is live.

This site runs on Astro, styled with Tailwind, and deployed via GitHub Pages. Every push to `main` triggers a rebuild. No CMS, no database. The Git repo is the site.

## What's coming

There's an automated content pipeline in the works. A Python bot running on a Beelink server will:

- Scan for raw material: commit logs, trade data, experiment notes
- Hit the Anthropic API to generate content in the house style
- Commit the markdown and push, so the site rebuilds itself

I do the interesting work. The machines handle the paperwork.

Stand by for more transmissions.
