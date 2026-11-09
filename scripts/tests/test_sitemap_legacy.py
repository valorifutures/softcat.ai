"""Keep canonical pages discoverable without indexing retired redirects."""
import unittest
from pathlib import Path
from urllib.parse import urlsplit, unquote
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"

REDIRECTS = {
    "/now", "/status", "/lab", "/lab/model-explorer",
    "/receipt", "/trace", "/horizon/five",
    "/404", "/404.html",
}
CANONICAL = {
    "/pipeline", "/tools", "/lab/model-comparison",
    "/lab/outage-check", "/horizon", "/research",
    "/news-and-updates", "/radar", "/feral",
}


class SitemapLegacyRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        urls = set()
        matches = list(DIST.glob("sitemap*.xml"))
        if not matches:
            raise AssertionError("Build the site before checking its sitemap")
        for path in matches:
            tree = ElementTree.fromstring(path.read_text(encoding="utf-8"))
            if tree.tag.split("}")[-1] != "urlset":
                continue
            for node in tree.findall(".//{*}loc"):
                if not node.text:
                    continue
                path = unquote(urlsplit(node.text).path).rstrip("/") or "/"
                urls.add(path)
        cls.routes = urls

    def test_canonical_pages_remain_discoverable(self):
        for route in CANONICAL:
            with self.subTest(route=route):
                self.assertIn(route, self.routes)

    def test_retired_and_alias_routes_are_not_in_sitemap(self):
        for route in REDIRECTS:
            with self.subTest(route=route):
                self.assertNotIn(route, self.routes)

    def test_retired_receipt_redirect_is_noindex(self):
        path = DIST / "receipt" / "index.html"
        self.assertTrue(path.is_file(), "Old redirects must remain usable")
        text = path.read_text(encoding="utf-8").lower()
        self.assertIn('name="robots"', text)
        self.assertIn("noindex", text)
        self.assertIn("/trace/", text)


if __name__ == "__main__":
    unittest.main()
