"""A feed discovery is an unpublished proposal, not a tested recommendation."""
import json
import re
from datetime import date
from thought_drafts import source_url


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate tool proposal key: {key}")
        result[key] = value
    return result


def prepare_tool_draft(text: str, allowed_urls: set[str], target_date: str) -> str:
    if date.fromisoformat(target_date).isoformat() != target_date:
        raise ValueError("Tool draft date must be an ISO calendar date")
    text = text.strip().removeprefix("\ufeff")
    if text.startswith("```json\n") and text.endswith("```"):
        text = text[8:-3].strip()
    data = json.loads(text, object_pairs_hook=_unique_object)
    if not isinstance(data, dict) or set(data) != {"title", "description", "tags", "url", "body"}:
        raise ValueError("Tool proposal must contain only title, description, tags, url and body")
    for key, limit in [("title", 140), ("description", 300)]:
        if not isinstance(data[key], str) or not data[key].strip() or len(data[key]) > limit or any(ord(char) < 32 for char in data[key]):
            raise ValueError(f"Invalid tool {key}")
    tags = data["tags"]
    if not isinstance(tags, list) or not 2 <= len(tags) <= 5 or any(not isinstance(tag, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", tag) for tag in tags):
        raise ValueError("Tool proposals need two to five lowercase tags")
    url = source_url(data["url"])
    if url is None or url not in allowed_urls:
        raise ValueError("Tool proposal source must come from the supplied feed entries")
    body = data["body"]
    if not isinstance(body, str) or not 60 <= len(body.split()) <= 240 or re.search(r"<[a-zA-Z/!]", body):
        raise ValueError("Tool body must be 60 to 240 words of Markdown without raw HTML")
    links = {source_url(link) for link in re.findall(r"\[[^\]]+\]\((https?://[^\s)]+)\)", body)}
    all_urls = {source_url(link.rstrip(".,;!")) for link in re.findall(r"https?://[^\s<>()\]\"']+", body)}
    if url not in links or None in links or not links.issubset(allowed_urls) or not all_urls.issubset(allowed_urls):
        raise ValueError("Tool body needs its supplied source link and cannot invent other URLs")
    quote = lambda value: json.dumps(value, ensure_ascii=False)
    content = "\n".join([
        "---", f"title: {quote(data['title'].strip())}",
        f"description: {quote(data['description'].strip())}", f"date: {target_date}",
        f"url: {quote(url)}", "status: experimental", f"tags: {quote(tags)}",
        "draft: true", 'generated_by: "tool_bot"', 'model: "claude-sonnet-4-6"',
        "---", "", "Unreviewed discovery proposal. Not a published recommendation.", "", body.strip(), "",
    ])
    assert_tool_draft(content)
    return content


def assert_tool_draft(content: str) -> dict:
    lines = content.strip().splitlines()
    if len(lines) < 12 or lines[0] != "---" or lines[10] != "---":
        raise ValueError("Tool drafts need canonical frontmatter")
    if lines[5] != "status: experimental" or lines[7:10] != ["draft: true", 'generated_by: "tool_bot"', 'model: "claude-sonnet-4-6"']:
        raise ValueError("The tool writer accepts only canonical unpublished proposals")
    result = {}
    for index, key in [(1, "title"), (2, "description"), (4, "url"), (6, "tags")]:
        if not lines[index].startswith(key + ": "):
            raise ValueError("Invalid canonical tool metadata")
        result[key] = json.loads(lines[index][len(key) + 2:])
    if not lines[3].startswith("date: "):
        raise ValueError("Tool draft date is missing")
    result["date"] = lines[3][6:]
    if date.fromisoformat(result["date"]).isoformat() != result["date"]:
        raise ValueError("Invalid tool draft date")
    if not all(isinstance(result[key], str) and result[key].strip() for key in ["title", "description", "url"]) or not isinstance(result["tags"], list) or source_url(result["url"]) is None:
        raise ValueError("Invalid canonical tool metadata types")
    return result
