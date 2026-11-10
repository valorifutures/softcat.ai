"""Parse generated prompt files without guessing at missing YAML delimiters."""

import re


def _fence(line: str) -> str | None:
    match = re.fullmatch(r"(`{3,}|~{3,})(?:[a-zA-Z0-9_-]+)?", line.strip())
    return match.group(1) if match else None


def normalise_frontmatter(content: str) -> str:
    """Remove a complete outer Markdown wrapper, then require real frontmatter.

    Fences inside the prompt's indented YAML block are content, so they must
    survive. Invalid or truncated documents are rejected, never 'repaired' by
    inventing an opening delimiter that can hide the original parse error.
    """
    lines = content.strip().removeprefix("\ufeff").splitlines()
    if not lines:
        raise ValueError("Empty generated prompt")
    fence = _fence(lines[0])
    if fence:
        if len(lines) < 3 or lines[-1].strip() != fence:
            raise ValueError("Unclosed Markdown wrapper around generated prompt")
        lines = lines[1:-1]
    if not lines or lines[0] != "---":
        raise ValueError("Generated prompt must start with a YAML delimiter")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise ValueError("Generated prompt has no closing YAML delimiter") from exc
    if end == 1 or any(_fence(line) for line in lines[1:end] if not line.startswith(" ")):
        raise ValueError("Invalid frontmatter: empty or contains a Markdown wrapper")
    return "\n".join(lines).strip()


def split_prompt_response(content: str) -> list[str]:
    """Accept two raw files, individually fenced files, or one outer wrapper."""
    parts = [p.strip() for p in re.split(r"(?m)^---SPLIT---[ \t]*$", content.strip())]
    if len(parts) != 2 or not all(parts):
        raise ValueError(f"Expected exactly two complete prompts, got {len(parts)}")
    first_lines, last_lines = parts[0].splitlines(), parts[-1].splitlines()
    outer = _fence(first_lines[0])
    if outer and first_lines[-1].strip() != outer:
        if last_lines[-1].strip() != outer:
            raise ValueError("Unclosed wrapper around generated response")
        parts[0] = "\n".join(first_lines[1:])
        parts[-1] = "\n".join(last_lines[:-1])
    return [normalise_frontmatter(part) for part in parts]
