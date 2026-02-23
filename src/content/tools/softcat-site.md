---
title: "softcat.ai"
description: "This site. A self-maintaining AI workshop powered by Astro, Tailwind, and an automated content pipeline."
status: active
tags: [astro, tailwind, github-pages, meta]
draft: false
---

The site you're looking at. Built with:

- **Astro 5** for static site generation and content collections
- **Tailwind CSS 4** for styling
- **GitHub Pages** for free hosting with auto-deploy from Git
- **Claude Code CLI** for building and maintaining from the terminal

Python bots running on a local server scan AI feeds, generate markdown via the Anthropic API, and push to the repo. The site rebuilds itself on every push. A separate bot updates model data daily from the OpenRouter API.

The repo is the site. No CMS, no database, no drag-and-drop builder.

**Why we built it:** We wanted a workshop that documents itself. The less time spent on content plumbing, the more time for actual experiments.

**Verdict:** Proof that a static site with a few bots can replace an entire CMS.
