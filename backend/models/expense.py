"""
models/expense.py — Expense model for Life OS.

Currency is stored as a plain Numeric value.  The symbol/code are
intentionally NOT baked into the model so that a future per-user
currency preference can be layered on top without a migration.
Default presentation currency: INR (₹).
"""

import enum
from datetime import date as _date, datetime, timezone

from extensions import db


class ExpenseCategory(str, enum.Enum):
    FOOD          = "Food"
    TRAVEL        = "Travel"
    SHOPPING      = "Shopping"
    EDUCATION     = "Education"
    ENTERTAINMENT = "Entertainment"
    BILLS         = "Bills"
    HEALTH        = "Health"
    OTHER         = "Other"


VALID_CATEGORIES = {c.value for c in ExpenseCategory}


class Expense(db.Model):
    """A single expense entry owned by one user."""

    __tablename__ = "expenses"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # Stored as NUMERIC(12,2) — no currency symbol in the DB
    amount       = db.Column(db.Numeric(12, 2), nullable=False)
    category     = db.Column(db.String(30), nullable=False, default=ExpenseCategory.OTHER.value)
    description  = db.Column(db.String(255), nullable=True)
    expense_date = db.Column(db.Date, nullable=False, default=lambda: _date.today())
    created_at   = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "user_id":      self.user_id,
            "amount":       float(self.amount),
            "category":     self.category,
            "description":  self.description,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<Expense id={self.id} amount={self.amount} "
            f"category={self.category!r} date={self.expense_date}>"
        )


# ── Monthly budget ──────────────────────────────────────────────────────── #

class MonthlyBudget(db.Model):
    """One budget record per user per calendar month (YYYY-MM)."""

    __tablename__ = "monthly_budgets"
    __table_args__ = (
        db.UniqueConstraint("user_id", "month", name="uq_budget_user_month"),
    )

    id      = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # "YYYY-MM" string — simple and unambiguous across time zones
    month   = db.Column(db.String(7), nullable=False)
    amount  = db.Column(db.Numeric(12, 2), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id":      self.id,
            "user_id": self.user_id,
            "month":   self.month,
            "amount":  float(self.amount),
        }

    def __repr__(self) -> str:
        return f"<MonthlyBudget user={self.user_id} month={self.month} amount={self.amount}>"
