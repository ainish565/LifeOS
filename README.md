# Life OS

**Personal Productivity Operating System**

A personal workspace for tasks, calendar, habits, goals, study, finances, notes and analytics, with a **React + Vite** frontend and a **Flask REST API** backend.

---

## Current Phase

**Phase 2 — Authentication & User Accounts** — registration, login/logout, protected routes and a profile menu, on top of the Phase 1 app shell (dashboard with mock widgets, theming, placeholder pages for upcoming modules).

---

## Tech Stack

| Layer      | Technology                                       |
|------------|--------------------------------------------------|
| Backend    | Python 3, Flask 3, Flask-SQLAlchemy, Flask-CORS  |
| Auth       | Flask signed-cookie sessions, Werkzeug password hashing (scrypt) |
| Database   | SQLite (`instance/lifeos.db`)                    |
| Frontend   | React 19 + Vite                                  |
| Routing    | React Router (client-side SPA)                   |
| Data       | TanStack Query (wired up for upcoming phases)    |
| Animations | Framer Motion                                    |
| Styling    | CSS Modules + CSS custom properties              |
| Fonts      | Plus Jakarta Sans (display), Inter (body), JetBrains Mono |

---

## Features

### Authentication (Phase 2)

- **Register / log in / log out** with server-side validation (plus matching instant checks in the browser).
- **Passwords** are hashed with Werkzeug (scrypt) — plaintext is never stored, and hashes are never returned by the API.
- **Duplicate emails** are rejected (case-insensitive, also enforced by a unique index).
- **Protected app** — every page except `/login` and `/register` requires a session; logged-out visitors are sent to login and returned to the page they wanted afterwards.
- **Sessions** use a signed, `HttpOnly`, `SameSite=Lax` cookie that lasts 7 days (renewed on each visit). Logging in starts a fresh session (no session fixation), and auth endpoints only accept JSON bodies (blocks cross-site form posts).
- **Your account in the shell** — name and initials in the sidebar and top bar, a greeting on the dashboard, and a profile dropdown with **Profile**, **Settings** and **Logout**.

### App shell (Phase 1)

- **6 colour themes × light/dark mode** — Lavender, Sage, Sky, Rose, Terracotta, Indigo. Saved in `localStorage`, follows your OS light/dark preference on first visit, applied before first paint (no flash).
- **Dashboard** — hero summary, stat cards, interactive "Today's Focus" habits, and a quick-create modal (task, note, expense, goal) with toast feedback.
- **Search / command palette** — `Ctrl + K` (or `⌘ + K` on Mac) or the search button: jump to any page or toggle dark mode.
- **Responsive shell** — collapsible sidebar (remembered), slide-in mobile nav, `Esc` closes dialogs and the mobile menu.
- **Accessible & motion-aware** — keyboard-operable controls, labelled forms, respects *reduced motion*.
- Placeholder pages for every upcoming module, plus a 404 page.

---

## Project Structure

```
Life OS/
├── backend/                # Flask REST API
│   ├── app.py              # App factory; also serves ../frontend/dist if built
│   ├── config.py           # Config classes (dev/prod/testing) + session cookie settings
│   ├── extensions.py       # Shared SQLAlchemy instance
│   ├── requirements.txt    # Python dependencies (requirements-dev.txt adds pytest)
│   ├── validate.py         # API smoke tests
│   ├── models/user.py      # User model (password hashing, safe to_dict)
│   ├── services/auth_service.py  # Validation, registration, credential checks
│   ├── middleware/auth.py  # Session helpers + @login_required
│   ├── routes/auth.py      # /api/auth/* (register, login, logout, me)
│   ├── routes/main.py      # /api/* (dashboard, modules) — login required
│   ├── tests/              # pytest suite for authentication
│   ├── instance/           # lifeos.db + dev secret_key (auto-created, not committed)
│   └── venv/               # Python virtual environment (local, not committed)
│
└── frontend/               # React + Vite SPA
    ├── index.html          # Pre-paint theme script, fonts, favicon
    ├── vite.config.js      # Dev server :5173, proxies /api → Flask :5000
    └── src/
        ├── main.jsx        # React root (Router + React Query)
        ├── App.jsx         # App shell, routes, global shortcuts
        ├── api/client.js   # fetch wrapper for the Flask API
        ├── context/        # ThemeContext, AuthContext (current user, login/logout)
        ├── styles/globals.css          # Design tokens for every theme/mode
        ├── utils/          # Initials, safe redirects, auth form validation
        ├── components/
        │   ├── auth/       # Route guards, login/register layout
        │   ├── layout/     # Sidebar, Topbar, ProfileMenu
        │   └── ui/         # StatCard, QuickCreateModal, Toast, CommandPalette
        └── pages/          # Login, Register, Profile, Dashboard, Settings, Placeholder, NotFound
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** (tested with 3.14)
- **Node.js 20.19+ or 22.12+** (tested with 24)

### 1. One-time setup

From the project root, in PowerShell:

```powershell
# Python backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cd ..

# React frontend
cd frontend
npm install
cd ..
```

> If PowerShell blocks `Activate.ps1`, run
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or skip activation
> and call `.\venv\Scripts\python` directly.

### 2a. Development mode (hot reload) — two terminals

**Terminal 1 — Flask API**

```powershell
cd backend
.\venv\Scripts\python app.py         # http://127.0.0.1:5000
```

**Terminal 2 — React dev server**

```powershell
cd frontend
npm run dev                          # http://localhost:5173
```

Open **http://localhost:5173**. Vite proxies `/api/*` to Flask on port 5000.
You'll land on the login page — click **Create an account** to register your first user.

### 2b. Single-server mode — one terminal

Build the frontend once, then Flask serves the whole app:

```powershell
cd frontend
npm run build
cd ..\backend
.\venv\Scripts\python app.py
```

Open **http://127.0.0.1:5000**. Re-run `npm run build` after changing frontend code.

### 3. Checks

```powershell
cd backend
.\venv\Scripts\python -m pip install -r requirements-dev.txt   # once: adds pytest
.\venv\Scripts\python -m pytest      # authentication test suite
.\venv\Scripts\python validate.py    # API smoke tests
cd ..\frontend
npm run lint                         # oxlint
```

Both use an in-memory database, so they never touch your real data.

### Production notes

- Set a long random `SECRET_KEY` environment variable — the app refuses to start in production without one. (In development a key is generated once and stored in `backend/instance/secret_key`.)
- Serve over HTTPS; the production config marks the session cookie `Secure`.

---

## API Endpoints

| Method | Endpoint             | Login | Description                                   |
|--------|----------------------|-------|-----------------------------------------------|
| POST   | `/api/auth/register` |       | Create account `{name, email, password, confirm_password}` and log in |
| POST   | `/api/auth/login`    |       | Log in `{email, password}`                    |
| POST   | `/api/auth/logout`   | Yes   | End the session                               |
| GET    | `/api/auth/me`       |       | Current user, or `{"user": null}`             |
| GET    | `/api/health`        |       | Health check                                  |
| GET    | `/api/dashboard`     | Yes   | Mock dashboard data (stats, tasks, events, habits) |
| GET    | `/api/module/<slug>` | Yes   | Module "coming soon" info (404 for unknown)   |

Protected endpoints return `401` when not logged in. Validation errors return `400` with
`{"error": "...", "errors": {"field": "message"}}`; an email that is already registered returns `409`.
Unknown `/api/*` routes return a JSON `404`.

---

## Development Roadmap

| Phase | Focus                              | Status        |
|-------|------------------------------------|---------------|
| 1     | Foundation + React migration       | Complete      |
| 2     | Authentication & User Accounts     | Complete      |
| 3     | Tasks Module (full CRUD)           | Planned       |
| 4     | Calendar Module                    | Planned       |
| 5     | Expenses & Budget Tracker          | Planned       |
| 6     | Notes Module                       | Planned       |
| 7     | Goals & Habits                     | Planned       |
| 8     | Study Tracker                      | Planned       |
| 9     | Analytics & Insights               | Planned       |
| 10    | Mobile PWA & Settings              | Planned       |
