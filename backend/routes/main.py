"""
routes/main.py — Life OS REST API blueprint.

All endpoints return JSON. No Jinja2 templates.
Everything except /health requires a logged-in user.
"""

from datetime import date
from flask import Blueprint, jsonify, abort

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
    """Return dashboard data as JSON with live user-specific tasks and events."""
    from models.task import Task, TaskStatus  # noqa: PLC0415
    from models.event import Event  # noqa: PLC0415

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
        "today_tasks": [t.to_dict() for t in today_tasks],
        "tasks": [t.to_dict() for t in today_tasks],
        "today_events": [e.to_dict() for e in today_events],
        "upcoming_events": [e.to_dict() for e in upcoming_events],
        "events": [e.to_dict() for e in today_events],
        "stat_cards": [
            {
                "id": "tasks",
                "label": "Tasks Completed",
                "value": str(completed),
                "sub": f"/{total}" if total else "/0",
                "change": f"{overdue} overdue" if overdue > 0 else "On schedule",
                "trend": "down" if overdue > 0 else "up",
                "color": "success",
            },
            {
                "id": "events",
                "label": "Today's Events",
                "value": str(len(today_events)),
                "sub": None,
                "change": f"{len(upcoming_events)} upcoming",
                "trend": "neutral",
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
            "overall": completion_pct,
            "bars": [
                {"label": "Tasks", "value": f"{completed} / {total}", "percent": completion_pct, "color": "success"},
                {"label": "Habits", "value": "5 / 7", "percent": 71, "color": "primary"},
                {"label": "Study Goal", "value": "1.5 / 2 hrs", "percent": 75, "color": "warning"},
                {"label": "Budget Used", "value": "$342 / $500", "percent": 68, "color": "danger"},
            ],
        },
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
@login_required
def module_info(module: str):
    """Return info for a coming-soon module."""
    if module not in MODULES:
        abort(404)
    return jsonify({"module": module, "status": "coming_soon"})
