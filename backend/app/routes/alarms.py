from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Alarm, Event
from app.models.alarm import AlarmValidationError, clean_alarm_payload

bp = Blueprint("alarms", __name__)


def _error(message, status=400):
    return jsonify({"error": message}), status


def _apply_rules(fields, alarm=None):
    tier = fields.get("frequency_tier", alarm.frequency_tier if alarm else "some")
    offsets = fields.get("custom_offsets", alarm.custom_offsets if alarm else [])
    if tier == "custom":
        if not offsets:
            raise AlarmValidationError(
                "custom_offsets needs at least one value when frequency_tier is custom"
            )
    else:
        fields["custom_offsets"] = []
    event_id = fields.get("event_id")
    if event_id is not None and db.session.get(Event, event_id) is None:
        raise AlarmValidationError("event_id does not match an existing event")


@bp.get("/alarms")
def list_alarms():
    query = db.select(Alarm).order_by(Alarm.created_at.desc(), Alarm.id.desc())
    alarms = db.session.execute(query).scalars().all()
    return jsonify([alarm.to_dict() for alarm in alarms])


@bp.post("/alarms")
def create_alarm():
    try:
        fields = clean_alarm_payload(request.get_json(silent=True), partial=False)
        _apply_rules(fields)
    except AlarmValidationError as exc:
        return _error(str(exc))
    alarm = Alarm(**fields)
    db.session.add(alarm)
    db.session.commit()
    return jsonify(alarm.to_dict()), 201


@bp.get("/alarms/<int:alarm_id>")
def get_alarm(alarm_id):
    alarm = db.session.get(Alarm, alarm_id)
    if alarm is None:
        return _error("Alarm not found", 404)
    return jsonify(alarm.to_dict())


@bp.patch("/alarms/<int:alarm_id>")
def update_alarm(alarm_id):
    alarm = db.session.get(Alarm, alarm_id)
    if alarm is None:
        return _error("Alarm not found", 404)
    try:
        fields = clean_alarm_payload(request.get_json(silent=True), partial=True)
        _apply_rules(fields, alarm)
    except AlarmValidationError as exc:
        return _error(str(exc))
    for key, value in fields.items():
        setattr(alarm, key, value)
    db.session.commit()
    return jsonify(alarm.to_dict())


@bp.delete("/alarms/<int:alarm_id>")
def delete_alarm(alarm_id):
    alarm = db.session.get(Alarm, alarm_id)
    if alarm is None:
        return _error("Alarm not found", 404)
    db.session.delete(alarm)
    db.session.commit()
    return "", 204
