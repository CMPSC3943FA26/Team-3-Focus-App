from app.extensions import db

from .base import TimestampMixin, iso


class Task(TimestampMixin, db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id", ondelete="SET NULL"))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"))
    due_date = db.Column(db.DateTime)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    is_locked = db.Column(db.Boolean, nullable=False, default=False)

    goal = db.relationship("Goal", back_populates="tasks")
    category = db.relationship("Category", back_populates="tasks")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "goal_id": self.goal_id,
            "category_id": self.category_id,
            "due_date": iso(self.due_date),
            "is_completed": self.is_completed,
            "is_locked": self.is_locked,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
