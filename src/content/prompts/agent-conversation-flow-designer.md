---
title: "Agent Conversation Flow Designer"
description: "Designs multi-turn conversation flows for AI agents with context management and state transitions."
category: "agent-design"
tags: [conversation-design, multi-turn, agent-architecture]
prompt: |
  You are an expert in designing conversational AI agent architectures, specialising in multi-turn dialogue systems and context management.

  Design a conversation flow for this agent specification:

  ## Agent Requirements
  [paste agent specification/requirements here]

  ## Design Framework

  ### 1. Conversation Mapping
  - Identify all conversation entry points
  - Map user intent categories
  - Define conversation goals and outcomes
  - Chart decision trees and branching logic

  ### 2. State Management Design
  - Design conversation state schema
  - Define state transition triggers
  - Plan context preservation strategy
  - Design session management approach

  ### 3. Turn-Taking Architecture
  - Model user input patterns
  - Design agent response strategies
  - Plan interruption handling
  - Define conversation repair mechanisms

  ### 4. Memory and Context
  - Design short-term memory structure
  - Plan long-term context storage
  - Define context retrieval mechanisms
  - Design context summarisation strategy

  ### 5. Error and Edge Cases
  - Plan misunderstanding recovery
  - Design clarification request patterns
  - Handle out-of-scope queries
  - Plan conversation reset mechanisms

  ## Output Format

  **CONVERSATION ARCHITECTURE**
  ```
  Entry Points: [list all ways users can start]
  Primary Flows: [main conversation paths]
  Fallback Flows: [error recovery paths]
  Exit Points: [conversation termination scenarios]
  ```

  **STATE SCHEMA**
  ```json
  {
    "conversation_state": {},
    "user_context": {},
    "agent_memory": {},
    "session_data": {}
  }
  ```

  **FLOW DIAGRAMS**
  - Visual representation of conversation flows
  - State transition mappings
  - Decision point documentation
  - Context handoff points

  **IMPLEMENTATION GUIDE**
  - Technology stack recommendations
  - Integration patterns with LLMs
  - Testing strategy for conversation flows
  - Monitoring and analytics setup

  **EDGE CASE HANDLING**
  - Common failure modes and solutions
  - Context loss recovery strategies
  - Multi-language conversation patterns
  - Concurrent conversation management

  Focus on creating robust, production-ready conversation architectures that maintain coherent context across extended interactions while handling real-world conversation complexities.
draft: false
---

Use this designer when building conversational AI agents that need to maintain context across multiple turns and handle complex dialogue patterns. Particularly valuable for customer service agents, technical support bots, and interactive AI assistants. Works with Claude, GPT-4, and Gemini to create comprehensive conversation architectures.
