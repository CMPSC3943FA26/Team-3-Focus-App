from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Category
from app.models.category import CategoryValidationError, clean_category_payload

bp = Blueprint("categories", __name__)


def _error(message, status=400):
    return jsonify({"error": message}), status


def _apply_rules(fields, category=None):
    tier = fields.get("reminder_tier", category.reminder_tier if category else None)
    offsets = fields.get("custom_offsets", category.custom_offsets if category else [])
    if tier == "custom":
        if not offsets:
            raise CategoryValidationError(
                "custom_offsets needs at least one value when reminder_tier is custom"
            )
    else:
        fields["custom_offsets"] = []
    name = fields.get("name")
    if name is not None:
        query = db.select(Category).where(db.func.lower(Category.name) == name.lower())
        other = db.session.execute(query).scalars().first()
        if other is not None and (category is None or other.id != category.id):
            raise CategoryValidationError("A task type with that name already exists")


@bp.get("/categories")
def list_categories():
    query = db.select(Category).order_by(Category.name, Category.id)
    return jsonify([category.to_dict() for category in db.session.execute(query).scalars()])


@bp.post("/categories")
def create_category():
    try:
        fields = clean_category_payload(request.get_json(silent=True), partial=False)
        _apply_rules(fields)
    except CategoryValidationError as exc:
        return _error(str(exc))
    category = Category(**fields)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@bp.get("/categories/<int:category_id>")
def get_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return _error("Category not found", 404)
    return jsonify(category.to_dict())


@bp.patch("/categories/<int:category_id>")
def update_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return _error("Category not found", 404)
    try:
        fields = clean_category_payload(request.get_json(silent=True), partial=True)
        _apply_rules(fields, category)
    except CategoryValidationError as exc:
        return _error(str(exc))
    for key, value in fields.items():
        setattr(category, key, value)
    db.session.commit()
    return jsonify(category.to_dict())


@bp.delete("/categories/<int:category_id>")
def delete_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return _error("Category not found", 404)
    db.session.delete(category)
    db.session.commit()
    return "", 204
