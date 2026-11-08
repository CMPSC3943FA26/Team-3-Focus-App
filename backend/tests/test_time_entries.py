def _create(client, **fields):
    return client.post("/api/time-entries", json=fields)


def test_create_finished_entry(client):
    response = _create(client, started_at="2026-10-20T09:00:00", ended_at="2026-10-20T09:45:00", note="reading")
    assert response.status_code == 201
    body = response.get_json()
    assert set(body) == {"id", "task_id", "started_at", "ended_at", "note", "created_at", "updated_at"}
    assert body["note"] == "reading"


def test_create_running_entry_and_second_is_409(client):
    assert _create(client, started_at="2026-10-20T09:00:00").status_code == 201
    second = _create(client, started_at="2026-10-20T10:00:00")
    assert second.status_code == 409
    assert "already running" in second.get_json()["error"]


def test_end_before_start_is_400(client):
    response = _create(client, started_at="2026-10-20T09:00:00", ended_at="2026-10-20T08:00:00")
    assert response.status_code == 400


def test_unknown_task_is_400(client):
    assert _create(client, started_at="2026-10-20T09:00:00", task_id=99).status_code == 400


def test_date_filter_includes_entry_crossing_midnight_on_both_days(client):
    _create(client, started_at="2026-10-20T23:30:00", ended_at="2026-10-21T00:30:00")
    _create(client, started_at="2026-10-22T09:00:00", ended_at="2026-10-22T10:00:00")
    first = client.get("/api/time-entries?date=2026-10-20").get_json()
    second = client.get("/api/time-entries?date=2026-10-21").get_json()
    other = client.get("/api/time-entries?date=2026-10-22").get_json()
    assert len(first) == 1
    assert len(second) == 1
    assert len(other) == 1
    assert client.get("/api/time-entries?date=nope").status_code == 400


def test_patch_stops_timer_and_frees_the_slot(client):
    entry = _create(client, started_at="2026-10-20T09:00:00").get_json()
    stopped = client.patch(f"/api/time-entries/{entry['id']}", json={"ended_at": "2026-10-20T09:30:00"})
    assert stopped.status_code == 200
    assert stopped.get_json()["ended_at"] == "2026-10-20T09:30:00"
    assert _create(client, started_at="2026-10-20T10:00:00").status_code == 201


def test_patch_can_keep_the_same_running_entry_running(client):
    entry = _create(client, started_at="2026-10-20T09:00:00").get_json()
    response = client.patch(f"/api/time-entries/{entry['id']}", json={"note": "still going"})
    assert response.status_code == 200


def test_delete_then_404(client):
    entry = _create(client, started_at="2026-10-20T09:00:00", ended_at="2026-10-20T09:10:00").get_json()
    assert client.delete(f"/api/time-entries/{entry['id']}").status_code == 204
    assert client.delete(f"/api/time-entries/{entry['id']}").status_code == 404
    assert client.patch(f"/api/time-entries/{entry['id']}", json={"note": "x"}).status_code == 404
