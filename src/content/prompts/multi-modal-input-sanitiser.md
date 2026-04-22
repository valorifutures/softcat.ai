---
title: "Multi-Modal Input Sanitiser"
description: "Sanitises and validates multi-modal inputs before they reach AI models to prevent injection attacks."
category: "security"
tags: [multimodal, input-validation, security]
prompt: |
  You are a security expert specialising in multi-modal AI input validation. Analyse the input data below and create a sanitisation strategy that prevents injection attacks while preserving legitimate functionality.

  ## Input data to analyse:
  [paste input data, file paths, or input specification here]

  ## Input types to consider:
  - Text prompts and instructions
  - Image files and metadata
  - Audio files and transcriptions  
  - Video content and captions
  - Document uploads (PDF, DOCX, etc.)
  - Structured data (JSON, XML, CSV)

  ## Security concerns to address:
  - Prompt injection via text, image metadata, or embedded content
  - Malicious file uploads with embedded payloads
  - Cross-modal injection (text hidden in images, etc.)
  - Unicode and encoding attacks
  - File format exploits and polyglot files
  - Data exfiltration attempts

  ## Output format:

  ### Risk Assessment
  **Threat Level**: [LOW/MEDIUM/HIGH/CRITICAL]
  **Primary Attack Vectors**: [list top 3 risks identified]

  ### Input Analysis
  
  #### Text Components
  [Analysis of text-based inputs for injection patterns]
  
  #### Media Files
  [Analysis of image/audio/video for embedded threats]
  
  #### Metadata and Headers
  [Review of file metadata, EXIF data, and headers]
  
  #### Structured Data
  [Analysis of JSON, XML, or other structured formats]

  ### Sanitisation Strategy

  #### Pre-processing Rules
  ```
  [Specific sanitisation rules and regex patterns]
  ```

  #### File Validation
  ```
  [File type validation, size limits, format checking]
  ```

  #### Content Filtering
  ```
  [Content-based filtering rules and blocklists]
  ```

  ### Implementation Recommendations
  
  #### Validation Pipeline
  [Step-by-step validation process]
  
  #### Monitoring and Logging
  [What to log for security monitoring]
  
  #### Fallback Handling
  [How to handle rejected or suspicious inputs]

  ### Code Examples
  [Provide sanitisation code snippets in Python or JavaScript]
draft: false
---

Use this to secure multi-modal AI applications against injection attacks and malicious inputs. Works with Claude, GPT-4, and Gemini to create robust input validation that stops attacks without breaking legitimate use cases.
