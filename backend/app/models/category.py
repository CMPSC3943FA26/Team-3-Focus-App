from app.extensions import db

from .base import TimestampMixin, iso


class Category(TimestampMixin, db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    color = db.Column(db.String(7), nullable=False)

    events = db.relationship("Event", back_populates="category")
    tasks = db.relationship("Task", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
