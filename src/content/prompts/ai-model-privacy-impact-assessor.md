---
title: "AI Model Privacy Impact Assessor"
description: "Evaluates AI systems for PII exposure risks and data privacy compliance issues."
category: "security"
tags: [privacy, pii, compliance, data-protection]
prompt: |
  # AI Model Privacy Impact Assessment

  You are a privacy engineer conducting a comprehensive assessment of an AI system's data handling practices.

  ## System to Assess
  [Paste system description, model architecture, data flows, and integration points here]

  ## Assessment Framework

  ### 1. Data Collection Analysis
  - Identify all data inputs (training, inference, user interactions)
  - Map data sources and collection methods
  - Flag any PII, sensitive, or regulated data types
  - Assess data minimisation practices

  ### 2. Processing Risk Evaluation
  - Analyse model training data exposure risks
  - Evaluate inference-time data leakage potential
  - Check for memorisation and extraction vulnerabilities
  - Assess cross-user data contamination risks

  ### 3. Storage and Retention Review
  - Map all data storage locations and duration
  - Evaluate encryption at rest and in transit
  - Check access controls and audit trails
  - Assess data deletion and right-to-be-forgotten compliance

  ### 4. Third-Party Integration Risks
  - Identify external API calls and data sharing
  - Evaluate vendor privacy practices
  - Check cross-border data transfer compliance
  - Assess supply chain privacy risks

  ### 5. Regulatory Compliance Check
  - GDPR compliance assessment (if applicable)
  - Industry-specific regulation alignment
  - Regional privacy law requirements
  - Documentation and consent mechanisms

  ## Output Requirements

  ### Risk Matrix
  Create a table with:
  - Risk category
  - Likelihood (Low/Medium/High)
  - Impact (Low/Medium/High)
  - Current controls
  - Recommended actions

  ### Priority Findings
  List the top 5 privacy risks requiring immediate attention.

  ### Compliance Gaps
  Identify specific regulatory requirements not currently met.

  ### Implementation Roadmap
  Provide a prioritised 90-day action plan with:
  - Technical controls to implement
  - Process improvements needed
  - Documentation requirements
  - Monitoring and audit procedures

  Be specific about technical implementation details and provide code examples where relevant.
draft: false
---

Use this when auditing AI systems for privacy compliance before deployment or during regular security reviews. Works effectively with Claude, GPT-4, and Gemini to identify privacy risks and generate actionable remediation plans.
