"""Spreadsheet and CSV extraction via pandas (BP-03 step 3)."""
import io
import logging

import pandas as pd

logger = logging.getLogger(__name__)


def _rows_to_pages(df: pd.DataFrame) -> list[dict]:
    pages = []
    for row_index, (_, row) in enumerate(df.iterrows()):
        text = " | ".join(f"{col}: {val}" for col, val in row.items() if pd.notna(val))
        pages.append({"page_number": row_index + 1, "text": text})
    return pages


def extract_pages_from_excel(file_bytes: bytes) -> list[dict]:
    # sheet_name=None loads every worksheet, not just the first — a workbook's later sheets
    # were previously dropped entirely with no error to indicate it.
    sheets = pd.read_excel(io.BytesIO(file_bytes), sheet_name=None)
    pages = [page for df in sheets.values() for page in _rows_to_pages(df)]
    for index, page in enumerate(pages):
        page["page_number"] = index + 1
    return pages


def extract_pages_from_csv(file_bytes: bytes) -> list[dict]:
    df = pd.read_csv(io.BytesIO(file_bytes))
    return _rows_to_pages(df)
