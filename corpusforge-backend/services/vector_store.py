"""ChromaDB wrapper (BP-03 step 5).

Persistent client at ./chroma_db locally, /app/data/chroma_db on Fly.io.
Collection uses cosine distance so the confidence thresholds
(< 0.3 High, 0.3-0.5 Medium, > 0.5 Low, > 0.7 NOT_FOUND) apply directly.
"""
import logging
import os

import chromadb

logger = logging.getLogger(__name__)

COLLECTION_NAME = "corpusforge"

_chroma_path = "/app/data/chroma_db" if os.getenv("FLY_APP_NAME") else "./chroma_db"


class VectorStore:
    def __init__(self, path: str = _chroma_path):
        self.client = chromadb.PersistentClient(path=path)
        self.collection = self.client.get_or_create_collection(
            COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: list[dict], embeddings: list[list[float]], document_id: str) -> list[str]:
        """Add embedded chunks. Each chunk dict has chunk_id, text, page_number.

        Returns the ChromaDB ids assigned (chunk_{chunk_id}).
        """
        chroma_ids = [f"chunk_{c['chunk_id']}" for c in chunks]
        self.collection.add(
            ids=chroma_ids,
            embeddings=embeddings,
            documents=[c["text"] for c in chunks],
            metadatas=[
                {
                    "chunk_id": c["chunk_id"],
                    "document_id": document_id,
                    "page_number": c["page_number"],
                }
                for c in chunks
            ],
        )
        logger.info("Added %d chunks to ChromaDB for document %s", len(chunks), document_id)
        return chroma_ids

    def query(self, embedding: list[float], n_results: int = 6) -> list[dict]:
        """Query by embedding. Returns [{chunk_id, document_id, page_number, text, distance}]."""
        count = self.collection.count()
        if count == 0:
            return []
        results = self.collection.query(
            query_embeddings=[embedding], n_results=min(n_results, count)
        )
        hits = []
        for text, metadata, distance in zip(
            results["documents"][0], results["metadatas"][0], results["distances"][0]
        ):
            hits.append(
                {
                    "chunk_id": metadata["chunk_id"],
                    "document_id": metadata["document_id"],
                    "page_number": metadata["page_number"],
                    "text": text,
                    "distance": distance,
                }
            )
        return hits

    def delete_document(self, document_id: str) -> None:
        self.collection.delete(where={"document_id": document_id})
        logger.info("Removed ChromaDB vectors for document %s", document_id)


# Singleton — one persistent client per process
vector_store = VectorStore()
