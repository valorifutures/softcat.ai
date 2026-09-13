"""Turn a sourced thought proposal into a canonical, unpublished draft."""
import json
import re
from datetime import date
from urllib.parse import urlsplit, urlunsplit


def source_url(value: str) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        parts = urlsplit(value.strip())
        if parts.scheme not in {"http", "https"} or not parts.hostname or parts.username or parts.password:
            return None
        if parts.hostname.lower() in {"softcat.ai", "www.softcat.ai"}:
            return None
        return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))
    except ValueError:
        return None


def prepare_thought_draft(text: str, allowed_urls: set[str], target_date: str) -> str:
    date.fromisoformat(target_date)
    text = text.strip().removeprefix("\ufeff")
    if text.startswith("```json\n") and text.endswith("```"):
        text = text[8:-3].strip()
    data = json.loads(text)
    if not isinstance(data, dict) or set(data) != {"title", "summary", "tags", "body"}:
        raise ValueError("Thought proposal must contain only title, summary, tags and body")
    for key, limit in [("title", 140), ("summary", 300)]:
        if not isinstance(data[key], str) or not data[key].strip() or len(data[key]) > limit or "\n" in data[key]:
            raise ValueError(f"Invalid thought {key}")
    tags = data["tags"]
    if not isinstance(tags, list) or not 2 <= len(tags) <= 5 or any(not isinstance(tag, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", tag) for tag in tags):
        raise ValueError("Thought tags must be two to five lowercase tags")
    if "field-notes" in tags or "corrections" in tags:
        raise ValueError("A generated proposal cannot claim to be a field note or a correction")
    body = data["body"]
    if not isinstance(body, str) or not 180 <= len(body.split()) <= 550:
        raise ValueError("Thought body must contain 180 to 550 words")
    if re.search(r"<[a-zA-Z/!]", body):
        raise ValueError("Thought drafts must use Markdown without raw HTML")
    raw_links = re.findall(r"\[[^\]]+\]\((https?://[^\s)]+)\)", body)
    links = {source_url(link) for link in raw_links}
    if not links or None in links or not links.issubset(allowed_urls):
        raise ValueError("Thought needs source links drawn from the supplied feed entries")
    all_urls = {source_url(link.rstrip(".,;!")) for link in re.findall(r"https?://[^\s<>()\]\"']+", body)}
    if not all_urls.issubset(allowed_urls):
        raise ValueError("Thought contains a URL outside the supplied feed entries")
    # The title, metadata and review state are ours, not model-authored YAML.
    quote = lambda value: json.dumps(value, ensure_ascii=False)
    return "\n".join([
        "---", f"title: {quote(data['title'].strip())}", f"date: {target_date}",
        f"tags: {quote(tags)}", f"summary: {quote(data['summary'].strip())}",
        "draft: true", "pinned: false", 'generated_by: "thoughts_bot"',
        'model: "claude-sonnet-4-6"', "---", "", body.strip(), "",
    ])
