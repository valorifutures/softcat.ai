---
title: "DeepSeek R1 vs Claude 3.5: a head-to-head on real tasks"
date: 2026-02-11
tags: [deepseek, claude, benchmarks, comparison]
summary: "Ran both models through the same set of coding and reasoning tasks. Results were closer than expected."
draft: false
---

DeepSeek R1 made a splash when it dropped. The benchmarks looked incredible. But benchmarks are benchmarks. I wanted to see how it holds up on actual work.

## The test

Five tasks, same prompt for both models:

1. Refactor a messy Python class (200 lines)
2. Write a SQL query joining four tables with edge cases
3. Explain a bug in a React component
4. Solve a probability puzzle
5. Generate a bash script for log rotation

## Results

Claude was better at the refactor and the React bug. It understood the intent behind the code, not just the syntax. DeepSeek was stronger on the SQL query and the probability puzzle. Its chain-of-thought reasoning on maths problems is genuinely excellent.

The bash script was a draw. Both produced working solutions with slightly different approaches.

## The real difference

Claude is more consistent. It rarely produces garbage. DeepSeek has higher highs but also some odd failures where it misreads the prompt entirely. For production use I'd still pick Claude. For research and reasoning experiments, DeepSeek is worth having in the toolkit.
