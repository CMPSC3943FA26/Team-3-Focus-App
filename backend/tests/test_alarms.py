CONTRACT_KEYS = {
    "id", "time", "label", "is_active", "repeat_days", "sound_file", "snooze_duration",
    "frequency_tier", "custom_offsets", "event_id", "created_at", "updated_at",
}

VALID = {"time": "07:30", "label": "Class", "repeat_days": ["wed", "mon"], "frequency_tier": "some"}


def test_health_still_works(client):
    assert client.get("/api/health").status_code == 200


def test_create_matches_contract(client):
    response = client.post("/api/alarms", json=VALID)
    assert response.status_code == 201
    body = response.get_json()
    assert set(body) == CONTRACT_KEYS
    assert body["time"] == "07:30"
    assert body["repeat_days"] == ["mon", "wed"]
    assert body["custom_offsets"] == []
    assert body["is_active"] is True


def test_get_and_list(client):
    first = client.post("/api/alarms", json=VALID).get_json()
    client.post("/api/alarms", json={**VALID, "label": "Gym"})
    assert client.get(f"/api/alarms/{first['id']}").status_code == 200
    assert len(client.get("/api/alarms").get_json()) == 2


def test_toggle_off(client):
    alarm = client.post("/api/alarms", json=VALID).get_json()
    response = client.patch(f"/api/alarms/{alarm['id']}", json={"is_active": False})
    assert response.status_code == 200
    assert response.get_json()["is_active"] is False


def test_custom_offsets(client):
    response = client.post("/api/alarms", json={**VALID, "frequency_tier": "custom", "custom_offsets": [5, 45, 20]})
    assert response.status_code == 201
    assert response.get_json()["custom_offsets"] == [45, 20, 5]


def test_custom_without_offsets_is_rejected(client):
    assert client.post("/api/alarms", json={**VALID, "frequency_tier": "custom"}).status_code == 400


def test_bad_tier_is_rejected(client):
    assert client.post("/api/alarms", json={**VALID, "frequency_tier": "loud"}).status_code == 400


def test_bad_time_is_rejected(client):
    assert client.post("/api/alarms", json={**VALID, "time": "25:00"}).status_code == 400


def test_delete_then_missing(client):
    alarm = client.post("/api/alarms", json=VALID).get_json()
    assert client.delete(f"/api/alarms/{alarm['id']}").status_code == 204
    assert client.get(f"/api/alarms/{alarm['id']}").status_code == 404
