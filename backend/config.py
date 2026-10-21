"""
config.py — Application configuration for Life OS.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Read settings such as DATABASE_URL from backend/.env (git-ignored).
# Real environment variables still win over values in the file.
load_dotenv(os.path.join(BASE_DIR, ".env"))


def database_url() -> str:
    """
    DATABASE_URL from the environment, or the local SQLite file if unset.

    Postgres URLs copied from Neon/Heroku/Render start with postgres:// or
    postgresql://; SQLAlchemy needs to be told to use the psycopg (v3) driver.
    """
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'lifeos.db')}"
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def describe_database(uri: str) -> str:
    """Human-readable description of a database URI, never including the password."""
    from sqlalchemy.engine import make_url  # noqa: PLC0415

    url = make_url(uri)
    if url.get_backend_name() == "sqlite":
        return f"SQLite file {url.database}" if url.database else "SQLite (in-memory)"
    return f"PostgreSQL database '{url.database}' on {url.host} as user '{url.username}'"


class Config:
    """Base configuration."""

    # Set SECRET_KEY in the environment for production. If it is missing in
    # development, create_app() generates one and keeps it in instance/secret_key.
    SECRET_KEY = os.environ.get("SECRET_KEY")

    # Local SQLite file by default; set DATABASE_URL (e.g. in backend/.env) for Postgres/Neon
    SQLALCHEMY_DATABASE_URI = database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Neon suspends idle databases and closes their connections: check each
    # pooled connection before use and recycle them every 5 minutes
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}

    # Session cookie: signed by Flask, unreadable from JavaScript, not sent on
    # cross-site requests, and valid for 7 days (renewed on each request)
    SESSION_COOKIE_NAME = "lifeos_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # Flask debug mode — override via environment variable in production
    DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    # Production is served over HTTPS, so only send the cookie over HTTPS
    SESSION_COOKIE_SECURE = True


class TestingConfig(Config):
    TESTING = True
    DEBUG = False
    SECRET_KEY = "test-secret-key"
    SQLALCHEMY_DATABASE_URI = "sqlite://"  # in-memory


# Map string names to config classes for easy selection
config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
