"""
routes/main.py — Life OS REST API blueprint.

All endpoints return JSON. No Jinja2 templates.
"""

from datetime import date
from flask import Blueprint, jsonify, abort

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
def dashboard():
    """Return dashboard data as JSON (task stats are live; others remain mock)."""
    from models.task import Task, TaskStatus  # noqa: PLC0415

    today = date.today()
    user_id = 1  # Phase-1 single-user

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
    due_today_tasks = Task.query.filter(
        Task.user_id  == user_id,
        Task.status   != TaskStatus.COMPLETED.value,
        Task.due_date == today,
    ).order_by(Task.priority).limit(5).all()

    completion_pct = round((completed / total * 100)) if total else 0

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
            "due_today":      len(due_today_tasks),
            "completion_pct": completion_pct,
        },
        "stat_cards": [
            {
                "id": "tasks",
                "label": "Tasks Completed",
                "value": "8",
                "sub": "/12",
                "change": "+2 more than yesterday",
                "trend": "up",
                "color": "success",
            },
            {
                "id": "productivity",
                "label": "Productivity",
                "value": "74%",
                "sub": None,
                "change": "+8% from last week",
                "trend": "up",
                "color": "primary",
            },
            {
                "id": "streak",
                "label": "Habit Streak",
                "value": "14",
                "sub": "d",
                "change": "Current streak",
                "trend": "neutral",
                "color": "warning",
            },
            {
                "id": "budget",
                "label": "Monthly Budget",
                "value": "$342",
                "sub": None,
                "change": "$58 over last month",
                "trend": "down",
                "color": "danger",
            },
        ],
        "progress": {
            "overall": 74,
            "bars": [
                {"label": "Tasks", "value": "8 / 12", "percent": 67, "color": "success"},
                {"label": "Habits", "value": "5 / 7", "percent": 71, "color": "primary"},
                {"label": "Study Goal", "value": "1.5 / 2 hrs", "percent": 75, "color": "warning"},
                {"label": "Budget Used", "value": "$342 / $500", "percent": 68, "color": "danger"},
            ],
        },
        "tasks": [t.to_dict() for t in due_today_tasks],
        "events": [
            {"title": "Team Standup", "meta": "Work · Daily", "time": "9:00 AM", "color": "primary"},
            {"title": "Project Deadline", "meta": "Work · Aug 19", "time": "5:00 PM", "color": "warning"},
            {"title": "Gym Session", "meta": "Health · Daily", "time": "6:30 AM", "color": "success"},
            {"title": "Book Club Meeting", "meta": "Personal · Aug 21", "time": "7:00 PM", "color": "info"},
            {"title": "Quarterly Review", "meta": "Work · Aug 22", "time": "2:00 PM", "color": "danger"},
        ],
        "habits": [
            {"name": "Morning Meditation", "done": True},
            {"name": "Exercise 30 min", "done": True},
            {"name": "Read 20 pages", "done": True},
            {"name": "No social media", "done": False},
            {"name": "Cold shower", "done": True},
            {"name": "Journal", "done": False},
            {"name": "Sleep by 11 PM", "done": False},
        ],
    })


@main_bp.get("/module/<string:module>")
def module_info(module: str):
    """Return info for a coming-soon module."""
    if module not in MODULES:
        abort(404)
    return jsonify({"module": module, "status": "coming_soon"})
