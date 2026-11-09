import re
from datetime import date, datetime

from app.extensions import db

from .alarm import DAY_CODES, FREQUENCY_TIERS
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

    if "repeat_days" in data:
        value = data["repeat_days"]
        if not isinstance(value, list) or any(day not in DAY_CODES for day in value):
            raise EventValidationError("repeat_days must be a list of: " + ", ".join(DAY_CODES))
        cleaned["repeat_days"] = [day for day in DAY_CODES if day in value]

    if "repeat_until" in data:
        value = data["repeat_until"]
        if value is None:
            cleaned["repeat_until"] = None
        else:
            try:
                if not isinstance(value, str):
                    raise ValueError
                cleaned["repeat_until"] = date.fromisoformat(value)
            except ValueError:
                raise EventValidationError("repeat_until must be a date like 2026-12-18 or null") from None

    if "reminders_enabled" in data:
        if not isinstance(data["reminders_enabled"], bool):
            raise EventValidationError("reminders_enabled must be true or false")
        cleaned["reminders_enabled"] = data["reminders_enabled"]

    if "reminder_tier" in data:
        value = data["reminder_tier"]
        if value is not None and value not in FREQUENCY_TIERS:
            raise EventValidationError(
                "reminder_tier must be null or one of: " + ", ".join(FREQUENCY_TIERS)
            )
        cleaned["reminder_tier"] = value

    if "custom_offsets" in data:
        value = data["custom_offsets"]
        if not isinstance(value, list) or any(
            not _is_int(item) or not 0 <= item <= 1440 for item in value
        ):
            raise EventValidationError("custom_offsets must be whole minutes from 0 to 1440")
        cleaned["custom_offsets"] = sorted(set(value), reverse=True)

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
    repeat_days = db.Column(db.JSON, nullable=False, default=list)
    repeat_until = db.Column(db.Date)
    reminders_enabled = db.Column(db.Boolean, nullable=False, default=True)
    reminder_tier = db.Column(db.String(10))
    custom_offsets = db.Column(db.JSON, nullable=False, default=list)

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
            "repeat_days": list(self.repeat_days or []),
            "repeat_until": iso(self.repeat_until),
            "reminders_enabled": self.reminders_enabled,
            "reminder_tier": self.reminder_tier,
            "custom_offsets": list(self.custom_offsets or []),
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
