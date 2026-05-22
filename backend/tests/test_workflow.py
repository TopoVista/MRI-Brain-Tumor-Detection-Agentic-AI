from fastapi.testclient import TestClient
from PIL import Image
import io

from app.main import app


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
