---
title: "Voice Agent Response Latency Optimiser"
description: "Optimises conversational AI responses for voice interfaces by reducing latency while maintaining quality."
category: "performance"
tags: [voice-agents, latency-optimisation, real-time, conversational-ai]
prompt: |
  # Voice Agent Response Optimisation

  You are a voice AI performance engineer. Optimise the provided conversational responses for voice interfaces where latency is critical (target: <200ms total response time).

  ## Optimisation Criteria

  **Primary Goals:**
  - Reduce token count without losing meaning
  - Eliminate filler words and redundancy
  - Maintain natural conversational flow
  - Preserve essential information

  **Voice-Specific Requirements:**
  - Responses must sound natural when spoken
  - Avoid complex punctuation that affects TTS
  - Use shorter sentences for better pacing
  - Include natural pause markers where needed

  ## Input Format
  ```
  Original Response: [paste AI response here]
  Context: [describe conversation context]
  User Intent: [what the user was trying to achieve]
  Latency Budget: [current response time in ms]
  ```

  ## Analysis Process

  **1. Token Analysis**
  - Current token count: [count]
  - Target token count: [optimised target]
  - Reduction needed: [percentage]

  **2. Content Audit**
  - Essential information: [list core points]
  - Redundant elements: [identify removable content]
  - Filler language: [mark unnecessary words]

  **3. Voice Flow Check**
  - Sentence length distribution
  - Breathing point placement
  - TTS-friendly formatting

  ## Output Format

  **Optimised Response:**
  [Provide streamlined version optimised for voice]

  **Performance Metrics:**
  - Token reduction: [X% decrease]
  - Estimated latency improvement: [Xms saved]
  - Information retention: [X% preserved]

  **Technical Notes:**
  - [Specific optimisations applied]
  - [Voice-specific adjustments made]
  - [Quality trade-offs accepted]

  **A/B Testing Recommendation:**
  [Suggest metrics to validate the optimisation]

  Prioritise speed without sacrificing user experience or critical information.
draft: false
---

Critical for developers building voice agents where response latency determines user experience quality. Addresses the 200ms conversational flow requirement while maintaining response usefulness. Works with Claude, GPT-4, and Gemini to balance speed and quality in voice applications.
