"""
routes/auth.py — Authentication API (/api/auth/*).
"""

from flask import Blueprint, jsonify, request

from middleware.auth import get_current_user, login_required, login_user, logout_user
from services.auth_service import EmailTakenError, ValidationError, authenticate, register_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _json_body():
    """
    Return the request's JSON object, or None.

    Requiring a JSON body also blocks cross-site form posts: browsers can't send
    application/json cross-origin without a CORS preflight, which we don't allow.
    """
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _bad_json():
    return jsonify({"error": "Expected a JSON object body."}), 400


def _invalid(errors: dict, status: int = 400):
    return jsonify({"error": "Please fix the highlighted fields.", "errors": errors}), status


@auth_bp.post("/register")
def register():
    data = _json_body()
    if data is None:
        return _bad_json()
    try:
        user = register_user(data)
    except ValidationError as exc:
        return _invalid(exc.errors)
    except EmailTakenError:
        return _invalid({"email": "An account with this email already exists."}, 409)

    login_user(user)
    return jsonify({"user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = _json_body()
    if data is None:
        return _bad_json()
    try:
        user = authenticate(data)
    except ValidationError as exc:
        return _invalid(exc.errors)

    if user is None:
        # Same message whether the email or the password was wrong
        return jsonify({"error": "Invalid email or password."}), 401

    login_user(user)
    return jsonify({"user": user.to_dict()})


@auth_bp.post("/logout")
@login_required
def logout():
    if _json_body() is None:
        return _bad_json()
    logout_user()
    return jsonify({"ok": True})


@auth_bp.get("/me")
def me():
    """Who is logged in? Returns {"user": null} rather than 401 for anonymous visitors."""
    user = get_current_user()
    return jsonify({"user": user.to_dict() if user else None})
