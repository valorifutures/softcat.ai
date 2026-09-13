---
title: "Measure cost changes before assigning motives"
date: 2026-07-02
tags: [ai-trust, model-pricing, observability, corrections]
summary: "A changed bill needs a traceable explanation. Our earlier essay made allegations without providing the records needed to assess them."
draft: false
pinned: false
correction:
  date: 2026-09-13
  summary: "Withdrew unsupported claims about hidden monitoring, a 40 per cent token increase and deliberate price manipulation."
---

The original essay alleged hidden monitoring of users by geography and a 40 per cent rise in tokens per task. It linked no incident report, code change, usage records or provider response. It then treated a motive for increasing revenue as established.

Those claims are withdrawn here. The absence of evidence in our post does not settle what happened elsewhere. It means this post did not establish its allegations. The [earlier text is preserved](https://github.com/valorifutures/softcat.ai/blob/a83add0285366fd5305241742b05f0e0da0fbd42/src/content/thoughts/2026-07-02-hidden-flags-and-token-bloat-trust-is-now-a-pricing-problem.md).

## A useful cost record

Start with the exact model ID, provider, date and pricing tier. Record the full input, generated output, reported usage, retries and tool calls for the same task. Include cached tokens and reasoning charges where the provider reports them.

Conversation history matters. If a later request resends earlier messages, those messages are input again. During this site's repair, we found that our own conversation calculator had omitted that repeated history. [PR 198 corrected it](https://github.com/valorifutures/softcat.ai/pull/198).

That was an accounting error in our tool. It is not evidence about a provider's intentions.

## Compare like with like

Repeat the same workload across the versions or dates being compared. Record changes in task completion, output length and retries alongside the bill. A lower token price can accompany a higher total cost, but the reason needs to be measured.

Our [model comparison](/lab/model-comparison) makes its token counts, saved rates and excluded charges visible. The [conversation calculator](/lab/token-cost) can estimate repeated history. Provider usage records remain the better basis for an actual invoice.
