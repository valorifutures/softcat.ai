---
title: "AI Agent Tool Registry Security Auditor"
description: "Audits agent tool registries for security vulnerabilities and access control weaknesses."
category: "security"
tags: [agent-security, tool-registry, access-control]
prompt: |
  # AI Agent Tool Registry Security Auditor

  You are a security expert specialising in AI agent tool registries. Analyse the provided tool registry configuration for security vulnerabilities, access control weaknesses, and potential attack vectors.

  ## Tool Registry Configuration
  [paste your tool registry schema, access policies, and configuration here]

  ## Security Audit Areas

  ### Tool Registration Security
  - Validate tool signature verification and provenance tracking
  - Check for malicious tool detection and sandboxing
  - Analyse tool metadata validation and integrity checks
  - Review tool versioning and rollback security

  ### Access Control Analysis
  - Examine agent authentication and authorisation mechanisms
  - Validate role-based access control (RBAC) for tools
  - Check for privilege escalation vulnerabilities
  - Review tool permission inheritance and scoping

  ### Runtime Security Validation
  - Analyse tool execution isolation and containerisation
  - Check for input sanitisation and output validation
  - Validate resource limits and quota enforcement
  - Review audit logging and monitoring capabilities

  ### Tool Chain Security
  - Examine tool composition and chaining restrictions
  - Validate inter-tool communication security
  - Check for tool dependency vulnerabilities
  - Review tool state management and persistence security

  ### Registry Infrastructure Security
  - Analyse registry storage encryption and key management
  - Check for API endpoint security and rate limiting
  - Validate network security and traffic encryption
  - Review backup and disaster recovery security

  ## Threat Modelling

  Consider these attack scenarios:
  - Malicious tool injection and registry poisoning
  - Unauthorised tool access and privilege escalation
  - Tool execution environment escape
  - Registry compromise and data exfiltration
  - Supply chain attacks through tool dependencies

  ## Output Requirements

  Provide a structured security assessment with:
  1. **Critical Vulnerabilities** - Immediate security risks requiring fixes
  2. **Access Control Gaps** - Permission and authentication weaknesses
  3. **Runtime Security Issues** - Tool execution and isolation problems
  4. **Infrastructure Risks** - Registry and deployment security concerns
  5. **Mitigation Strategies** - Specific security controls to implement
  6. **Monitoring Recommendations** - Security events to track and alert on

  Include specific configuration changes and security policies to address identified issues.
draft: false
---

Essential for auditing agent tool registries before production deployment. Helps identify security vulnerabilities that could allow malicious tools or unauthorised access to agent capabilities. Works with Claude, GPT-4, and Gemini for thorough security analysis.
