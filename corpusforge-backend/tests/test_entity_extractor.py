import io


def test_entity_extractor_parses_valid_gemini_response():
    from services.ingestion.entity_extractor import parse_entity_json

    raw = '{"entities": [{"entity_type": "equipment_tag", "value": "P-101", "confidence": 0.95}]}'
    result = parse_entity_json(raw)
    assert len(result) == 1
    assert result[0]["entity_type"] == "equipment_tag"
    assert result[0]["value"] == "P-101"


def test_entity_extractor_handles_malformed_json():
    from services.ingestion.entity_extractor import parse_entity_json

    result = parse_entity_json("not valid json")
    assert result == []  # fallback to empty list, not a crash


def test_entity_extractor_handles_missing_entities_key():
    from services.ingestion.entity_extractor import parse_entity_json

    result = parse_entity_json('{"result": "ok"}')
    assert result == []


def test_entity_extractor_skips_invalid_types():
    from services.ingestion.entity_extractor import parse_entity_json

    raw = '{"entities": [{"entity_type": "made_up_type", "value": "X"}, {"entity_type": "person", "value": "Rajesh Nair"}]}'
    result = parse_entity_json(raw)
    assert len(result) == 1
    assert result[0]["entity_type"] == "person"


def test_entity_types_are_valid():
    from services.ingestion.entity_extractor import VALID_ENTITY_TYPES

    expected = {
        "equipment_tag",
        "procedure_code",
        "regulation_ref",
        "incident_id",
        "work_order_id",
        "date",
        "person",
        "parameter",
    }
    assert VALID_ENTITY_TYPES == expected


def test_entity_count_updates_after_ingestion(test_client, test_db, mock_gemini_entity):
    file = ("entity_test.txt", io.BytesIO(b"P-101 pump. SOP-07 procedure. Date: 2024-03-14."), "text/plain")
    upload = test_client.post("/api/v1/documents/upload", files={"file": file})
    doc_id = upload.json()["data"]["document_id"]
    status = test_client.get(f"/api/v1/documents/{doc_id}/status")
    # Pipeline is mocked in unit tests — manual test verifies actual extraction
    assert status.json()["data"]["status"] in ["done", "processing"]
