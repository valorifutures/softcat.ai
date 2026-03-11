---
title: "Agent Integration Testing Framework"
description: "Generate comprehensive test suites for multi-agent systems with communication protocols and failure scenarios."
category: "testing"
tags: [agent-testing, integration, communication, failure-modes]
prompt: |
  # Multi-Agent Integration Testing Framework

  You are an expert in testing complex multi-agent systems. Create a comprehensive integration testing framework for the agent architecture described below.

  ## Agent System Description
  [Paste your agent system details here - include agent types, communication patterns, shared resources, dependencies]

  ## Testing Framework Design

  ### 1. Agent Communication Testing
  - **Message Protocol Tests**: Verify message format, serialisation, and parsing
  - **Async Communication**: Test message queues, callbacks, and event handling
  - **Protocol Compliance**: Validate adherence to communication standards
  - **Message Ordering**: Test sequential and parallel message handling
  - **Timeout Handling**: Verify behaviour when agents don't respond

  ### 2. Inter-Agent Dependency Testing
  - **Service Discovery**: Test agent registration and discovery mechanisms
  - **Shared Resource Access**: Validate concurrent access to databases, APIs, files
  - **State Synchronisation**: Test distributed state consistency
  - **Dependency Chains**: Verify cascading operations across agents
  - **Circular Dependencies**: Detect and handle circular agent dependencies

  ### 3. Failure Mode Testing
  - **Agent Crash Recovery**: Test system behaviour when individual agents fail
  - **Network Partitions**: Simulate network splits between agent groups
  - **Resource Exhaustion**: Test behaviour under memory, CPU, and I/O limits
  - **Cascading Failures**: Verify graceful degradation when multiple agents fail
  - **Data Corruption**: Test handling of malformed or corrupted inter-agent data

  ### 4. Performance Integration Testing
  - **Load Testing**: Test system under varying agent workloads
  - **Latency Testing**: Measure end-to-end operation times across agents
  - **Throughput Testing**: Verify message processing rates
  - **Memory Leaks**: Test for resource leaks in long-running agent interactions
  - **Scaling Behaviour**: Test adding/removing agents dynamically

  ### 5. Security Integration Testing
  - **Authentication**: Test agent identity verification
  - **Authorisation**: Verify agent permission boundaries
  - **Data Isolation**: Test agent data access restrictions
  - **Injection Attacks**: Test malicious input handling between agents
  - **Privilege Escalation**: Verify agents can't exceed granted permissions

  ### 6. Test Implementation Strategy
  Generate specific test cases including:
  - Test setup and teardown procedures
  - Mock agent implementations for isolated testing
  - Integration test data and scenarios
  - Assertion strategies for distributed systems
  - Test environment configuration
  - Continuous integration pipeline integration

  ## Test Output Requirements
  Provide:
  1. Detailed test scenarios with expected outcomes
  2. Test data generation strategies
  3. Environment setup scripts and configurations
  4. Monitoring and logging requirements for tests
  5. Test execution order and dependencies
  6. Performance benchmarks and acceptance criteria
  7. Failure simulation tools and techniques

  Focus on practical, executable tests that catch real integration issues.
draft: false
---

Essential for testing complex agent systems like ByteDance's DeerFlow or multi-agent architectures. Works with Claude, GPT-4, and Gemini to generate thorough integration test suites. Use this when you need to validate agent communication, failure handling, and system-wide behaviour.
