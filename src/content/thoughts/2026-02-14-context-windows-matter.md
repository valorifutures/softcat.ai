---
title: "Context size needs a retrieval test"
date: 2026-02-14
tags: [context-window, evaluation, models, corrections]
summary: "Fitting a project into a model's input is useful. Finding the right facts and producing a correct answer still need to be measured."
draft: false
correction:
  date: 2026-09-13
  summary: "Removed an undocumented whole-project test and the blanket conclusion that a larger context window beats a more capable model."
---

The original essay described giving Claude an entire project and obtaining better cross-file answers. It recorded no model version, file set, prompts, outputs or comparison. We cannot reproduce that account from the post, so we have withdrawn it as supporting evidence.

The earlier claim that context size measures usefulness while benchmarks measure intelligence was also too broad. The [original version remains available](https://github.com/valorifutures/softcat.ai/blob/a83add0285366fd5305241742b05f0e0da0fbd42/src/content/thoughts/2026-02-14-context-windows-matter.md).

## Ask questions with known answers

Choose questions that require specific facts from the project or document set. Write down the expected answer and its source before testing. Include a fact near the beginning, one in the middle, one near the end and a question whose answer is absent.

Compare the full input with a smaller selection of relevant files. Keep the question, model version and evaluation rule fixed. Check the cited evidence as well as the final answer. If the task spans files, include a case that requires connecting them correctly.

## Count the whole request

The available window must accommodate more than the document. System instructions, tools, conversation history and the intended output consume part of the allowance. A provider's maximum output limit may also be smaller than its total context limit.

Our [model comparison](/lab/model-comparison) labels context sizes as saved reference values. It does not treat them as measured retrieval performance. The [conversation calculator](/lab/token-cost) also counts repeated history in later requests.

A larger allowance can make a workflow possible. A task-specific evaluation tells us whether that workflow works.
