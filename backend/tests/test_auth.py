from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app


def test_issue_token() -> None:
    settings = get_settings()
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/token",
            data={"username": settings.admin_username, "password": settings.admin_password},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["token_type"] == "bearer"
        assert payload["access_token"]
