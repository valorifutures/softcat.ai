---
title: "Accessibility Audit"
description: "Run a WCAG 2.2 accessibility audit covering levels A, AA, and AAA. Flags ARIA gaps, keyboard navigation issues, and colour contrast failures."
category: "audit"
tags: [accessibility, audit, a11y, wcag]
prompt: |
  Audit the following code or page for accessibility issues against WCAG 2.2. Cover all three conformance levels:

  **Level A (must fix)**
  - Missing alt text on images
  - Form inputs without labels
  - Missing skip navigation links
  - Keyboard traps (elements you can tab into but not out of)
  - Missing lang attribute on html element

  **Level AA (should fix)**
  - Colour contrast below 4.5:1 for normal text, 3:1 for large text
  - Missing focus indicators on interactive elements
  - Touch targets smaller than 24x24 CSS pixels
  - Content that reflows poorly at 320px width
  - Missing error identification on form validation

  **Level AAA (nice to have)**
  - Contrast below 7:1 for normal text
  - Sign language alternatives for media
  - Reading level above lower secondary education
  - Timing adjustments for all time limits

  **ARIA Review**
  - Incorrect or missing ARIA roles, states, and properties
  - ARIA attributes that conflict with native HTML semantics
  - Missing aria-live regions for dynamic content
  - Widgets missing required ARIA patterns (e.g. tabs, dialogs, menus)

  **Keyboard Navigation**
  - Tab order that doesn't match visual layout
  - Custom components that aren't keyboard operable
  - Missing keyboard shortcuts for common actions
  - Focus management after modal open/close

  For each issue found, state: the element or pattern, the WCAG criterion it violates, the severity level, and a concrete fix.

  ```
  [paste code or URL here]
  ```
draft: false
---

Comprehensive accessibility audit prompt covering WCAG 2.2 at all three conformance levels. Goes beyond automated checkers by flagging ARIA misuse, keyboard navigation gaps, and semantic HTML issues that tools like Lighthouse miss.

Paste your HTML, component code, or describe the page structure. Works best when you include the full markup so the model can check element nesting and ARIA relationships.
