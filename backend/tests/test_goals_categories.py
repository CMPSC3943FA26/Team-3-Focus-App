GOAL_KEYS = {
    "id", "title", "description", "target_date", "urgency", "is_completed", "created_at", "updated_at",
}
CATEGORY_KEYS = {
    "id", "name", "color", "reminder_tier", "custom_offsets", "created_at", "updated_at",
}


def test_goal_crud(client):
    response = client.post(
        "/api/goals", json={"title": "Finish report", "target_date": "2026-10-30", "urgency": "high"}
    )
    assert response.status_code == 201
    goal = response.get_json()
    assert set(goal) == GOAL_KEYS
    assert goal["target_date"] == "2026-10-30"
    patched = client.patch(f"/api/goals/{goal['id']}", json={"is_completed": True, "target_date": None})
    assert patched.get_json()["is_completed"] is True
    assert patched.get_json()["target_date"] is None
    assert len(client.get("/api/goals").get_json()) == 1
    assert client.delete(f"/api/goals/{goal['id']}").status_code == 204
    assert client.get(f"/api/goals/{goal['id']}").status_code == 404


def test_goal_validation(client):
    assert client.post("/api/goals", json={}).status_code == 400
    assert client.post("/api/goals", json={"title": "x", "urgency": "now"}).status_code == 400
    assert client.post("/api/goals", json={"title": "x", "target_date": "soon"}).status_code == 400


def test_deleting_goal_keeps_tasks_via_api(client):
    goal = client.post("/api/goals", json={"title": "Goal"}).get_json()
    task = client.post("/api/tasks", json={"title": "Task", "goal_id": goal["id"]}).get_json()
    client.delete(f"/api/goals/{goal['id']}")
    assert client.get(f"/api/tasks/{task['id']}").get_json()["goal_id"] is None


def test_category_crud_and_duplicate_name(client):
    response = client.post("/api/categories", json={"name": "Class", "color": "#5e8c76"})
    assert response.status_code == 201
    category = response.get_json()
    assert set(category) == CATEGORY_KEYS
    assert category["color"] == "#5E8C76"
    assert category["reminder_tier"] is None
    assert category["custom_offsets"] == []
    assert client.post("/api/categories", json={"name": "class", "color": "#5E8C76"}).status_code == 400
    assert client.delete(f"/api/categories/{category['id']}").status_code == 204
    assert client.get(f"/api/categories/{category['id']}").status_code == 404


def test_category_custom_preset_needs_offsets(client):
    body = {"name": "Study", "color": "#4F7CAC", "reminder_tier": "custom"}
    assert client.post("/api/categories", json=body).status_code == 400
    created = client.post("/api/categories", json={**body, "custom_offsets": [5, 45, 20]})
    assert created.status_code == 201
    assert created.get_json()["custom_offsets"] == [45, 20, 5]


def test_category_non_custom_tier_clears_offsets(client):
    created = client.post(
        "/api/categories",
        json={"name": "Work", "color": "#4F7CAC", "reminder_tier": "custom", "custom_offsets": [30]},
    ).get_json()
    patched = client.patch(f"/api/categories/{created['id']}", json={"reminder_tier": "many"})
    assert patched.status_code == 200
    assert patched.get_json()["reminder_tier"] == "many"
    assert patched.get_json()["custom_offsets"] == []
    cleared = client.patch(f"/api/categories/{created['id']}", json={"reminder_tier": None})
    assert cleared.get_json()["reminder_tier"] is None


def test_category_bad_tier_or_color(client):
    assert client.post("/api/categories", json={"name": "A", "color": "red"}).status_code == 400
    bad = {"name": "A", "color": "#5E8C76", "reminder_tier": "loud"}
    assert client.post("/api/categories", json=bad).status_code == 400
