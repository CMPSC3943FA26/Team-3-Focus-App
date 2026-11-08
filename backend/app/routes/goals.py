from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Goal
from app.models.goal import GoalValidationError, clean_goal_payload

bp = Blueprint("goals", __name__)


def _error(message, status=400):
    return jsonify({"error": message}), status


@bp.get("/goals")
def list_goals():
    query = db.select(Goal).order_by(Goal.created_at, Goal.id)
    return jsonify([goal.to_dict() for goal in db.session.execute(query).scalars()])


@bp.post("/goals")
def create_goal():
    try:
        fields = clean_goal_payload(request.get_json(silent=True), partial=False)
    except GoalValidationError as exc:
        return _error(str(exc))
    goal = Goal(**fields)
    db.session.add(goal)
    db.session.commit()
    return jsonify(goal.to_dict()), 201


@bp.get("/goals/<int:goal_id>")
def get_goal(goal_id):
    goal = db.session.get(Goal, goal_id)
    if goal is None:
        return _error("Goal not found", 404)
    return jsonify(goal.to_dict())


@bp.patch("/goals/<int:goal_id>")
def update_goal(goal_id):
    goal = db.session.get(Goal, goal_id)
    if goal is None:
        return _error("Goal not found", 404)
    try:
        fields = clean_goal_payload(request.get_json(silent=True), partial=True)
    except GoalValidationError as exc:
        return _error(str(exc))
    for key, value in fields.items():
        setattr(goal, key, value)
    db.session.commit()
    return jsonify(goal.to_dict())


@bp.delete("/goals/<int:goal_id>")
def delete_goal(goal_id):
    goal = db.session.get(Goal, goal_id)
    if goal is None:
        return _error("Goal not found", 404)
    db.session.delete(goal)
    db.session.commit()
    return "", 204
