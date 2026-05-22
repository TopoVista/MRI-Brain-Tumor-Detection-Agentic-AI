from app.services.vector_store import get_collection


SEED_DOCS = [
    {
        "id": "who-glioma-overview",
        "title": "WHO central nervous system tumor overview",
        "source": "WHO classification summary",
        "year": 2021,
        "text": (
            "Gliomas are primary brain tumors with imaging findings that may include "
            "signal heterogeneity, edema, mass effect, and contrast-enhancing lesions. "
            "Radiologic interpretation must be correlated with clinical context and histopathology."
        ),
    },
    {
        "id": "pubmed-mri-tumor-patterns",
        "title": "MRI patterns in intracranial tumor assessment",
        "source": "PubMed abstract summary",
        "year": 2023,
        "text": (
            "Brain MRI evaluation for tumor suspicion often reviews lesion boundaries, edema, "
            "mass effect, and abnormal signal distribution. AI tools can support triage but "
            "should not replace radiologist review."
        ),
    },
    {
        "id": "pubmed-ai-neuro-oncology",
        "title": "AI assistance in neuro-oncology imaging workflows",
        "source": "PubMed abstract summary",
        "year": 2024,
        "text": (
            "Clinical-grade neuro-oncology decision support benefits from calibrated confidence, "
            "citation grounding, and explicit uncertainty reporting when model evidence is weak."
        ),
    },
]


def seed_knowledge_base() -> None:
    collection = get_collection()
    existing = collection.count()
    if existing >= len(SEED_DOCS):
        return
    collection.upsert(
        ids=[doc["id"] for doc in SEED_DOCS],
        documents=[doc["text"] for doc in SEED_DOCS],
        metadatas=[{"title": doc["title"], "source": doc["source"], "year": doc["year"]} for doc in SEED_DOCS],
    )
