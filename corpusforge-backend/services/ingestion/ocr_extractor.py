"""OCR extraction for scanned PDFs and images via pytesseract (BP-03 step 3)."""
import io
import logging

import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

logger = logging.getLogger(__name__)


def extract_pages_from_scanned_pdf(file_bytes: bytes) -> list[dict]:
    """Convert PDF pages to images at 300 DPI and OCR each. Returns [{page_number, text}]."""
    images = convert_from_bytes(file_bytes, dpi=300)
    pages = []
    for page_num, image in enumerate(images):
        text = pytesseract.image_to_string(image, lang="eng")
        pages.append({"page_number": page_num + 1, "text": text.strip()})
    return pages


def extract_pages_from_image(file_bytes: bytes) -> list[dict]:
    """OCR a single PNG/JPG image. Returns [{page_number, text}]."""
    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image, lang="eng")
    return [{"page_number": 1, "text": text.strip()}]
