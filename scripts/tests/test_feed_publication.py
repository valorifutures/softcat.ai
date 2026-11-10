"""Check the built feed against actual publication records. Offline only."""
import json
import unittest
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]


class PublicationFeedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        feed = ROOT / "dist" / "feed.xml"
        if not feed.is_file():
            raise AssertionError("Build the site before testing its publication feed")
        cls.tree = ElementTree.fromstring(feed.read_text(encoding="utf-8"))
        cls.items = cls.tree.findall("./channel/item")
        cls.links = [node.findtext("link", default="") for node in cls.items]

    def test_feed_has_unique_public_item_links(self):
        self.assertGreater(len(self.items), 0)
        self.assertEqual(len(self.links), len(set(self.links)))
        for link in self.links:
            self.assertTrue(link.startswith("https://softcat.ai/"), link)

    def test_feed_includes_real_feral_publications(self):
        entries = json.loads((ROOT / "src/content/feral/manifest.json").read_text(encoding="utf-8"))
        links = set(self.links)
        for creation in entries:
            link = "https://softcat.ai" + creation["route"] + "/"
            item = next((node for node in self.items if node.findtext("link") in {
                link, link.rstrip("/")
            }), None)
            self.assertIsNotNone(item, creation["slug"])
            published = parsedate_to_datetime(item.findtext("pubDate"))
            self.assertEqual(published.date(), datetime.fromisoformat(creation["born"]).date())

    def test_publication_dates_are_real_rss_dates(self):
        for item in self.items:
            published = item.findtext("pubDate")
            self.assertTrue(published)
            parsed = parsedate_to_datetime(published)
            self.assertIsNotNone(parsed.tzinfo)
            self.assertLessEqual(parsed, datetime.now(tz=parsed.tzinfo))

    def test_feed_does_not_promise_daily_news(self):
        description = self.tree.findtext("./channel/description", default="").lower()
        self.assertIn("historical", description)
        self.assertIn("not a promise", description)


if __name__ == "__main__":
    unittest.main()
