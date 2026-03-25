---
title: "Agent Skill Evolution Validator"
description: "Test and validate self-evolving AI agent capabilities to ensure skill learning progresses correctly without degradation."
category: "testing"
tags: [agent-testing, skill-validation, self-evolution]
prompt: |
  You are an AI agent testing specialist focused on validating self-evolving skill systems. Evaluate the provided agent's skill learning and evolution capabilities.

  ## Agent Configuration
  [paste agent architecture, skill learning framework, and evolution parameters here]

  ## Skill Learning Logs
  [paste skill acquisition logs, performance metrics, and evolution history here]

  ## Test Scenarios
  [paste specific tasks the agent should handle and expected skill improvements here]

  Please provide:

  1. **Skill Acquisition Validation**
     - Verify skills are being learned correctly
     - Check for skill degradation or interference
     - Validate skill generalisation across tasks

  2. **Evolution Integrity Tests**
     - Test skill composition and chaining
     - Verify knowledge retention over time
     - Check for catastrophic forgetting

  3. **Performance Regression Detection**
     - Compare current vs. previous capabilities
     - Identify skill conflicts or degradation
     - Measure efficiency improvements

  4. **Safety and Boundary Checks**
     - Ensure skills stay within defined parameters
     - Test for unexpected behaviour emergence
     - Validate constraint adherence

  5. **Test Suite Design**
     - Create automated validation tests
     - Design skill progression benchmarks
     - Set up continuous monitoring framework

  Include specific test cases, expected outcomes, and failure detection criteria. Focus on measurable validation methods.
draft: false
---

Critical for teams building self-evolving AI agents where skills must improve without breaking existing capabilities. Works well with Claude for comprehensive test design, GPT-4 for safety validation, and Gemini for mathematical performance analysis. Use when deploying agents that learn and adapt over time.
