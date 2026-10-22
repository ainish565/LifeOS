"""DATABASE_URL handling (local SQLite by default, Postgres/Neon when set)."""

from config import database_url, engine_options, load_env_files, migration_database_url

NEON = "ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


def test_defaults_to_local_sqlite(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert database_url().startswith("sqlite:///")
    assert database_url().endswith("lifeos.db")


def test_blank_value_means_sqlite(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "   ")
    assert database_url().startswith("sqlite:///")


def test_neon_url_pasted_as_is_uses_psycopg(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"postgresql://alex:s3cret@{NEON}")
    assert database_url() == f"postgresql+psycopg://alex:s3cret@{NEON}"


def test_legacy_postgres_scheme_is_converted(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"postgres://alex:s3cret@{NEON}")
    assert database_url() == f"postgresql+psycopg://alex:s3cret@{NEON}"


def test_explicit_driver_is_left_alone(monkeypatch):
    url = f"postgresql+psycopg://alex:s3cret@{NEON}"
    monkeypatch.setenv("DATABASE_URL", url)
    assert database_url() == url


def test_unpooled_url_used_for_migrations(monkeypatch):
    monkeypatch.setenv("DATABASE_URL_UNPOOLED", f"postgresql://alex:s3cret@{NEON}")
    assert migration_database_url() == f"postgresql+psycopg://alex:s3cret@{NEON}"
    monkeypatch.delenv("DATABASE_URL_UNPOOLED")
    assert migration_database_url() is None


def test_pooled_connection_disables_prepared_statements():
    pooled = "postgresql+psycopg://u:p@ep-x-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb"
    direct = "postgresql+psycopg://u:p@ep-x.c-4.ap-southeast-1.aws.neon.tech/neondb"
    assert engine_options(pooled)["connect_args"] == {"prepare_threshold": None}
    assert "connect_args" not in engine_options(direct)
    assert "connect_args" not in engine_options("sqlite://")
    assert engine_options(direct)["pool_pre_ping"] is True


def test_blank_value_in_one_env_file_does_not_hide_a_later_real_value(tmp_path, monkeypatch):
    """A leftover 'DATABASE_URL=' in backend/.env must not switch the app away from Neon."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    blank = tmp_path / "backend.env"
    blank.write_text("DATABASE_URL=\n")
    real = tmp_path / "env.local"
    real.write_text("DATABASE_URL=postgresql://u:p@ep-x.neon.tech/neondb\n")
    load_env_files([str(blank), str(real)])
    assert database_url().startswith("postgresql+psycopg://u:p@ep-x.neon.tech")


def test_env_file_priority_and_real_environment_wins(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    first = tmp_path / "first.env"
    first.write_text("DATABASE_URL=postgresql://first:p@ep-first.neon.tech/db\n")
    second = tmp_path / "second.env"
    second.write_text("DATABASE_URL=postgresql://second:p@ep-second.neon.tech/db\n")
    load_env_files([str(first), str(second), str(tmp_path / "missing.env")])
    assert "ep-first" in database_url()          # earlier file wins; a missing file is fine
    monkeypatch.setenv("DATABASE_URL", "postgresql://real:p@ep-real.neon.tech/db")
    load_env_files([str(first)])
    assert "ep-real" in database_url()           # a real environment variable beats files
