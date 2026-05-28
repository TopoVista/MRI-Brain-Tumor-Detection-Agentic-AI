from PIL import Image

from app.core.logging import get_logger
from app.services.image_processing import extract_mri_features, load_image_bytes
from app.services.clinical_support import build_consensus_summary
from app.services.inference import inference_service
from app.services.model_registry import MODEL_LABELS


logger = get_logger(__name__)


def run_preprocessing_agent(content: bytes) -> dict:
    image = load_image_bytes(content)
    features = extract_mri_features(image)
    logger.info("Preprocessing agent extracted MRI features.")
    return {
        "image": image,
        "features": features,
        "inference_note": "MRI normalized with Gaussian smoothing, Laplacian features, and intensity statistics.",
    }


def run_model_agent(agent: str, image: Image.Image, features: dict, strict: bool = False) -> dict:
    result = inference_service.predict(agent=agent, image=image, features=features, strict=strict)
    logger.info("%s prediction=%s confidence=%.3f", agent, result.prediction, result.confidence)
    return {
        "agent": agent,
        "prediction": result.prediction,
        "confidence": result.confidence,
        "probabilities": result.probabilities,
        "mode": result.mode,
        "note": result.explanation,
    }


def run_orchestration_agent(model_votes: list[dict]) -> dict:
    averaged = {label: 0.0 for label in MODEL_LABELS}
    for vote in model_votes:
        for label, value in vote["probabilities"].items():
            averaged[label] += float(value)

    count = max(len(model_votes), 1)
    averaged = {label: value / count for label, value in averaged.items()}
    ranked = sorted(averaged.items(), key=lambda item: item[1], reverse=True)
    prediction, confidence = ranked[0]

    supporting_agents = [vote["agent"] for vote in model_votes if vote["prediction"] == prediction]
    dissenting_agents = [vote["agent"] for vote in model_votes if vote["prediction"] != prediction]
    if dissenting_agents:
        summary = (
            f"Ensemble selected {prediction} with support from {len(supporting_agents)}/{len(model_votes)} "
            f"algorithm agents; dissent from {', '.join(dissenting_agents)}."
        )
    else:
        summary = f"All algorithm agents agreed on {prediction}."

    consensus_summary = build_consensus_summary(model_votes=model_votes, ensemble_probabilities=averaged)

    return {
        "prediction": prediction,
        "confidence": float(confidence),
        "ensemble_probabilities": averaged,
        "supporting_agents": supporting_agents,
        "dissenting_agents": dissenting_agents,
        "consensus_summary": consensus_summary,
        "inference_note": summary,
    }
