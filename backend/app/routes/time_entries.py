from datetime import date, datetime, time, timedelta

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Task, TimeEntry

bp = Blueprint("time_entries", __name__)


class TimeEntryError(ValueError):
    pass


def _error(message, status=400):
    return jsonify({"error": message}), status


def _parse_dt(value, field):
    message = f"{field} must be a date-time like 2026-10-20T09:00:00"
    if not isinstance(value, str):
        raise TimeEntryError(message)
    try:
        return datetime.fromisoformat(value).replace(tzinfo=None, microsecond=0)
    except ValueError:
        raise TimeEntryError(message) from None


def _clean(data, partial):
    if not isinstance(data, dict):
        raise TimeEntryError("Request body must be a JSON object")
    cleaned = {}
    if "started_at" in data or not partial:
        cleaned["started_at"] = _parse_dt(data.get("started_at"), "started_at")
    if "ended_at" in data:
        cleaned["ended_at"] = None if data["ended_at"] is None else _parse_dt(data["ended_at"], "ended_at")
    if "task_id" in data:
        value = data["task_id"]
        if value is not None and (not isinstance(value, int) or isinstance(value, bool)):
            raise TimeEntryError("task_id must be a whole number or null")
        if value is not None and db.session.get(Task, value) is None:
            raise TimeEntryError("task_id does not match an existing task")
        cleaned["task_id"] = value
    if "note" in data:
        value = data["note"]
        if value is not None and (not isinstance(value, str) or len(value) > 200):
            raise TimeEntryError("note must be text up to 200 characters or null")
        cleaned["note"] = value.strip() if isinstance(value, str) and value.strip() else None
    return cleaned


def _check(fields, entry=None):
    started = fields.get("started_at", entry.started_at if entry else None)
    ended = fields.get("ended_at", entry.ended_at if entry else None)
    if ended is not None and ended <= started:
        raise TimeEntryError("ended_at must be after started_at")
    if ended is None:
        running = db.session.execute(db.select(TimeEntry).where(TimeEntry.ended_at.is_(None))).scalars().first()
        if running is not None and (entry is None or running.id != entry.id):
            raise TimeEntryError("Another timer is already running")


def _fail(exc):
    status = 409 if "already running" in str(exc) else 400
    return _error(str(exc), status)


@bp.get("/time-entries")
def list_entries():
    query = db.select(TimeEntry).order_by(TimeEntry.started_at, TimeEntry.id)
    day_arg = request.args.get("date")
    if day_arg:
        try:
            day = date.fromisoformat(day_arg)
        except ValueError:
            return _error("date must be like 2026-10-20")
        start = datetime.combine(day, time.min)
        end = start + timedelta(days=1)
        query = query.where(
            TimeEntry.started_at < end,
            (TimeEntry.ended_at.is_(None)) | (TimeEntry.ended_at > start),
        )
    return jsonify([entry.to_dict() for entry in db.session.execute(query).scalars()])


@bp.post("/time-entries")
def create_entry():
    try:
        fields = _clean(request.get_json(silent=True), partial=False)
        _check(fields)
    except TimeEntryError as exc:
        return _fail(exc)
    entry = TimeEntry(**fields)
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201


@bp.patch("/time-entries/<int:entry_id>")
def update_entry(entry_id):
    entry = db.session.get(TimeEntry, entry_id)
    if entry is None:
        return _error("Time entry not found", 404)
    try:
        fields = _clean(request.get_json(silent=True), partial=True)
        _check(fields, entry)
    except TimeEntryError as exc:
        return _fail(exc)
    for key, value in fields.items():
        setattr(entry, key, value)
    db.session.commit()
    return jsonify(entry.to_dict())


@bp.delete("/time-entries/<int:entry_id>")
def delete_entry(entry_id):
    entry = db.session.get(TimeEntry, entry_id)
    if entry is None:
        return _error("Time entry not found", 404)
    db.session.delete(entry)
    db.session.commit()
    return "", 204
