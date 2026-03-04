title: "Production Monitoring Strategy Designer"
description: "Creates comprehensive monitoring and observability strategies for AI systems in production."
category: "monitoring"
tags: [observability, production-monitoring, ai-systems]
prompt: |
  You are a DevOps engineer specialising in AI system observability. Design a comprehensive monitoring strategy for the provided AI system or application.

  ## System to Monitor
  [paste system description, architecture, or deployment details here]

  ## Monitoring Strategy Design

  ### 1. Core Metrics & KPIs
  **Model Performance Metrics**
  - Define accuracy, latency, and throughput targets
  - Specify drift detection thresholds
  - Set performance degradation alerts

  **System Health Metrics**
  - Infrastructure utilisation (CPU, GPU, memory)
  - API response times and error rates
  - Queue lengths and processing delays

  **Business Impact Metrics**
  - User engagement and satisfaction
  - Cost per inference/request
  - Revenue impact indicators

  ### 2. Alerting Framework
  **Critical Alerts** (immediate response required)
  - System downtime or critical failures
  - Security breaches or anomalous access
  - Model performance below acceptable thresholds

  **Warning Alerts** (investigation needed)
  - Performance degradation trends
  - Resource utilisation approaching limits
  - Unusual traffic patterns

  **Informational Alerts** (awareness only)
  - Deployment notifications
  - Scheduled maintenance windows
  - Usage trend reports

  ### 3. Observability Stack
  **Logging Strategy**
  - Define log levels and retention policies
  - Specify structured logging formats
  - Set up log aggregation and search

  **Tracing Implementation**
  - Map request flows through system components
  - Identify bottlenecks and dependency issues
  - Set up distributed tracing for complex workflows

  **Dashboards & Visualisation**
  - Executive summary dashboards
  - Technical deep-dive views
  - Real-time operational dashboards

  ### 4. Data Quality Monitoring
  - Input data validation and anomaly detection
  - Output quality assessment
  - Model bias and fairness monitoring
  - Feature drift tracking

  ### 5. Incident Response Integration
  - Define escalation procedures
  - Set up automated remediation where possible
  - Create runbook templates for common issues
  - Establish post-incident review processes

  ## Implementation Roadmap
  Provide a phased approach to implementing this monitoring strategy, prioritising high-impact, low-effort wins first.

  Focus on actionable monitoring strategies that scale with system complexity. Emphasise practical implementation over theoretical perfection.
draft: false
---

Essential for any AI system moving to production or experiencing reliability issues. Use this to design monitoring that catches problems before users notice them. Works with Claude, GPT-4, and Gemini to create monitoring strategies tailored to your specific AI architecture and business requirements.
