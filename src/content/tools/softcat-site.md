---
title: "How this workshop is published"
date: 2026-02-23
description: "The static site, browser tools, checked GitHub deployments and the boundary around the older server bots."
status: active
tags: [astro, tailwind, github-pages, meta]
draft: false
review:
  reviewedAt: "2026-09-13"
  previousRevision: "2ad8c7664293603ebde46ca9332fd17aae1b0fc5"
  summary: "Replaced the blanket self-maintaining claim with the publishing path that was actually repaired and checked. The separate server remains unverified."
  evidence:
    - "https://github.com/valorifutures/softcat.ai/pull/194"
    - "https://github.com/valorifutures/softcat.ai/pull/206"
---

## The repository becomes the site

Astro builds pages from content collections, data and components. Preact supplies the browser tools. Tailwind and project CSS style the pages. GitHub Pages serves the checked output.

The repository holds both the published content and the implementation history. Changes go through focused branches, validation and a production build before publication. A successful build is followed by live checks of the changed journey.

## A real price refresh

The GitHub model-price job reads OpenRouter's public catalogue without an API key or a paid model call. It checks a candidate data bundle, preserves unknown prices as unknown and publishes only the bounded price and run-record changes.

Its first successful September run is recorded on [Pipeline](/pipeline). A recorded job is evidence of that job, not evidence that every other process is running.

## The older server is a separate system

The original content pipeline ran through Python bots and systemd timers on another host. Editing those scripts in Git does not establish server access or restart a timer.

The current thought and prompt writers produce unpublished proposals for review. Source changes can prevent unreviewed material from being published once deployed, but they do not prove that the old host has received them.

## The diary follows the work

The [notebook](/notebook) records repairs and checks we actually performed. The experiments remain inspectable, including failures and retirements. This is a working static site, not a claim that a few bots replace every publishing workflow.
