import os
import sys

import pytest

# Make backend/ importable when running `pytest` from the backend folder
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402

PASSWORD = "Secret123"


@pytest.fixture
def app():
    # Testing config uses a fresh in-memory SQLite database per app
    return create_app("testing")


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def register(client):
    """Register a user through the API (which also logs them in)."""

    def _register(name="Ada Lovelace", email="ada@example.com", password=PASSWORD, confirm=None):
        return client.post("/api/auth/register", json={
            "name": name,
            "email": email,
            "password": password,
            "confirm_password": password if confirm is None else confirm,
        })

    return _register
