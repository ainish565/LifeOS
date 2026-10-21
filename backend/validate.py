# validate.py — Life OS API & Backend validation script.
# Run from backend/ with: venv/Scripts/python validate.py
# Uses an in-memory test database, so your real data is never touched.
# Full auth test suite: venv/Scripts/python -m pytest

import os
from app import create_app

app = create_app("testing")
client = app.test_client()

all_pass = True


def check(label, ok):
    global all_pass
    all_pass = all_pass and ok
    print(f"[{'PASS' if ok else 'FAIL'}] {label}")


def check_get(endpoint, expected_status):
    r = client.get(endpoint)
    check(f"GET {endpoint} -> {r.status_code} (expected {expected_status})", r.status_code == expected_status)


modules = ["tasks", "calendar", "goals", "habits", "study", "expenses", "notes", "analytics", "settings"]

print("=== Life OS API Validation ===")

print("-- Logged out")
check_get("/api/health", 200)
check_get("/api/auth/me", 200)
check_get("/api/dashboard", 401)
check_get("/api/module/tasks", 401)

print("-- Register + logged in")
r = client.post("/api/auth/register", json={
    "name": "Validate User",
    "email": "validate@example.com",
    "password": "Validate123",
    "confirm_password": "Validate123",
})
check(f"POST /api/auth/register -> {r.status_code} (expected 201)", r.status_code == 201)
check_get("/api/dashboard", 200)
for module in modules:
    check_get(f"/api/module/{module}", 200)
check_get("/api/module/nonexistent", 404)

print("-- Logged out again")
r = client.post("/api/auth/logout", json={})
check(f"POST /api/auth/logout -> {r.status_code} (expected 200)", r.status_code == 200)
check_get("/api/dashboard", 401)

# The real development database lives next to this file
create_app("development")
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "lifeos.db")
check(f"SQLite DB at instance/lifeos.db: {os.path.exists(db_path)}", os.path.exists(db_path))

print()
print("=== Result:", "ALL PASS" if all_pass else "SOME FAILURES", "===")
