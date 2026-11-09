EVENT_KEYS = {
    "id", "title", "description", "start_time", "end_time", "category_id",
    "location", "travel_minutes", "color", "repeat_days", "repeat_until",
    "reminders_enabled", "reminder_tier", "custom_offsets", "created_at", "updated_at",
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


WEEKLY = {**VALID, "repeat_days": ["wed", "mon"]}


def test_repeat_and_reminder_defaults(client):
    body = client.post("/api/events", json=VALID).get_json()
    assert body["repeat_days"] == []
    assert body["repeat_until"] is None
    assert body["reminders_enabled"] is True
    assert body["reminder_tier"] is None
    assert body["custom_offsets"] == []


def test_weekly_event_appears_in_a_range_three_weeks_later(client):
    created = client.post("/api/events", json=WEEKLY).get_json()
    assert created["repeat_days"] == ["mon", "wed"]
    later = client.get("/api/events?start=2026-11-09&end=2026-11-15").get_json()
    assert [event["id"] for event in later] == [created["id"]]
    before = client.get("/api/events?start=2026-10-12&end=2026-10-18").get_json()
    assert before == []


def test_repeat_until_excludes_later_ranges(client):
    body = {**WEEKLY, "repeat_until": "2026-11-02"}
    created = client.post("/api/events", json=body).get_json()
    inside = client.get("/api/events?start=2026-11-02&end=2026-11-08").get_json()
    outside = client.get("/api/events?start=2026-11-09&end=2026-11-15").get_json()
    assert [event["id"] for event in inside] == [created["id"]]
    assert outside == []


def test_non_repeating_event_is_not_returned_for_later_ranges(client):
    client.post("/api/events", json=VALID)
    assert client.get("/api/events?start=2026-11-09&end=2026-11-15").get_json() == []


def test_bad_day_code_is_rejected(client):
    assert client.post("/api/events", json={**VALID, "repeat_days": ["funday"]}).status_code == 400


def test_repeat_until_before_start_is_rejected(client):
    response = client.post("/api/events", json={**WEEKLY, "repeat_until": "2026-10-19"})
    assert response.status_code == 400
    event = client.post("/api/events", json=WEEKLY).get_json()
    patched = client.patch(f"/api/events/{event['id']}", json={"repeat_until": "2026-10-01"})
    assert patched.status_code == 400


def test_custom_tier_needs_offsets(client):
    response = client.post("/api/events", json={**VALID, "reminder_tier": "custom"})
    assert response.status_code == 400
    ok = client.post("/api/events", json={**VALID, "reminder_tier": "custom", "custom_offsets": [5, 45]})
    assert ok.status_code == 201
    assert ok.get_json()["custom_offsets"] == [45, 5]


def test_other_tier_clears_offsets_and_reminders_can_be_off(client):
    event = client.post(
        "/api/events", json={**VALID, "reminder_tier": "custom", "custom_offsets": [30]}
    ).get_json()
    patched = client.patch(
        f"/api/events/{event['id']}", json={"reminder_tier": "many", "reminders_enabled": False}
    ).get_json()
    assert patched["custom_offsets"] == []
    assert patched["reminders_enabled"] is False
    assert client.post("/api/events", json={**VALID, "reminder_tier": "loud"}).status_code == 400
    assert client.post("/api/events", json={**VALID, "reminders_enabled": "yes"}).status_code == 400
