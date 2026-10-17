from datetime import date, datetime, time

from app.extensions import db
from app.models import Alarm, Category, Event, Goal, Task


def test_relationships_and_to_dict(app):
    category = Category(name="Class", color="#5E8C76")
    event = Event(
        title="OS lecture",
        start_time=datetime(2026, 10, 20, 9, 0),
        end_time=datetime(2026, 10, 20, 10, 15),
        category=category,
        travel_minutes=15,
    )
    alarm = Alarm(time=time(8, 30), label="Leave for class", repeat_days=["mon", "wed"], event=event)
    goal = Goal(title="Finish OS report", target_date=date(2026, 10, 30), urgency="high")
    task = Task(title="Proofread", goal=goal, category=category)
    db.session.add_all([category, event, alarm, goal, task])
    db.session.commit()

    assert alarm.to_dict()["time"] == "08:30"
    assert alarm.to_dict()["event_id"] == event.id
    assert event.to_dict()["category_id"] == category.id
    assert task.to_dict()["goal_id"] == goal.id
    assert goal.to_dict()["target_date"] == "2026-10-30"


def test_deleting_goal_keeps_its_tasks(app):
    goal = Goal(title="Goal")
    task = Task(title="Task", goal=goal)
    db.session.add_all([goal, task])
    db.session.commit()
    db.session.delete(goal)
    db.session.commit()
    remaining = db.session.get(Task, task.id)
    assert remaining is not None
    assert remaining.goal_id is None
