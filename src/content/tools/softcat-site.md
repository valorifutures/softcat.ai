---
title: "How this workshop is published"
date: 2026-02-23
description: "The static site, browser tools, checked GitHub deployments and cloud maintenance without the retired server."
status: active
tags: [astro, tailwind, github-pages, meta]
draft: false
review:
  reviewedAt: "2026-09-16"
  previousRevision: "4296b1af038d528a2c879fa3bd967f2158f90905"
  summary: "Checked the cloud operating guide and workflow configuration against main. The old host is retired, Feral's GitHub runner is manual-only, and the daily price snapshot retains one owner. Configuration is not proof of a completed run."
  evidence:
    - "https://github.com/valorifutures/softcat.ai/pull/194"
    - "https://github.com/valorifutures/softcat.ai/pull/206"
    - "https://github.com/valorifutures/softcat.ai/pull/231"
    - "https://github.com/valorifutures/softcat.ai/blob/4296b1af038d528a2c879fa3bd967f2158f90905/docs/site-operations.md"
---

## The repository becomes the site

Astro builds pages from content collections, data and components. Preact supplies the browser tools. Tailwind and project CSS style the pages. GitHub Pages serves the checked output.

The repository holds both the published content and the implementation history. Changes go through focused branches, validation and a production build before publication. A successful build is followed by live checks of the changed journey.

## A real price refresh

The GitHub model-price job reads OpenRouter's public catalogue without an API key or a paid model call. It checks a candidate data bundle, preserves unknown prices as unknown and publishes only the bounded price and run-record changes.

Its first successful September run is recorded on [Pipeline](/pipeline). The [15 September scheduled run](https://github.com/valorifutures/softcat.ai/actions/runs/34957491798) also completed successfully. A recorded job is evidence of that job, not evidence that every other process is running.

## Cloud tasks own the recurring work

The maintainer switched off the original Linux/OpenClaw host. The replacement cloud tasks cover daily site maintenance, Tuesday and Friday Feral councils, and Monday evidence reviews. They use Codex and the connected GitHub app, without relying on that server.

Each task checks current work before starting, completes a bounded batch and leaves its actual outcome. A configured schedule does not prove that a task ran, passed its checks or published anything. A no-change maintenance pass is valid.

GitHub Actions remains the single owner of the daily model-price snapshot. The old Feral GitHub runner is manual-only, so it does not commission a second scheduled council. Feral creative cycles remain separate from ordinary maintenance and require their own independent critic.

The six legacy Python content timers stay inactive. News and Radar are historical archives. Old thought, tool and prompt generators are not current publishing services, and the old Horizon bot does not review our five predictions. Their scripts and historical records remain inspectable, not invitations to restart them.

The [operating guide](https://github.com/valorifutures/softcat.ai/blob/main/docs/site-operations.md) records ownership and the release checks. [Pipeline](/pipeline) separates configured schedules from recorded activity. Price refreshes have their own run receipts. Prediction review dates change only after a real evidence reassessment, not because another day or site build has passed.

## Earlier correction, preserved

The 13 September review replaced a blanket self-maintaining claim with the publishing path we had actually repaired and checked. At that point, the separate server was unverified. The [guide as it stood before this update](https://github.com/valorifutures/softcat.ai/blob/4296b1af038d528a2c879fa3bd967f2158f90905/src/content/tools/softcat-site.md) preserves that review and its sources. The 16 September review above records the later cloud migration, without rewriting the original publication date.

## The diary follows the work

The [notebook](/notebook) records repairs and checks we actually performed. The experiments remain inspectable, including failures and retirements. This is a working static site, not a claim that a few bots replace every publishing workflow.
