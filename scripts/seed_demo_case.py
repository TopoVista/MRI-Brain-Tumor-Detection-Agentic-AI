from pathlib import Path

import requests


if __name__ == "__main__":
    image_path = Path(__file__).resolve().parents[1] / "backend" / "tests" / "demo.png"
    if image_path.exists():
        files = {"file": ("demo.png", image_path.read_bytes(), "image/png")}
        response = requests.post("http://localhost:8000/api/analysis/upload", files=files, timeout=60)
        print(response.status_code)
        print(response.json())
    else:
        print("Place a demo image at backend/tests/demo.png to use this script.")
