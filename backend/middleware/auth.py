"""
middleware/auth.py — Session helpers and the @login_required decorator.

The logged-in user is always resolved from the signed session cookie,
never from request parameters, so a user can only ever act as themselves.
"""

from functools import wraps

from flask import g, jsonify, session

from extensions import db
from models import User

SESSION_USER_KEY = "user_id"


def get_current_user() -> User | None:
    """Return the logged-in user (cached per request), or None."""
    if "current_user" not in g:
        user = None
        user_id = session.get(SESSION_USER_KEY)
        if user_id is not None:
            user = db.session.get(User, user_id)
            if user is None:
                # Account no longer exists — drop the stale session
                session.clear()
        g.current_user = user
    return g.current_user


def login_user(user: User) -> None:
    # Start from an empty session so nothing from before login carries over
    # (prevents session fixation)
    session.clear()
    session[SESSION_USER_KEY] = user.id
    session.permanent = True  # persists for PERMANENT_SESSION_LIFETIME
    g.current_user = user


def logout_user() -> None:
    session.clear()
    g.current_user = None


def login_required(view):
    """Reject the request with 401 unless a user is logged in."""

    @wraps(view)
    def wrapped(*args, **kwargs):
        if get_current_user() is None:
            return jsonify({"error": "Authentication required."}), 401
        return view(*args, **kwargs)

    return wrapped
