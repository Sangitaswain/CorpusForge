"""F1 ingestion pipeline orchestrator (BP-03).

Runs as a FastAPI background task. Steps are added substep by substep:
extraction, chunking, and embedding arrive in Substeps 2.2-2.4; the full
wiring with status updates lands in Substep 2.6.
"""
import logging

logger = logging.getLogger(__name__)


def process_document(document_id: str, file_bytes: bytes) -> None:
    """Background task entry point. Placeholder until Substep 2.6 wires steps 2-5."""
    logger.info("Ingestion started for document %s", document_id)
