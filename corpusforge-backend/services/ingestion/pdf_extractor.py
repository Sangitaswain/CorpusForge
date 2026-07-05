"""Digital PDF text extraction via pdfplumber (BP-03 step 3)."""
import io
import logging

import pdfplumber

logger = logging.getLogger(__name__)


def format_tables(tables: list) -> str:
    """Convert pdfplumber tables to markdown-style pipe-delimited text."""
    lines = []
    for table in tables or []:
        for row in table:
            cells = [str(cell).strip() if cell is not None else "" for cell in row]
            if any(cells):
                lines.append(" | ".join(cells))
        lines.append("")
    return "\n".join(lines).strip()


def extract_pages(file_bytes: bytes) -> list[dict]:
    """Extract text and tables per page. Returns [{page_number, text}]."""
    pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            tables_text = format_tables(page.extract_tables())
            combined = (text + "\n" + tables_text).strip()
            pages.append({"page_number": page_num + 1, "text": combined})
    return pages


def has_selectable_text(file_bytes: bytes) -> bool:
    """True if the PDF yields more than 100 chars of extractable text (BP-03 step 2)."""
    try:
        pages = extract_pages(file_bytes)
    except Exception:
        return False
    return sum(len(p["text"]) for p in pages) > 100
