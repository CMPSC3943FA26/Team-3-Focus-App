# Empty on purpose. Database models belong to the "Database Table Shells" ticket
# and are owned by someone else.
#
# SQLAlchemy is already configured, so that ticket only needs to define model
# classes in this package and import them where they are used. The shared
# instance lives in app/extensions.py and is imported as:
#
#     from app.extensions import db
#
# Flask-Migrate is wired up as well, so schema changes can be handled with
# migrations rather than dropping and recreating the database.
