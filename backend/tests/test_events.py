EVENT_KEYS = {
    "id", "title", "description", "start_time", "end_time", "category_id",
    "location", "travel_minutes", "color", "created_at", "updated_at",
}

VALID = {
    "title": "OS lecture",
    "start_time": "2026-10-20T09:00:00",
    "end_time": "2026-10-20T10:15:00",
    "travel_minutes": 15,
    "color": "#5e8c76",
}


def test_create_matches_contract(client):
    response = client.post("/api/events", json=VALID)
    assert response.status_code == 201
    body = response.get_json()
    assert set(body) == EVENT_KEYS
    assert body["start_time"] == "2026-10-20T09:00:00"
    assert body["color"] == "#5E8C76"
    assert body["travel_minutes"] == 15


def test_range_includes_overlap_and_excludes_outside(client):
    client.post("/api/events", json=VALID)
    client.post(
        "/api/events",
        json={**VALID, "title": "Late night", "start_time": "2026-10-19T23:00:00", "end_time": "2026-10-20T01:00:00"},
    )
    client.post(
        "/api/events",
        json={**VALID, "title": "Next week", "start_time": "2026-10-27T09:00:00", "end_time": "2026-10-27T10:00:00"},
    )
    events = client.get("/api/events?start=2026-10-20&end=2026-10-20").get_json()
    assert [event["title"] for event in events] == ["Late night", "OS lecture"]


def test_end_before_start_is_rejected(client):
    assert client.post("/api/events", json={**VALID, "end_time": "2026-10-20T08:00:00"}).status_code == 400


def test_bad_color_is_rejected(client):
    assert client.post("/api/events", json={**VALID, "color": "#zzz"}).status_code == 400


def test_bad_range_is_rejected(client):
    assert client.get("/api/events?start=2026-10-21&end=2026-10-20").status_code == 400
    assert client.get("/api/events?start=2026-10-20").status_code == 400


def test_patch_cannot_flip_times(client):
    event = client.post("/api/events", json=VALID).get_json()
    response = client.patch(f"/api/events/{event['id']}", json={"end_time": "2026-10-20T08:00:00"})
    assert response.status_code == 400


def test_patch_and_delete(client):
    event = client.post("/api/events", json=VALID).get_json()
    response = client.patch(f"/api/events/{event['id']}", json={"travel_minutes": 0})
    assert response.status_code == 200
    assert response.get_json()["travel_minutes"] is None
    assert client.delete(f"/api/events/{event['id']}").status_code == 204
    assert client.get(f"/api/events/{event['id']}").status_code == 404
