"""Seed database with demo data for the CWIP pilot."""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.billing import Invoice, InvoiceStatus, Payment, PaymentMethod
from app.models.community import Community, CommunitySize, WaterSystemType
from app.models.household import Household, HouseholdStatus
from app.models.maintenance import (
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceRecord,
    MaintenanceStatus,
)
from app.models.meter import Meter, MeterReading
from app.models.partner import Partner
from app.models.user import User, UserRole


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Partner).count() > 0:
            print("Database already seeded. Skipping.")
            return
        _seed_data(db)
        print("Database seeded successfully!")
    finally:
        db.close()


def _seed_data(db: Session):
    # Partners
    partners = [
        Partner(name="FEDICAMP", country="Nicaragua", contact_name="Maria Lopez", contact_email="maria@fedicamp.org"),
        Partner(name="ALTROPICO", country="Ecuador", contact_name="Carlos Vega", contact_email="carlos@altropico.org"),
        Partner(name="AVODEC", country="Honduras", contact_name="Ana Martinez", contact_email="ana@avodec.org"),
        Partner(name="ASOMAINCUPACO", country="Nicaragua", contact_name="Jose Hernandez", contact_email="jose@asomaincupaco.org"),
    ]
    for p in partners:
        db.add(p)
    db.flush()

    # Communities (12 total across partners)
    community_data = [
        ("San Juan del Sur", "Nicaragua", "Rivas", partners[0], WaterSystemType.GRAVITY_FED, CommunitySize.SMALL, "NIO", 5.0, 0.15, 45),
        ("El Jicaral", "Nicaragua", "León", partners[0], WaterSystemType.PUMPED, CommunitySize.MEDIUM, "NIO", 8.0, 0.20, 120),
        ("Santa Teresa", "Nicaragua", "Carazo", partners[0], WaterSystemType.GRAVITY_FED, CommunitySize.SMALL, "NIO", 4.0, 0.12, 35),
        ("Otavalo Rural", "Ecuador", "Imbabura", partners[1], WaterSystemType.GRAVITY_FED, CommunitySize.MEDIUM, "USD", 2.0, 0.35, 180),
        ("Cotacachi Sur", "Ecuador", "Imbabura", partners[1], WaterSystemType.GRAVITY_FED, CommunitySize.SMALL, "USD", 1.5, 0.30, 40),
        ("Esmeraldas Norte", "Ecuador", "Esmeraldas", partners[1], WaterSystemType.PUMPED, CommunitySize.LARGE, "USD", 3.0, 0.40, 250),
        ("La Ceiba Rural", "Honduras", "Atlántida", partners[2], WaterSystemType.GRAVITY_FED, CommunitySize.SMALL, "HNL", 50.0, 2.0, 55),
        ("Tela Comunidad", "Honduras", "Atlántida", partners[2], WaterSystemType.MIXED, CommunitySize.MEDIUM, "HNL", 75.0, 3.5, 150),
        ("El Progreso Sur", "Honduras", "Yoro", partners[2], WaterSystemType.PUMPED, CommunitySize.MEDIUM, "HNL", 60.0, 2.5, 90),
        ("Jinotega Norte", "Nicaragua", "Jinotega", partners[3], WaterSystemType.GRAVITY_FED, CommunitySize.SMALL, "NIO", 6.0, 0.18, 48),
        ("Matagalpa Este", "Nicaragua", "Matagalpa", partners[3], WaterSystemType.GRAVITY_FED, CommunitySize.MEDIUM, "NIO", 7.0, 0.22, 110),
        ("Muy Muy Central", "Nicaragua", "Matagalpa", partners[3], WaterSystemType.MIXED, CommunitySize.SMALL, "NIO", 5.5, 0.16, 38),
    ]

    communities = []
    for name, country, region, partner, ws_type, size, currency, tariff_fixed, tariff_m3, conns in community_data:
        c = Community(
            name=name, country=country, region=region, partner_id=partner.id,
            water_system_type=ws_type, community_size=size, currency=currency,
            tariff_fixed=tariff_fixed, tariff_per_m3=tariff_m3,
            total_connections=conns, population=conns * 4,
        )
        db.add(c)
        communities.append(c)
    db.flush()

    # Admin user
    admin = User(
        email="admin@cwip.org", hashed_password=get_password_hash("admin123"),
        full_name="CWIP Administrator", role=UserRole.SUPER_ADMIN,
    )
    db.add(admin)

    # Partner admin users
    for partner in partners:
        u = User(
            email=f"admin@{partner.name.lower()}.org",
            hashed_password=get_password_hash("partner123"),
            full_name=f"{partner.name} Admin", role=UserRole.PARTNER_ADMIN,
            partner_id=partner.id,
        )
        db.add(u)
    db.flush()

    # Community operator users (technician / treasurer per community)
    for ci, community in enumerate(communities[:6]):
        slug = community.name.lower().replace(" ", "")[:10]
        op = User(
            email=f"operator{ci+1}@cwip.org",
            hashed_password=get_password_hash("operator123"),
            full_name=f"Operator - {community.name}",
            role=UserRole.OPERATOR,
            partner_id=community.partner_id,
            community_id=community.id,
        )
        db.add(op)
        tr = User(
            email=f"treasurer{ci+1}@cwip.org",
            hashed_password=get_password_hash("treasurer123"),
            full_name=f"Treasurer - {community.name}",
            role=UserRole.TREASURER,
            partner_id=community.partner_id,
            community_id=community.id,
        )
        db.add(tr)
    db.flush()

    # Households, meters, readings, invoices, payments for first 3 communities (demo)
    now = datetime.now(timezone.utc)
    names_pool = [
        "García", "Rodríguez", "López", "Hernández", "Martínez", "Pérez",
        "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez",
        "Díaz", "Reyes", "Morales", "Cruz", "Ortiz", "Gutiérrez",
        "Chávez", "Ramos", "Vargas", "Castillo", "Jiménez", "Medina",
    ]
    first_names = ["Juan", "María", "Pedro", "Ana", "José", "Rosa", "Carlos", "Elena", "Luis", "Carmen"]

    for ci, community in enumerate(communities[:6]):
        num_households = min(community.total_connections, 20)
        for hi in range(num_households):
            fname = random.choice(first_names)
            lname = random.choice(names_pool)
            hh = Household(
                account_number=f"C{ci+1:02d}-{hi+1:04d}",
                head_of_household=f"{fname} {lname}",
                members_count=random.randint(2, 8),
                status=random.choices(
                    [HouseholdStatus.ACTIVE, HouseholdStatus.ACTIVE, HouseholdStatus.ACTIVE, HouseholdStatus.SUSPENDED],
                    weights=[7, 7, 7, 1],
                )[0],
                has_meter=True,
                community_id=community.id,
            )
            db.add(hh)
            db.flush()

            # Meter
            meter = Meter(
                serial_number=f"M-C{ci+1:02d}-{hi+1:04d}",
                brand="Zenner" if hi % 2 == 0 else "Itron",
                install_date=now - timedelta(days=random.randint(60, 365)),
                household_id=hh.id,
            )
            db.add(meter)
            db.flush()

            # Meter readings (last 4 months)
            cumulative = random.uniform(50, 500)
            for month_offset in range(4, 0, -1):
                consumption = random.uniform(5, 30)
                prev = cumulative
                cumulative += consumption
                reading = MeterReading(
                    reading_value=round(cumulative, 1),
                    previous_value=round(prev, 1),
                    consumption_m3=round(consumption, 1),
                    reading_date=now - timedelta(days=month_offset * 30),
                    meter_id=meter.id,
                    recorded_by="Operator",
                )
                db.add(reading)

            meter.last_reading_value = round(cumulative, 1)
            meter.last_reading_date = now - timedelta(days=30)

            # Invoices for last 3 months
            for month_offset in range(3, 0, -1):
                period_start = now - timedelta(days=month_offset * 30 + 30)
                period_end = now - timedelta(days=month_offset * 30)
                consumption = random.uniform(8, 25)
                variable = consumption * community.tariff_per_m3
                total = community.tariff_fixed + variable

                inv = Invoice(
                    invoice_number=f"INV-C{ci+1:02d}-{hi+1:03d}-{month_offset}",
                    billing_period_start=period_start,
                    billing_period_end=period_end,
                    consumption_m3=round(consumption, 1),
                    fixed_charge=community.tariff_fixed,
                    variable_charge=round(variable, 2),
                    total_amount=round(total, 2),
                    currency=community.currency,
                    due_date=period_end + timedelta(days=15),
                    household_id=hh.id,
                )

                # Simulate payment status
                pay_chance = random.random()
                if pay_chance > 0.3:
                    inv.amount_paid = inv.total_amount
                    inv.balance_due = 0
                    inv.status = InvoiceStatus.PAID
                elif pay_chance > 0.15:
                    partial = round(inv.total_amount * random.uniform(0.3, 0.7), 2)
                    inv.amount_paid = partial
                    inv.balance_due = round(inv.total_amount - partial, 2)
                    inv.status = InvoiceStatus.PARTIAL
                else:
                    inv.balance_due = inv.total_amount
                    inv.status = InvoiceStatus.OVERDUE if month_offset > 1 else InvoiceStatus.PENDING

                db.add(inv)
                db.flush()

                if inv.amount_paid > 0:
                    pmt = Payment(
                        amount=inv.amount_paid,
                        currency=community.currency,
                        payment_method=random.choice([PaymentMethod.CASH, PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER]),
                        payment_date=period_end + timedelta(days=random.randint(1, 14)),
                        household_id=hh.id,
                        invoice_id=inv.id,
                    )
                    db.add(pmt)

            # Update outstanding balance
            outstanding = (
                db.query(Invoice)
                .filter(Invoice.household_id == hh.id, Invoice.balance_due > 0)
                .all()
            )
            hh.outstanding_balance = round(sum(i.balance_due for i in outstanding), 2)

    # Maintenance records
    categories = list(MaintenanceCategory)
    for community in communities[:6]:
        for _ in range(random.randint(2, 6)):
            record = MaintenanceRecord(
                title=random.choice([
                    "Pipe leak near distribution tank",
                    "Valve replacement needed",
                    "Pump motor overheating",
                    "Tank cleaning scheduled",
                    "Meter not registering",
                    "Chlorination system check",
                    "Electrical panel inspection",
                    "Spring box maintenance",
                ]),
                category=random.choice(categories),
                priority=random.choice(list(MaintenancePriority)),
                status=random.choice([MaintenanceStatus.REPORTED, MaintenanceStatus.REPORTED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED]),
                reported_date=now - timedelta(days=random.randint(1, 90)),
                cost=round(random.uniform(0, 200), 2) if random.random() > 0.5 else 0,
                currency=community.currency,
                community_id=community.id,
            )
            if record.status == MaintenanceStatus.COMPLETED:
                record.resolved_date = record.reported_date + timedelta(days=random.randint(1, 14))
            db.add(record)

    db.commit()
    print(f"Seeded: {len(partners)} partners, {len(communities)} communities, demo households/billing/maintenance")


if __name__ == "__main__":
    seed()
