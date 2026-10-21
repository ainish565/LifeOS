"""
services/auth_service.py — Registration / login business logic and input validation.
"""

import re

from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import User

NAME_MAX = 80
EMAIL_MAX = 254
PASSWORD_MIN = 8
# Upper bound keeps hashing cost bounded for absurdly long inputs
PASSWORD_MAX = 128

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Compared against when the email is unknown, so failed logins take
# the same time whether or not the account exists
_DUMMY_HASH = generate_password_hash("not-a-real-password")


class ValidationError(Exception):
    """Raised with a {field: message} dict when input is invalid."""

    def __init__(self, errors: dict):
        super().__init__("Invalid input")
        self.errors = errors


class EmailTakenError(Exception):
    pass


def _clean_str(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def normalize_email(value) -> str:
    return _clean_str(value).lower()


def validate_registration(data: dict) -> dict:
    """Return cleaned {name, email, password} or raise ValidationError."""
    name = " ".join(_clean_str(data.get("name")).split())
    email = normalize_email(data.get("email"))
    password = data.get("password") if isinstance(data.get("password"), str) else ""
    confirm = data.get("confirm_password") if isinstance(data.get("confirm_password"), str) else ""

    errors = {}

    if not name:
        errors["name"] = "Name is required."
    elif len(name) > NAME_MAX:
        errors["name"] = f"Name must be at most {NAME_MAX} characters."

    if not email:
        errors["email"] = "Email is required."
    elif len(email) > EMAIL_MAX or not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."

    if not password:
        errors["password"] = "Password is required."
    elif len(password) < PASSWORD_MIN:
        errors["password"] = f"Password must be at least {PASSWORD_MIN} characters."
    elif len(password) > PASSWORD_MAX:
        errors["password"] = f"Password must be at most {PASSWORD_MAX} characters."
    elif not (re.search(r"[A-Za-z]", password) and re.search(r"\d", password)):
        errors["password"] = "Password must contain at least one letter and one number."

    if not confirm:
        errors["confirm_password"] = "Please confirm your password."
    elif confirm != password:
        errors["confirm_password"] = "Passwords do not match."

    if errors:
        raise ValidationError(errors)
    return {"name": name, "email": email, "password": password}


def validate_login(data: dict) -> dict:
    """Return cleaned {email, password} or raise ValidationError."""
    email = normalize_email(data.get("email"))
    password = data.get("password") if isinstance(data.get("password"), str) else ""

    errors = {}
    if not email:
        errors["email"] = "Email is required."
    elif len(email) > EMAIL_MAX or not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    if not password:
        errors["password"] = "Password is required."
    elif len(password) > PASSWORD_MAX:
        errors["password"] = "Invalid email or password."

    if errors:
        raise ValidationError(errors)
    return {"email": email, "password": password}


def register_user(data: dict) -> User:
    """Validate input and create a user. Raises ValidationError / EmailTakenError."""
    clean = validate_registration(data)

    if User.query.filter_by(email=clean["email"]).first() is not None:
        raise EmailTakenError()

    user = User(name=clean["name"], email=clean["email"])
    user.set_password(clean["password"])
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        # Another request registered the same email between the check and the insert
        db.session.rollback()
        raise EmailTakenError() from None
    return user


def authenticate(data: dict) -> User | None:
    """Return the user for valid credentials, else None. Raises ValidationError on bad input."""
    clean = validate_login(data)
    user = User.query.filter_by(email=clean["email"]).first()
    if user is None:
        check_password_hash(_DUMMY_HASH, clean["password"])
        return None
    return user if user.check_password(clean["password"]) else None
