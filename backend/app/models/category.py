from app.extensions import db

from .alarm import FREQUENCY_TIERS
from .base import TimestampMixin, iso
from .event import COLOR_PATTERN


class CategoryValidationError(ValueError):
    pass


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def clean_category_payload(data, partial=False):
    if not isinstance(data, dict):
        raise CategoryValidationError("Request body must be a JSON object")
    cleaned = {}

    if "name" in data or not partial:
        value = data.get("name")
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 50:
            raise CategoryValidationError("name is required, up to 50 characters")
        cleaned["name"] = value.strip()

    if "color" in data or not partial:
        value = data.get("color")
        if not isinstance(value, str) or not COLOR_PATTERN.match(value):
            raise CategoryValidationError("color must be a hex value like #5E8C76")
        cleaned["color"] = value.upper()

    if "reminder_tier" in data:
        value = data["reminder_tier"]
        if value is not None and value not in FREQUENCY_TIERS:
            raise CategoryValidationError(
                "reminder_tier must be null or one of: " + ", ".join(FREQUENCY_TIERS)
            )
        cleaned["reminder_tier"] = value

    if "custom_offsets" in data:
        value = data["custom_offsets"]
        if not isinstance(value, list) or any(not _is_int(item) or not 0 <= item <= 1440 for item in value):
            raise CategoryValidationError("custom_offsets must be whole minutes from 0 to 1440")
        cleaned["custom_offsets"] = sorted(set(value), reverse=True)

    return cleaned


class Category(TimestampMixin, db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    color = db.Column(db.String(7), nullable=False)
    reminder_tier = db.Column(db.String(10))
    custom_offsets = db.Column(db.JSON, nullable=False, default=list)

    events = db.relationship("Event", back_populates="category")
    tasks = db.relationship("Task", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "reminder_tier": self.reminder_tier,
            "custom_offsets": list(self.custom_offsets or []),
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
