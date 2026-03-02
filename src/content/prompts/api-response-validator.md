---
title: "API Response Validator"
description: "Validates API responses against expected schemas and identifies inconsistencies, missing fields, or malformed data."
category: "api-design"
tags: [api-testing, validation, schema-checking]
prompt: |
  You are an API response validator. Your task is to analyse API responses against their expected schemas and identify any issues.

  ## API Response to Validate
  [paste API response here]

  ## Expected Schema/Documentation
  [paste expected schema, OpenAPI spec, or documentation here]

  ## Analysis Required
  Please provide:

  ### 1. Schema Compliance
  - Check all required fields are present
  - Verify data types match expectations
  - Identify any unexpected fields
  - Flag missing or null values where not allowed

  ### 2. Data Quality Issues
  - Inconsistent formatting (dates, numbers, strings)
  - Invalid enum values
  - Out-of-range values
  - Malformed nested objects or arrays

  ### 3. Business Logic Validation
  - Cross-field validation issues
  - Logical inconsistencies in the data
  - Referential integrity problems

  ### 4. Performance Concerns
  - Oversized responses
  - Unnecessarily nested structures
  - Missing pagination markers

  ## Output Format
  For each issue found:
  - **Field/Path**: Exact location of the problem
  - **Issue Type**: Schema violation, data quality, business logic, or performance
  - **Description**: Clear explanation of what's wrong
  - **Severity**: Critical, High, Medium, or Low
  - **Suggested Fix**: Specific recommendation

  If no issues found, confirm the response is valid and note any best practices being followed.
draft: false
---

Use this to systematically validate API responses during development or testing phases. Paste your actual API response and the expected schema to get detailed analysis of compliance issues and data quality problems. Works with Claude, GPT-4, and Gemini for comprehensive API validation workflows.
