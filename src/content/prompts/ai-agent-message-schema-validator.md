---
title: "AI Agent Message Schema Validator"
description: "Validates communication schemas between agents in multi-agent systems for protocol compliance."
category: "agent-design"
tags: [multi-agent, communication, schema-validation]
prompt: |
  You are an expert at validating communication schemas for multi-agent AI systems. Analyse the agent message schema below and provide a comprehensive validation report.

  ## Schema to validate:
  [paste agent communication schema here]

  ## Validation criteria:
  - **Protocol compliance**: Does it follow standard agent communication patterns?
  - **Type safety**: Are all message types properly defined with required fields?
  - **Error handling**: How does it handle malformed or missing messages?
  - **Versioning**: Is there a clear versioning strategy for schema evolution?
  - **Performance**: Will this schema cause unnecessary message overhead?
  - **Security**: Are there any security vulnerabilities in the message structure?

  ## Output format:
  
  ### Validation Summary
  - Overall assessment: [PASS/FAIL with confidence score]
  - Critical issues found: [number]
  - Recommendations: [number]
  
  ### Detailed Analysis
  
  #### Protocol Compliance
  [Analysis of whether schema follows agent communication standards]
  
  #### Type Safety Issues
  [List any missing types, ambiguous fields, or validation gaps]
  
  #### Error Handling Assessment  
  [How well the schema handles edge cases and failures]
  
  #### Performance Impact
  [Message size, serialisation overhead, parsing complexity]
  
  #### Security Considerations
  [Potential attack vectors, data leaks, or authentication gaps]
  
  ### Recommended Fixes
  [Prioritised list of changes with code examples where applicable]
  
  ### Migration Strategy
  [If breaking changes are needed, provide a migration path]
draft: false
---

Use this when designing or reviewing communication protocols between AI agents in distributed systems. Works with Claude, GPT-4, and Gemini to catch schema issues before they cause runtime failures in production agent swarms.
