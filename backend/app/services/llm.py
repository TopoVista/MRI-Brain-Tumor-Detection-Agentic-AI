from openai import OpenAI

from app.core.config import get_settings
from app.core.logging import get_logger


settings = get_settings()
logger = get_logger(__name__)


def _build_prompt(prediction: str, confidence: float, features: dict, citations: list[dict], model_votes: list[dict]) -> str:
    literature_lines = "\n".join(
        f"- {item['title']} ({item.get('source', 'Source')}, {item.get('year', 'n.d.')}): {item['summary']}"
        for item in citations[:3]
    )
    vote_lines = "\n".join(
        f"- {vote['agent']}: {vote['prediction']} ({vote['confidence']:.2f}, {vote['mode']})"
        for vote in model_votes
    )
    return (
        "Draft a medically cautious AI-assisted MRI support report in compact Markdown. "
        "Do not diagnose. Use only the provided evidence. "
        "Mention uncertainty and recommend radiologist or specialist review. "
        "Use these exact sections: ## Impression, ## Model Consensus, ## Evidence Signals, ## Recommendation.\n\n"
        f"Ensemble prediction: {prediction}\n"
        f"Ensemble confidence: {confidence:.2f}\n"
        f"Mean intensity: {features['mean_intensity']:.3f}\n"
        f"Intensity variability: {features['std_intensity']:.3f}\n"
        f"High signal ratio: {features['high_signal_ratio']:.3f}\n"
        f"Edge density: {features['edge_density']:.3f}\n"
        f"Model votes:\n{vote_lines or '- No model votes supplied.'}\n"
        f"Evidence:\n{literature_lines or '- No external evidence retrieved.'}\n\n"
        "Use bullets where helpful and keep each section concise."
    )


def _generate_with_openai(
    prediction: str,
    confidence: float,
    features: dict,
    citations: list[dict],
    model_votes: list[dict],
) -> str | None:
    if settings.llm_provider != "openai" or not settings.openai_api_key:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = _build_prompt(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )

    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": "Generate a grounded medical support report and avoid unsupported claims.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )
        text = getattr(response, "output_text", None)
        if text:
            return text.strip()
    except Exception as exc:
        logger.warning("OpenAI report generation failed, using local fallback: %s", exc)

    return None


def generate_grounded_report(
    prediction: str,
    confidence: float,
    features: dict,
    citations: list[dict],
    model_votes: list[dict],
) -> str:
    openai_report = _generate_with_openai(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )
    if openai_report:
        return openai_report

    literature_line = " ".join(
        f"{item['title']} notes {item['summary']}" for item in citations[:2]
    )
    uncertainty_line = (
        "The system recommends urgent specialist review."
        if confidence >= settings.mri_confidence_threshold
        else "The system recommends correlation with radiologist review and clinical context."
    )
    vote_summary = "; ".join(
        f"{vote['agent'].replace('_', ' ')} voted {vote['prediction']} ({vote['confidence']:.0%})"
        for vote in model_votes
    )
    return "\n".join(
        [
            "## Impression",
            f"- Ensemble class: **{prediction}**",
            f"- Ensemble confidence: **{confidence:.0%}**",
            "- This output is AI-assisted support and not a diagnosis.",
            "",
            "## Model Consensus",
            *(f"- {vote['agent'].replace('_', ' ')}: {vote['prediction']} ({vote['confidence']:.0%}, {vote['mode']})" for vote in model_votes),
            "",
            "## Evidence Signals",
            f"- Mean intensity: {features['mean_intensity']:.3f}",
            f"- Intensity variability: {features['std_intensity']:.3f}",
            f"- High-signal ratio: {features['high_signal_ratio']:.3f}",
            f"- Edge density: {features['edge_density']:.3f}",
            f"- Literature context: {literature_line or 'No external evidence retrieved.'}",
            "",
            "## Recommendation",
            f"- {uncertainty_line}",
            "- Correlate with radiologist review, clinical history, and formal workup where indicated.",
        ]
    )
