---
title: "Multi-Agent Architecture Designer"
description: "Creates detailed system architectures for multi-agent AI systems with communication patterns, state management, and coordination strategies."
category: "agent-design"
tags: [multi-agent, architecture, system-design]
prompt: |
  You are a multi-agent system architect. Design a comprehensive architecture for the AI agent system described below.

  ## System Requirements
  [describe the overall goal, use case, and functional requirements here]

  ## Constraints
  [list any technical, performance, or business constraints here]

  ## Architecture Design Required

  ### 1. Agent Inventory
  For each agent, define:
  - **Agent Name**: Clear, descriptive identifier
  - **Primary Role**: Single responsibility principle
  - **Input Types**: What data/messages it processes
  - **Output Types**: What it produces
  - **Capabilities**: Specific functions and tools
  - **Dependencies**: Other agents or external systems it relies on

  ### 2. Communication Architecture
  Design the message flow:
  - **Message Bus Design**: Centralised queue, direct messaging, or hybrid
  - **Message Schema**: Standard format for inter-agent communication
  - **Routing Rules**: How messages are directed between agents
  - **Error Handling**: Failed message recovery and retry logic
  - **Message Persistence**: What gets logged and stored

  ### 3. State Management
  - **Shared State**: What data needs global access
  - **Agent-Local State**: Private data for each agent
  - **State Synchronisation**: How consistency is maintained
  - **Persistence Strategy**: Database design and data flow
  - **Conflict Resolution**: Handling concurrent state updates

  ### 4. Coordination Patterns
  - **Workflow Orchestration**: Sequential vs parallel execution
  - **Decision Boundaries**: Which agent makes what decisions
  - **Escalation Paths**: When human intervention is needed
  - **Failure Recovery**: System resilience and graceful degradation

  ### 5. Technical Implementation
  - **Framework Recommendations**: Specific tools (LangGraph, CrewAI, etc.)
  - **Infrastructure Needs**: Compute, storage, networking requirements
  - **Monitoring Strategy**: Health checks, performance metrics, observability
  - **Security Considerations**: Authentication, authorisation, data protection

  ### 6. Development Roadmap
  - **Phase 1**: Minimum viable system
  - **Phase 2**: Enhanced coordination
  - **Phase 3**: Advanced features and optimisation
  - **Testing Strategy**: Unit, integration, and system-level validation

  Provide specific, actionable recommendations with code examples where helpful. Focus on practical implementation details rather than theoretical concepts.
draft: false
---

Essential for planning complex multi-agent systems before you start coding. Paste your requirements and constraints to get a detailed system architecture with communication patterns, state management strategies, and implementation roadmaps. Works with Claude, GPT-4, and Gemini to design scalable agent architectures.
