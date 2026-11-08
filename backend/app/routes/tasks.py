from datetime import datetime

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Category, Goal, Task
from app.models.task import TaskValidationError, clean_task_payload

bp = Blueprint("tasks", __name__)

PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}


def _error(message, status=400):
    return jsonify({"error": message}), status


def _check_links(fields):
    goal_id = fields.get("goal_id")
    if goal_id is not None and db.session.get(Goal, goal_id) is None:
        raise TaskValidationError("goal_id does not match an existing goal")
    category_id = fields.get("category_id")
    if category_id is not None and db.session.get(Category, category_id) is None:
        raise TaskValidationError("category_id does not match an existing category")


def suggest_next_task(tasks, now):
    today = now.date()
    candidates = [
        task for task in tasks
        if not task.is_completed and (task.scheduled_date is None or task.scheduled_date <= today)
    ]
    if not candidates:
        return None

    def rank(task):
        due = task.due_date or datetime.max
        return (0 if due < now else 1, due, PRIORITY_RANK.get(task.priority, 1), task.id)

    return min(candidates, key=rank)


@bp.get("/tasks/suggest")
def suggest_task():
    try:
        now = datetime.fromisoformat(request.args.get("now", "")).replace(tzinfo=None)
    except ValueError:
        return _error("now must be a date-time like 2026-10-20T09:00:00")
    tasks = db.session.execute(db.select(Task)).scalars().all()
    task = suggest_next_task(tasks, now)
    return jsonify({"task": task.to_dict() if task else None})


@bp.get("/tasks")
def list_tasks():
    query = db.select(Task).order_by(Task.created_at, Task.id)
    goal_arg = request.args.get("goal_id")
    if goal_arg:
        if not goal_arg.isdigit():
            return _error("goal_id must be a whole number")
        query = query.where(Task.goal_id == int(goal_arg))
    return jsonify([task.to_dict() for task in db.session.execute(query).scalars()])


@bp.post("/tasks")
def create_task():
    try:
        fields = clean_task_payload(request.get_json(silent=True), partial=False)
        _check_links(fields)
    except TaskValidationError as exc:
        return _error(str(exc))
    task = Task(**fields)
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@bp.get("/tasks/<int:task_id>")
def get_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return _error("Task not found", 404)
    return jsonify(task.to_dict())


@bp.patch("/tasks/<int:task_id>")
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return _error("Task not found", 404)
    try:
        fields = clean_task_payload(request.get_json(silent=True), partial=True)
        _check_links(fields)
    except TaskValidationError as exc:
        return _error(str(exc))
    for key, value in fields.items():
        setattr(task, key, value)
    db.session.commit()
    return jsonify(task.to_dict())


@bp.delete("/tasks/<int:task_id>")
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return _error("Task not found", 404)
    db.session.delete(task)
    db.session.commit()
    return "", 204
