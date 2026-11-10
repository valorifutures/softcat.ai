"""Guard visitor-facing archive labels against an accidental return to 'live daily' wording."""
import json
import unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


class TextFromHtml(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.strings = []
        self.feed(html)

    def handle_data(self, text):
        self.strings.append(text)

    def visible_text(self):
        return " ".join(" ".join(self.strings).split())


class ArchiveClarityTests(unittest.TestCase):
    def text(self, route):
        path = DIST / route.lstrip("/") / "index.html"
        self.assertTrue(path.is_file(), f"Missing built route {route}")
        return TextFromHtml(path.read_text(encoding="utf-8")).visible_text().lower()

    def test_news_landing_page_identifies_archive_and_date(self):
        content = self.text("/news-and-updates")
        self.assertIn("ai news archive", content)
        self.assertIn("last published digest", content)
        self.assertIn("3 july 2026", content)
        self.assertIn("no longer updated", content)

    def test_news_edition_does_not_present_old_claims_as_current(self):
        content = self.text("/news-and-updates/2026-07-03-ai-digest")
        self.assertIn("historical news digest", content)
        self.assertIn("not been rechecked as current news", content)

    def test_radar_landing_page_identifies_stopped_daily_feed(self):
        content = self.text("/radar")
        self.assertIn("radar archive", content)
        self.assertIn("3 july 2026", content)
        self.assertIn("daily series has stopped", content)
        self.assertNotIn("today's picks", content)
        self.assertNotIn("check back tomorrow", content)

    def test_radar_edition_retains_historic_boundary(self):
        content = self.text("/radar/2026-07-03")
        self.assertIn("this is a dated radar edition", content)
        self.assertIn("not a live product recommendation", content)
        self.assertNotIn("today's picks", content)

    def test_footer_names_actual_feed_and_current_feral_creation(self):
        home = self.text("/")
        manifest = json.loads((ROOT / "src/content/feral/manifest.json").read_text(encoding="utf-8"))
        current_creation = max(manifest, key=lambda creation: creation["born"])
        self.assertIn("published work (rss)", home)
        self.assertIn("domain checker", home)
        self.assertIn(current_creation["title"].lower(), home)


if __name__ == "__main__":
    unittest.main()
