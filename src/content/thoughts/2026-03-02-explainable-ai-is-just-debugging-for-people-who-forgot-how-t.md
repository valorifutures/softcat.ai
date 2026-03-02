---
title: "Explainable AI is just debugging for people who forgot how to read code"
date: 2026-03-02
tags: [explainable-ai, shap, model-debugging, feature-importance]
summary: "We're building elaborate explanation frameworks because we've lost the ability to understand what our models actually do."
draft: false
pinned: false
---

The explainable AI movement has reached peak absurdity. We're building SHAP-IQ pipelines and interaction matrices to explain models we could understand perfectly well if we just bothered to look at them properly. It's debugging for developers who've forgotten how to debug.

## The explanation industrial complex

Every week brings another framework for model explainability. Feature importance scores, interaction effects, attention visualisations. We treat black box models like mysterious oracles that require special divination techniques to interpret. But most of these models aren't black boxes at all. They're just complicated, and we've lost patience with complexity.

## When explanation becomes procrastination

SHAP values and Shapley interactions are mathematically elegant, but they're often solving the wrong problem. If you need a separate framework to explain why your random forest made a decision, perhaps the issue isn't explainability. Perhaps it's that you built something too complex for the task, or you didn't spend enough time understanding your features before training.

## Back to basics

The best explanation for a model's behaviour is usually a simpler model that performs nearly as well. Or better feature engineering. Or just looking at the bloody decision tree. We've convinced ourselves that complexity requires special tools to understand, when often it just requires better engineering discipline.

Explainable AI has become a comfort blanket for teams who've outsourced their intuition to frameworks.
