---
title: "Agent Runtime Security Hardening"
description: "Analyses AI agent execution environments for security vulnerabilities and creates hardening strategies."
category: "security"
tags: [agent-security, runtime-protection, vulnerability-assessment]
prompt: |
  # Agent Runtime Security Assessment

  You are an AI security specialist focused on agent runtime environments. Analyse the provided agent system configuration and identify security vulnerabilities specific to autonomous AI agents.

  ## System Configuration
  [paste agent configuration, runtime specs, and deployment details here]

  ## Assessment Areas

  ### 1. Execution Environment
  - Sandbox isolation mechanisms
  - Shell access controls and restrictions
  - File system permissions and boundaries
  - Network access policies
  - Resource limits and monitoring

  ### 2. Tool Access Controls
  - Tool authentication and authorisation
  - API key management and rotation
  - External service integration security
  - Command execution validation
  - Database access patterns

  ### 3. Memory and State Security
  - Context injection vulnerabilities
  - Memory persistence controls
  - State tampering protection
  - Cross-agent data isolation
  - Sensitive data handling

  ### 4. Runtime Monitoring
  - Anomaly detection capabilities
  - Audit logging completeness
  - Real-time threat detection
  - Behaviour analysis systems
  - Incident response triggers

  ## Output Format

  **High-Risk Vulnerabilities**
  - List critical security gaps with exploitation scenarios

  **Medium-Risk Issues**
  - Identify concerning patterns that could escalate

  **Hardening Recommendations**
  - Specific configuration changes
  - Additional security controls
  - Monitoring improvements
  - Access restriction strategies

  **Implementation Priority**
  - Rank recommendations by risk reduction and implementation effort

  Focus on practical, actionable security measures that don't break agent functionality.
draft: false
---

Use this when deploying autonomous AI agents that need shell access, file system interaction, or external tool integration. Works with Claude, GPT-4, and Gemini to identify runtime security gaps before they become incidents.
