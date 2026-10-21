"""
routes/main.py — Life OS REST API blueprint.

All endpoints return JSON. No Jinja2 templates.
Everything except /health requires a logged-in user.
"""

from flask import Blueprint, jsonify, abort

from middleware.auth import login_required

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
    """Return mock dashboard data as JSON."""
    return jsonify({
        "greeting_stats": {
            "tasks_done": 8,
            "remaining": 4,
            "upcoming": 3,
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
        "tasks": [
            {"name": "Finish project proposal", "category": "Work", "priority": "high", "due": "Today, 5 PM", "status": "in-progress"},
            {"name": "Review pull requests", "category": "Dev", "priority": "medium", "due": "Today, 7 PM", "status": "pending"},
            {"name": "Call with design team", "category": "Meetings", "priority": "normal", "due": "Tomorrow, 10 AM", "status": "scheduled"},
            {"name": "Write weekly report", "category": "Work", "priority": "medium", "due": "Tomorrow, 12 PM", "status": "pending"},
            {"name": "Read React docs", "category": "Study", "priority": "low", "due": "This week", "status": "done"},
        ],
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
@login_required
def module_info(module: str):
    """Return info for a coming-soon module."""
    if module not in MODULES:
        abort(404)
    return jsonify({"module": module, "status": "coming_soon"})
