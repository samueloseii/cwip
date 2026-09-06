"""Additive schema fixes for databases created before a column existed.

The app relies on ``create_all``, which never alters existing tables, so new
columns are added here at startup. Every statement must be idempotent.
"""

import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

STATEMENTS = (
    "ALTER TABLE meters ADD COLUMN IF NOT EXISTS avg_consumption_m3 DOUBLE PRECISION DEFAULT 0",
    "ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(255)",
    "ALTER TABLE maintenance_records "
    "ADD COLUMN IF NOT EXISTS reported_via_whatsapp BOOLEAN DEFAULT FALSE",
)


SQLITE_STATEMENTS = (
    "ALTER TABLE meters ADD COLUMN avg_consumption_m3 FLOAT DEFAULT 0",
    "ALTER TABLE meter_readings ADD COLUMN flag_reason VARCHAR(255)",
    "ALTER TABLE maintenance_records ADD COLUMN reported_via_whatsapp BOOLEAN DEFAULT 0",
)


def run_migrations(engine: Engine) -> None:
    statements = SQLITE_STATEMENTS if engine.dialect.name == "sqlite" else STATEMENTS
    for statement in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:  # pragma: no cover - a missing table is fine on first boot
            logger.warning("Skipped migration: %s", statement, exc_info=True)
