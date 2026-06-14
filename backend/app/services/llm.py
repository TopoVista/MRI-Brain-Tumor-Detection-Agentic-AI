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

    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = _build_prompt(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )

    # Use standard chat.completions.create as it is the most stable and widely supported endpoint
    models_to_try = [settings.openai_model, "gpt-4o-mini", "gpt-4o"]
    for model in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a grounded medical support report and avoid unsupported claims.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.2,
            )
            text = response.choices[0].message.content
            if text:
                return text.strip()
        except Exception as exc:
            logger.warning("OpenAI generation failed with model %s: %s", model, exc)

    return None


def _generate_with_gemini(
    prediction: str,
    confidence: float,
    features: dict,
    citations: list[dict],
    model_votes: list[dict],
) -> str | None:
    if settings.llm_provider != "gemini" or not settings.gemini_api_key:
        return None

    import httpx

    prompt = _build_prompt(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )

    # We support gemini-2.5-flash or gemini-1.5-flash
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "You are a grounded medical support AI assistant. Generate a grounded medical support report and avoid unsupported claims.\n\n" + prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
        }
    }

    try:
        response = httpx.post(url, json=payload, timeout=15.0)
        if response.status_code == 200:
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            if text:
                return text.strip()
        else:
            logger.warning("Gemini API returned status code %d: %s", response.status_code, response.text)
    except Exception as exc:
        logger.warning("Gemini report generation failed: %s", exc)

    return None


def _generate_with_groq(
    prediction: str,
    confidence: float,
    features: dict,
    citations: list[dict],
    model_votes: list[dict],
) -> str | None:
    if settings.llm_provider != "groq" or not settings.groq_api_key:
        return None

    from openai import OpenAI

    # Groq exposes an OpenAI-compatible endpoint
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.groq_api_key,
    )
    prompt = _build_prompt(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )

    models_to_try = ["mixtral-8x7b-32768", "llama3-8b-8192", "gemma2-9b-it"]
    for model in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a grounded medical support report and avoid unsupported claims.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.2,
            )
            text = response.choices[0].message.content
            if text:
                return text.strip()
        except Exception as exc:
            logger.warning("Groq generation failed with model %s: %s", model, exc)

    return None


def generate_grounded_report(
    prediction: str,
    confidence: float,
    features: dict,
    citations: list[dict],
    model_votes: list[dict],
) -> str:
    # 1. Try OpenAI if configured
    openai_report = _generate_with_openai(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )
    if openai_report:
        return openai_report

    # 2. Try Gemini if configured
    gemini_report = _generate_with_gemini(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )
    if gemini_report:
        return gemini_report

    # 3. Try Groq if configured
    groq_report = _generate_with_groq(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=citations,
        model_votes=model_votes,
    )
    if groq_report:
        return groq_report

    # 4. Fallback to local report generator if no API is available/configured
    literature_line = " ".join(
        f"{item['title']} notes {item['summary']}" for item in citations[:2]
    )
    uncertainty_line = (
        "The system recommends urgent specialist review."
        if confidence >= settings.mri_confidence_threshold
        else "The system recommends correlation with radiologist review and clinical context."
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
