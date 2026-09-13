import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("built_site_audit", Path(__file__).resolve().parents[1] / "validate-built-site.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class BuiltSiteTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.write("index.html", '<main id="main-content"><h1>Home</h1><a href="/guide#part">Guide</a><a href="https://elsewhere.example/missing">External</a><img src="/pixel.svg"></main>')
        self.write("guide/index.html", '<main id="main-content"><h1>Guide</h1><h2 id="part">Part</h2><a name="old-anchor"></a><a href="../">Home</a></main>')
        self.write("pixel.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>')
        self.write("search-index.json", json.dumps([{"url": "/guide#part"}]))
        self.write("feed.xml", '<rss><channel><item><link>https://softcat.ai/guide</link></item></channel></rss>')
        self.write("sitemap-index.xml", '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://softcat.ai/sitemap-0.xml</loc></sitemap></sitemapindex>')
        self.write("sitemap-0.xml", '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://softcat.ai/guide</loc></url></urlset>')

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)

    def errors(self, **kwargs):
        return "\n".join(audit.audit_site(self.root, **kwargs)["errors"])

    def test_clean_site_checks_local_routes_assets_indexes_and_fragments(self):
        report = audit.audit_site(self.root)
        self.assertEqual(report["errors"], [])
        self.assertEqual(report["htmlPages"], 2)
        self.assertGreater(report["internalLinksChecked"], 4)
        self.assertEqual(report["localAssetsAndMetadataChecked"], 1)

    def test_missing_destinations_assets_and_fragments_are_reported(self):
        self.write("index.html", '<main id="main-content"><h1>Home</h1><a href="/missing">Missing</a><a href="/guide#absent">Bad fragment</a><script src="/lost.js"></script></main>')
        errors = self.errors()
        for text in ["missing destination /missing", "missing fragment /guide#absent", "missing destination /lost.js"]:
            self.assertIn(text, errors)

    def test_duplicate_ids_nested_links_and_shared_layout_headings_fail(self):
        self.write("index.html", '<main id="main-content"><h1>One</h1><h1>Two</h1><p id="same"></p><p id="same"></p><a href="/"><a href="/">Nested</a></a></main>')
        errors = self.errors()
        for text in ["duplicate IDs", "nested links", "exactly one h1"]:
            self.assertIn(text, errors)

    def test_redirects_and_encoded_named_fragments_are_checked(self):
        self.write("redirect/index.html", '<meta http-equiv="refresh" content="0; url=/guide#old-anchor">')
        self.write("encoded/index.html", '<a href="/guide#%70art">Part</a>')
        self.assertEqual(self.errors(), "")
        self.write("redirect/index.html", '<meta http-equiv="refresh" content="0; url=/missing">')
        self.assertIn("redirect: missing destination", self.errors())

    def test_encoded_path_escape_is_rejected_without_reading_outside_output(self):
        self.write("index.html", '<a href="/%2e%2e/outside.html">Outside</a>')
        self.assertIn("escapes the built directory", self.errors())

    def test_drafts_and_stale_tag_routes_are_not_allowed_to_reappear(self):
        self.write("draft/index.html", '<h1>Unpublished</h1>')
        self.write("tags/draft-only/index.html", '<h1>Draft tag</h1>')
        records = [{"path": "source/draft.md", "route": "/draft", "draft": True, "tags": ["draft-only"]}]
        errors = self.errors(records=records)
        self.assertIn("unpublished draft has a public route", errors)
        self.assertIn("stale or draft-only tag route", errors)

    def test_published_content_must_have_a_route_but_shared_tags_are_valid(self):
        self.write("tags/useful/index.html", '<h1>Useful</h1>')
        records = [{"path": "source/guide.md", "route": "/guide", "draft": False, "tags": ["useful"]}, {"path": "source/draft.md", "route": "/draft", "draft": True, "tags": ["useful"]}]
        self.assertEqual(self.errors(records=records), "")
        records[0]["route"] = "/missing"
        self.assertIn("published content has no built route", self.errors(records=records))

    def test_retirement_notices_need_noindex_and_the_exact_preserved_blob(self):
        entry = {"id": "old", "sourceBlob": "a" * 40}
        self.write("tools/old/index.html", '<meta name="robots" content="noindex, follow"><h1>Retired</h1>')
        args = {"retirements": [("tools", entry)], "verify_blob": lambda record: "a" * 40}
        self.assertEqual(self.errors(**args), "")
        args["verify_blob"] = lambda record: "b" * 40
        self.assertIn("preserved source blob does not match", self.errors(**args))
        self.write("tools/old/index.html", '<h1>Retired</h1>')
        self.assertIn("noindex metadata", self.errors(**args))

    def test_retired_entries_cannot_remain_in_search_or_sitemap(self):
        entry = {"id": "old"}
        self.write("tools/old/index.html", '<meta name="robots" content="noindex"><h1>Retired</h1>')
        self.write("search-index.json", json.dumps([{"url": "/tools/old/"}]))
        self.assertIn("retired content is still indexed", self.errors(retirements=[("tools", entry)]))

    def test_missing_and_malformed_discovery_files_fail_closed(self):
        self.write("search-index.json", "{")
        self.write("feed.xml", "<unclosed>")
        self.assertIn("Invalid or missing search index", self.errors())
        self.assertIn("Invalid or missing feed.xml", self.errors())

    def test_discovery_indexes_reject_wrong_formats_and_nonlocal_search_urls(self):
        for url in ["javascript:alert(1)", "https://elsewhere.example/", "//elsewhere.example/"]:
            self.write("search-index.json", json.dumps([{"url": url}]))
            self.assertIn("root-relative URL", self.errors())
        self.write("feed.xml", "<other />")
        self.assertIn("expected rss XML", self.errors())
        self.write("sitemap-0.xml", "<urlset><url><loc /></url></urlset>")
        self.assertIn("empty discovery URL", self.errors())

    def test_404_recovery_is_not_a_search_result(self):
        self.write("404.html", '<meta name="robots" content="noindex"><main id="main-content"><h1>Not found</h1></main>')
        self.assertEqual(self.errors(), "")
        self.write("search-index.json", json.dumps([{"url": "/404.html"}]))
        self.assertIn("404 recovery page must be noindex", self.errors())


if __name__ == "__main__":
    unittest.main()
