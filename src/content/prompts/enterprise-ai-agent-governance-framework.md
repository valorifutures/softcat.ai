---
title: "Enterprise AI Agent Governance Framework"
description: "Designs approval workflows, risk classification, and audit trails for enterprise AI agent systems."
category: "agent-design"
tags: [enterprise-ai, governance, approval-workflows, risk-management]
prompt: |
  # Enterprise AI Agent Governance Framework Designer

  You are an enterprise AI architect specialising in governance systems. Design a comprehensive governance framework for the AI agent deployment described below.

  ## Agent System Description
  [paste agent system details, use cases, and business requirements here]

  ## Governance Framework Components

  ### Risk Classification Matrix
  Create a risk classification system that categorises agent requests based on:
  - **Data Sensitivity**: Public, internal, confidential, restricted
  - **System Impact**: Read-only, data modification, system configuration, external integration
  - **Business Criticality**: Low, medium, high, mission-critical
  - **Compliance Scope**: Standard operations, regulated data, cross-border transfers

  ### Approval Workflow Design
  Define approval processes for each risk level:
  - **Automatic Approval**: Low-risk operations that can proceed without human oversight
  - **Manager Approval**: Medium-risk operations requiring departmental sign-off
  - **Committee Review**: High-risk operations requiring cross-functional approval
  - **Executive Approval**: Mission-critical operations requiring C-level authorisation

  ### Policy Engine Rules
  Create executable policies that can be implemented in code:
  - **Access Controls**: Which users/roles can deploy or modify agents
  - **Resource Limits**: Compute, storage, and API usage quotas per agent
  - **Time Restrictions**: Operating hours, maintenance windows, and session limits
  - **Geographic Boundaries**: Data residency and cross-border operation rules

  ### Audit and Monitoring Strategy
  Design comprehensive logging and oversight mechanisms:
  - **Decision Audit Trail**: Every approval, rejection, and policy application
  - **Agent Action Logging**: Complete record of agent operations and outcomes
  - **Performance Metrics**: Success rates, error patterns, and resource utilisation
  - **Compliance Reporting**: Automated reports for regulatory requirements

  ### Implementation Architecture
  Provide technical specifications for:
  - **Policy Storage**: How rules and approvals are stored and versioned
  - **Integration Points**: APIs for existing enterprise systems (LDAP, ITSM, etc.)
  - **Notification Systems**: How stakeholders are alerted to approvals and incidents
  - **Override Mechanisms**: Emergency procedures for bypassing normal approval flows

  ## Output Requirements

  Structure your response as:

  1. **Executive Summary** (governance approach and key principles)
  2. **Risk Classification Schema** (detailed matrix with examples)
  3. **Approval Workflow Diagrams** (step-by-step processes for each risk level)
  4. **Policy Implementation Code** (pseudocode or configuration examples)
  5. **Monitoring Dashboard Design** (key metrics and alert conditions)
  6. **Integration Roadmap** (phased implementation plan with timelines)

  Focus on practical implementation details rather than theoretical frameworks. Include specific examples of policies and approval criteria.
draft: false
---

Use this prompt to establish enterprise-grade governance for AI agent deployments. Works with Claude, GPT-4, and Gemini to create practical approval workflows and risk management systems. Essential for organisations deploying autonomous agents in regulated environments or handling sensitive data.
