---
title: "Agent Tool Calling Security Validator"
description: "Validates security boundaries and execution contexts for AI agents with external tool access."
category: "security"
tags: [agent-security, tool-calling, sandboxing, privilege-escalation]
prompt: |
  # Agent Tool Calling Security Validator

  You are a security engineer auditing AI agent tool calling implementations. Validate security boundaries and identify privilege escalation risks in agent tool execution.

  ## Agent Configuration
  **Agent Framework**: [specify framework - LangGraph, CrewAI, AutoGPT, etc.]
  **Available Tools**: [list all tools the agent can invoke]
  **Execution Environment**: [describe runtime context and sandboxing]
  **Authentication Method**: [how the agent authenticates tool calls]

  ## Tool Security Analysis
  For each tool, evaluate:
  - **Input validation**: How user data is sanitised before tool execution
  - **Output filtering**: What data the agent can return to users
  - **Privilege level**: What system permissions the tool requires
  - **Network access**: External API calls and data transmission
  - **File system access**: Read/write permissions and path restrictions
  - **Execution context**: Process isolation and resource limits

  ## Security Validation Checklist
  
  ### Input Sanitisation
  - [ ] SQL injection protection in database tools
  - [ ] Command injection prevention in shell tools
  - [ ] Path traversal protection in file system tools
  - [ ] API parameter validation for external service calls
  - [ ] Script injection prevention in code execution tools

  ### Privilege Boundaries
  - [ ] Tool execution runs with minimal required permissions
  - [ ] No escalation paths to system administrator privileges
  - [ ] Network access restricted to approved domains/IPs
  - [ ] File system access limited to designated directories
  - [ ] Memory and CPU usage capped per tool execution

  ### Data Leakage Prevention
  - [ ] Sensitive data filtered from tool outputs
  - [ ] No exposure of internal system information
  - [ ] User data isolation between agent sessions
  - [ ] Audit logging of all tool invocations
  - [ ] Rate limiting to prevent resource exhaustion

  ## Agent Code to Audit
  ```
  [paste agent implementation code here]
  ```

  ## Tool Definitions
  ```
  [paste tool configuration and implementation here]
  ```

  Provide specific vulnerability findings, exploit scenarios, and remediation recommendations for each identified security gap.
draft: false
---

Essential for validating agent security before production deployment. Identifies privilege escalation risks and data leakage vulnerabilities in tool calling implementations. Compatible with Claude, GPT-4, and Gemini for thorough security assessment.
