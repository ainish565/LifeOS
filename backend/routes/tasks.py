"""
routes/tasks.py -- Task CRUD API for Life OS.

Every endpoint requires a logged-in user and only ever reads or changes
that user's own tasks (another user's task id returns 404). Returns JSON. Every mutating operation validates input and returns
descriptive errors on failure.
"""

from datetime import date, datetime, timezone

from flask import Blueprint, jsonify, request

from extensions import db
from middleware.auth import get_current_user, login_required
from models.task import Task, TaskPriority, TaskStatus

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

VALID_STATUSES   = {s.value for s in TaskStatus}
VALID_PRIORITIES = {p.value for p in TaskPriority}


def _user_tasks():
    """Base query scoped to the logged-in user."""
    return Task.query.filter_by(user_id=get_current_user().id)


def _parse_date(value: str | None):
    """Parse an ISO date string (YYYY-MM-DD) or return None."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _validate_payload(data: dict, require_title: bool = True):
    """Return (cleaned_data, error_message)."""
    errors = []

    title = (data.get("title") or "").strip()
    if require_title and not title:
        errors.append("title is required")
    if title and len(title) > 255:
        errors.append("title must be 255 characters or fewer")

    status = data.get("status", TaskStatus.PENDING.value)
    if status not in VALID_STATUSES:
        errors.append(f"status must be one of: {sorted(VALID_STATUSES)}")

    priority = data.get("priority", TaskPriority.MEDIUM.value)
    if priority not in VALID_PRIORITIES:
        errors.append(f"priority must be one of: {sorted(VALID_PRIORITIES)}")

    due_date_raw = data.get("due_date")
    due_date = _parse_date(due_date_raw)
    if due_date_raw and due_date is None:
        errors.append("due_date must be in YYYY-MM-DD format")

    if errors:
        return None, "; ".join(errors)

    return {
        "title":       title,
        "description": (data.get("description") or "").strip() or None,
        "status":      status,
        "priority":    priority,
        "category":    (data.get("category") or "").strip() or None,
        "due_date":    due_date,
    }, None


# --------------------------------------------------------------------------- #
# GET /api/tasks  — list with optional filtering / sorting
# --------------------------------------------------------------------------- #

@tasks_bp.get("/")
@login_required
def list_tasks():
    """Return all tasks for the current user with optional filters."""
    q = _user_tasks()

    # Filter by status
    status = request.args.get("status")
    if status == "Overdue":
        today = date.today()
        q = q.filter(
            Task.status != TaskStatus.COMPLETED.value,
            Task.due_date != None,          # noqa: E711
            Task.due_date < today,
        )
    elif status and status in VALID_STATUSES:
        q = q.filter(Task.status == status)

    # Filter by priority
    priority = request.args.get("priority")
    if priority and priority in VALID_PRIORITIES:
        q = q.filter(Task.priority == priority)

    # Filter by category
    category = request.args.get("category")
    if category:
        q = q.filter(Task.category.ilike(f"%{category}%"))

    # Search title / description
    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        q = q.filter(
            db.or_(Task.title.ilike(like), Task.description.ilike(like))
        )

    # Sort
    sort = request.args.get("sort", "created_at")
    if sort == "due_date":
        q = q.order_by(Task.due_date.asc().nullslast())
    elif sort == "priority":
        # Custom priority ordering: Urgent > High > Medium > Low
        priority_order = db.case(
            {
                TaskPriority.URGENT.value: 0,
                TaskPriority.HIGH.value:   1,
                TaskPriority.MEDIUM.value: 2,
                TaskPriority.LOW.value:    3,
            },
            value=Task.priority,
            else_=4,
        )
        q = q.order_by(priority_order)
    else:
        q = q.order_by(Task.created_at.desc())

    tasks = q.all()
    return jsonify([t.to_dict() for t in tasks])


# --------------------------------------------------------------------------- #
# GET /api/tasks/stats  — summary counts for the dashboard
# --------------------------------------------------------------------------- #

@tasks_bp.get("/stats")
@login_required
def task_stats():
    """Return aggregate task statistics for the current user."""
    today = date.today()

    total     = _user_tasks().count()
    completed = _user_tasks().filter(Task.status == TaskStatus.COMPLETED.value).count()
    pending   = _user_tasks().filter(Task.status == TaskStatus.PENDING.value).count()
    overdue   = _user_tasks().filter(
        Task.status != TaskStatus.COMPLETED.value,
        Task.due_date != None,          # noqa: E711
        Task.due_date < today,
    ).count()
    due_today = _user_tasks().filter(
        Task.status != TaskStatus.COMPLETED.value,
        Task.due_date == today,
    ).count()
    in_progress = _user_tasks().filter(Task.status == TaskStatus.IN_PROGRESS.value).count()

    completion_pct = round((completed / total * 100)) if total else 0

    return jsonify({
        "total":          total,
        "completed":      completed,
        "pending":        pending,
        "in_progress":    in_progress,
        "overdue":        overdue,
        "due_today":      due_today,
        "completion_pct": completion_pct,
    })


# --------------------------------------------------------------------------- #
# POST /api/tasks  — create a task
# --------------------------------------------------------------------------- #

@tasks_bp.post("/")
@login_required
def create_task():
    """Create a new task for the current user."""
    data = request.get_json(silent=True) or {}
    cleaned, error = _validate_payload(data, require_title=True)
    if error:
        return jsonify({"error": error}), 400

    task = Task(user_id=get_current_user().id, **cleaned)
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


# --------------------------------------------------------------------------- #
# GET /api/tasks/<id>  — read single task
# --------------------------------------------------------------------------- #

@tasks_bp.get("/<int:task_id>")
@login_required
def get_task(task_id: int):
    """Return a single task by ID (must belong to current user)."""
    task = _user_tasks().filter_by(id=task_id).first_or_404()
    return jsonify(task.to_dict())


# --------------------------------------------------------------------------- #
# PUT /api/tasks/<id>  — full update
# --------------------------------------------------------------------------- #

@tasks_bp.put("/<int:task_id>")
@login_required
def update_task(task_id: int):
    """Full replace of a task's fields."""
    task = _user_tasks().filter_by(id=task_id).first_or_404()
    data = request.get_json(silent=True) or {}
    cleaned, error = _validate_payload(data, require_title=True)
    if error:
        return jsonify({"error": error}), 400

    for key, val in cleaned.items():
        setattr(task, key, val)

    # Handle completion timestamp
    if cleaned["status"] == TaskStatus.COMPLETED.value and task.completed_at is None:
        task.completed_at = datetime.now(timezone.utc)
    elif cleaned["status"] != TaskStatus.COMPLETED.value:
        task.completed_at = None

    db.session.commit()
    return jsonify(task.to_dict())


# --------------------------------------------------------------------------- #
# PATCH /api/tasks/<id>  — partial update (status change, mark complete, etc.)
# --------------------------------------------------------------------------- #

@tasks_bp.patch("/<int:task_id>")
@login_required
def patch_task(task_id: int):
    """Partial update — any subset of fields."""
    task = _user_tasks().filter_by(id=task_id).first_or_404()
    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return jsonify({"error": "title cannot be empty"}), 400
        if len(title) > 255:
            return jsonify({"error": "title must be 255 characters or fewer"}), 400
        task.title = title

    if "description" in data:
        task.description = (data["description"] or "").strip() or None

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return jsonify({"error": f"invalid status: {data['status']}"}), 400
        task.status = data["status"]
        if task.status == TaskStatus.COMPLETED.value and task.completed_at is None:
            task.completed_at = datetime.now(timezone.utc)
        elif task.status != TaskStatus.COMPLETED.value:
            task.completed_at = None

    if "priority" in data:
        if data["priority"] not in VALID_PRIORITIES:
            return jsonify({"error": f"invalid priority: {data['priority']}"}), 400
        task.priority = data["priority"]

    if "category" in data:
        task.category = (data["category"] or "").strip() or None

    if "due_date" in data:
        due_date = _parse_date(data["due_date"])
        if data["due_date"] and due_date is None:
            return jsonify({"error": "due_date must be in YYYY-MM-DD format"}), 400
        task.due_date = due_date

    db.session.commit()
    return jsonify(task.to_dict())


# --------------------------------------------------------------------------- #
# DELETE /api/tasks/<id>  — delete a task
# --------------------------------------------------------------------------- #

@tasks_bp.delete("/<int:task_id>")
@login_required
def delete_task(task_id: int):
    """Permanently delete a task belonging to the current user."""
    task = _user_tasks().filter_by(id=task_id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted", "id": task_id})
