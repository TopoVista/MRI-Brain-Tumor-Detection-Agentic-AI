from app.services.llm import generate_grounded_report


def run_report_agent(prediction: str, confidence: float, features: dict, citations: list, model_votes: list[dict]) -> dict:
    report = generate_grounded_report(
        prediction=prediction,
        confidence=confidence,
        features=features,
        citations=[citation.model_dump() for citation in citations],
        model_votes=model_votes,
    )
    top_vote = max(model_votes, key=lambda vote: vote["confidence"]) if model_votes else None
    findings = [
        f"Predicted class: {prediction.replace('-', ' ')}",
        f"Confidence score: {confidence:.0%}",
        f"Classified among: glioma, meningioma, notumor, pituitary",
        f"High signal ratio: {features['high_signal_ratio']:.2f}",
        f"Edge density: {features['edge_density']:.2f}",
    ]
    if top_vote is not None:
        findings.append(
            f"Strongest individual model: {top_vote['agent'].replace('_', ' ')} at {top_vote['confidence']:.0%} confidence"
        )
    return {"report": report, "findings": findings}
