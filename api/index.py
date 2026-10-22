import os
import sys

# Ensure backend directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app  # noqa: E402 # type: ignore

# When running on Vercel or in production, use the production config
config_name = os.environ.get("FLASK_ENV")
if not config_name:
    config_name = "production" if os.environ.get("VERCEL") else "default"

app = create_app(config_name)
