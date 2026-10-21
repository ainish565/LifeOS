"""
app.py — Life OS application entry point.

Creates the Flask application, initialises extensions,
registers blueprints, enables CORS, and ensures the database is ready.
If the React app has been built (../frontend/dist), Flask serves it too,
so the whole app can run from a single process on port 5000.
"""

import os

from flask import Flask, abort, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import safe_join

from config import BASE_DIR, config_map

# Shared SQLAlchemy instance — imported by models in future phases
db = SQLAlchemy()

# Production build output of the React frontend (`npm run build`), a sibling of backend/
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")


def create_app(config_name: str = "default") -> Flask:
    """Application factory — create and configure the Flask app."""

    # static_folder=None: static assets are served by the SPA route below
    app = Flask(__name__, instance_relative_config=True, static_folder=None)

    # Load configuration
    app.config.from_object(config_map[config_name])

    # Ensure the instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialize extensions
    db.init_app(app)

    # Enable CORS for all /api/* routes (allows React dev server on :5173)
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

    # Register blueprints
    from routes.main import main_bp  # noqa: PLC0415

    app.register_blueprint(main_bp)

    register_frontend(app)

    # API clients get JSON errors instead of HTML pages
    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Not found"}), 404
        return error

    # Create database tables
    with app.app_context():
        db.create_all()

    return app


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
        return send_from_directory(FRONTEND_DIST, "index.html")


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    app = create_app("development")
    app.run(debug=True, port=5000)
