from fastapi.testclient import TestClient

from app.main import app


def test_issue_token() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/token",
            data={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["token_type"] == "bearer"
        assert payload["access_token"]
