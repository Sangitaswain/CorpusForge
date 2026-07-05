"""Text chunking into overlapping passages (BP-03 step 4).

Target ~600 tokens per chunk with ~100 tokens of overlap. Token counts are
estimated as word_count * 1.3 — no tokenizer library needed.
"""
import logging
import re
import uuid

logger = logging.getLogger(__name__)

TARGET_TOKENS = 600
OVERLAP_TOKENS = 100
WORDS_PER_TOKEN = 1.3

TARGET_WORDS = int(TARGET_TOKENS / WORDS_PER_TOKEN)   # ~461 words
OVERLAP_WORDS = int(OVERLAP_TOKENS / WORDS_PER_TOKEN)  # ~76 words


def estimate_tokens(text: str) -> float:
    return len(text.split()) * WORDS_PER_TOKEN


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.?!])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _split_long_sentence(sentence: str) -> list[str]:
    """Break a sentence longer than the target into overlapping word windows."""
    words = sentence.split()
    pieces = []
    start = 0
    while start < len(words):
        pieces.append(" ".join(words[start : start + TARGET_WORDS]))
        if start + TARGET_WORDS >= len(words):
            break
        start += TARGET_WORDS - OVERLAP_WORDS
    return pieces


def chunk_text(text: str, document_id: str, page_number: int, db, start_index: int = 0) -> list[dict]:
    """Split one page's text into overlapping chunks.

    Inserts chunk rows into the chunks table when a db session is given
    (pass db=None for pure text splitting, e.g. in tests).
    Returns [{chunk_id, text, page_number}].
    """
    if not text or not text.strip():
        return []

    sentences = []
    for sentence in _split_sentences(text):
        if estimate_tokens(sentence) > TARGET_TOKENS:
            sentences.extend(_split_long_sentence(sentence))
        else:
            sentences.append(sentence)

    chunk_texts = []
    current: list[str] = []
    current_words = 0
    for sentence in sentences:
        sentence_words = len(sentence.split())
        if current and (current_words + sentence_words) * WORDS_PER_TOKEN > TARGET_TOKENS:
            chunk_texts.append(" ".join(current))
            # Overlap: carry the last ~100 tokens of sentences into the next chunk
            overlap: list[str] = []
            overlap_words = 0
            for prev in reversed(current):
                prev_words = len(prev.split())
                if overlap_words + prev_words > OVERLAP_WORDS:
                    break
                overlap.insert(0, prev)
                overlap_words += prev_words
            current = overlap
            current_words = overlap_words
        current.append(sentence)
        current_words += sentence_words
    if current:
        chunk_texts.append(" ".join(current))

    chunks = []
    for offset, chunk in enumerate(chunk_texts):
        chunk_id = str(uuid.uuid4())
        if db is not None:
            from models.chunk import Chunk

            db.add(
                Chunk(
                    id=chunk_id,
                    document_id=document_id,
                    page_number=page_number,
                    chunk_index=start_index + offset,
                    text=chunk,
                    token_count=int(estimate_tokens(chunk)),
                )
            )
        chunks.append({"chunk_id": chunk_id, "text": chunk, "page_number": page_number})
    if db is not None:
        db.commit()
    return chunks
