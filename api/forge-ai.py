from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parent))

from forge_ai_service import app  # noqa: E402,F401
