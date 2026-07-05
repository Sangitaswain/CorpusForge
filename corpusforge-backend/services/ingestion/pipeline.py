"""F1 ingestion pipeline orchestrator (BP-03).

Runs as a FastAPI background task. Steps are added substep by substep:
extraction, chunking, and embedding arrive in Substeps 2.2-2.4; the full
wiring with status updates lands in Substep 2.6.
"""
import logging
from pathlib import Path

from services.ingestion import ocr_extractor, pdf_extractor, spreadsheet_extractor

logger = logging.getLogger(__name__)

# BP-03 step 2: doc_type classification keywords, checked in order.
DOC_TYPE_KEYWORDS = [
    ("manual", ["manual", "oem", "datasheet"]),
    ("work_order", ["wo-", "work order", "maintenance"]),
    ("sop", ["sop-", "procedure", "instruction"]),
    ("incident", ["inc-", "incident", "near-miss"]),
    ("inspection", ["inspection", "insp-"]),
    ("regulation", ["oisd", "factory act", "regulation", "standard"]),
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
    """BP-03 step 2: business document type from filename keywords or first-pass text."""
    haystack = (filename + "\n" + first_pass_text[:2000]).lower()
    for doc_type, keywords in DOC_TYPE_KEYWORDS:
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


def process_document(document_id: str, file_bytes: bytes) -> None:
    """Background task entry point. Placeholder until Substep 2.6 wires steps 2-5."""
    logger.info("Ingestion started for document %s", document_id)
