import math
from collections import Counter

from chromadb import PersistentClient
from chromadb.api.types import EmbeddingFunction, Documents

from app.core.config import get_settings


settings = get_settings()


class LocalHashEmbeddingFunction(EmbeddingFunction[Documents]):
    def __init__(self) -> None:
        pass

    @staticmethod
    def name() -> str:
        return "local-hash-embedding"

    @staticmethod
    def get_config() -> dict:
        return {"type": "local-hash", "dimensions": 64}

    @classmethod
    def build_from_config(cls, config: dict) -> "LocalHashEmbeddingFunction":
        _ = config
        return cls()

    def __call__(self, input: Documents) -> list[list[float]]:
        embeddings: list[list[float]] = []
        for document in input:
            tokens = [token.strip(".,()").lower() for token in document.split() if token.strip()]
            counts = Counter(tokens)
            vector = [0.0] * 64
            for token, count in counts.items():
                index = hash(token) % len(vector)
                vector[index] += float(count)
            norm = math.sqrt(sum(value * value for value in vector)) or 1.0
            embeddings.append([value / norm for value in vector])
        return embeddings


def get_collection():
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    client = PersistentClient(path=str(settings.chroma_dir))
    embedding_fn = LocalHashEmbeddingFunction()
    return client.get_or_create_collection(
        name="medical-literature",
        embedding_function=embedding_fn,
    )
