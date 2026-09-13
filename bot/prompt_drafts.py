"""Canonical unpublished prompt proposals. No model-authored review state."""
import json
import re


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate prompt proposal key: {key}")
        result[key] = value
    return result


def prepare_prompt_drafts(text: str) -> list[str]:
    text = text.strip().removeprefix("\ufeff")
    if text.startswith("```json\n") and text.endswith("```"):
        text = text[8:-3].strip()
    proposals = json.loads(text, object_pairs_hook=_unique_object)
    if not isinstance(proposals, list) or len(proposals) != 2:
        raise ValueError("Expected exactly two prompt proposals")
    results, titles = [], set()
    for proposal in proposals:
        if not isinstance(proposal, dict) or set(proposal) != {"title", "description", "category", "tags", "prompt", "notes"}:
            raise ValueError("Proposal fields must be title, description, category, tags, prompt and notes")
        for key, limit in [("title", 140), ("description", 300), ("prompt", 20000), ("notes", 4000)]:
            if not isinstance(proposal[key], str) or not proposal[key].strip() or len(proposal[key]) > limit:
                raise ValueError(f"Invalid prompt proposal {key}")
        if "\n" in proposal["title"] or "\n" in proposal["description"]:
            raise ValueError("Prompt title and description must be single-line")
        title_key = proposal["title"].strip().casefold()
        if title_key in titles:
            raise ValueError("A prompt batch cannot contain duplicate titles")
        titles.add(title_key)
        if not isinstance(proposal["category"], str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", proposal["category"]):
            raise ValueError("Invalid prompt category")
        tags = proposal["tags"]
        if not isinstance(tags, list) or not 2 <= len(tags) <= 6 or any(not isinstance(tag, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", tag) for tag in tags):
            raise ValueError("Prompt proposals need two to six lowercase tags")
        if not re.search(r"\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}", proposal["prompt"]):
            raise ValueError("Prompt proposals need explicit input variables")
        if re.search(r"<[a-zA-Z/!]", proposal["notes"]):
            raise ValueError("Prompt notes cannot contain raw HTML")
        quote = lambda value: json.dumps(value, ensure_ascii=False)
        result = "\n".join([
            "---", f"title: {quote(proposal['title'].strip())}",
            f"description: {quote(proposal['description'].strip())}",
            f"category: {quote(proposal['category'])}", f"tags: {quote(tags)}", "prompt: |",
            *["  " + line for line in proposal["prompt"].splitlines()],
            "draft: true", 'generated_by: "prompt_bot"', "---", "",
            "Unreviewed prompt proposal. Not part of the published recipe collection.", "", proposal["notes"].strip(),
        ])
        assert_prompt_draft(result)
        results.append(result)
    return results


def assert_prompt_draft(content: str) -> dict:
    """Accept only our canonical header before the writer touches any files."""
    lines = content.strip().splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("Prompt drafts need canonical frontmatter")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise ValueError("Prompt draft has no closing frontmatter") from exc
    if end < 9 or lines[5] != "prompt: |" or lines[end - 2:end] != ["draft: true", 'generated_by: "prompt_bot"']:
        raise ValueError("The prompt writer only accepts canonical unpublished drafts")
    metadata = {}
    for index, key in enumerate(["title", "description", "category", "tags"], 1):
        prefix = key + ": "
        if not lines[index].startswith(prefix):
            raise ValueError("Invalid canonical prompt metadata")
        metadata[key] = json.loads(lines[index][len(prefix):])
    if any(not line.startswith("  ") for line in lines[6:end - 2]):
        raise ValueError("Prompt text must remain inside its indented block")
    if not all(isinstance(metadata[key], str) and metadata[key].strip() for key in ["title", "description", "category"]) or not isinstance(metadata["tags"], list):
        raise ValueError("Invalid canonical prompt metadata types")
    return metadata
