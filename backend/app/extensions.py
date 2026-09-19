from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# Created here without an app so any module can import them without importing the
# application itself, which is what avoids circular imports once models exist.
# They are bound to the app inside create_app().
db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
