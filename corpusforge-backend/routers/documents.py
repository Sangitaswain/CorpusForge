import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ApiError, ok
from models.chunk import Chunk
from models.document import Document
from schemas.document import DocumentItem, DocumentStatus, UploadResult
from services import file_storage
from services.ingestion.pipeline import process_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".xlsx", ".xls", ".csv", ".txt"}
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

# Magic bytes per extension (SO-05 check 3). CSV/TXT are plain text — no magic bytes.
MAGIC_BYTES = {
    ".pdf": [b"%PDF"],
    ".png": [b"\x89PNG"],
    ".jpg": [b"\xFF\xD8"],
    ".jpeg": [b"\xFF\xD8"],
    ".xlsx": [b"PK\x03\x04"],
    ".xls": [b"\xD0\xCF\x11\xE0", b"PK\x03\x04"],
}

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".csv": "text/csv",
    ".txt": "text/plain",
}


def sanitize_filename(filename: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    safe = Path(safe).name
    if safe.startswith("."):
        safe = "_" + safe
    return safe[:200]


def validate_uuid(value: str) -> str:
    try:
        uuid.UUID(value)
        return value
    except ValueError:
        raise ApiError(400, "Invalid ID format.", "invalid_id")


def get_document_or_404(document_id: str, db: Session) -> Document:
    validate_uuid(document_id)
    doc = db.query(Document).filter_by(id=document_id).first()
    if doc is None:
        raise ApiError(404, "Document not found.", "not_found")
    return doc


@router.post("/upload", status_code=201)
async def upload_document(file: UploadFile, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ApiError(415, f"File type '{ext}' is not supported.", "unsupported_file_type")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise ApiError(413, "File exceeds the 50 MB size limit.", "file_too_large")
    if not file_bytes:
        raise ApiError(422, "File is empty.", "empty_file")

    expected_magic = MAGIC_BYTES.get(ext)
    if expected_magic and not any(file_bytes.startswith(m) for m in expected_magic):
        raise ApiError(415, "File content does not match its extension — this file type is not supported.", "file_type_mismatch")

    content_hash = hashlib.sha256(file_bytes).hexdigest()
    existing = db.query(Document).filter_by(content_hash=content_hash).first()
    if existing is not None:
        raise ApiError(409, "This document has already been uploaded.", "duplicate_document")

    document_id = str(uuid.uuid4())
    safe_name = sanitize_filename(file.filename or f"upload{ext}")
    storage_path = f"documents/{document_id}{ext}"

    try:
        file_storage.upload_file(file_bytes, storage_path, CONTENT_TYPES[ext])
    except Exception:
        logger.exception("Storage upload failed for document %s", document_id)
        raise ApiError(500, "File storage failed. Please try again.", "storage_upload_failed")

    doc = Document(
        id=document_id,
        filename=safe_name,
        original_name=safe_name,
        file_url=storage_path,
        status="processing",
        content_hash=content_hash,
        uploaded_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(doc)
    db.commit()
    logger.info("Document %s uploaded (ext %s), queued for processing", document_id, ext)

    background_tasks.add_task(process_document, document_id, file_bytes)

    return ok(UploadResult(document_id=document_id, status="processing", filename=safe_name).model_dump())


@router.get("")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    items = [
        DocumentItem(
            id=d.id,
            filename=d.filename,
            doc_type=d.doc_type,
            status=d.status,
            page_count=d.page_count or 0,
            entity_count=d.entity_count or 0,
            uploaded_at=d.uploaded_at,
            error_msg=d.error_msg,
        ).model_dump()
        for d in docs
    ]
    return ok(items)


@router.get("/{document_id}/status")
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    doc = get_document_or_404(document_id, db)
    return ok(DocumentStatus(status=doc.status, entity_count=doc.entity_count or 0, error_msg=doc.error_msg).model_dump())


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = get_document_or_404(document_id, db)

    if doc.file_url:
        try:
            file_storage.delete_file(doc.file_url)
        except Exception:
            logger.warning("Storage delete failed for document %s", document_id)

    try:
        # Lazy import: keeps ChromaDB out of unit tests that never touch vectors
        from services.vector_store import vector_store

        vector_store.delete_document(document_id)
    except Exception:
        logger.warning("Vector cleanup failed for document %s", document_id)

    db.query(Chunk).filter_by(document_id=document_id).delete()
    db.delete(doc)
    db.commit()
    logger.info("Document %s deleted", document_id)
    return ok({"message": "Document deleted."})
