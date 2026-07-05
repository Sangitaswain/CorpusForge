"""Embeddings service (BP-09): bge-small-en-v1.5 singleton."""
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    def __init__(self):
        # CPU pinned: deployment target has no GPU, and local CUDA kernels
        # don't match the installed torch wheels
        self.model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")

    def embed(self, text: str) -> list[float]:
        return self.model.encode(text, normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(texts, normalize_embeddings=True).tolist()


# Singleton instance — model loads once at startup, not per request
embedding_service = EmbeddingService()
