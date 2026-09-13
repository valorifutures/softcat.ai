#!/usr/bin/env python3
"""Offline publication gate. No provider calls, browser automation or writes."""
import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree

ORIGIN = "https://softcat.ai"


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.named_anchors, self.links, self.assets = [], [], [], []
        self.robots, self.h1, self.anchor_depth, self.nested_anchors = [], 0, 0, 0
        self.refresh = None
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        data = dict(attributes)
        if "id" in data:
            self.ids.append(data["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "a":
            self.nested_anchors += self.anchor_depth > 0
            self.anchor_depth += 1
            if data.get("name"):
                self.named_anchors.append(data["name"])
            if data.get("href"):
                self.links.append(data["href"])
        if tag in {"script", "img", "source", "video", "audio"} and data.get("src"):
            self.assets.append(data["src"])
        if tag == "video" and data.get("poster"):
            self.assets.append(data["poster"])
        if tag == "link" and data.get("href"):
            self.assets.append(data["href"])
        if tag == "meta":
            if data.get("name", "").lower() == "robots":
                self.robots.extend(token.strip().lower() for token in data.get("content", "").split(","))
            if data.get("http-equiv", "").lower() == "refresh":
                match = re.search(r"(?:^|;)\s*url\s*=\s*['\"]?([^'\"]+)", data.get("content", ""), re.I)
                if match:
                    self.refresh = match.group(1).strip()

    def handle_endtag(self, tag):
        if tag == "a":
            self.anchor_depth = max(0, self.anchor_depth - 1)


def route_key(url):
    return unquote(urlsplit(url).path).rstrip("/") or "/"


def audit_site(directory, records=(), retirements=(), verify_blob=None):
    root = Path(directory).resolve()
    pages = {path.resolve(): Page(path.read_text(encoding="utf-8")) for path in root.rglob("*.html")}
    errors, links_checked, assets_checked = [], 0, 0
    if not pages:
        errors.append("No built HTML pages found. Run the production build first.")

    def target_for(url):
        target = (root / unquote(urlsplit(url).path).lstrip("/")).resolve()
        if not target.is_relative_to(root):
            raise ValueError("URL escapes the built directory")
        return target if target.is_file() else target / "index.html"

    def check(value, base, label, asset=False):
        nonlocal links_checked, assets_checked
        try:
            absolute = urljoin(base, value)
            url = urlsplit(absolute)
            if url.scheme not in {"http", "https"} or url.hostname != "softcat.ai":
                return
            if url.username or url.password:
                raise ValueError("Local link contains credentials")
            if asset:
                assets_checked += 1
            else:
                links_checked += 1
            target = target_for(absolute)
            if not target.is_file():
                errors.append(f"{label}: missing destination {value}")
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids + pages[target].named_anchors:
                errors.append(f"{label}: missing fragment {value}")
        except ValueError as error:
            errors.append(f"{label}: invalid URL {value!r}: {error}")

    for path, page in pages.items():
        relative = path.relative_to(root).as_posix()
        base = ORIGIN + "/" + relative.removesuffix("index.html")
        duplicates = [key for key, count in Counter(page.ids).items() if count > 1]
        if duplicates:
            errors.append(f"{relative}: duplicate IDs {duplicates}")
        if page.nested_anchors:
            errors.append(f"{relative}: nested links")
        # Standalone art rooms have their own document designs. This heading
        # check covers the shared site layout, not a claim of full accessibility.
        if "main-content" in page.ids and page.h1 != 1:
            errors.append(f"{relative}: shared-layout page needs exactly one h1")
        for href in page.links:
            check(href, base, relative)
        for src in page.assets:
            check(src, base, relative, asset=True)
        if page.refresh:
            check(page.refresh, base, relative + " redirect")

    indexed, feed_routes, sitemap_routes = set(), set(), set()
    try:
        search = json.loads((root / "search-index.json").read_text())
        if not isinstance(search, list):
            raise ValueError("search index must be an array")
        for entry in search:
            if not isinstance(entry, dict) or not isinstance(entry.get("url"), str) or not entry["url"].startswith("/") or entry["url"].startswith("//"):
                raise ValueError("search entry needs a local root-relative URL")
            check(entry["url"], ORIGIN + "/", "search index")
            indexed.add(route_key(entry["url"]))
    except (OSError, ValueError) as error:
        search = []
        errors.append(f"Invalid or missing search index: {error}")

    sitemap_files = list(root.glob("sitemap*.xml"))
    if not (root / "sitemap-index.xml").is_file():
        errors.append("Missing sitemap index")
    for path in [root / "feed.xml", *sitemap_files]:
        try:
            tree = ElementTree.fromstring(path.read_text())
            expected_root = "rss" if path.name == "feed.xml" else "sitemapindex" if path.name == "sitemap-index.xml" else "urlset"
            if tree.tag.split("}")[-1] != expected_root:
                raise ValueError(f"expected {expected_root} XML")
            values = tree.findall(".//{*}loc") if path.name.startswith("sitemap") else tree.findall(".//item/link")
            for element in values:
                value = element.text or ""
                if not value.strip():
                    raise ValueError("empty discovery URL")
                check(value, ORIGIN + "/", path.name)
                (sitemap_routes if path.name.startswith("sitemap") else feed_routes).add(route_key(value))
        except (OSError, ElementTree.ParseError, ValueError) as error:
            errors.append(f"Invalid or missing {path.name}: {error}")

    expected_tags = {"/tags/" + tag for record in records if not record["draft"] for tag in record["tags"]}
    for record in records:
        route = record["route"]
        target = target_for(route)
        if record["draft"]:
            if target.is_file() or route in indexed | feed_routes | sitemap_routes:
                errors.append(f"{record['path']}: unpublished draft has a public route or index entry")
        elif not target.is_file():
            errors.append(f"{record['path']}: published content has no built route")
    if records:
        for path in (root / "tags").glob("*/index.html"):
            route = "/tags/" + path.parent.name
            if route not in expected_tags:
                errors.append(f"{route}: stale or draft-only tag route")

    for collection, entry in retirements:
        route = "/" + collection + "/" + entry["id"]
        page = pages.get(target_for(route))
        if page is None or "noindex" not in page.robots or page.h1 != 1:
            errors.append(f"{route}: retirement notice is missing its heading or noindex metadata")
        if route in indexed | feed_routes | sitemap_routes:
            errors.append(f"{route}: retired content is still indexed")
        if verify_blob:
            try:
                if verify_blob(entry) != entry["sourceBlob"]:
                    errors.append(f"{route}: preserved source blob does not match")
            except (ValueError, subprocess.CalledProcessError) as error:
                errors.append(f"{route}: source history cannot be verified: {error}")

    missing = pages.get(root / "404.html")
    if missing and ("noindex" not in missing.robots or "/404" in indexed | sitemap_routes or "/404.html" in indexed | sitemap_routes):
        errors.append("The 404 recovery page must be noindex and outside discovery indexes")
    return {"htmlPages": len(pages), "internalLinksChecked": links_checked, "localAssetsAndMetadataChecked": assets_checked, "searchEntries": len(search), "contentRecords": len(records), "retirementNotices": len(retirements), "errors": errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", default="dist", help="Built output directory")
    args = parser.parse_args()
    repository = Path(__file__).resolve().parent.parent
    try:
        records = json.loads(subprocess.check_output(["node", "scripts/content-inventory.mjs"], cwd=repository, text=True))
        retirements = []
        for collection, filename in [("thoughts", "editorial-retirements.json"), ("prompts", "prompt-retirements.json"), ("tools", "tool-retirements.json")]:
            review = json.loads((repository / "src/data" / filename).read_text())
            retirements.extend((collection, entry) for entry in review["entries"])
        def verify_blob(entry):
            if not re.fullmatch(r"[a-f0-9]{40}", entry["sourceRevision"]) or not entry["sourcePath"].startswith("src/content/"):
                raise ValueError("Invalid source revision or path")
            return subprocess.check_output(["git", "rev-parse", entry["sourceRevision"] + ":" + entry["sourcePath"]], cwd=repository, text=True, stderr=subprocess.DEVNULL).strip()
        report = audit_site(Path(args.dist), records, retirements, verify_blob)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        report = {"errors": [str(error)]}
    print(json.dumps(report, indent=2))
    return bool(report["errors"])


if __name__ == "__main__":
    sys.exit(main())
