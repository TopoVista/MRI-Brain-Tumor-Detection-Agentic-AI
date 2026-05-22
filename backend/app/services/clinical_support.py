from app.services.model_registry import MODEL_LABELS


TUMOR_PROFILES = {
    "glioma": {
        "display_name": "Glioma",
        "category": "Intra-axial tumor",
        "summary": "Often associated with infiltrative intra-axial brain lesions and heterogeneous signal patterns.",
        "common_considerations": [
            "Correlate with lesion location, edema pattern, and enhancement characteristics.",
            "Neuro-oncology or radiology review is recommended when model confidence is elevated.",
        ],
    },
    "meningioma": {
        "display_name": "Meningioma",
        "category": "Extra-axial tumor",
        "summary": "Often associated with dural-based extra-axial masses and well-circumscribed appearance on MRI.",
        "common_considerations": [
            "Review for dural attachment, mass effect, and adjacent bone or dural changes.",
            "Clinical correlation and formal imaging interpretation remain essential.",
        ],
    },
    "notumor": {
        "display_name": "No Tumor Pattern",
        "category": "Non-tumor class",
        "summary": "Model ensemble did not prioritize one of the tumor classes above the non-tumor class.",
        "common_considerations": [
            "A non-tumor prediction does not exclude subtle pathology or technical imaging limitations.",
            "If symptoms remain concerning, radiologist review and additional sequences may still be indicated.",
        ],
    },
    "pituitary": {
        "display_name": "Pituitary Tumor Pattern",
        "category": "Sellar / parasellar tumor",
        "summary": "Often associated with sellar-region lesions and signal patterns centered around the pituitary region.",
        "common_considerations": [
            "Review lesion size, sellar extension, and local mass effect on adjacent structures.",
            "Endocrine and neuroradiology correlation may be appropriate depending on the presentation.",
        ],
    },
}


def build_differential_diagnosis(probabilities: dict[str, float]) -> list[dict]:
    ranked = sorted(probabilities.items(), key=lambda item: item[1], reverse=True)
    return [
        {
            "label": label,
            "display_name": TUMOR_PROFILES[label]["display_name"],
            "probability": float(probability),
        }
        for label, probability in ranked[:3]
    ]


def build_recommended_actions(prediction: str, confidence: float, verified: bool, dissenting_agents: list[str]) -> list[str]:
    actions = []
    if prediction == "notumor":
        actions.append("Use the result as supportive evidence only; correlate with the full MRI study and symptoms.")
        if confidence < 0.65:
            actions.append("Because confidence is limited, prioritize formal radiologist review before excluding pathology.")
    else:
        actions.append("Escalate to radiology or neuro-oncology review for definitive interpretation.")
        actions.append("Correlate with lesion location, edema, enhancement, and clinical presentation.")

    if dissenting_agents:
        actions.append(f"Model disagreement detected across: {', '.join(dissenting_agents)}. Treat the classification as uncertain.")

    if not verified:
        actions.append("Verifier flags should be reviewed before relying on the generated note.")

    return actions


def build_consensus_summary(model_votes: list[dict], ensemble_probabilities: dict[str, float]) -> dict:
    supporting_agents: dict[str, list[str]] = {label: [] for label in MODEL_LABELS}
    for vote in model_votes:
        supporting_agents[vote["prediction"]].append(vote["agent"])

    ranked = sorted(ensemble_probabilities.items(), key=lambda item: item[1], reverse=True)
    winner, winner_probability = ranked[0]
    runner_up_probability = ranked[1][1] if len(ranked) > 1 else 0.0
    margin = float(winner_probability - runner_up_probability)

    if margin >= 0.20:
        strength = "strong"
    elif margin >= 0.10:
        strength = "moderate"
    else:
        strength = "weak"

    return {
        "strength": strength,
        "margin": margin,
        "supporting_agents": supporting_agents[winner],
        "dissenting_agents": [vote["agent"] for vote in model_votes if vote["prediction"] != winner],
    }
