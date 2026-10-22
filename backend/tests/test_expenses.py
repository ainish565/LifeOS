"""
tests/test_expenses.py — Full test suite for the Expense Tracker API.

Covers:
- Authentication enforcement
- CRUD (create, read, update, delete)
- Validation (amount, category, date)
- User isolation (no cross-user access)
- Statistics (today / week / month / total)
- Budget (set, update, remaining calculation)
- Sorting and filtering
"""

from datetime import date, timedelta
from conftest import PASSWORD


# ── Helpers ─────────────────────────────────────────────────────────────── #

def register_as(client, name, email):
    client.post("/api/auth/logout", json={})
    r = client.post("/api/auth/register", json={
        "name": name, "email": email,
        "password": PASSWORD, "confirm_password": PASSWORD,
    })
    assert r.status_code == 201
    return r.get_json()["user"]


def login_as(client, email):
    client.post("/api/auth/logout", json={})
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200


def create_expense(client, **kwargs):
    payload = {
        "amount":       100,
        "category":     "Food",
        "description":  "Test expense",
        "expense_date": date.today().isoformat(),
    }
    payload.update(kwargs)
    r = client.post("/api/expenses/", json=payload)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


# ── Auth enforcement ─────────────────────────────────────────────────────── #

def test_expenses_require_auth(client):
    assert client.get("/api/expenses/").status_code == 401
    assert client.post("/api/expenses/", json={"amount": 100}).status_code == 401
    assert client.get("/api/expenses/stats").status_code == 401
    assert client.get("/api/expenses/chart").status_code == 401
    assert client.get("/api/expenses/budget").status_code == 401
    assert client.put("/api/expenses/budget", json={"amount": 5000}).status_code == 401
    assert client.get("/api/expenses/1").status_code == 401
    assert client.put("/api/expenses/1", json={"amount": 100}).status_code == 401
    assert client.patch("/api/expenses/1", json={"amount": 100}).status_code == 401
    assert client.delete("/api/expenses/1").status_code == 401


# ── Create validations ───────────────────────────────────────────────────── #

def test_create_expense_validations(client):
    register_as(client, "ValUser", "val@example.com")

    # Missing amount
    r = client.post("/api/expenses/", json={"category": "Food"})
    assert r.status_code == 400
    assert "amount" in r.get_json()["error"]

    # Zero amount
    r = client.post("/api/expenses/", json={"amount": 0, "category": "Food"})
    assert r.status_code == 400

    # Negative amount
    r = client.post("/api/expenses/", json={"amount": -50, "category": "Food"})
    assert r.status_code == 400

    # Invalid category
    r = client.post("/api/expenses/", json={"amount": 100, "category": "Gaming"})
    assert r.status_code == 400
    assert "category must be one of" in r.get_json()["error"]

    # Invalid date
    r = client.post("/api/expenses/", json={"amount": 100, "category": "Food", "expense_date": "not-a-date"})
    assert r.status_code == 400
    assert "expense_date" in r.get_json()["error"]

    # Description too long
    r = client.post("/api/expenses/", json={"amount": 100, "category": "Food", "description": "x" * 256})
    assert r.status_code == 400

    # Valid creation — default date
    r = client.post("/api/expenses/", json={"amount": 250, "category": "Travel"})
    assert r.status_code == 201
    exp = r.get_json()
    assert exp["amount"] == 250.0
    assert exp["category"] == "Travel"
    assert exp["expense_date"] == date.today().isoformat()


# ── All 8 categories ─────────────────────────────────────────────────────── #

def test_all_categories_accepted(client):
    register_as(client, "CatUser2", "cat2@example.com")
    for cat in ["Food", "Travel", "Shopping", "Education", "Entertainment", "Bills", "Health", "Other"]:
        r = client.post("/api/expenses/", json={"amount": 10, "category": cat})
        assert r.status_code == 201, f"Category {cat} rejected"
        assert r.get_json()["category"] == cat


# ── Full CRUD ────────────────────────────────────────────────────────────── #

def test_create_read_update_delete(client):
    register_as(client, "CRUDUser", "crud@example.com")

    # CREATE
    exp = create_expense(client, amount=500, category="Shopping", description="Shoes")
    exp_id = exp["id"]
    assert exp["amount"] == 500.0
    assert exp["category"] == "Shopping"
    assert exp["description"] == "Shoes"
    assert exp["user_id"] is not None

    # READ single
    r = client.get(f"/api/expenses/{exp_id}")
    assert r.status_code == 200
    assert r.get_json()["id"] == exp_id

    # READ list
    r = client.get("/api/expenses/")
    assert r.status_code == 200
    assert any(e["id"] == exp_id for e in r.get_json())

    # PUT (full update)
    r = client.put(f"/api/expenses/{exp_id}", json={
        "amount":       750,
        "category":     "Health",
        "description":  "Gym membership",
        "expense_date": "2026-10-01",
    })
    assert r.status_code == 200
    updated = r.get_json()
    assert updated["amount"] == 750.0
    assert updated["category"] == "Health"
    assert updated["expense_date"] == "2026-10-01"

    # PATCH (partial update)
    r = client.patch(f"/api/expenses/{exp_id}", json={"amount": 800, "category": "Bills"})
    assert r.status_code == 200
    patched = r.get_json()
    assert patched["amount"] == 800.0
    assert patched["category"] == "Bills"
    assert patched["expense_date"] == "2026-10-01"  # unchanged

    # DELETE
    r = client.delete(f"/api/expenses/{exp_id}")
    assert r.status_code == 200
    assert r.get_json()["id"] == exp_id

    # Confirm gone
    assert client.get(f"/api/expenses/{exp_id}").status_code == 404


# ── User isolation ────────────────────────────────────────────────────────── #

def test_user_isolation(client):
    alice = register_as(client, "Alice Exp", "alice_exp@example.com")
    exp = create_expense(client, amount=999, category="Food", description="Alice's secret")
    exp_id = exp["id"]
    assert exp["user_id"] == alice["id"]

    # Bob logs in
    register_as(client, "Bob Exp", "bob_exp@example.com")

    # Bob's list is empty
    assert client.get("/api/expenses/").get_json() == []

    # Bob cannot read, edit, delete Alice's expense
    assert client.get(f"/api/expenses/{exp_id}").status_code == 404
    assert client.put(f"/api/expenses/{exp_id}", json={"amount": 1, "category": "Other"}).status_code == 404
    assert client.patch(f"/api/expenses/{exp_id}", json={"amount": 1}).status_code == 404
    assert client.delete(f"/api/expenses/{exp_id}").status_code == 404

    # Spoofed user_id on create is ignored
    r = client.post("/api/expenses/", json={
        "amount": 200, "category": "Travel", "user_id": alice["id"]
    })
    assert r.status_code == 201
    bob_exp = r.get_json()
    assert bob_exp["user_id"] != alice["id"]


# ── Statistics ────────────────────────────────────────────────────────────── #

def test_statistics(client):
    register_as(client, "StatsUser", "stats@example.com")
    today = date.today()

    # Today
    create_expense(client, amount=100, expense_date=today.isoformat())
    create_expense(client, amount=50,  expense_date=today.isoformat())

    # This week but not today
    last_monday = today - timedelta(days=today.weekday())
    other_day = last_monday if last_monday != today else today - timedelta(days=1)
    create_expense(client, amount=200, expense_date=other_day.isoformat())

    # Last month — outside this month window
    first_of_last_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    create_expense(client, amount=999, expense_date=first_of_last_month.isoformat())

    r = client.get("/api/expenses/stats")
    assert r.status_code == 200
    stats = r.get_json()

    assert stats["today"] == 150.0
    assert stats["month"] >= 150.0           # today expenses included
    assert stats["total"] >= 150.0 + 999.0   # includes last-month expense

    # Week total should include today + other_day (if in current week)
    if other_day >= last_monday and other_day <= today:
        assert stats["week"] >= 150.0


# ── Budget ────────────────────────────────────────────────────────────────── #

def test_budget_set_and_remaining(client):
    register_as(client, "BudgetUser", "budget@example.com")
    today = date.today()
    month = today.strftime("%Y-%m")

    # No budget yet
    r = client.get(f"/api/expenses/budget?month={month}")
    assert r.status_code == 200
    assert r.get_json()["amount"] is None

    # Set budget
    r = client.put("/api/expenses/budget", json={"month": month, "amount": 5000})
    assert r.status_code == 200
    assert r.get_json()["amount"] == 5000.0

    # Update budget
    r = client.put("/api/expenses/budget", json={"month": month, "amount": 8000})
    assert r.status_code == 200
    assert r.get_json()["amount"] == 8000.0

    # Add some spending
    create_expense(client, amount=2000, expense_date=today.isoformat())
    create_expense(client, amount=1000, expense_date=today.isoformat())

    # Check stats reflect budget remaining
    stats = client.get("/api/expenses/stats").get_json()
    assert stats["budget_amount"] == 8000.0
    assert stats["budget_remaining"] == 5000.0   # 8000 - 3000

    # Invalid budget amount
    r = client.put("/api/expenses/budget", json={"amount": -1})
    assert r.status_code == 400

    # Invalid month format
    r = client.put("/api/expenses/budget", json={"month": "invalid", "amount": 1000})
    assert r.status_code == 400


# ── Chart data ───────────────────────────────────────────────────────────── #

def test_chart_data(client):
    register_as(client, "ChartUser", "chart@example.com")
    today = date.today()
    month_this = today.strftime("%Y-%m")

    create_expense(client, amount=300, category="Food",     expense_date=today.isoformat())
    create_expense(client, amount=200, category="Travel",   expense_date=today.isoformat())
    create_expense(client, amount=500, category="Shopping", expense_date=today.isoformat())

    r = client.get("/api/expenses/chart")
    assert r.status_code == 200
    data = r.get_json()

    assert "by_category" in data
    assert "over_time" in data

    # by_category should have 3 entries
    assert len(data["by_category"]) == 3
    cats = {row["category"]: row["amount"] for row in data["by_category"]}
    assert cats["Food"] == 300.0
    assert cats["Travel"] == 200.0
    assert cats["Shopping"] == 500.0

    # over_time should have 30 entries
    assert len(data["over_time"]) == 30
    today_entry = next(
        (d for d in data["over_time"] if d["date"] == today.isoformat()), None
    )
    assert today_entry is not None
    assert today_entry["amount"] == 1000.0


# ── Filtering and sorting ────────────────────────────────────────────────── #

def test_filtering_and_sorting(client):
    register_as(client, "FilterUser", "filter@example.com")
    today = date.today()
    yesterday = (today - timedelta(days=1)).isoformat()

    create_expense(client, amount=100, category="Food",    expense_date=today.isoformat(),     description="Pizza")
    create_expense(client, amount=300, category="Travel",  expense_date=today.isoformat(),     description="Bus ticket")
    create_expense(client, amount=50,  category="Food",    expense_date=yesterday,              description="Coffee")

    # Filter by category
    r = client.get("/api/expenses/?category=Food")
    food = r.get_json()
    assert len(food) == 2
    assert all(e["category"] == "Food" for e in food)

    # Filter by period=today
    r = client.get("/api/expenses/?period=today")
    today_items = r.get_json()
    assert len(today_items) == 2

    # Filter by date_from / date_to
    r = client.get(f"/api/expenses/?date_from={today.isoformat()}&date_to={today.isoformat()}")
    assert len(r.get_json()) == 2

    # Search
    r = client.get("/api/expenses/?search=coffee")
    result = r.get_json()
    assert len(result) == 1
    assert result[0]["description"] == "Coffee"

    # Sort by amount_desc
    r = client.get("/api/expenses/?sort=amount_desc")
    sorted_desc = r.get_json()
    amounts = [e["amount"] for e in sorted_desc]
    assert amounts == sorted(amounts, reverse=True)

    # Sort by amount_asc
    r = client.get("/api/expenses/?sort=amount_asc")
    sorted_asc = r.get_json()
    amounts = [e["amount"] for e in sorted_asc]
    assert amounts == sorted(amounts)


# ── Dashboard expense integration ────────────────────────────────────────── #

def test_dashboard_expense_stats(client):
    register_as(client, "DashExpUser", "dashexp@example.com")
    today = date.today()
    month = today.strftime("%Y-%m")

    # Set budget
    client.put("/api/expenses/budget", json={"month": month, "amount": 10000})

    # Add expenses
    create_expense(client, amount=500, expense_date=today.isoformat())
    create_expense(client, amount=1500, expense_date=today.isoformat())

    r = client.get("/api/dashboard")
    assert r.status_code == 200
    dash = r.get_json()

    assert "expense_stats" in dash
    stats = dash["expense_stats"]
    assert stats["today"] == 2000.0
    assert stats["month"] == 2000.0
    assert stats["budget_amount"] == 10000.0
    assert stats["budget_remaining"] == 8000.0
    assert stats["budget_pct"] == 20
