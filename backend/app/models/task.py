from datetime import date, datetime

from app.extensions import db

from .base import TimestampMixin, iso

PRIORITIES = ("low", "medium", "high")


class TaskValidationError(ValueError):
    pass


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def clean_task_payload(data, partial=False):
    if not isinstance(data, dict):
        raise TaskValidationError("Request body must be a JSON object")
    cleaned = {}

    if "title" in data or not partial:
        value = data.get("title")
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 200:
            raise TaskValidationError("title is required, up to 200 characters")
        cleaned["title"] = value.strip()

    for field in ("goal_id", "category_id"):
        if field in data:
            value = data[field]
            if value is not None and not _is_int(value):
                raise TaskValidationError(f"{field} must be a whole number or null")
            cleaned[field] = value

    if "due_date" in data:
        value = data["due_date"]
        if value is None:
            cleaned["due_date"] = None
        else:
            message = "due_date must be a date-time like 2026-10-20T17:00:00 or null"
            if not isinstance(value, str):
                raise TaskValidationError(message)
            try:
                cleaned["due_date"] = datetime.fromisoformat(value).replace(tzinfo=None, microsecond=0)
            except ValueError:
                raise TaskValidationError(message) from None

    for field in ("is_completed", "is_locked"):
        if field in data:
            if not isinstance(data[field], bool):
                raise TaskValidationError(f"{field} must be true or false")
            cleaned[field] = data[field]

    if "scheduled_date" in data:
        value = data["scheduled_date"]
        if value is None:
            cleaned["scheduled_date"] = None
        else:
            try:
                if not isinstance(value, str):
                    raise ValueError
                cleaned["scheduled_date"] = date.fromisoformat(value)
            except ValueError:
                raise TaskValidationError("scheduled_date must be a date like 2026-10-20 or null") from None

    if "estimated_minutes" in data:
        value = data["estimated_minutes"]
        if value is not None and (not _is_int(value) or not 1 <= value <= 1440):
            raise TaskValidationError("estimated_minutes must be a whole number from 1 to 1440 or null")
        cleaned["estimated_minutes"] = value

    if "priority" in data:
        if data["priority"] not in PRIORITIES:
            raise TaskValidationError("priority must be one of: " + ", ".join(PRIORITIES))
        cleaned["priority"] = data["priority"]

    return cleaned


class Task(TimestampMixin, db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id", ondelete="SET NULL"))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"))
    due_date = db.Column(db.DateTime)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    is_locked = db.Column(db.Boolean, nullable=False, default=False)
    scheduled_date = db.Column(db.Date)
    estimated_minutes = db.Column(db.Integer)
    priority = db.Column(db.String(10), nullable=False, default="medium")

    goal = db.relationship("Goal", back_populates="tasks")
    category = db.relationship("Category", back_populates="tasks")
    time_entries = db.relationship("TimeEntry", back_populates="task")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "goal_id": self.goal_id,
            "category_id": self.category_id,
            "due_date": iso(self.due_date),
            "is_completed": self.is_completed,
            "is_locked": self.is_locked,
            "scheduled_date": iso(self.scheduled_date),
            "estimated_minutes": self.estimated_minutes,
            "priority": self.priority,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
