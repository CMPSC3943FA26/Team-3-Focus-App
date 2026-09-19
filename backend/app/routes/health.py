from flask import Blueprint, current_app, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify(
        status="ok",
        environment=current_app.config["ENV_NAME"],
    )
