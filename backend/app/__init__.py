from flask import Flask

from .config import get_config
from .extensions import cors, db, migrate
from .routes.alarms import bp as alarms_bp
from .routes.health import health_bp


def create_app(config_name=None):
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    db.init_app(app)
    migrate.init_app(app, db, render_as_batch=True)

    from . import models  # noqa: F401

    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(alarms_bp, url_prefix="/api")

    return app
