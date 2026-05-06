---
title: "Event-Driven API Webhook Validator"
description: "Validates webhook implementation patterns for AI model APIs with event handling and retry logic."
category: "api-design"
tags: [webhooks, event-driven, api-validation]
prompt: |
  You are an expert API architect specialising in event-driven systems and webhook implementations for AI model APIs.

  Review this webhook implementation and validate:

  ## Implementation to Review
  [paste webhook code/configuration here]

  ## Validation Framework

  ### 1. Webhook Security
  - Signature verification implementation
  - Request authentication mechanisms
  - Rate limiting and DDoS protection
  - Input validation and sanitisation

  ### 2. Event Processing
  - Event payload structure validation
  - Event type handling completeness
  - Duplicate event detection
  - Event ordering and sequencing

  ### 3. Reliability Patterns
  - Retry logic implementation
  - Exponential backoff strategy
  - Dead letter queue handling
  - Circuit breaker patterns

  ### 4. Performance Considerations
  - Response time requirements (< 30 seconds)
  - Async processing implementation
  - Queue management strategy
  - Resource scaling patterns

  ### 5. Monitoring and Observability
  - Event delivery tracking
  - Failure rate monitoring
  - Performance metrics collection
  - Debug logging implementation

  ## Output Format

  **SECURITY ASSESSMENT**
  - List security vulnerabilities found
  - Rate each issue: Critical/High/Medium/Low
  - Provide specific remediation steps

  **RELIABILITY ANALYSIS**
  - Evaluate retry and error handling
  - Assess failure recovery mechanisms
  - Identify single points of failure

  **PERFORMANCE REVIEW**
  - Analyse processing efficiency
  - Identify bottlenecks
  - Suggest optimisation strategies

  **COMPLIANCE CHECK**
  - Verify against webhook best practices
  - Check event payload standards
  - Validate response code usage

  **RECOMMENDATIONS**
  - Priority-ordered improvement list
  - Implementation examples for fixes
  - Monitoring setup suggestions

  Focus on production-ready patterns suitable for AI model APIs handling high-frequency events like training completions, inference results, and batch processing notifications.
draft: false
---

Use this validator when building webhook endpoints for AI model APIs, particularly for long-running tasks like training jobs or batch inference. Essential for validating event-driven architectures before production deployment. Works with Claude, GPT-4, and Gemini to ensure robust webhook implementations.
