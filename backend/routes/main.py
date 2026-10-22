"""
routes/main.py — Life OS REST API blueprint.

All endpoints return JSON. No Jinja2 templates.
Everything except /health requires a logged-in user.
"""

from datetime import date
from flask import Blueprint, jsonify, abort

from extensions import db
from middleware.auth import get_current_user, login_required

main_bp = Blueprint("main", __name__, url_prefix="/api")

MODULES = [
    "tasks", "calendar", "expenses", "notes",
    "goals", "habits", "study", "analytics", "settings",
]


@main_bp.get("/health")
def health():
    """Health-check endpoint."""
    return jsonify({"status": "ok", "app": "Life OS"})


@main_bp.get("/dashboard")
@login_required
def dashboard():
    """Return dashboard data as JSON with live user-specific tasks, events, and expenses."""
    from models.task import Task, TaskStatus  # noqa: PLC0415
    from models.event import Event  # noqa: PLC0415
    from models.expense import Expense, MonthlyBudget  # noqa: PLC0415
    from sqlalchemy import func  # noqa: PLC0415

    today = date.today()
    user_id = get_current_user().id

    total      = Task.query.filter_by(user_id=user_id).count()
    completed  = Task.query.filter_by(user_id=user_id, status=TaskStatus.COMPLETED.value).count()
    pending    = Task.query.filter_by(user_id=user_id, status=TaskStatus.PENDING.value).count()
    in_prog    = Task.query.filter_by(user_id=user_id, status=TaskStatus.IN_PROGRESS.value).count()
    overdue    = Task.query.filter(
        Task.user_id == user_id,
        Task.status  != TaskStatus.COMPLETED.value,
        Task.due_date != None,   # noqa: E711
        Task.due_date < today,
    ).count()

    today_tasks = Task.query.filter(
        Task.user_id  == user_id,
        Task.due_date == today,
    ).order_by(Task.status.desc(), Task.priority.asc()).all()

    today_events = Event.query.filter(
        Event.user_id == user_id,
        Event.event_date == today,
    ).order_by(Event.start_time.asc().nullsfirst(), Event.id.asc()).all()

    upcoming_events = Event.query.filter(
        Event.user_id == user_id,
        Event.event_date > today,
    ).order_by(Event.event_date.asc(), Event.start_time.asc().nullsfirst(), Event.id.asc()).limit(10).all()

    completion_pct = round((completed / total * 100)) if total else 0

    # ── Expense stats ────────────────────────────────────────────────────── #
    month_str = today.strftime("%Y-%m")

    def _sum_expenses(q):
        result = q.with_entities(func.sum(Expense.amount)).scalar()
        return float(result) if result else 0.0

    today_spending = _sum_expenses(
        Expense.query.filter_by(user_id=user_id)
                     .filter(Expense.expense_date == today)
    )
    month_spending = _sum_expenses(
        Expense.query.filter_by(user_id=user_id)
                     .filter(func.to_char(Expense.expense_date, "YYYY-MM") == month_str)
    )

    budget_row = MonthlyBudget.query.filter_by(user_id=user_id, month=month_str).first()
    budget_amount = float(budget_row.amount) if budget_row else None
    budget_remaining = (
        round(budget_amount - month_spending, 2) if budget_amount is not None else None
    )

    cat_row = (
        db.session.query(Expense.category, func.sum(Expense.amount).label("s"))
        .filter_by(user_id=user_id)
        .filter(func.to_char(Expense.expense_date, "YYYY-MM") == month_str)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .first()
    )
    top_category = cat_row[0] if cat_row else None

    budget_pct = (
        min(100, round((month_spending / budget_amount) * 100))
        if budget_amount else 0
    )

    def _fmt_inr(v):
        """Format as compact INR string for stat cards."""
        if v is None:
            return "—"
        if v >= 100000:
            return f"₹{v/100000:.1f}L"
        if v >= 1000:
            return f"₹{v/1000:.1f}K"
        return f"₹{v:.0f}"

    return jsonify({
        "greeting_stats": {
            "tasks_done":  completed,
            "remaining":   pending + in_prog,
            "upcoming":    total,
        },
        "task_stats": {
            "total":          total,
            "completed":      completed,
            "pending":        pending,
            "in_progress":    in_prog,
            "overdue":        overdue,
            "due_today":      len(today_tasks),
            "completion_pct": completion_pct,
        },
        "event_stats": {
            "today_count":    len(today_events),
            "upcoming_count": len(upcoming_events),
        },
        "expense_stats": {
            "today":            round(today_spending, 2),
            "month":            round(month_spending, 2),
            "budget_amount":    budget_amount,
            "budget_remaining": budget_remaining,
            "budget_pct":       budget_pct,
            "top_category":     top_category,
        },
        "today_tasks":      [t.to_dict() for t in today_tasks],
        "tasks":            [t.to_dict() for t in today_tasks],
        "today_events":     [e.to_dict() for e in today_events],
        "upcoming_events":  [e.to_dict() for e in upcoming_events],
        "events":           [e.to_dict() for e in today_events],
        "stat_cards": [
            {
                "id":     "tasks",
                "label":  "Tasks Completed",
                "value":  str(completed),
                "sub":    f"/{total}" if total else "/0",
                "change": f"{overdue} overdue" if overdue > 0 else "On schedule",
                "trend":  "down" if overdue > 0 else "up",
                "color":  "success",
            },
            {
                "id":     "events",
                "label":  "Today's Events",
                "value":  str(len(today_events)),
                "sub":    None,
                "change": f"{len(upcoming_events)} upcoming",
                "trend":  "neutral",
                "color":  "primary",
            },
            {
                "id":     "streak",
                "label":  "Habit Streak",
                "value":  "14",
                "sub":    "d",
                "change": "Current streak",
                "trend":  "neutral",
                "color":  "warning",
            },
            {
                "id":    "budget",
                "label": "Monthly Spending",
                "value": _fmt_inr(month_spending),
                "sub":   f"/ {_fmt_inr(budget_amount)}" if budget_amount else None,
                "change": (
                    f"₹{abs(budget_remaining):.0f} "
                    f"{'remaining' if budget_remaining >= 0 else 'over budget'}"
                    if budget_remaining is not None
                    else "No budget set"
                ),
                "trend":  "down" if (budget_remaining is not None and budget_remaining < 0) else "neutral",
                "color":  "danger",
            },
        ],
        "progress": {
            "overall": completion_pct,
            "bars": [
                {"label": "Tasks",      "value": f"{completed} / {total}", "percent": completion_pct, "color": "success"},
                {"label": "Habits",     "value": "5 / 7",                  "percent": 71,             "color": "primary"},
                {"label": "Study Goal", "value": "1.5 / 2 hrs",            "percent": 75,             "color": "warning"},
                {
                    "label":   "Budget Used",
                    "value":   f"{_fmt_inr(month_spending)} / {_fmt_inr(budget_amount) if budget_amount else '—'}",
                    "percent": budget_pct,
                    "color":   "danger",
                },
            ],
        },
        "habits": [
            {"name": "Morning Meditation", "done": True},
            {"name": "Exercise 30 min",    "done": True},
            {"name": "Read 20 pages",      "done": True},
            {"name": "No social media",    "done": False},
            {"name": "Cold shower",        "done": True},
            {"name": "Journal",            "done": False},
            {"name": "Sleep by 11 PM",     "done": False},
        ],
    })


@main_bp.get("/module/<string:module>")
@login_required
def module_info(module: str):
    """Return info for a coming-soon module."""
    if module not in MODULES:
        abort(404)
    return jsonify({"module": module, "status": "coming_soon"})
