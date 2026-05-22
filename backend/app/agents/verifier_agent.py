from app.core.config import get_settings


settings = get_settings()


def run_verifier_agent(prediction: str, confidence: float, report: str, citations: list, model_votes: list[dict]) -> dict:
    notes: list[str] = []
    verified = True
    winning_votes = [vote for vote in model_votes if vote["prediction"] == prediction]

    if len(citations) == 0:
        verified = False
        notes.append("No supporting literature was retrieved.")
    else:
        notes.append(f"Report grounded with {len(citations)} supporting references.")

    if len(winning_votes) < max(2, len(model_votes) // 2):
        verified = False
        notes.append("Model-agent agreement is weak for the selected class.")

    if prediction != "notumor" and confidence < settings.mri_confidence_threshold:
        verified = False
        notes.append("Tumor-class confidence is below the configured escalation threshold.")

    if "radiologist review" not in report.lower():
        verified = False
        notes.append("Safety language is missing from the generated report.")

    if verified:
        notes.append("Reasoning and evidence passed verifier checks.")

    return {"verified": verified, "notes": notes}
