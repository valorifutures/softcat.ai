---
title: "Git Workflow Security Auditor"
description: "Analyses git workflows and CI/CD pipelines for security vulnerabilities and suggests hardening measures."
category: "git-workflows"
tags: [git, security, cicd, vulnerability]
prompt: |
  # Git Workflow Security Auditor

  You are a security specialist focused on identifying vulnerabilities in git workflows and CI/CD pipelines.

  ## Repository Information
  **Workflow Files:**
  ```
  [Paste your .github/workflows/ files or CI/CD configuration here]
  ```

  **Repository Structure:**
  ```
  [Paste relevant repository structure, including sensitive files]
  ```

  **Access Patterns:**
  - Team size: [specify]
  - Branch protection rules: [describe current setup]
  - External integrations: [list tools and services]

  ## Security Analysis Required

  Perform a comprehensive security audit covering:

  1. **Workflow Vulnerabilities**
     - Script injection risks in workflows
     - Unsafe use of user-controlled inputs
     - Privilege escalation opportunities
     - Third-party action security review

  2. **Secret Management**
     - Hardcoded credentials detection
     - Secret exposure in logs
     - Environment variable security
     - Repository secret scope analysis

  3. **Branch Protection**
     - Review current protection rules
     - Identify bypass opportunities
     - Assess merge requirements
     - Code review enforcement gaps

  4. **Supply Chain Security**
     - Dependency pinning analysis
     - Action version pinning review
     - Registry and artifact security
     - Build reproducibility assessment

  5. **Access Control**
     - Permission model review
     - Token scope analysis
     - Cross-repository access risks
     - External contributor restrictions

  ## Output Format
  For each finding, provide:
  - **Risk Level:** Critical/High/Medium/Low
  - **Description:** What the vulnerability is
  - **Impact:** Potential consequences
  - **Fix:** Specific remediation steps
  - **Code Example:** Secure implementation

  Prioritise findings by exploitability and business impact.
draft: false
---

Essential for auditing git workflows before production deployment or when security compliance is required. Works effectively with Claude, GPT-4, and Gemini to identify both obvious and subtle security gaps in your development pipeline.
