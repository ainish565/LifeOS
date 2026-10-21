"""Tasks API is login-protected and scoped to each user's own tasks."""

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


def test_tasks_api_requires_login(client):
    assert client.get("/api/tasks/").status_code == 401
    assert client.get("/api/tasks/stats").status_code == 401
    assert client.post("/api/tasks/", json={"title": "x"}).status_code == 401
    assert client.patch("/api/tasks/1", json={"title": "x"}).status_code == 401
    assert client.delete("/api/tasks/1").status_code == 401


def test_users_only_see_and_change_their_own_tasks(client):
    alice = register_as(client, "Alice", "alice@example.com")
    r = client.post("/api/tasks/", json={"title": "Alice's task"})
    assert r.status_code == 201
    task = r.get_json()
    assert task["user_id"] == alice["id"]

    bob = register_as(client, "Bob", "bob@example.com")
    assert client.get("/api/tasks/").get_json() == []
    assert client.get("/api/tasks/stats").get_json()["total"] == 0
    assert client.get("/api/dashboard").get_json()["task_stats"]["total"] == 0

    # Bob can't read, edit or delete Alice's task — it looks like it doesn't exist
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404
    assert client.patch(f"/api/tasks/{task['id']}", json={"title": "hacked"}).status_code == 404
    assert client.put(f"/api/tasks/{task['id']}", json={"title": "hacked"}).status_code == 404
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 404

    # A user_id in the payload is ignored — tasks always belong to the logged-in user
    r = client.post("/api/tasks/", json={"title": "Bob's task", "user_id": alice["id"]})
    assert r.get_json()["user_id"] == bob["id"]

    login_as(client, "alice@example.com")
    titles = [t["title"] for t in client.get("/api/tasks/").get_json()]
    assert titles == ["Alice's task"]
    assert client.get("/api/dashboard").get_json()["task_stats"]["total"] == 1
