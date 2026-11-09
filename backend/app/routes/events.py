from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Category, Event
from app.models.event import EventValidationError, clean_event_payload

bp = Blueprint("events", __name__)


def _error(message, status=400):
    return jsonify({"error": message}), status


def _check_rules(fields, event=None):
    start = fields.get("start_time", event.start_time if event else None)
    end = fields.get("end_time", event.end_time if event else None)
    if start is not None and end is not None and end <= start:
        raise EventValidationError("end_time must be after start_time")
    until = fields.get("repeat_until", event.repeat_until if event else None)
    if until is not None and start is not None and until < start.date():
        raise EventValidationError("repeat_until must not be before the start date")
    tier = fields.get("reminder_tier", event.reminder_tier if event else None)
    offsets = fields.get("custom_offsets", event.custom_offsets if event else [])
    if tier == "custom":
        if not offsets:
            raise EventValidationError(
                "custom_offsets needs at least one value when reminder_tier is custom"
            )
    else:
        fields["custom_offsets"] = []
    category_id = fields.get("category_id")
    if category_id is not None and db.session.get(Category, category_id) is None:
        raise EventValidationError("category_id does not match an existing category")


def _parse_day(value, name):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise EventValidationError(f"{name} must be a date like 2026-10-20") from None


def _touches_range(event, range_start, range_end):
    if event.end_time > range_start:
        return True
    if not event.repeat_days:
        return False
    # repeating series can still land in range even when first one is before it
    return event.repeat_until is None or event.repeat_until >= range_start.date()


@bp.get("/events")
def list_events():
    query = db.select(Event).order_by(Event.start_time, Event.id)
    start_arg = request.args.get("start")
    end_arg = request.args.get("end")
    if start_arg or end_arg:
        try:
            start_day = _parse_day(start_arg, "start")
            end_day = _parse_day(end_arg, "end")
        except EventValidationError as exc:
            return _error(str(exc))
        if end_day < start_day:
            return _error("end must be on or after start")
        range_start = datetime.combine(start_day, datetime.min.time())
        range_end = datetime.combine(end_day + timedelta(days=1), datetime.min.time())
        query = query.where(Event.start_time < range_end)
        events = [event for event in db.session.execute(query).scalars() if _touches_range(event, range_start, range_end)]
        return jsonify([event.to_dict() for event in events])
    events = db.session.execute(query).scalars().all()
    return jsonify([event.to_dict() for event in events])


@bp.post("/events")
def create_event():
    try:
        fields = clean_event_payload(request.get_json(silent=True), partial=False)
        _check_rules(fields)
    except EventValidationError as exc:
        return _error(str(exc))
    event = Event(**fields)
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201


@bp.get("/events/<int:event_id>")
def get_event(event_id):
    event = db.session.get(Event, event_id)
    if event is None:
        return _error("Event not found", 404)
    return jsonify(event.to_dict())


@bp.patch("/events/<int:event_id>")
def update_event(event_id):
    event = db.session.get(Event, event_id)
    if event is None:
        return _error("Event not found", 404)
    try:
        fields = clean_event_payload(request.get_json(silent=True), partial=True)
        _check_rules(fields, event)
    except EventValidationError as exc:
        return _error(str(exc))
    for key, value in fields.items():
        setattr(event, key, value)
    db.session.commit()
    return jsonify(event.to_dict())


@bp.delete("/events/<int:event_id>")
def delete_event(event_id):
    event = db.session.get(Event, event_id)
    if event is None:
        return _error("Event not found", 404)
    db.session.delete(event)
    db.session.commit()
    return "", 204
