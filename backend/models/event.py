"""
models/event.py -- Event model for Life OS Calendar module.
"""
from datetime import datetime, timezone
import enum
from extensions import db


class EventCategory(str, enum.Enum):
    STUDY    = "Study"
    PERSONAL = "Personal"
    WORK     = "Work"
    MEETING  = "Meeting"
    BIRTHDAY = "Birthday"
    OTHER    = "Other"


class Event(db.Model):
    """Represents a calendar event owned by a user."""

    __tablename__ = "events"

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title       = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    event_date  = db.Column(db.Date, nullable=False, index=True)
    start_time  = db.Column(db.Time, nullable=True)
    end_time    = db.Column(db.Time, nullable=True)
    category    = db.Column(db.String(50), nullable=False, default=EventCategory.OTHER.value)
    created_at  = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id":          self.id,
            "user_id":     self.user_id,
            "title":       self.title,
            "description": self.description,
            "event_date":  self.event_date.isoformat() if self.event_date else None,
            "start_time":  self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time":    self.end_time.strftime("%H:%M") if self.end_time else None,
            "category":    self.category,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Event id={self.id} title={self.title!r} date={self.event_date!r} category={self.category!r}>"
