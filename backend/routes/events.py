"""
routes/events.py -- Event and Calendar CRUD API for Life OS.

All endpoints require authentication and are strictly scoped to the logged-in user.
"""

from calendar import monthrange
from datetime import date, datetime, time
from flask import Blueprint, jsonify, request

from extensions import db
from middleware.auth import get_current_user, login_required
from models.event import Event, EventCategory
from models.task import Task

events_bp = Blueprint("events", __name__, url_prefix="/api/events")

VALID_CATEGORIES = {c.value for c in EventCategory}


def _user_events():
    """Query base scoped to the authenticated user."""
    return Event.query.filter_by(user_id=get_current_user().id)


def _parse_date(value: str | None) -> date | None:
    """Parse YYYY-MM-DD or return None."""
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


def _parse_time(value: str | None) -> time | None:
    """Parse HH:MM or HH:MM:SS or return None."""
    if not value or not str(value).strip():
        return None
    val = str(value).strip()
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(val, fmt).time()
        except ValueError:
            pass
    return None


def _validate_event_payload(data: dict, partial: bool = False):
    """Validate incoming event fields. Returns (cleaned_dict, error_string)."""
    errors = []
    cleaned = {}

    if not partial or "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            errors.append("title is required")
        elif len(title) > 255:
            errors.append("title must be 255 characters or fewer")
        else:
            cleaned["title"] = title

    if not partial or "event_date" in data:
        raw_date = data.get("event_date")
        parsed_date = _parse_date(raw_date)
        if not parsed_date:
            errors.append("event_date is required in YYYY-MM-DD format")
        else:
            cleaned["event_date"] = parsed_date

    if not partial or "category" in data:
        category = (data.get("category") or EventCategory.OTHER.value).strip()
        if category not in VALID_CATEGORIES:
            errors.append(f"category must be one of: {sorted(VALID_CATEGORIES)}")
        else:
            cleaned["category"] = category

    if "description" in data:
        cleaned["description"] = (data.get("description") or "").strip() or None
    elif not partial:
        cleaned["description"] = None

    if "start_time" in data:
        raw_start = data.get("start_time")
        if raw_start:
            parsed_start = _parse_time(raw_start)
            if parsed_start is None:
                errors.append("start_time must be in HH:MM format")
            else:
                cleaned["start_time"] = parsed_start
        else:
            cleaned["start_time"] = None
    elif not partial:
        cleaned["start_time"] = None

    if "end_time" in data:
        raw_end = data.get("end_time")
        if raw_end:
            parsed_end = _parse_time(raw_end)
            if parsed_end is None:
                errors.append("end_time must be in HH:MM format")
            else:
                cleaned["end_time"] = parsed_end
        else:
            cleaned["end_time"] = None
    elif not partial:
        cleaned["end_time"] = None

    if errors:
        return None, "; ".join(errors)

    return cleaned, None


@events_bp.get("/")
@login_required
def list_events():
    """List events for the current user, optionally filtered by month or date range."""
    q = _user_events()

    # Filter by specific month (YYYY-MM)
    month_arg = request.args.get("month")
    if month_arg:
        try:
            year_str, mon_str = month_arg.split("-")
            year, month = int(year_str), int(mon_str)
            _, last_day = monthrange(year, month)
            start_d = date(year, month, 1)
            end_d = date(year, month, last_day)
            q = q.filter(Event.event_date >= start_d, Event.event_date <= end_d)
        except Exception:
            return jsonify({"error": "month must be in YYYY-MM format"}), 400

    start_date = _parse_date(request.args.get("start_date"))
    if start_date:
        q = q.filter(Event.event_date >= start_date)

    end_date = _parse_date(request.args.get("end_date"))
    if end_date:
        q = q.filter(Event.event_date <= end_date)

    category = request.args.get("category")
    if category and category in VALID_CATEGORIES:
        q = q.filter(Event.category == category)

    events = q.order_by(Event.event_date.asc(), Event.start_time.asc().nullsfirst(), Event.id.asc()).all()
    return jsonify([e.to_dict() for e in events])


@events_bp.post("/")
@login_required
def create_event():
    """Create a new event for the current user."""
    data = request.get_json(silent=True) or {}
    cleaned, err = _validate_event_payload(data, partial=False)
    if err:
        return jsonify({"error": err}), 400

    user_id = get_current_user().id
    event = Event(
        user_id=user_id,
        title=cleaned["title"],
        description=cleaned.get("description"),
        event_date=cleaned["event_date"],
        start_time=cleaned.get("start_time"),
        end_time=cleaned.get("end_time"),
        category=cleaned.get("category", EventCategory.OTHER.value),
    )
    db.session.add(event)
    db.session.commit()

    return jsonify(event.to_dict()), 201


@events_bp.get("/<int:event_id>")
@login_required
def get_event(event_id: int):
    """Retrieve a single event owned by the current user."""
    event = _user_events().filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(event.to_dict())


@events_bp.patch("/<int:event_id>")
@events_bp.put("/<int:event_id>")
@login_required
def update_event(event_id: int):
    """Update an existing event."""
    event = _user_events().filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404

    data = request.get_json(silent=True) or {}
    is_partial = request.method == "PATCH"
    cleaned, err = _validate_event_payload(data, partial=is_partial)
    if err:
        return jsonify({"error": err}), 400

    for key, val in cleaned.items():
        setattr(event, key, val)

    db.session.commit()
    return jsonify(event.to_dict())


@events_bp.delete("/<int:event_id>")
@login_required
def delete_event(event_id: int):
    """Delete an event owned by the current user."""
    event = _user_events().filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404

    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted successfully", "id": event_id}), 200


@events_bp.get("/calendar")
@login_required
def calendar_feed():
    """
    Return both events and task deadlines for the user within a month or date range.
    Keep Task and Event separate in database, but unify them for calendar view.
    """
    user_id = get_current_user().id
    month_arg = request.args.get("month")

    start_d = None
    end_d = None

    if month_arg:
        try:
            year_str, mon_str = month_arg.split("-")
            year, month = int(year_str), int(mon_str)
            _, last_day = monthrange(year, month)
            start_d = date(year, month, 1)
            end_d = date(year, month, last_day)
        except Exception:
            return jsonify({"error": "month must be in YYYY-MM format"}), 400
    else:
        start_d = _parse_date(request.args.get("start_date"))
        end_d = _parse_date(request.args.get("end_date"))

    # Fetch events
    eq = Event.query.filter_by(user_id=user_id)
    if start_d:
        eq = eq.filter(Event.event_date >= start_d)
    if end_d:
        eq = eq.filter(Event.event_date <= end_d)
    events = eq.order_by(Event.event_date.asc(), Event.start_time.asc().nullsfirst(), Event.id.asc()).all()

    # Fetch tasks with due dates (deadlines)
    tq = Task.query.filter(Task.user_id == user_id, Task.due_date != None)  # noqa: E711
    if start_d:
        tq = tq.filter(Task.due_date >= start_d)
    if end_d:
        tq = tq.filter(Task.due_date <= end_d)
    tasks = tq.order_by(Task.due_date.asc(), Task.priority.asc()).all()

    deadlines = [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "status": t.status,
            "priority": t.priority,
            "category": t.category,
            "type": "deadline",
        }
        for t in tasks
    ]

    return jsonify({
        "events": [e.to_dict() for e in events],
        "deadlines": deadlines,
        "month": month_arg,
    })
