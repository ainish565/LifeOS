"""Authentication tests — run from backend/ with: venv/Scripts/python -m pytest"""

from conftest import PASSWORD
from extensions import db
from models import User

SESSION_COOKIE = "lifeos_session"


def login(client, email="ada@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


# --------------------------------------------------------------------------- #
# Registration
# --------------------------------------------------------------------------- #
def test_register_creates_user_and_logs_in(client, register, app):
    r = register()
    assert r.status_code == 201
    assert r.get_json()["user"]["email"] == "ada@example.com"
    assert r.get_json()["user"]["name"] == "Ada Lovelace"

    # Registration starts a session
    assert client.get("/api/auth/me").get_json()["user"]["email"] == "ada@example.com"

    with app.app_context():
        user = db.session.execute(db.select(User)).scalar_one()
        assert user.password_hash != PASSWORD
        assert PASSWORD not in user.password_hash
        assert user.check_password(PASSWORD)
        assert user.created_at is not None


def test_register_normalizes_input(client, register):
    r = register(name="  Ada   Lovelace ", email="  Ada@Example.COM ")
    assert r.status_code == 201
    user = r.get_json()["user"]
    assert user["name"] == "Ada Lovelace"
    assert user["email"] == "ada@example.com"


def test_register_validation_errors(client, register):
    r = client.post("/api/auth/register", json={})
    assert r.status_code == 400
    assert set(r.get_json()["errors"]) == {"name", "email", "password", "confirm_password"}

    cases = [
        ({"email": "not-an-email"}, "email"),
        ({"password": "short1"}, "password"),
        ({"password": "lettersonly"}, "password"),
        ({"password": "12345678"}, "password"),
        ({"password": "x1" * 70}, "password"),
        ({"confirm": "Different123"}, "confirm_password"),
        ({"name": "x" * 81}, "name"),
    ]
    for overrides, field in cases:
        r = register(**overrides)
        assert r.status_code == 400, overrides
        assert field in r.get_json()["errors"], overrides


def test_register_rejects_non_string_values(client):
    r = client.post("/api/auth/register", json={
        "name": ["Ada"], "email": {"a": 1}, "password": 12345678, "confirm_password": None,
    })
    assert r.status_code == 400


def test_duplicate_email_rejected_case_insensitively(client, register):
    assert register().status_code == 201
    client.post("/api/auth/logout", json={})

    r = register(name="Someone Else", email="ADA@example.com")
    assert r.status_code == 409
    assert "email" in r.get_json()["errors"]


# --------------------------------------------------------------------------- #
# Login / logout
# --------------------------------------------------------------------------- #
def test_login_success(client, register):
    register()
    client.post("/api/auth/logout", json={})

    r = login(client, email="ADA@example.com")
    assert r.status_code == 200
    assert r.get_json()["user"]["email"] == "ada@example.com"
    assert client.get("/api/auth/me").get_json()["user"] is not None


def test_invalid_credentials_get_the_same_generic_error(client, register):
    register()
    client.post("/api/auth/logout", json={})

    wrong_password = login(client, password="Wrong12345")
    unknown_email = login(client, email="nobody@example.com")
    for r in (wrong_password, unknown_email):
        assert r.status_code == 401
        assert r.get_json() == {"error": "Invalid email or password."}
    assert client.get("/api/auth/me").get_json()["user"] is None


def test_login_validation(client):
    r = client.post("/api/auth/login", json={"email": "", "password": ""})
    assert r.status_code == 400
    assert set(r.get_json()["errors"]) == {"email", "password"}


def test_logout_ends_session(client, register):
    register()
    assert client.get("/api/dashboard").status_code == 200

    r = client.post("/api/auth/logout", json={})
    assert r.status_code == 200
    assert client.get("/api/auth/me").get_json()["user"] is None
    assert client.get("/api/dashboard").status_code == 401


def test_logout_requires_login(client):
    assert client.post("/api/auth/logout", json={}).status_code == 401


# --------------------------------------------------------------------------- #
# Protected routes
# --------------------------------------------------------------------------- #
def test_protected_api_requires_login(client):
    assert client.get("/api/health").status_code == 200
    for path in ("/api/dashboard", "/api/module/tasks"):
        r = client.get(path)
        assert r.status_code == 401
        assert r.get_json()["error"] == "Authentication required."


def test_protected_api_after_login(client, register):
    register()
    assert client.get("/api/dashboard").status_code == 200
    assert client.get("/api/module/tasks").status_code == 200
    assert client.get("/api/module/nonexistent").status_code == 404


def test_session_for_deleted_user_is_rejected(client, register, app):
    register()
    with app.app_context():
        db.session.delete(db.session.execute(db.select(User)).scalar_one())
        db.session.commit()
    assert client.get("/api/dashboard").status_code == 401
    assert client.get("/api/auth/me").get_json()["user"] is None


# --------------------------------------------------------------------------- #
# Session security & persistence
# --------------------------------------------------------------------------- #
def test_session_cookie_is_secure_and_persistent(client, register):
    r = register()
    cookie = next(h for h in r.headers.getlist("Set-Cookie") if h.startswith(SESSION_COOKIE + "="))
    assert "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie
    assert "Expires=" in cookie  # permanent session, survives browser restarts


def test_session_persists_across_clients(app, client, register):
    """A new client carrying the same cookie (e.g. browser restart) stays logged in."""
    register()
    value = client.get_cookie(SESSION_COOKIE).value

    other = app.test_client()
    assert other.get("/api/dashboard").status_code == 401
    other.set_cookie(SESSION_COOKIE, value)
    assert other.get("/api/dashboard").status_code == 200
    assert other.get("/api/auth/me").get_json()["user"]["email"] == "ada@example.com"


def test_tampered_session_cookie_is_rejected(app, client, register):
    register()
    value = client.get_cookie(SESSION_COOKIE).value
    forged = app.test_client()
    forged.set_cookie(SESSION_COOKIE, value[:-2] + ("AA" if not value.endswith("AA") else "BB"))
    assert forged.get("/api/dashboard").status_code == 401


def test_login_starts_fresh_session(client, register):
    """Data placed in the session before login is discarded (session fixation)."""
    register()
    client.post("/api/auth/logout", json={})
    with client.session_transaction() as sess:
        sess["planted"] = "attacker-value"
    login(client)
    with client.session_transaction() as sess:
        assert "planted" not in sess
        assert "user_id" in sess


def test_form_posts_are_rejected(client, register):
    """Only JSON bodies are accepted, which blocks cross-site HTML form submissions."""
    register()
    client.post("/api/auth/logout", json={})
    r = client.post("/api/auth/login", data={"email": "ada@example.com", "password": PASSWORD})
    assert r.status_code == 400
    assert client.get("/api/auth/me").get_json()["user"] is None


def test_password_hash_never_exposed(client, register, app):
    responses = [register(), login(client), client.get("/api/auth/me")]
    with app.app_context():
        password_hash = db.session.execute(db.select(User)).scalar_one().password_hash
    for r in responses:
        body = r.get_data(as_text=True)
        assert "password" not in body
        assert password_hash not in body


# --------------------------------------------------------------------------- #
# Page redirects when Flask serves the built frontend
# --------------------------------------------------------------------------- #
def test_pages_redirect_to_login_when_logged_out(client, monkeypatch, tmp_path):
    import app as app_module

    (tmp_path / "index.html").write_text("<div id='root'></div>")
    monkeypatch.setattr(app_module, "FRONTEND_DIST", str(tmp_path))

    r = client.get("/settings")
    assert r.status_code == 302
    assert r.headers["Location"] == "/login?next=/settings"
    assert client.get("/").headers["Location"] == "/login"
    assert client.get("/login").status_code == 200


def test_login_page_redirects_home_when_logged_in(client, register, monkeypatch, tmp_path):
    import app as app_module

    (tmp_path / "index.html").write_text("<div id='root'></div>")
    monkeypatch.setattr(app_module, "FRONTEND_DIST", str(tmp_path))

    register()
    assert client.get("/login").headers["Location"] == "/"
    assert client.get("/settings").status_code == 200
