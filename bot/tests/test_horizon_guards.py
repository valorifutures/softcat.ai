"""Guards for horizon_bot Now-lane proposals (added 2026-06-22).

A proposal with signal_type "debate" passed the bot but failed the Zod build
(nowSignalType is a 4-value subset of the 6-value base enum) and broke the
deploy in PR #170. These tests pin NOW_SIGNAL_TYPES to the schema so the bot
enum can never silently drift from src/content.config.ts again.
"""
import re
from pathlib import Path

from horizon_bot import NOW_SIGNAL_TYPES

CONFIG = Path(__file__).resolve().parents[2] / "src" / "content.config.ts"


def test_now_signal_types_exclude_base_only_values():
    # these exist in the base enum but NOT in the Now lane
    assert "debate" not in NOW_SIGNAL_TYPES
    assert "forecast" not in NOW_SIGNAL_TYPES
    # the four Now-lane values must be present
    assert NOW_SIGNAL_TYPES == {"event", "trend", "inflection", "warning"}


def test_now_signal_types_match_schema():
    """Parse `nowSignalType` from content.config.ts and assert the bot's
    constant matches exactly. This is the test that would have caught #170."""
    src = CONFIG.read_text()
    m = re.search(r"nowSignalType\s*=\s*z\.enum\(\[([^\]]*)\]\)", src)
    assert m, "could not find nowSignalType enum in content.config.ts"
    schema_vals = set(re.findall(r"'([^']+)'", m.group(1)))
    assert NOW_SIGNAL_TYPES == schema_vals, (
        f"bot NOW_SIGNAL_TYPES {sorted(NOW_SIGNAL_TYPES)} != "
        f"schema nowSignalType {sorted(schema_vals)}")
