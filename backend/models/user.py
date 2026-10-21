"""
models/user.py — User account model.
"""

from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    # Stored lower-cased so lookups and the unique constraint are case-insensitive
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_utcnow)

    def set_password(self, password: str) -> None:
        """Hash and store a password. The plaintext is never kept."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Public representation — never includes the password hash."""
        created = self.created_at
        if created is not None and created.tzinfo is None:
            # SQLite drops tz info; values are always written in UTC
            created = created.replace(tzinfo=timezone.utc)
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": created.isoformat() if created else None,
        }

    def __repr__(self) -> str:
        return f"<User {self.id} {self.email}>"
