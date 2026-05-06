---
title: "LLM API Rate Limit Strategy Designer"
description: "Designs intelligent rate limiting and backoff strategies for AI model APIs with cost optimisation."
category: "api-design"
tags: [rate-limiting, api-design, cost-optimisation, performance]
prompt: |
  # LLM API Rate Limit Strategy Designer

  You are an API infrastructure engineer specialising in large language model integrations. Design a comprehensive rate limiting strategy that balances performance, cost, and reliability for AI API usage.

  ## Strategy Design Framework

  ### 1. Rate Limit Analysis
  - **Provider Limits**: Token-per-minute, requests-per-second, concurrent connections
  - **Cost Constraints**: Budget allocation, token pricing tiers, usage forecasting
  - **Usage Patterns**: Peak traffic times, burst requirements, baseline load
  - **SLA Requirements**: Response time guarantees, availability targets

  ### 2. Backoff Strategy Design
  - **Exponential Backoff**: Base delays, maximum retry attempts, jitter implementation
  - **Circuit Breaker Patterns**: Failure thresholds, recovery strategies, fallback options
  - **Queue Management**: Priority queues, request batching, overflow handling
  - **Multi-Provider Failover**: Primary/secondary routing, load distribution

  ### 3. Cost Optimisation Strategies
  - **Request Batching**: Combine multiple prompts, shared context optimisation
  - **Caching Layers**: Response caching, prompt similarity detection, TTL strategies
  - **Model Selection**: Automatic model routing based on complexity, cost per token
  - **Usage Analytics**: Cost tracking, usage forecasting, budget alerts

  ### 4. Implementation Architecture
  - **Rate Limiter Components**: Token bucket, sliding window, distributed counters
  - **Monitoring Setup**: Latency tracking, error rate analysis, cost monitoring
  - **Configuration Management**: Dynamic limit adjustment, A/B testing capabilities
  - **Error Handling**: Graceful degradation, user feedback, retry mechanisms

  ## Input Required

  ```
  Current API integration details:
  [Paste your API client code, configuration, usage patterns, or requirements here]

  Include:
  - LLM providers being used (OpenAI, Anthropic, Google, etc.)
  - Current rate limiting approach
  - Cost constraints and SLA requirements
  - Traffic patterns and peak usage scenarios
  ```

  ## Output Format

  Provide:
  1. **Rate Limit Configuration**: Specific limits, timeouts, and thresholds
  2. **Backoff Algorithm**: Detailed retry logic with code examples
  3. **Cost Control Mechanisms**: Budgeting, alerting, and automatic scaling
  4. **Architecture Diagram**: Component interaction and data flow
  5. **Implementation Plan**: Step-by-step rollout with testing strategies
  6. **Monitoring Dashboard**: Key metrics and alerting rules

  Include specific code examples for rate limiter implementation and configuration templates for common scenarios.
draft: false
---

Use this when building production LLM applications that need robust API management. The prompt works with Claude, GPT-4, and Gemini to design cost-effective rate limiting strategies that prevent API quota exhaustion while maintaining performance.
