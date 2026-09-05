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


def run_migrations(engine: Engine) -> None:
    for statement in STATEMENTS:
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:  # pragma: no cover - a missing table is fine on first boot
            logger.warning("Skipped migration: %s", statement, exc_info=True)
