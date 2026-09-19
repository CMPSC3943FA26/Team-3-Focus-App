from flask import Flask

from .config import get_config
from .extensions import cors, db, migrate
from .routes.health import health_bp


def create_app(config_name=None):
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    db.init_app(app)
    migrate.init_app(app, db)

    # Wide open on purpose. The Expo app runs on a physical phone and reaches this
    # server across the local network, so every request arrives from a different
    # origin. Restrict origins before this is deployed anywhere real.
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(health_bp, url_prefix="/api")

    return app
