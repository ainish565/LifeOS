"""
config.py — Application configuration for Life OS.
"""

import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""

    # Set SECRET_KEY in the environment for production. If it is missing in
    # development, create_app() generates one and keeps it in instance/secret_key.
    SECRET_KEY = os.environ.get("SECRET_KEY")

    # SQLite database stored in the instance folder
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'lifeos.db')}",
    )
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
    SQLALCHEMY_DATABASE_URI = "sqlite://"  # in-memory


# Map string names to config classes for easy selection
config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
