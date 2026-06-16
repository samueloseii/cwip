import sys
import os

# Add backend directory to Python path so `app.*` imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402, F401
