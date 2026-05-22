from app.core.config import get_settings
from app.schemas.analysis import Citation
from app.services.vector_store import get_collection


settings = get_settings()


def run_retrieval_agent(prediction: str, features: dict) -> list[Citation]:
    prompt = (
        f"MRI brain tumor assessment guidance for class {prediction}. "
        f"Mean intensity {features['mean_intensity']:.3f}, "
        f"std {features['std_intensity']:.3f}, "
        f"high signal ratio {features['high_signal_ratio']:.3f}, "
        f"edge density {features['edge_density']:.3f}."
    )
    collection = get_collection()
    result = collection.query(query_texts=[prompt], n_results=settings.top_k_literature)

    citations: list[Citation] = []
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0] if result.get("distances") else [0.2] * len(documents)

    for document, metadata, distance in zip(documents, metadatas, distances):
        citations.append(
            Citation(
                title=metadata.get("title", "Reference"),
                source=metadata.get("source", "Knowledge base"),
                year=metadata.get("year"),
                summary=document,
                relevance_score=max(0.0, min(1.0, 1.0 - float(distance))),
            )
        )
    return citations
