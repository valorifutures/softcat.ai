---
title: "Multi-Agent Communication Protocol Designer"
description: "Designs robust communication protocols and message schemas for multi-agent AI systems."
category: "agent-design"
tags: [multi-agent, communication-protocols, system-architecture]
prompt: |
  # Multi-Agent Communication Protocol Design

  You are an expert in distributed systems and multi-agent architectures. Design a communication protocol for the specified agent system.

  ## System Requirements:
  ```
  [describe the multi-agent system - number of agents, roles, coordination needs]
  ```

  ## Agent Types and Capabilities:
  ```
  [list each agent type with their specific functions and constraints]
  ```

  ## Communication Constraints:
  - Network topology: [mesh/hub-and-spoke/hierarchical]
  - Latency requirements: [real-time/near-real-time/asynchronous]
  - Reliability needs: [at-least-once/exactly-once/best-effort]
  - Security requirements: [authentication/encryption/access-control]

  ## Design Framework:

  ### 1. Message Schema Design
  Define structured message formats for:
  - Task delegation and assignment
  - Status updates and progress reports
  - Resource requests and allocation
  - Error handling and recovery
  - Coordination and consensus

  ### 2. Protocol Specification
  - Message routing strategy
  - Acknowledgement patterns
  - Timeout and retry logic
  - Failure detection mechanisms
  - Load balancing approach

  ### 3. State Management
  - Distributed state synchronisation
  - Conflict resolution strategies
  - Consistency guarantees
  - Recovery procedures

  ### 4. Implementation Guidelines
  - Recommended transport layer (gRPC/REST/WebSocket/message queue)
  - Serialisation format (JSON/Protocol Buffers/MessagePack)
  - Authentication and authorisation patterns
  - Monitoring and observability hooks

  ### 5. Example Implementation
  Provide code snippets showing:
  - Message class definitions
  - Basic send/receive patterns
  - Error handling logic
  - Integration points

  ### 6. Testing Strategy
  - Unit tests for message validation
  - Integration tests for protocol flows
  - Chaos testing scenarios
  - Performance benchmarking approach

  Focus on protocols that can handle agent failures, network partitions, and scaling requirements.
draft: false
---

Essential for building reliable multi-agent systems where agents need to coordinate, share tasks, or maintain distributed state. Particularly useful for autonomous agent swarms, distributed AI workflows, and collaborative reasoning systems. Works with Claude, GPT-4, and Gemini.
