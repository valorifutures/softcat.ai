import sys
from pathlib import Path

# Make bot/ modules importable from bot/tests/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
