from services.ingestion.chunker import chunk_text


def test_chunk_splits_long_text():
    long_text = " ".join(["word"] * 1000)
    chunks = chunk_text(long_text, document_id="test-id", page_number=1, db=None)
    assert len(chunks) > 1


def test_chunk_text_within_token_limit():
    long_text = " ".join(["word"] * 1000)
    chunks = chunk_text(long_text, document_id="test-id", page_number=1, db=None)
    for chunk in chunks:
        estimated_tokens = len(chunk["text"].split()) * 1.3
        assert estimated_tokens <= 700  # allow slight overflow from sentence boundary


def test_chunk_preserves_all_content():
    text = "This is sentence one. This is sentence two. This is sentence three."
    chunks = chunk_text(text, document_id="test-id", page_number=1, db=None)
    full_reconstructed = " ".join([c["text"] for c in chunks])
    for sentence in ["sentence one", "sentence two", "sentence three"]:
        assert sentence in full_reconstructed


def test_empty_text_returns_no_chunks():
    chunks = chunk_text("", document_id="test-id", page_number=1, db=None)
    assert chunks == []


def test_short_text_returns_one_chunk():
    text = "P-101 pressure is 18 bar."
    chunks = chunk_text(text, document_id="test-id", page_number=1, db=None)
    assert len(chunks) == 1
