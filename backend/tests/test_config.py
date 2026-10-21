"""DATABASE_URL handling (local SQLite by default, Postgres/Neon when set)."""

from config import database_url, engine_options, migration_database_url

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
