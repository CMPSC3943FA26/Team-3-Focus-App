from app.extensions import db

from .base import TimestampMixin, iso

URGENCY_LEVELS = ("low", "medium", "high")


class Goal(TimestampMixin, db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    target_date = db.Column(db.Date)
    urgency = db.Column(db.String(10), nullable=False, default="medium")
    is_completed = db.Column(db.Boolean, nullable=False, default=False)

    tasks = db.relationship("Task", back_populates="goal")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "target_date": iso(self.target_date),
            "urgency": self.urgency,
            "is_completed": self.is_completed,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
