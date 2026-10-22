"""
routes/expenses.py — Expense Tracker API for Life OS.

All endpoints require authentication. Every query is scoped to the
current user so no user can touch another's data.

Endpoints
---------
GET    /api/expenses/             List with search, category, date, sort filters
POST   /api/expenses/             Create an expense
GET    /api/expenses/stats        Aggregate stats (today / week / month / total)
GET    /api/expenses/chart        Chart data: by-category + over-time (last 6 months)
GET    /api/expenses/budget       Get monthly budget for a given month
PUT    /api/expenses/budget       Set / update monthly budget
GET    /api/expenses/<id>         Single expense
PUT    /api/expenses/<id>         Full update
PATCH  /api/expenses/<id>         Partial update
DELETE /api/expenses/<id>         Delete
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db
from middleware.auth import get_current_user, login_required
from models.expense import (
    Expense,
    ExpenseCategory,
    MonthlyBudget,
    VALID_CATEGORIES,
)

expenses_bp = Blueprint("expenses", __name__, url_prefix="/api/expenses")

# ── Currency config (swap to per-user preference later) ──────────────────── #
# Currently INR is hard-coded on the frontend; the backend stays currency-agnostic.

# ── Helpers ─────────────────────────────────────────────────────────────── #

def _user_expenses():
    """Base query scoped to the current user."""
    return Expense.query.filter_by(user_id=get_current_user().id)


def _parse_amount(value) -> tuple[Decimal | None, str | None]:
    """Return (Decimal, None) on success or (None, error_string)."""
    if value is None:
        return None, "amount is required"
    try:
        d = Decimal(str(value))
    except InvalidOperation:
        return None, "amount must be a valid number"
    if d <= 0:
        return None, "amount must be greater than zero"
    if d > Decimal("999999999.99"):
        return None, "amount is too large"
    return d, None


def _parse_date(value: str | None) -> tuple[date | None, str | None]:
    """Return (date, None) or (None, error_string)."""
    if not value:
        return None, None          # optional → caller supplies default
    try:
        return date.fromisoformat(value), None
    except ValueError:
        return None, "expense_date must be in YYYY-MM-DD format"


def _validate_payload(data: dict, require_amount: bool = True):
    """Return (cleaned_dict, error_message)."""
    errors = []

    amount, amount_err = _parse_amount(data.get("amount") if require_amount else data.get("amount"))
    if require_amount and amount_err:
        errors.append(amount_err)
    elif not require_amount and data.get("amount") is not None and amount_err:
        errors.append(amount_err)

    category = (data.get("category") or ExpenseCategory.OTHER.value).strip()
    if category not in VALID_CATEGORIES:
        errors.append(f"category must be one of: {sorted(VALID_CATEGORIES)}")

    expense_date, date_err = _parse_date(data.get("expense_date"))
    if date_err:
        errors.append(date_err)
    if expense_date is None:
        expense_date = date.today()

    description = (data.get("description") or "").strip() or None
    if description and len(description) > 255:
        errors.append("description must be 255 characters or fewer")

    if errors:
        return None, "; ".join(errors)

    out = {
        "category":     category,
        "expense_date": expense_date,
        "description":  description,
    }
    if amount is not None:
        out["amount"] = amount
    return out, None


# ── Week helpers ─────────────────────────────────────────────────────────── #

def _week_bounds(d: date) -> tuple[date, date]:
    """Return (Monday, Sunday) of the ISO week containing d."""
    monday = d - timedelta(days=d.weekday())
    return monday, monday + timedelta(days=6)


# ── GET /api/expenses/ ───────────────────────────────────────────────────── #

@expenses_bp.get("/")
@login_required
def list_expenses():
    """List expenses for the current user with filtering and sorting."""
    q = _user_expenses()

    # Category filter
    category = request.args.get("category", "").strip()
    if category and category in VALID_CATEGORIES:
        q = q.filter(Expense.category == category)

    # Date range filter
    date_from_raw = request.args.get("date_from", "").strip()
    date_to_raw   = request.args.get("date_to", "").strip()
    if date_from_raw:
        try:
            q = q.filter(Expense.expense_date >= date.fromisoformat(date_from_raw))
        except ValueError:
            pass
    if date_to_raw:
        try:
            q = q.filter(Expense.expense_date <= date.fromisoformat(date_to_raw))
        except ValueError:
            pass

    # Quick-period shortcut
    period = request.args.get("period", "").strip()
    today  = date.today()
    if period == "today":
        q = q.filter(Expense.expense_date == today)
    elif period == "week":
        mon, sun = _week_bounds(today)
        q = q.filter(Expense.expense_date.between(mon, sun))
    elif period == "month":
        q = q.filter(
            func.strftime("%Y-%m", Expense.expense_date) == today.strftime("%Y-%m")
        )

    # Text search
    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        q = q.filter(Expense.description.ilike(like))

    # Sort
    sort = request.args.get("sort", "date_desc")
    if sort == "amount_asc":
        q = q.order_by(Expense.amount.asc())
    elif sort == "amount_desc":
        q = q.order_by(Expense.amount.desc())
    elif sort == "date_asc":
        q = q.order_by(Expense.expense_date.asc(), Expense.id.asc())
    else:  # default: date_desc
        q = q.order_by(Expense.expense_date.desc(), Expense.id.desc())

    return jsonify([e.to_dict() for e in q.all()])


# ── GET /api/expenses/stats ──────────────────────────────────────────────── #

@expenses_bp.get("/stats")
@login_required
def expense_stats():
    """Return aggregate spending stats for the current user."""
    user_id = get_current_user().id
    today   = date.today()
    mon, sun = _week_bounds(today)
    month_str = today.strftime("%Y-%m")

    def _sum(q):
        result = q.with_entities(func.sum(Expense.amount)).scalar()
        return float(result) if result else 0.0

    today_total = _sum(
        Expense.query.filter_by(user_id=user_id)
                     .filter(Expense.expense_date == today)
    )
    week_total = _sum(
        Expense.query.filter_by(user_id=user_id)
                     .filter(Expense.expense_date.between(mon, sun))
    )
    month_total = _sum(
        Expense.query.filter_by(user_id=user_id)
                     .filter(func.strftime("%Y-%m", Expense.expense_date) == month_str)
    )
    total = _sum(Expense.query.filter_by(user_id=user_id))

    # Top category this month
    cat_row = (
        db.session.query(Expense.category, func.sum(Expense.amount).label("s"))
        .filter_by(user_id=user_id)
        .filter(func.strftime("%Y-%m", Expense.expense_date) == month_str)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .first()
    )
    top_category = cat_row[0] if cat_row else None

    # Budget
    budget = MonthlyBudget.query.filter_by(user_id=user_id, month=month_str).first()
    budget_amount = float(budget.amount) if budget else None
    budget_remaining = (
        round(budget_amount - month_total, 2) if budget_amount is not None else None
    )

    return jsonify({
        "today":            round(today_total, 2),
        "week":             round(week_total, 2),
        "month":            round(month_total, 2),
        "total":            round(total, 2),
        "top_category":     top_category,
        "budget_amount":    budget_amount,
        "budget_remaining": budget_remaining,
        "period":           month_str,
    })


# ── GET /api/expenses/chart ──────────────────────────────────────────────── #

@expenses_bp.get("/chart")
@login_required
def expense_chart():
    """
    Return two datasets for Chart.js:
      - by_category: total per category this month
      - over_time:   total per day for the last 30 days
    """
    user_id   = get_current_user().id
    today     = date.today()
    month_str = today.strftime("%Y-%m")

    # Spending by category (current month)
    cat_rows = (
        db.session.query(Expense.category, func.sum(Expense.amount).label("s"))
        .filter_by(user_id=user_id)
        .filter(func.strftime("%Y-%m", Expense.expense_date) == month_str)
        .group_by(Expense.category)
        .all()
    )
    by_category = [
        {"category": row[0], "amount": float(row[1])} for row in cat_rows
    ]

    # Spending over time — last 30 days (daily totals)
    thirty_ago = today - timedelta(days=29)
    day_rows = (
        db.session.query(Expense.expense_date, func.sum(Expense.amount).label("s"))
        .filter_by(user_id=user_id)
        .filter(Expense.expense_date >= thirty_ago)
        .group_by(Expense.expense_date)
        .order_by(Expense.expense_date.asc())
        .all()
    )
    # Fill gaps with zero so the line chart is continuous
    day_totals: dict[str, float] = {}
    for i in range(30):
        d = thirty_ago + timedelta(days=i)
        day_totals[d.isoformat()] = 0.0
    for row in day_rows:
        key = row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0])
        day_totals[key] = float(row[1])

    over_time = [{"date": k, "amount": v} for k, v in sorted(day_totals.items())]

    return jsonify({"by_category": by_category, "over_time": over_time})


# ── GET/PUT /api/expenses/budget ─────────────────────────────────────────── #

@expenses_bp.get("/budget")
@login_required
def get_budget():
    """Return the monthly budget for a given month (defaults to current)."""
    user_id   = get_current_user().id
    month_str = request.args.get("month", date.today().strftime("%Y-%m")).strip()

    # Validate month format
    try:
        datetime.strptime(month_str, "%Y-%m")
    except ValueError:
        return jsonify({"error": "month must be in YYYY-MM format"}), 400

    budget = MonthlyBudget.query.filter_by(user_id=user_id, month=month_str).first()
    if not budget:
        return jsonify({"month": month_str, "amount": None})
    return jsonify(budget.to_dict())


@expenses_bp.put("/budget")
@login_required
def set_budget():
    """Create or update the monthly budget."""
    user_id = get_current_user().id
    data    = request.get_json(silent=True) or {}

    month_str = (data.get("month") or date.today().strftime("%Y-%m")).strip()
    try:
        datetime.strptime(month_str, "%Y-%m")
    except ValueError:
        return jsonify({"error": "month must be in YYYY-MM format"}), 400

    amount, err = _parse_amount(data.get("amount"))
    if err:
        return jsonify({"error": err}), 400

    budget = MonthlyBudget.query.filter_by(user_id=user_id, month=month_str).first()
    if budget:
        budget.amount = amount
    else:
        budget = MonthlyBudget(user_id=user_id, month=month_str, amount=amount)
        db.session.add(budget)

    db.session.commit()
    return jsonify(budget.to_dict()), 200


# ── POST /api/expenses/ ──────────────────────────────────────────────────── #

@expenses_bp.post("/")
@login_required
def create_expense():
    """Create a new expense for the current user."""
    data = request.get_json(silent=True) or {}
    cleaned, error = _validate_payload(data, require_amount=True)
    if error:
        return jsonify({"error": error}), 400

    expense = Expense(user_id=get_current_user().id, **cleaned)
    db.session.add(expense)
    db.session.commit()
    return jsonify(expense.to_dict()), 201


# ── GET /api/expenses/<id> ───────────────────────────────────────────────── #

@expenses_bp.get("/<int:expense_id>")
@login_required
def get_expense(expense_id: int):
    """Return a single expense (must belong to the current user)."""
    expense = _user_expenses().filter_by(id=expense_id).first_or_404()
    return jsonify(expense.to_dict())


# ── PUT /api/expenses/<id> ───────────────────────────────────────────────── #

@expenses_bp.put("/<int:expense_id>")
@login_required
def update_expense(expense_id: int):
    """Full replace of an expense's fields."""
    expense = _user_expenses().filter_by(id=expense_id).first_or_404()
    data = request.get_json(silent=True) or {}
    cleaned, error = _validate_payload(data, require_amount=True)
    if error:
        return jsonify({"error": error}), 400

    for key, val in cleaned.items():
        setattr(expense, key, val)

    db.session.commit()
    return jsonify(expense.to_dict())


# ── PATCH /api/expenses/<id> ─────────────────────────────────────────────── #

@expenses_bp.patch("/<int:expense_id>")
@login_required
def patch_expense(expense_id: int):
    """Partial update — only the fields sent are changed."""
    expense = _user_expenses().filter_by(id=expense_id).first_or_404()
    data = request.get_json(silent=True) or {}

    if "amount" in data:
        amount, err = _parse_amount(data["amount"])
        if err:
            return jsonify({"error": err}), 400
        expense.amount = amount

    if "category" in data:
        cat = (data["category"] or "").strip()
        if cat not in VALID_CATEGORIES:
            return jsonify({"error": f"category must be one of: {sorted(VALID_CATEGORIES)}"}), 400
        expense.category = cat

    if "description" in data:
        desc = (data["description"] or "").strip() or None
        if desc and len(desc) > 255:
            return jsonify({"error": "description must be 255 characters or fewer"}), 400
        expense.description = desc

    if "expense_date" in data:
        d, err = _parse_date(data["expense_date"])
        if err:
            return jsonify({"error": err}), 400
        expense.expense_date = d or date.today()

    db.session.commit()
    return jsonify(expense.to_dict())


# ── DELETE /api/expenses/<id> ────────────────────────────────────────────── #

@expenses_bp.delete("/<int:expense_id>")
@login_required
def delete_expense(expense_id: int):
    """Permanently delete an expense belonging to the current user."""
    expense = _user_expenses().filter_by(id=expense_id).first_or_404()
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted", "id": expense_id})
