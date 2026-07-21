import json
import uuid

from models.document import Document
from models.pattern import Pattern
from services.pattern_engine import assign_severity, cluster_by_similarity


def test_pattern_run_endpoint_returns_accepted(test_client):
    response = test_client.post("/api/v1/intelligence/patterns/run")
    assert response.status_code in [200, 202]
    assert "message" in response.json()["data"]


def test_pattern_run_endpoint_never_calls_the_real_engine(test_client, mock_background_engines):
    """Regression test: run_pattern_analysis opens its own SessionLocal() rather than
    accepting a db session, so the test_client/get_db override alone does not stop it from
    hitting the real on-disk database and real Gemini API. Only mock_background_engines
    (conftest.py) does. If this test starts failing, a real pattern run is firing during
    the test suite again."""
    pattern_mock, _ = mock_background_engines
    test_client.post("/api/v1/intelligence/patterns/run")
    assert pattern_mock.called


def test_get_patterns_returns_array(test_client):
    response = test_client.get("/api/v1/intelligence/patterns")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_get_pattern_by_id_validates_uuid(test_client):
    response = test_client.get("/api/v1/intelligence/patterns/not-a-uuid")
    assert response.status_code == 400


def test_get_pattern_returns_404_for_unknown_id(test_client):
    response = test_client.get(f"/api/v1/intelligence/patterns/{uuid.uuid4()}")
    assert response.status_code == 404


def test_pattern_schema_is_complete(test_client, test_db):
    doc = Document(
        id=str(uuid.uuid4()), filename="INC-2022-07.pdf", original_name="INC-2022-07.pdf",
        doc_type="incident", status="done",
    )
    test_db.add(doc)
    test_db.commit()

    p = Pattern(
        id=str(uuid.uuid4()),
        title="Test Pattern",
        root_cause="Common cause",
        recommendation="Fix it",
        severity="High",
        incident_count=2,
        incident_ids=json.dumps([doc.id]),
        equipment_tags=json.dumps(["P-101"]),
        created_at="2026-06-26T10:00:00",
        last_run_at="2026-06-26T10:00:00",
    )
    test_db.add(p)
    test_db.commit()

    response = test_client.get("/api/v1/intelligence/patterns")
    data = response.json()["data"]
    assert len(data) >= 1
    pattern = data[0]
    required_fields = [
        "id", "title", "root_cause", "severity", "incident_count",
        "equipment_tags", "recommendation", "citations", "created_at", "last_run_at",
    ]
    for field in required_fields:
        assert field in pattern, f"Field '{field}' missing from pattern response"
    assert pattern["citations"] == [{"document_id": doc.id, "filename": doc.filename, "page_number": 1}]


def test_severity_assignment():
    assert assign_severity(incident_count=3, has_major_incident=True) == "Critical"
    assert assign_severity(incident_count=3, has_major_incident=False) == "High"
    assert assign_severity(incident_count=2, has_major_incident=True) == "High"
    assert assign_severity(incident_count=2, has_major_incident=False) == "Medium"


def test_clustering_groups_similar_incidents():
    incidents = [
        {"document_id": "doc1", "filename": "INC-1", "equipment_tags": [],
         "text": "Equipment: P-101. bearing failure after contractor maintenance"},
        {"document_id": "doc2", "filename": "INC-2", "equipment_tags": [],
         "text": "Equipment: P-101. bearing seized after contractor service"},
        {"document_id": "doc3", "filename": "INC-3", "equipment_tags": [],
         "text": "Equipment: P-101. bearing damage following contractor work"},
        {"document_id": "doc4", "filename": "INC-4", "equipment_tags": [],
         "text": "Equipment: E-204. electrical fault in control panel"},
    ]
    state = {"incident_features": incidents, "clusters": [], "patterns": []}
    result = cluster_by_similarity(state)
    sizes = sorted((len(c) for c in result["clusters"]), reverse=True)
    assert sizes and sizes[0] >= 2
