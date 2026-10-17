from app.extensions import db

from .base import TimestampMixin, iso


class Event(TimestampMixin, db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"))
    location = db.Column(db.String(200))
    travel_minutes = db.Column(db.Integer)

    category = db.relationship("Category", back_populates="events")
    alarms = db.relationship("Alarm", back_populates="event")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "start_time": iso(self.start_time),
            "end_time": iso(self.end_time),
            "category_id": self.category_id,
            "location": self.location,
            "travel_minutes": self.travel_minutes,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
