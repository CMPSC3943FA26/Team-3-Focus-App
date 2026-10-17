import re
from datetime import time as dt_time

from app.extensions import db

from .base import TimestampMixin, iso

FREQUENCY_TIERS = ("few", "some", "many", "custom")
DAY_CODES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


class AlarmValidationError(ValueError):
    pass


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def clean_alarm_payload(data, partial=False):
    if not isinstance(data, dict):
        raise AlarmValidationError("Request body must be a JSON object")
    cleaned = {}

    if "time" in data or not partial:
        value = data.get("time")
        if not isinstance(value, str) or not TIME_PATTERN.match(value):
            raise AlarmValidationError("time must be HH:MM in 24-hour format")
        hours, minutes = value.split(":")
        cleaned["time"] = dt_time(int(hours), int(minutes))

    if "label" in data:
        value = data["label"]
        if not isinstance(value, str) or len(value.strip()) > 100:
            raise AlarmValidationError("label must be text up to 100 characters")
        cleaned["label"] = value.strip() or "Alarm"

    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            raise AlarmValidationError("is_active must be true or false")
        cleaned["is_active"] = data["is_active"]

    if "repeat_days" in data:
        value = data["repeat_days"]
        if not isinstance(value, list) or any(day not in DAY_CODES for day in value):
            raise AlarmValidationError("repeat_days must be a list of: " + ", ".join(DAY_CODES))
        cleaned["repeat_days"] = [day for day in DAY_CODES if day in value]

    if "sound_file" in data:
        value = data["sound_file"]
        if value is not None and not isinstance(value, str):
            raise AlarmValidationError("sound_file must be text or null")
        cleaned["sound_file"] = value

    if "snooze_duration" in data:
        value = data["snooze_duration"]
        if not _is_int(value) or not 1 <= value <= 60:
            raise AlarmValidationError("snooze_duration must be a whole number from 1 to 60")
        cleaned["snooze_duration"] = value

    if "frequency_tier" in data:
        if data["frequency_tier"] not in FREQUENCY_TIERS:
            raise AlarmValidationError(
                "frequency_tier must be one of: " + ", ".join(FREQUENCY_TIERS)
            )
        cleaned["frequency_tier"] = data["frequency_tier"]

    if "custom_offsets" in data:
        value = data["custom_offsets"]
        if not isinstance(value, list) or any(
            not _is_int(item) or not 0 <= item <= 1440 for item in value
        ):
            raise AlarmValidationError("custom_offsets must be whole minutes from 0 to 1440")
        cleaned["custom_offsets"] = sorted(set(value), reverse=True)

    if "event_id" in data:
        value = data["event_id"]
        if value is not None and not _is_int(value):
            raise AlarmValidationError("event_id must be a whole number or null")
        cleaned["event_id"] = value

    return cleaned


class Alarm(TimestampMixin, db.Model):
    __tablename__ = "alarms"

    id = db.Column(db.Integer, primary_key=True)
    time = db.Column(db.Time, nullable=False)
    label = db.Column(db.String(100), nullable=False, default="Alarm")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    repeat_days = db.Column(db.JSON, nullable=False, default=list)
    sound_file = db.Column(db.String(200))
    snooze_duration = db.Column(db.Integer, nullable=False, default=5)
    frequency_tier = db.Column(db.String(10), nullable=False, default="some")
    custom_offsets = db.Column(db.JSON, nullable=False, default=list)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="SET NULL"))

    event = db.relationship("Event", back_populates="alarms")

    def to_dict(self):
        return {
            "id": self.id,
            "time": self.time.strftime("%H:%M"),
            "label": self.label,
            "is_active": self.is_active,
            "repeat_days": list(self.repeat_days or []),
            "sound_file": self.sound_file,
            "snooze_duration": self.snooze_duration,
            "frequency_tier": self.frequency_tier,
            "custom_offsets": list(self.custom_offsets or []),
            "event_id": self.event_id,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
