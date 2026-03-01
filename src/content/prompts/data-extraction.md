---
title: "Structured Data Extractor"
description: "Pull structured fields out of unstructured text and return clean JSON."
category: "data-extraction"
tags: [data-extraction, json, parsing]
prompt: |
  Extract structured data from the text below and return it as JSON.

  Schema to extract:
  ```json
  {
    "fields": [
      { "name": "field_name", "type": "string | number | boolean | date", "description": "what this field represents" }
    ]
  }
  ```

  Rules:
  - Return only valid JSON. No commentary before or after.
  - If a field is missing from the text, use null.
  - For dates, use ISO 8601 format (YYYY-MM-DD).
  - If a value is ambiguous, include it as-is and add a "_note" sibling key with the issue.
  - Do not infer or guess values that aren't in the text.

  Schema:
  [describe your fields here, e.g. "name (string), email (string), company (string), annual_revenue (number)"]

  Text to extract from:
  """
  [paste text here]
  """
draft: false
---

Reliable for pulling fields from emails, reports, CVs, support tickets, and similar unstructured text. Returns clean JSON every time.

Replace the schema section with your actual fields before use. Works best when you describe the fields clearly.
