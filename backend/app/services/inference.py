from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.image_processing import prepare_model_tensor
from app.services.model_registry import MODEL_AGENT_SPECS, MODEL_LABELS


logger = get_logger(__name__)
settings = get_settings()


@dataclass
class ModelInferenceResult:
    agent: str
    prediction: str
    confidence: float
    probabilities: dict[str, float]
    mode: str
    explanation: str


class MultiModelInferenceService:
    def __init__(self) -> None:
        self._sessions: dict[str, ort.InferenceSession] = {}

    def _resolve_model_path(self, agent: str) -> Path | None:
        spec = MODEL_AGENT_SPECS[agent]
        configured = getattr(settings, spec["config_key"])
        path = settings.resolve_model_path(configured)
        if path and path.exists():
            return path

        if agent == "cnn_agent" and settings.model_path and settings.model_path.exists():
            return settings.model_path
        return None

    def _get_session(self, agent: str) -> ort.InferenceSession | None:
        model_path = self._resolve_model_path(agent)
        if model_path is None:
            return None
        if agent not in self._sessions:
            logger.info("Loading %s ONNX model from %s", agent, model_path)
            self._sessions[agent] = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        return self._sessions[agent]

    @staticmethod
    def _softmax(values: np.ndarray) -> np.ndarray:
        shifted = values - np.max(values)
        exp = np.exp(shifted)
        return exp / np.sum(exp)

    def _session_predict(self, agent: str, image: Image.Image) -> ModelInferenceResult:
        session = self._get_session(agent)
        assert session is not None
        spec = MODEL_AGENT_SPECS[agent]
        input_def = session.get_inputs()[0]
        shape = input_def.shape
        channels = 1 if len(shape) > 1 and shape[1] == 1 else 3
        size = spec["default_size"]
        if len(shape) >= 4 and isinstance(shape[-1], int) and shape[-1] > 0:
            size = int(shape[-1])
        tensor = prepare_model_tensor(image=image, size=size, channels=channels)
        output = session.run(None, {input_def.name: tensor})[0]
        logits = np.array(output).astype(np.float32).reshape(-1)
        if logits.size != len(MODEL_LABELS):
            padded = np.zeros(len(MODEL_LABELS), dtype=np.float32)
            padded[: min(len(MODEL_LABELS), logits.size)] = logits[: len(MODEL_LABELS)]
            logits = padded
        probabilities = self._softmax(logits)
        winner = int(np.argmax(probabilities))
        return ModelInferenceResult(
            agent=agent,
            prediction=MODEL_LABELS[winner],
            confidence=float(probabilities[winner]),
            probabilities={label: float(probabilities[index]) for index, label in enumerate(MODEL_LABELS)},
            mode="onnx",
            explanation=f"{MODEL_AGENT_SPECS[agent]['display_name']} used exported ONNX weights on CPU.",
        )

    def _heuristic_logits(self, features: dict, agent: str) -> np.ndarray:
        mean_intensity = float(features["mean_intensity"])
        std_intensity = float(features["std_intensity"])
        high_signal_ratio = float(features["high_signal_ratio"])
        edge_density = float(features["edge_density"])
        laplacian_variance = min(float(features["laplacian_variance"]) / 1000.0, 1.5)

        logits = np.array(
            [
                1.25 * std_intensity + 1.15 * edge_density + 1.05 * high_signal_ratio - 0.35 * mean_intensity,
                0.90 * mean_intensity + 0.80 * high_signal_ratio + 0.70 * edge_density + 0.20 * laplacian_variance,
                1.10 * (1.0 - std_intensity) + 1.20 * (1.0 - high_signal_ratio) + 0.90 * (1.0 - edge_density),
                1.20 * high_signal_ratio + 0.75 * mean_intensity + 0.35 * std_intensity + 0.25 * laplacian_variance,
            ],
            dtype=np.float32,
        )

        agent_offsets = {
            "cnn_agent": np.array([0.15, 0.00, -0.05, 0.05], dtype=np.float32),
            "resnet50_agent": np.array([0.10, 0.12, -0.08, 0.02], dtype=np.float32),
            "vgg16_agent": np.array([0.05, 0.18, -0.10, 0.01], dtype=np.float32),
            "inception_v3_agent": np.array([0.08, 0.06, -0.12, 0.10], dtype=np.float32),
        }
        return logits + agent_offsets[agent]

    def _heuristic_predict(self, agent: str, features: dict) -> ModelInferenceResult:
        logits = self._heuristic_logits(features=features, agent=agent)
        probabilities = self._softmax(logits)
        winner = int(np.argmax(probabilities))
        return ModelInferenceResult(
            agent=agent,
            prediction=MODEL_LABELS[winner],
            confidence=float(probabilities[winner]),
            probabilities={label: float(probabilities[index]) for index, label in enumerate(MODEL_LABELS)},
            mode="heuristic",
            explanation=(
                f"{MODEL_AGENT_SPECS[agent]['display_name']} is running in demo mode because no ONNX "
                "weights are configured for this model agent."
            ),
        )

    def predict(self, agent: str, image: Image.Image, features: dict) -> ModelInferenceResult:
        session = self._get_session(agent)
        if session is not None:
            return self._session_predict(agent=agent, image=image)
        return self._heuristic_predict(agent=agent, features=features)


inference_service = MultiModelInferenceService()
