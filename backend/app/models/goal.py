from datetime import date

from app.extensions import db

from .base import TimestampMixin, iso

URGENCY_LEVELS = ("low", "medium", "high")


class GoalValidationError(ValueError):
    pass


def clean_goal_payload(data, partial=False):
    if not isinstance(data, dict):
        raise GoalValidationError("Request body must be a JSON object")
    cleaned = {}

    if "title" in data or not partial:
        value = data.get("title")
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 200:
            raise GoalValidationError("title is required, up to 200 characters")
        cleaned["title"] = value.strip()

    if "description" in data:
        value = data["description"]
        if value is not None and (not isinstance(value, str) or len(value) > 2000):
            raise GoalValidationError("description must be text up to 2000 characters or null")
        cleaned["description"] = value.strip() if isinstance(value, str) and value.strip() else None

    if "target_date" in data:
        value = data["target_date"]
        if value is None:
            cleaned["target_date"] = None
        else:
            try:
                if not isinstance(value, str):
                    raise ValueError
                cleaned["target_date"] = date.fromisoformat(value)
            except ValueError:
                raise GoalValidationError("target_date must be a date like 2026-10-20 or null") from None

    if "urgency" in data:
        if data["urgency"] not in URGENCY_LEVELS:
            raise GoalValidationError("urgency must be one of: " + ", ".join(URGENCY_LEVELS))
        cleaned["urgency"] = data["urgency"]

    if "is_completed" in data:
        if not isinstance(data["is_completed"], bool):
            raise GoalValidationError("is_completed must be true or false")
        cleaned["is_completed"] = data["is_completed"]

    return cleaned


class Goal(TimestampMixin, db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    target_date = db.Column(db.Date)
    urgency = db.Column(db.String(10), nullable=False, default="medium")
    is_completed = db.Column(db.Boolean, nullable=False, default=False)

    tasks = db.relationship("Task", back_populates="goal")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "target_date": iso(self.target_date),
            "urgency": self.urgency,
            "is_completed": self.is_completed,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
