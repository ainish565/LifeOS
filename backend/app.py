"""
app.py — Life OS application entry point.

Creates the Flask application, initialises extensions,
registers blueprints, enables CORS, and ensures the database is ready.
If the React app has been built (../frontend/dist), Flask serves it too,
so the whole app can run from a single process on port 5000.
"""

import os
import secrets
from urllib.parse import quote

from flask import Flask, abort, jsonify, redirect, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import create_engine
from werkzeug.security import safe_join

from config import BASE_DIR, config_map
from extensions import db

# Production build output of the React frontend (`npm run build`), a sibling of backend/
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

# SPA pages that anonymous visitors may open
PUBLIC_PAGES = {"login", "register"}


def create_app(config_name: str = "default") -> Flask:
    """Application factory — create and configure the Flask app."""

    # static_folder=None: static assets are served by the SPA route below
    app = Flask(__name__, instance_relative_config=True, static_folder=None)

    # Load configuration
    app.config.from_object(config_map[config_name])

    # Ensure the instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)

    ensure_secret_key(app, production=config_name == "production")

    # Initialize extensions
    db.init_app(app)

    # Enable CORS for all /api/* routes (allows React dev server on :5173).
    # In development Vite proxies /api, so requests are normally same-origin anyway.
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
        supports_credentials=True,
    )

    # Register blueprints
    from routes.auth import auth_bp  # noqa: PLC0415
    from routes.main import main_bp    # noqa: PLC0415
    from routes.tasks import tasks_bp  # noqa: PLC0415

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(tasks_bp)

    register_frontend(app)

    # API clients get JSON errors instead of HTML pages
    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Not found"}), 404
        return error

    # Import all models so SQLAlchemy registers them before create_all()
    with app.app_context():
        import models  # noqa: F401, PLC0415 — registers every model (User, Task, ...)

        migration_uri = app.config.get("SQLALCHEMY_MIGRATION_URI")
        if migration_uri:
            # Neon: create tables over the direct connection, not the pooler
            engine = create_engine(migration_uri, pool_pre_ping=True)
            try:
                db.metadata.create_all(engine)
            finally:
                engine.dispose()
        else:
            db.create_all()

    return app


def ensure_secret_key(app: Flask, production: bool) -> None:
    """
    Sessions are signed with SECRET_KEY, so it must be secret and stable.
    Production must provide it via the environment; development gets a random
    key generated once and stored in instance/secret_key (git-ignored).
    """
    if app.config.get("SECRET_KEY"):
        return
    if production:
        raise RuntimeError("SECRET_KEY environment variable must be set in production.")

    key_path = os.path.join(app.instance_path, "secret_key")
    if os.path.isfile(key_path):
        with open(key_path, encoding="utf-8") as f:
            app.config["SECRET_KEY"] = f.read().strip()
    if not app.config.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = secrets.token_hex(32)
        with open(key_path, "w", encoding="utf-8") as f:
            f.write(app.config["SECRET_KEY"])


def register_frontend(app: Flask) -> None:
    """Serve the built React SPA, falling back to index.html for client-side routes."""

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path: str):
        if path.startswith("api/"):
            abort(404)

        if not os.path.isfile(os.path.join(FRONTEND_DIST, "index.html")):
            return (
                "<h3>Life OS frontend is not built.</h3>"
                "<p>Run <code>npm run build</code> inside <code>frontend/</code>, "
                "or use the Vite dev server at "
                "<a href='http://localhost:5173'>http://localhost:5173</a>.</p>",
                503,
            )

        asset = safe_join(FRONTEND_DIST, path) if path else None
        if asset and os.path.isfile(asset):
            return send_from_directory(FRONTEND_DIST, path)

        # Page request: send anonymous visitors to the login page first
        from middleware.auth import get_current_user  # noqa: PLC0415

        logged_in = get_current_user() is not None
        page = path.strip("/")
        if not logged_in and page not in PUBLIC_PAGES:
            target = "/login" if not page else f"/login?next={quote('/' + page)}"
            return redirect(target)
        if logged_in and page in PUBLIC_PAGES:
            return redirect("/")
        return send_from_directory(FRONTEND_DIST, "index.html")


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    from config import describe_database  # noqa: PLC0415

    app = create_app("development")
    # Show which database is in use (no password) — handy when switching to Neon
    print(f" * Database: {describe_database(app.config['SQLALCHEMY_DATABASE_URI'])}")
    app.run(debug=True, port=5000)
