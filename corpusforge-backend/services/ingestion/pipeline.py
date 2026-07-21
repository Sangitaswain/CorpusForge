"""F1 ingestion pipeline orchestrator (BP-03).

Runs as a FastAPI background task. Steps are added substep by substep:
extraction, chunking, and embedding arrive in Substeps 2.2-2.4; the full
wiring with status updates lands in Substep 2.6.
"""
import asyncio
import logging
from pathlib import Path

from core.database import SessionLocal
from models.chunk import Chunk
from models.document import Document
from services.ingestion import ocr_extractor, pdf_extractor, spreadsheet_extractor
from services.ingestion.chunker import chunk_text

logger = logging.getLogger(__name__)

# BP-03 step 2: doc_type classification keywords. Explicit code prefixes
# (tier 1) are checked before generic words (tier 2) so that e.g. an
# incident report mentioning "maintenance" is not classed as a work order.
DOC_TYPE_KEYWORD_TIERS = [
    [
        ("manual", ["oem"]),
        ("work_order", ["wo-"]),
        ("sop", ["sop-"]),
        ("incident", ["inc-", "near-miss"]),
        ("inspection", ["insp-"]),
        ("regulation", ["oisd"]),
    ],
    [
        ("manual", ["manual", "datasheet"]),
        ("work_order", ["work order", "maintenance"]),
        ("sop", ["procedure", "instruction"]),
        ("incident", ["incident"]),
        ("inspection", ["inspection"]),
        ("regulation", ["factory act", "regulation", "standard"]),
    ],
]


def detect_file_kind(filename: str, file_bytes: bytes) -> str:
    """BP-03 step 2: physical file kind, driving which extractor runs."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "digital_pdf" if pdf_extractor.has_selectable_text(file_bytes) else "scanned_pdf"
    if ext in (".png", ".jpg", ".jpeg"):
        return "image"
    if ext in (".xlsx", ".xls"):
        return "spreadsheet"
    if ext == ".csv":
        return "csv"
    return "text"


def classify_doc_type(filename: str, first_pass_text: str) -> str:
    """BP-03 step 2: business document type from filename keywords or first-pass text.

    The filename is the stronger signal, so it is checked against all types
    before falling back to the document body.
    """
    for haystack in (filename.lower(), first_pass_text[:2000].lower()):
        for tier in DOC_TYPE_KEYWORD_TIERS:
            for doc_type, keywords in tier:
                if any(kw in haystack for kw in keywords):
                    return doc_type
    return "other"


def extract_text(file_kind: str, file_bytes: bytes) -> list[dict]:
    """BP-03 step 3: route to the extractor for this file kind. Returns [{page_number, text}]."""
    if file_kind == "digital_pdf":
        return pdf_extractor.extract_pages(file_bytes)
    if file_kind == "scanned_pdf":
        return ocr_extractor.extract_pages_from_scanned_pdf(file_bytes)
    if file_kind == "image":
        return ocr_extractor.extract_pages_from_image(file_bytes)
    if file_kind == "spreadsheet":
        return spreadsheet_extractor.extract_pages_from_excel(file_bytes)
    if file_kind == "csv":
        return spreadsheet_extractor.extract_pages_from_csv(file_bytes)
    return [{"page_number": 1, "text": file_bytes.decode("utf-8", errors="replace")}]


def embed_and_store(chunks: list[dict], document_id: str, db) -> None:
    """BP-03 step 5: embed chunks, add to ChromaDB, record chroma_id in SQLite."""
    if not chunks:
        return
    # Imported lazily so unit tests can run without loading the embedding model
    from services.embeddings import embedding_service
    from services.vector_store import vector_store

    embeddings = embedding_service.embed_batch([c["text"] for c in chunks])
    chroma_ids = vector_store.add_chunks(chunks, embeddings, document_id)
    for chunk, chroma_id in zip(chunks, chroma_ids):
        row = db.query(Chunk).filter_by(id=chunk["chunk_id"]).first()
        if row is not None:
            row.chroma_id = chroma_id
    db.commit()


def process_document(document_id: str, file_bytes: bytes) -> None:
    """Background task entry point (BP-03 steps 2-5 + finalise).

    Never raises: any failure marks the document 'failed' with a safe
    error message and logs the full traceback server-side (SO-03).
    """
    logger.info("Ingestion started for document %s", document_id)
    with SessionLocal() as db:
        doc = db.query(Document).filter_by(id=document_id).first()
        if doc is None:
            logger.error("Ingestion aborted: document %s not found", document_id)
            return

        try:
            file_kind = detect_file_kind(doc.filename, file_bytes)
            pages = extract_text(file_kind, file_bytes)
            doc.doc_type = classify_doc_type(doc.filename, pages[0]["text"] if pages else "")
            doc.page_count = len(pages)
            db.commit()

            all_chunks = []
            for page in pages:
                made = chunk_text(
                    page["text"], document_id=document_id, page_number=page["page_number"],
                    db=db, start_index=len(all_chunks),
                )
                all_chunks.extend(made)

            if not all_chunks:
                raise ValueError("No text could be extracted from this file.")

            embed_and_store(all_chunks, document_id, db)

            # BP-03 step 6: Gemini entity extraction (rate-limited inside)
            from services.ingestion.entity_extractor import extract_entities_for_document

            entity_count, failed_chunks = asyncio.run(
                extract_entities_for_document(document_id, all_chunks, db)
            )

            if failed_chunks and failed_chunks == len(all_chunks):
                # Every chunk's Gemini call failed (e.g. a quota outage) — this is a broken
                # extraction, not a document that genuinely has zero entities, so it must not
                # be marked 'done'. Text/chunks/embeddings already stored remain usable (the
                # document is still searchable via Copilot); only entity-driven features
                # (Knowledge Graph, patterns, alerts) will miss it until a retry.
                doc.status = "failed"
                doc.error_msg = "Entity extraction failed. The document text was saved — please retry shortly."
                doc.entity_count = 0
                db.commit()
                logger.error(
                    "Ingestion for document %s: entity extraction failed on all %d chunks",
                    document_id, len(all_chunks),
                )
                return

            # BP-03 step 7: update the in-memory graph and build co-occurrence edges
            from models.entity import Entity as EntityModel
            from services.graph_builder import build_cooccurrence_edges, graph_builder

            for entity in db.query(EntityModel).filter_by(document_id=document_id).all():
                graph_builder.add_entity_node(entity)
            build_cooccurrence_edges(document_id, db)

            doc.status = "done"
            doc.entity_count = entity_count
            db.commit()

            # BP-08: proactive alert checks. Wrapped separately so a bug in alert checking
            # can never cause a successfully-ingested document to be marked 'failed'.
            try:
                from services.alert_service import check_after_ingestion

                check_after_ingestion(document_id, db)
            except Exception:
                logger.exception("Alert checks failed after ingesting document %s", document_id)

            logger.info(
                "Ingestion done for document %s: %d pages, %d chunks (kind %s)",
                document_id, len(pages), len(all_chunks), file_kind,
            )
        except Exception:
            logger.exception("Ingestion failed for document %s", document_id)
            db.rollback()
            doc.status = "failed"
            doc.error_msg = "Processing failed. The file may be corrupt, password-protected, or empty."
            db.commit()
