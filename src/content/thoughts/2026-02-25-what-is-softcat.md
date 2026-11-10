---
title: "The original SOFT CAT pipeline"
date: 2026-03-13
tags: [softcat, agents, pipeline]
summary: "The launch design used six content jobs and a separate website publisher. This is the history of that setup and what the September repair changed."
draft: false
pinned: false
correction:
  date: 2026-09-13
  summary: "Reframed the launch article as project history. Removed claims that all six bots ran this morning, corrected the treatment of schedules and linked the current records. The separate server is not verified by a new website build."
---

SOFT CAT began as a website built and fed with AI. Its early design separated content jobs on a home server from the GitHub Pages site that displayed their output. The site was both the thing being built and a public record of the machinery.

The [earlier version of this article](https://github.com/valorifutures/softcat.ai/blob/00dfedadb150522d12796a0760694b636a9b3d40/src/content/thoughts/2026-02-25-what-is-softcat.md) described that setup in the present tense. It said six bots had run “this morning”. That wording could keep making a claim long after the system changed or stopped, so this page now treats it as history.

## Six small jobs

The original design gave each job a narrow role. A news writer summarised feed items. A thought writer produced an opinion. Radar selected launches. Two more jobs maintained tool reviews and prompt templates. A model-data job fetched prices and specifications from a public API.

Content files were committed to the repository, then a separate workflow built the website. That separation mattered when publishing broke. New source could exist without reaching the live site.

The September [recovery note](/thoughts/2026-09-12-one-broken-prompt-froze-the-site) records the actual failure and repair. A malformed generated prompt blocked the build. The repair added checks before publication and made the dated run record easier to inspect.

## A schedule is not evidence of a run

The old article listed daily times without keeping the time-zone distinction clear. The [Pipeline](/pipeline) now shows the configured zone for each job and the timestamp of its latest published record. A website build has its own date.

Price snapshots now run in GitHub Actions. Their first real September check matched 37 tracked model IDs and kept two unlisted prices unknown. The [successful workflow](https://github.com/valorifutures/softcat.ai/actions/runs/34729167469) includes the checked data commit and its Pages deployment. It made no paid model call.

The other daily jobs still depend on the separate server. Updating their source does not establish that the host is reachable or that its timers have restarted.

## Keep the work worth reading

The old thought writer was instructed to produce strong opinions without source links. That produced a repetitive series whose claims were difficult to check. We [retired the series](/thoughts/review), kept its history and changed the writer to propose sourced drafts for editorial review.

Today the useful centre of the site is the [browser tools](/tools), the [build notebook](/notebook), the dated [Horizon](/horizon) evidence and the [Feral experiment](/feral). SOFT CAT still means Smart Outputs From Trained Conversational AI Technology. The work has to keep earning the name.
