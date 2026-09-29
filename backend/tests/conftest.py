import os
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.mkdtemp()}/test.db")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ADMIN_EMAIL", "admin@flowtest.org")
os.environ.setdefault("ADMIN_PASSWORD", "test-password")


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.db.base import Base
    from app.db.session import engine
    from app.main import app

    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def admin_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def auth(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
