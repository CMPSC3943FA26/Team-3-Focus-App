from datetime import date, datetime
from types import SimpleNamespace

from app.routes.tasks import suggest_next_task

TASK_KEYS = {
    "id", "title", "goal_id", "category_id", "due_date", "is_completed", "is_locked",
    "scheduled_date", "estimated_minutes", "priority", "created_at", "updated_at",
}


def _task(client, **fields):
    return client.post("/api/tasks", json={"title": "Task", **fields})


def test_new_fields_round_trip(client):
    response = _task(
        client,
        due_date="2026-10-20T17:00:00",
        scheduled_date="2026-10-20",
        estimated_minutes=45,
        priority="high",
        is_locked=True,
    )
    assert response.status_code == 201
    body = response.get_json()
    assert set(body) == TASK_KEYS
    assert body["scheduled_date"] == "2026-10-20"
    assert body["estimated_minutes"] == 45
    assert body["priority"] == "high"
    assert body["due_date"] == "2026-10-20T17:00:00"
    fetched = client.get(f"/api/tasks/{body['id']}").get_json()
    assert fetched == body


def test_defaults(client):
    body = _task(client).get_json()
    assert body["priority"] == "medium"
    assert body["scheduled_date"] is None
    assert body["estimated_minutes"] is None
    assert body["is_locked"] is False


def test_invalid_values_are_400(client):
    assert _task(client, priority="urgent").status_code == 400
    assert _task(client, estimated_minutes=0).status_code == 400
    assert _task(client, estimated_minutes=1441).status_code == 400
    assert _task(client, estimated_minutes=1.5).status_code == 400
    assert _task(client, scheduled_date="tomorrow").status_code == 400
    assert _task(client, due_date="soon").status_code == 400
    assert _task(client, title="  ").status_code == 400
    assert _task(client, goal_id=99).status_code == 400
    assert _task(client, category_id=99).status_code == 400


def test_patch_and_delete(client):
    task = _task(client).get_json()
    response = client.patch(f"/api/tasks/{task['id']}", json={"is_completed": True, "estimated_minutes": None})
    assert response.status_code == 200
    assert response.get_json()["is_completed"] is True
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404


def _fake(task_id, due=None, priority="medium", scheduled=None, done=False):
    return SimpleNamespace(
        id=task_id, due_date=due, priority=priority, scheduled_date=scheduled, is_completed=done
    )


NOW = datetime(2026, 10, 20, 9, 0, 0)


def test_suggest_prefers_overdue_then_earliest_due_then_priority():
    overdue = _fake(1, due=datetime(2026, 10, 19, 9, 0))
    soon = _fake(2, due=datetime(2026, 10, 20, 17, 0))
    later = _fake(3, due=datetime(2026, 10, 25, 17, 0), priority="high")
    assert suggest_next_task([later, soon, overdue], NOW).id == 1
    assert suggest_next_task([later, soon], NOW).id == 2
    low = _fake(4, priority="low")
    high = _fake(5, priority="high")
    assert suggest_next_task([low, high], NOW).id == 5


def test_suggest_ignores_completed_and_future_scheduled():
    done = _fake(1, due=datetime(2026, 10, 19), done=True)
    future = _fake(2, scheduled=date(2026, 10, 21))
    today = _fake(3, scheduled=date(2026, 10, 20))
    assert suggest_next_task([done, future], NOW) is None
    assert suggest_next_task([done, future, today], NOW).id == 3


def test_suggest_route(client):
    overdue = _task(client, title="Overdue", due_date="2026-10-19T09:00:00").get_json()
    _task(client, title="Fine", due_date="2026-10-22T09:00:00")
    _task(client, title="Later day", scheduled_date="2026-10-25")
    response = client.get("/api/tasks/suggest?now=2026-10-20T09:00:00")
    assert response.status_code == 200
    assert response.get_json()["task"]["id"] == overdue["id"]
    assert client.get("/api/tasks/suggest").status_code == 400


def test_suggest_route_with_nothing_waiting(client):
    response = client.get("/api/tasks/suggest?now=2026-10-20T09:00:00")
    assert response.get_json() == {"task": None}
