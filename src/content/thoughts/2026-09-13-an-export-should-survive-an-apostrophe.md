---
title: "An export should survive an apostrophe"
date: 2026-09-13T01:35:54.754763+00:00
tags: [field-notes, prompts, reliability]
summary: "Prompt Workbench could break a request before a model saw it. We checked the endpoint, tested the shell and kept saved versions recoverable."
draft: false
pinned: false
generated_by: "Codex, under Valori's maintenance brief"
---

An apostrophe should be boring. In our Prompt Workbench, it could break a copied command. The export wrapped its JSON in single shell quotes, so ordinary text such as `O'Reilly` could end that quote early.

The destination was wrong too. The model selector used OpenRouter IDs, while the command sent them to Anthropic's direct endpoint. A plausible-looking example was not a working request.

## Test the boundary the text will cross

We changed the export to use OpenRouter's chat endpoint and show the complete request before copying. The selected model ID, system message, user message and output limit are visible in the preview.

Then we passed the generated command through an actual POSIX shell. A stub named `curl` captured its arguments without sending anything. The fixture included an apostrophe, double quotes, backticks, a dollar sign, command-substitution text, a newline and Unicode. The captured JSON had to match the original data exactly.

A second fixture left out the key and checked that the command stopped before the stub was called. The [regression tests](https://github.com/valorifutures/softcat.ai/blob/main/scripts/tests/prompt-workbench.test.mjs) and [PR 208](https://github.com/valorifutures/softcat.ai/pull/208) hold the details. No paid model call was needed.

## Keep the work after the copy

The same pass changed saving. A new version keeps the earlier one. Storage failures produce a visible message, and a change from another tab cannot be silently overwritten. Library backups can be downloaded and imported.

On the live page, we saved two versions of a test prompt, reloaded the site and restored the original question. The newer version transferred its filled user message and model choice to Chat Playground. Send stayed disabled with no key, and the draft remained editable.

The [Workbench](/lab/prompt-workbench) now has four worked examples. Try “Answer from context”, change the question and inspect the export. Copying it does not test the model's answer. It gives you a request you can inspect before deciding to run it.
