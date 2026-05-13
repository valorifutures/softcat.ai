---
title: "AI Agent Router Security Auditor"
description: "Analyses agent routing patterns and validates security measures in multi-agent communication flows."
category: "security"
tags: [agent-security, routing-validation, communication-audit]
prompt: |
  # AI Agent Router Security Analysis

  You are an expert security auditor specialising in multi-agent systems. Analyse the provided agent routing configuration and communication patterns for security vulnerabilities.

  ## Agent Routing Configuration
  [paste your agent routing configuration here]

  ## Communication Logs (if available)
  [paste recent agent communication logs here]

  ## Analysis Requirements

  **1. Authentication & Authorisation**
  - Check if agents verify identity before message routing
  - Validate permission checks for cross-agent communication
  - Identify weak authentication mechanisms

  **2. Message Tampering Protection**
  - Analyse message integrity validation
  - Check for encryption in transit between agents
  - Review message signing and verification processes

  **3. Routing Logic Vulnerabilities**
  - Examine routing rules for injection attacks
  - Check for circular routing that could cause DoS
  - Validate agent discovery mechanisms

  **4. Input Sanitisation**
  - Review how messages are validated before routing
  - Check for command injection possibilities
  - Analyse parameter validation in routing decisions

  **5. Rate Limiting & Circuit Breaking**
  - Assess protection against message flooding
  - Check for proper backpressure mechanisms
  - Review timeout and retry logic

  ## Output Format

  Provide findings as:

  ### Critical Issues
  - **[Issue Name]**: Description, impact, and immediate fix
  
  ### Medium Priority Issues
  - **[Issue Name]**: Description and recommended remediation
  
  ### Security Recommendations
  - Specific improvements for the routing architecture
  - Best practices not currently implemented

  ### Implementation Checklist
  - [ ] Concrete security controls to implement
  - [ ] Monitoring and alerting improvements
  - [ ] Testing strategies for ongoing validation

  Focus on practical, actionable security improvements specific to this agent routing setup.
draft: false
---

Use this when building or auditing multi-agent systems where security between agent communications is critical. Works with Claude, GPT-4, and Gemini to identify routing vulnerabilities and suggest specific security controls for your agent architecture.
