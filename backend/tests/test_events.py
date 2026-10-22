"""
Tests for Event and Calendar API.
Validates authentication, authorization, CRUD, category constraints,
calendar integration with tasks, and user scoping.
"""

from datetime import date, timedelta
from conftest import PASSWORD


def register_as(client, name, email):
    client.post("/api/auth/logout", json={})
    r = client.post("/api/auth/register", json={
        "name": name, "email": email, "password": PASSWORD, "confirm_password": PASSWORD,
    })
    assert r.status_code == 201
    return r.get_json()["user"]


def login_as(client, email):
    client.post("/api/auth/logout", json={})
    assert client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200


def test_events_api_requires_login(client):
    assert client.get("/api/events/").status_code == 401
    assert client.get("/api/events/calendar").status_code == 401
    assert client.post("/api/events/", json={"title": "Test"}).status_code == 401
    assert client.get("/api/events/1").status_code == 401
    assert client.patch("/api/events/1", json={"title": "Test"}).status_code == 401
    assert client.delete("/api/events/1").status_code == 401


def test_create_event_validations(client):
    register_as(client, "EventUser", "eventuser@example.com")

    # Missing title
    r = client.post("/api/events/", json={"event_date": "2026-10-25"})
    assert r.status_code == 400
    assert "title is required" in r.get_json()["error"]

    # Missing event_date
    r = client.post("/api/events/", json={"title": "Team Sync"})
    assert r.status_code == 400
    assert "event_date is required" in r.get_json()["error"]

    # Invalid event_date format
    r = client.post("/api/events/", json={"title": "Team Sync", "event_date": "not-a-date"})
    assert r.status_code == 400

    # Invalid category
    r = client.post("/api/events/", json={"title": "Team Sync", "event_date": "2026-10-25", "category": "InvalidCat"})
    assert r.status_code == 400
    assert "category must be one of" in r.get_json()["error"]

    # Invalid time format
    r = client.post("/api/events/", json={"title": "Team Sync", "event_date": "2026-10-25", "start_time": "25:99"})
    assert r.status_code == 400

    # Valid event
    r = client.post("/api/events/", json={
        "title": "Strategy Meeting",
        "description": "Discuss Q4 objectives",
        "event_date": "2026-10-25",
        "start_time": "14:30",
        "end_time": "15:30",
        "category": "Meeting",
    })
    assert r.status_code == 201
    ev = r.get_json()
    assert ev["title"] == "Strategy Meeting"
    assert ev["description"] == "Discuss Q4 objectives"
    assert ev["event_date"] == "2026-10-25"
    assert ev["start_time"] == "14:30"
    assert ev["end_time"] == "15:30"
    assert ev["category"] == "Meeting"


def test_allowed_categories(client):
    register_as(client, "CatUser", "catuser@example.com")
    categories = ["Study", "Personal", "Work", "Meeting", "Birthday", "Other"]

    for cat in categories:
        r = client.post("/api/events/", json={
            "title": f"Test {cat}",
            "event_date": "2026-11-01",
            "category": cat,
        })
        assert r.status_code == 201
        assert r.get_json()["category"] == cat


def test_event_isolation_and_ownership(client):
    alice = register_as(client, "Alice", "alice_ev@example.com")
    r = client.post("/api/events/", json={
        "title": "Alice's Secret Event",
        "event_date": "2026-10-28",
        "category": "Personal",
    })
    assert r.status_code == 201
    alice_event = r.get_json()
    assert alice_event["user_id"] == alice["id"]

    bob = register_as(client, "Bob", "bob_ev@example.com")
    assert client.get("/api/events/").get_json() == []

    # Bob cannot access, edit, or delete Alice's event
    assert client.get(f"/api/events/{alice_event['id']}").status_code == 404
    assert client.patch(f"/api/events/{alice_event['id']}", json={"title": "Hacked"}).status_code == 404
    assert client.delete(f"/api/events/{alice_event['id']}").status_code == 404

    # Bob's event belongs to Bob even if spoofed user_id is sent
    r = client.post("/api/events/", json={
        "title": "Bob's Event",
        "event_date": "2026-10-28",
        "user_id": alice["id"],
    })
    assert r.status_code == 201
    assert r.get_json()["user_id"] == bob["id"]


def test_edit_and_delete_event(client):
    register_as(client, "EditUser", "edituser@example.com")
    r = client.post("/api/events/", json={
        "title": "Initial Title",
        "event_date": "2026-10-22",
        "category": "Work",
    })
    ev_id = r.get_json()["id"]

    # Edit event
    r = client.patch(f"/api/events/{ev_id}", json={
        "title": "Updated Title",
        "start_time": "09:00",
        "category": "Study",
    })
    assert r.status_code == 200
    updated = r.get_json()
    assert updated["title"] == "Updated Title"
    assert updated["start_time"] == "09:00"
    assert updated["category"] == "Study"

    # Delete event
    r = client.delete(f"/api/events/{ev_id}")
    assert r.status_code == 200
    assert client.get(f"/api/events/{ev_id}").status_code == 404


def test_calendar_feed_with_tasks_deadlines(client):
    register_as(client, "CalendarUser", "caluser@example.com")

    # Create an event in Oct 2026
    r_ev = client.post("/api/events/", json={
        "title": "Project Sprint Review",
        "event_date": "2026-10-24",
        "category": "Work",
        "start_time": "11:00",
    })
    assert r_ev.status_code == 201

    # Create a task with due date in Oct 2026
    r_tk = client.post("/api/tasks/", json={
        "title": "Submit Financial Report",
        "due_date": "2026-10-24",
        "priority": "High",
    })
    assert r_tk.status_code == 201

    # Query calendar feed for 2026-10
    feed = client.get("/api/events/calendar?month=2026-10").get_json()
    assert len(feed["events"]) >= 1
    assert any(e["title"] == "Project Sprint Review" for e in feed["events"])

    assert len(feed["deadlines"]) >= 1
    deadline = next(d for d in feed["deadlines"] if d["title"] == "Submit Financial Report")
    assert deadline["due_date"] == "2026-10-24"
    assert deadline["priority"] == "High"
    assert deadline["type"] == "deadline"


def test_dashboard_today_events_and_tasks(client):
    register_as(client, "DashUser", "dashuser@example.com")
    today_str = date.today().isoformat()
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()

    # Create today's event
    client.post("/api/events/", json={
        "title": "Today's Keynote",
        "event_date": today_str,
        "start_time": "10:00",
        "category": "Meeting",
    })

    # Create upcoming event
    client.post("/api/events/", json={
        "title": "Tomorrow's Workshop",
        "event_date": tomorrow_str,
        "start_time": "15:00",
        "category": "Study",
    })

    # Create today's task
    client.post("/api/tasks/", json={
        "title": "Finish Slide Deck",
        "due_date": today_str,
        "priority": "Urgent",
    })

    # Get dashboard
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    dash = r.get_json()

    assert any(e["title"] == "Today's Keynote" for e in dash["today_events"])
    assert any(e["title"] == "Tomorrow's Workshop" for e in dash["upcoming_events"])
    assert any(t["title"] == "Finish Slide Deck" for t in dash["today_tasks"])
