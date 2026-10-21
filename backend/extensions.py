"""
extensions.py — Flask extension instances shared across the app.

Kept separate from app.py so models and services can import `db`
without circular imports.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
