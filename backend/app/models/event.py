import re
from datetime import datetime

from app.extensions import db

from .base import TimestampMixin, iso

COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class EventValidationError(ValueError):
    pass


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _parse_datetime(value, field):
    message = f"{field} must be a date-time like 2026-10-20T09:00:00"
    if not isinstance(value, str):
        raise EventValidationError(message)
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise EventValidationError(message) from None
    return parsed.replace(tzinfo=None, microsecond=0)


def clean_event_payload(data, partial=False):
    if not isinstance(data, dict):
        raise EventValidationError("Request body must be a JSON object")
    cleaned = {}

    if "title" in data or not partial:
        value = data.get("title")
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 200:
            raise EventValidationError("title is required, up to 200 characters")
        cleaned["title"] = value.strip()

    for field in ("start_time", "end_time"):
        if field in data or not partial:
            cleaned[field] = _parse_datetime(data.get(field), field)

    for field, limit in (("description", 2000), ("location", 200)):
        if field in data:
            value = data[field]
            if value is not None and (not isinstance(value, str) or len(value) > limit):
                raise EventValidationError(f"{field} must be text up to {limit} characters or null")
            cleaned[field] = value.strip() if isinstance(value, str) and value.strip() else None

    if "travel_minutes" in data:
        value = data["travel_minutes"]
        if value is not None and (not _is_int(value) or not 0 <= value <= 600):
            raise EventValidationError("travel_minutes must be a whole number from 0 to 600 or null")
        cleaned["travel_minutes"] = value or None

    if "color" in data:
        value = data["color"]
        if value is not None and (not isinstance(value, str) or not COLOR_PATTERN.match(value)):
            raise EventValidationError("color must be a hex value like #5E8C76 or null")
        cleaned["color"] = value.upper() if value else None

    if "category_id" in data:
        value = data["category_id"]
        if value is not None and not _is_int(value):
            raise EventValidationError("category_id must be a whole number or null")
        cleaned["category_id"] = value

    return cleaned


class Event(TimestampMixin, db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"))
    location = db.Column(db.String(200))
    travel_minutes = db.Column(db.Integer)
    color = db.Column(db.String(7))

    category = db.relationship("Category", back_populates="events")
    alarms = db.relationship("Alarm", back_populates="event")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "start_time": iso(self.start_time),
            "end_time": iso(self.end_time),
            "category_id": self.category_id,
            "location": self.location,
            "travel_minutes": self.travel_minutes,
            "color": self.color,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
