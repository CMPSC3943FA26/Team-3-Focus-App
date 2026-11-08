from app.extensions import db

from .base import TimestampMixin, iso


class TimeEntry(TimestampMixin, db.Model):
    __tablename__ = "time_entries"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id", ondelete="SET NULL"))
    started_at = db.Column(db.DateTime, nullable=False)
    ended_at = db.Column(db.DateTime)
    note = db.Column(db.String(200))

    task = db.relationship("Task", back_populates="time_entries")

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "started_at": iso(self.started_at),
            "ended_at": iso(self.ended_at),
            "note": self.note,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
