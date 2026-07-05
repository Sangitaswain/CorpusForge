import math

import pytest

from services.embeddings import embedding_service


def test_embed_returns_list_of_floats():
    result = embedding_service.embed("test text")
    assert isinstance(result, list)
    assert all(isinstance(x, float) for x in result)


def test_embed_returns_384_dimensions():
    result = embedding_service.embed("test text")
    assert len(result) == 384  # bge-small-en-v1.5 dimension


def test_embed_is_normalised():
    result = embedding_service.embed("test text")
    magnitude = math.sqrt(sum(x**2 for x in result))
    assert abs(magnitude - 1.0) < 0.001  # normalised vectors have magnitude ≈ 1


def test_embed_batch_matches_single():
    texts = ["first text", "second text"]
    batch = embedding_service.embed_batch(texts)
    single_0 = embedding_service.embed(texts[0])
    assert len(batch) == 2
    assert batch[0] == pytest.approx(single_0, abs=1e-5)


def test_embed_different_texts_produce_different_vectors():
    v1 = embedding_service.embed("pump maintenance procedure")
    v2 = embedding_service.embed("gas detector calibration")
    dot_product = sum(a * b for a, b in zip(v1, v2))
    assert dot_product < 0.95  # different texts should not be near-identical
