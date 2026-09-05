"""Shared meter-reading logic: consumption, rolling average and anomaly flags.

Readings are cumulative, so a value below the previous one usually means a
transcription error. Suspicious readings are always stored — they are flagged
for the administrator to review rather than rejected.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.meter import Meter, MeterReading

HIGH_CONSUMPTION_RATIO = 1.25
AVERAGE_WINDOW = 6


def recent_average(db: Session, meter_id, window: int = AVERAGE_WINDOW) -> float:
    """Mean consumption over the most recent readings with usage."""
    rows = (
        db.query(MeterReading.consumption_m3)
        .filter(MeterReading.meter_id == meter_id)
        .order_by(MeterReading.reading_date.desc())
        .limit(window)
        .all()
    )
    values = [r[0] for r in rows if r[0] and r[0] > 0]
    if not values:
        return 0.0
    return sum(values) / len(values)


def flag_reading(reading_value: float, previous_value: float, average: float) -> str | None:
    """Return a human-readable reason the reading looks wrong, or None."""
    if reading_value < previous_value:
        return (
            f"Reading {reading_value:g} is below the previous reading "
            f"{previous_value:g} — meters only count up."
        )
    consumption = reading_value - previous_value
    if consumption == 0:
        return "No consumption since the last reading — check the meter was read correctly."
    if average > 0 and consumption > average * HIGH_CONSUMPTION_RATIO:
        pct = round((consumption / average - 1) * 100)
        return (
            f"Consumption {consumption:g} m³ is {pct}% above this household's "
            f"average of {average:.1f} m³ — possible leak or misread."
        )
    return None


def record_reading(
    db: Session,
    meter: Meter,
    *,
    reading_value: float,
    reading_date: datetime,
    notes: str | None = None,
    is_estimated: bool = False,
    recorded_by: str | None = None,
    photo_url: str | None = None,
) -> MeterReading:
    """Persist a reading, flagging anomalies and refreshing meter aggregates."""
    previous_value = meter.last_reading_value
    average = recent_average(db, meter.id)
    consumption = max(0.0, reading_value - previous_value)

    reading = MeterReading(
        reading_value=reading_value,
        previous_value=previous_value,
        consumption_m3=consumption,
        reading_date=reading_date,
        photo_url=photo_url,
        notes=notes,
        is_estimated=is_estimated,
        recorded_by=recorded_by,
        flag_reason=flag_reading(reading_value, previous_value, average),
        meter_id=meter.id,
    )
    db.add(reading)
    db.flush()

    # A backwards reading is kept for the record but must not rewind the meter.
    if reading_value >= meter.last_reading_value:
        meter.last_reading_value = reading_value
        meter.last_reading_date = reading_date
    meter.avg_consumption_m3 = recent_average(db, meter.id)
    return reading
