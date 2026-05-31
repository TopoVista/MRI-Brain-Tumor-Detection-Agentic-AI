from fastapi.testclient import TestClient
from PIL import Image
import io

from app.main import app
from app.workflows import orchestrator


def test_analysis_upload_flow() -> None:
    image = Image.new("RGB", (256, 256), color=(180, 180, 180))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    with TestClient(app) as client:
        response = client.post(
            "/api/analysis/upload",
            files={"file": ("scan.png", buffer.getvalue(), "image/png")},
        )
        assert response.status_code == 200
        payload = response.json()
        assert "prediction" in payload
        assert "report" in payload
        assert isinstance(payload["citations"], list)


def test_local_environment_prefers_real_models(monkeypatch) -> None:
    monkeypatch.setattr(orchestrator.settings, "app_env", "development")
    monkeypatch.setattr(orchestrator.settings, "strict_paper_core", False)
    monkeypatch.setattr(orchestrator.inference_service, "has_configured_weights", lambda: False)
    assert orchestrator._paper_core_is_strict() is True


def test_production_environment_can_fallback_without_models(monkeypatch) -> None:
    monkeypatch.setattr(orchestrator.settings, "app_env", "production")
    monkeypatch.setattr(orchestrator.settings, "strict_paper_core", False)
    monkeypatch.setattr(orchestrator.inference_service, "has_configured_weights", lambda: False)
    assert orchestrator._paper_core_is_strict() is False
