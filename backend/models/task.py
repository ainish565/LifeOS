"""
models/task.py -- Task model for Life OS.
"""
from datetime import datetime, timezone
import enum
from app import db


class TaskStatus(str, enum.Enum):
    PENDING     = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED   = "Completed"


class TaskPriority(str, enum.Enum):
    LOW    = "Low"
    MEDIUM = "Medium"
    HIGH   = "High"
    URGENT = "Urgent"


class Task(db.Model):
    """Represents a single task owned by a user."""

    __tablename__ = "tasks"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, nullable=False, index=True, default=1)
    title        = db.Column(db.String(255), nullable=False)
    description  = db.Column(db.Text, nullable=True)
    status       = db.Column(db.String(20), nullable=False, default=TaskStatus.PENDING.value)
    priority     = db.Column(db.String(10), nullable=False, default=TaskPriority.MEDIUM.value)
    category     = db.Column(db.String(100), nullable=True)
    due_date     = db.Column(db.Date, nullable=True)
    created_at   = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "user_id":      self.user_id,
            "title":        self.title,
            "description":  self.description,
            "status":       self.status,
            "priority":     self.priority,
            "category":     self.category,
            "due_date":     self.due_date.isoformat() if self.due_date else None,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title!r} status={self.status!r}>"
