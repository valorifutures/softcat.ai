"""Regression cases for the response wrapper that stopped publishing in July."""

import pytest
from prompt_output import normalise_frontmatter, split_prompt_response

PROMPT = '''---
title: "A useful prompt"
description: "Check a workflow."
category: "agent-design"
prompt: |
  Inspect this code:
  ```python
  print("keep this fence")
  ```
draft: false
---

Use with any capable language model.'''


@pytest.mark.parametrize("wrapper", ["", "```markdown", "~~~yaml"])
def test_individual_wrappers_preserve_prompt_fences(wrapper):
    fence = "~~~" if wrapper.startswith("~~~") else "```"
    item = f"{wrapper}\n{PROMPT}\n{fence}" if wrapper else PROMPT
    assert split_prompt_response(f"{item}\n---SPLIT---\n{item}") == [PROMPT, PROMPT]


def test_one_wrapper_around_both_files():
    response = f"```markdown\n{PROMPT}\n---SPLIT---\n{PROMPT}\n```"
    assert split_prompt_response(response) == [PROMPT, PROMPT]


@pytest.mark.parametrize("broken", ["", "```\n" + PROMPT, "---\n```\n" + PROMPT, PROMPT.replace("---\n", "", 1)])
def test_invalid_outputs_are_rejected(broken):
    with pytest.raises(ValueError):
        normalise_frontmatter(broken)


def test_incomplete_batch_is_rejected():
    with pytest.raises(ValueError):
        split_prompt_response(PROMPT)
