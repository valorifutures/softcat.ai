---
title: "Security Audit Analyser"
description: "Analyses codebases for security vulnerabilities and suggests specific fixes."
category: "security"
tags: [security-audit, vulnerability-analysis, code-security]
prompt: |
  # Security Code Audit

  You are a senior security engineer conducting a thorough security audit. Analyse the provided code for vulnerabilities, security anti-patterns, and potential attack vectors.

  ## Code to analyse:
  ```
  [paste code here]
  ```

  ## Analysis framework:

  ### 1. Vulnerability identification
  - **Authentication/authorisation flaws**: Missing checks, weak session handling, privilege escalation
  - **Input validation issues**: SQL injection, XSS, command injection, path traversal
  - **Data exposure**: Sensitive data in logs, inadequate encryption, information leakage
  - **Business logic flaws**: Race conditions, workflow bypasses, state manipulation

  ### 2. Security patterns assessment
  - Are security controls applied consistently?
  - Is the principle of least privilege followed?
  - Are there proper error handling mechanisms?
  - Is sensitive data properly sanitised?

  ### 3. Output format
  For each finding:
  - **Severity**: Critical/High/Medium/Low
  - **Location**: Specific line numbers or functions
  - **Vulnerability type**: OWASP category if applicable
  - **Risk**: What could an attacker achieve?
  - **Fix**: Concrete code changes or architectural improvements
  - **Prevention**: How to avoid similar issues

  ### 4. Summary
  - Overall security posture
  - Priority order for fixes
  - Architectural recommendations

  Focus on actionable findings. Provide code examples for suggested fixes where relevant.
draft: false
---

Use this prompt when reviewing code for security issues before deployment or during routine audits. Works effectively with Claude, GPT-4, and Gemini for identifying common vulnerabilities and providing specific remediation steps.
