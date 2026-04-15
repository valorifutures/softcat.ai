---
title: "Multi-Modal AI Pipeline Architecture Designer"
description: "Designs system architectures for AI applications that process text, images, audio, and video in coordinated workflows."
category: "architecture"
tags: [multimodal-ai, pipeline-design, system-architecture]
prompt: |
  # Multi-Modal AI Pipeline Architecture Designer

  You are a systems architect specialising in multi-modal AI applications. Design a robust, scalable architecture for processing and coordinating multiple data types (text, images, audio, video) through AI models.

  ## Project Requirements
  [Describe your multi-modal AI application requirements here]

  ## Data Types and Sources
  - **Text inputs**: [e.g., user messages, documents, captions]
  - **Image inputs**: [e.g., photos, diagrams, screenshots]
  - **Audio inputs**: [e.g., speech, music, ambient sound]
  - **Video inputs**: [e.g., recordings, streams, animations]
  - **Expected volume**: [e.g., 1000 requests/hour, real-time streaming]

  ## Processing Requirements
  - **Real-time vs batch**: [Specify latency requirements]
  - **Model preferences**: [List specific models like GPT-4V, Whisper, DALL-E]
  - **Output formats**: [e.g., JSON, generated media, structured data]
  - **Integration needs**: [APIs, webhooks, databases to connect]

  ## Architecture Design Framework

  ### 1. Input Processing Layer
  Design the ingestion and preprocessing pipeline:
  - **File upload handling**: Size limits, format validation, storage strategy
  - **Media preprocessing**: Compression, format conversion, quality optimisation
  - **Metadata extraction**: EXIF data, duration, dimensions, encoding details
  - **Content validation**: Safety filters, malware scanning, format verification

  ### 2. Model Orchestration Layer
  Plan the AI model coordination:
  - **Model selection logic**: When to use which models for different inputs
  - **Parallel vs sequential processing**: How to optimise for speed and cost
  - **Context sharing**: How models share information across modalities
  - **Fallback strategies**: What happens when models fail or are unavailable

  ### 3. Data Flow Architecture
  Map the information flow:
  - **Queue management**: How to handle processing backlogs
  - **State persistence**: Tracking multi-step processing workflows
  - **Result aggregation**: Combining outputs from multiple models
  - **Error propagation**: Handling failures in complex pipelines

  ### 4. Infrastructure Components
  Define the technical stack:
  - **Compute resources**: GPU requirements, auto-scaling strategies
  - **Storage solutions**: Media files, temporary data, model outputs
  - **API gateway**: Rate limiting, authentication, request routing
  - **Monitoring systems**: Performance tracking, cost monitoring, error alerting

  ### 5. Performance Optimisation
  Address scalability and efficiency:
  - **Caching strategies**: Model outputs, preprocessed media, API responses
  - **Load balancing**: Distributing work across model instances
  - **Cost optimisation**: Model selection based on quality vs price
  - **Resource pooling**: Sharing GPU instances across different model types

  ## Output Format

  Structure your architecture design as:

  ```markdown
  ## System Overview
  [High-level description of the architecture approach]

  ## Component Diagram
  ```
  [Input Sources] → [Preprocessing] → [Model Router] → [AI Models] → [Result Aggregator] → [Output API]
  ```

  ## Infrastructure Stack
  - **Container orchestration**: [e.g., Kubernetes, Docker Swarm]
  - **Message queues**: [e.g., Redis, RabbitMQ, AWS SQS]
  - **Databases**: [e.g., PostgreSQL for metadata, S3 for media]
  - **Monitoring**: [e.g., Prometheus, Grafana, custom dashboards]

  ## Model Integration Strategy
  1. **Text processing**: [Which models, how they're called]
  2. **Image processing**: [Computer vision pipeline design]
  3. **Audio processing**: [Speech and audio analysis workflow]
  4. **Video processing**: [Frame extraction, temporal analysis]

  ## Data Flow Patterns
  - **Synchronous workflows**: [When immediate results are needed]
  - **Asynchronous processing**: [For long-running tasks]
  - **Event-driven triggers**: [How components communicate]

  ## Scaling Considerations
  - **Horizontal scaling**: [How to add more processing capacity]
  - **Vertical scaling**: [When to upgrade individual components]
  - **Geographic distribution**: [Multi-region deployment strategy]

  ## Security and Compliance
  - **Data encryption**: [At rest and in transit]
  - **Access controls**: [API authentication, internal service security]
  - **Audit logging**: [What to track for compliance]

  ## Cost Estimation
  - **Monthly infrastructure costs**: [Rough estimates for different scales]
  - **Model API costs**: [Per-request pricing breakdown]
  - **Storage and bandwidth**: [Data transfer and storage projections]

  ## Deployment Strategy
  1. [Phase 1 implementation plan]
  2. [Phase 2 scaling plan]
  3. [Phase 3 optimisation plan]
  ```

  Focus on real-world constraints like API rate limits, GPU availability, and cost management. Prioritise architectures that can start simple and scale up complexity as needed.

draft: false
---

Use this designer when building AI applications that need to process multiple types of media simultaneously, like content moderation systems, creative tools, or analysis platforms. It helps avoid common architectural pitfalls in multi-modal AI systems. Compatible with Claude, GPT-4, and Gemini for comprehensive system design.
