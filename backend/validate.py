# validate.py — Life OS API & Backend validation script.
# Run from backend/ with: venv/Scripts/python validate.py

import os
from app import create_app

app = create_app("development")
client = app.test_client()

api_endpoints = [
    ("/api/health", 200),
    ("/api/dashboard", 200),
    ("/api/module/tasks", 200),
    ("/api/module/calendar", 200),
    ("/api/module/goals", 200),
    ("/api/module/habits", 200),
    ("/api/module/study", 200),
    ("/api/module/expenses", 200),
    ("/api/module/notes", 200),
    ("/api/module/analytics", 200),
    ("/api/module/settings", 200),
    ("/api/module/nonexistent", 404),
]

print("=== Life OS API Validation ===")
all_pass = True

for endpoint, expected_status in api_endpoints:
    r = client.get(endpoint)
    ok = r.status_code == expected_status
    if not ok:
        all_pass = False
    label = "PASS" if ok else "FAIL"
    print(f"[{label}] GET {endpoint} -> {r.status_code} (expected {expected_status})")

# Check DB exists
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "lifeos.db")
db_ok = os.path.exists(db_path)
if not db_ok:
    all_pass = False
label = "PASS" if db_ok else "FAIL"
print(f"[{label}] SQLite DB at instance/lifeos.db: {db_ok}")

print()
print("=== Result:", "ALL PASS" if all_pass else "SOME FAILURES", "===")
