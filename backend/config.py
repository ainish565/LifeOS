"""
config.py — Application configuration for Life OS.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

# Read settings such as DATABASE_URL from git-ignored env files. The first file
# to define a variable wins, and real environment variables beat all of them:
#   1. backend/.env          — your own overrides
#   2. <project>/.env.local  — written by `neon deploy` / `neon env pull`
#   3. <project>/.env
for env_file in (os.path.join(BASE_DIR, ".env"),
                 os.path.join(PROJECT_DIR, ".env.local"),
                 os.path.join(PROJECT_DIR, ".env")):
    load_dotenv(env_file)


def _postgres_driver_url(url: str) -> str:
    """postgres:// and postgresql:// URLs → SQLAlchemy URL using the psycopg (v3) driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def database_url() -> str:
    """
    DATABASE_URL from the environment, or the local SQLite file if unset.

    On Neon this is the pooled connection (hostname contains "-pooler"),
    which is what the app should use for normal query traffic.
    """
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'lifeos.db')}"
    return _postgres_driver_url(url)


def migration_database_url() -> str | None:
    """
    Direct (unpooled) connection for creating tables, from DATABASE_URL_UNPOOLED.

    Neon recommends running schema changes over the direct connection rather than
    through the PgBouncer pooler. None when unset — the app then uses DATABASE_URL.
    """
    url = os.environ.get("DATABASE_URL_UNPOOLED", "").strip()
    return _postgres_driver_url(url) if url else None


def engine_options(uri: str) -> dict:
    """SQLAlchemy engine options for the given database URI."""
    # Neon suspends idle computes and closes their connections: check each
    # pooled connection before use and recycle them every 5 minutes
    options = {"pool_pre_ping": True, "pool_recycle": 300}
    if "-pooler." in uri:
        # Neon's pooler is PgBouncer in transaction mode; don't let psycopg
        # auto-prepare statements that a later transaction may not see
        options["connect_args"] = {"prepare_threshold": None}
    return options


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

    # Local SQLite file by default; Neon's DATABASE_URL (from .env.local) when set
    SQLALCHEMY_DATABASE_URI = database_url()
    SQLALCHEMY_ENGINE_OPTIONS = engine_options(SQLALCHEMY_DATABASE_URI)
    # Direct connection used only for create_all() at startup (None → use the above)
    SQLALCHEMY_MIGRATION_URI = migration_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

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
    # Always an in-memory database, whatever DATABASE_URL / .env.local say
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = engine_options(SQLALCHEMY_DATABASE_URI)
    SQLALCHEMY_MIGRATION_URI = None


# Map string names to config classes for easy selection
config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
