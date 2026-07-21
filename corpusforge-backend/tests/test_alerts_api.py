import json
import uuid

from models.alert import Alert
from models.document import Document
from models.entity import Entity


def _alert(db, **kwargs):
    defaults = dict(
        id=str(uuid.uuid4()), alert_type="no_coverage", title="t", description="d",
        severity="High", affected_entities=json.dumps([]), source_doc_ids=json.dumps([]),
        recommendation="r", is_dismissed=0, created_at="2026-07-21T00:00:00",
    )
    defaults.update(kwargs)
    a = Alert(**defaults)
    db.add(a)
    db.commit()
    return a


def test_list_alerts_returns_array(test_client):
    response = test_client.get("/api/v1/alerts")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_list_alerts_excludes_dismissed(test_client, test_db):
    _alert(test_db, is_dismissed=0)
    _alert(test_db, is_dismissed=1)
    response = test_client.get("/api/v1/alerts")
    assert len(response.json()["data"]) == 1


def test_list_alerts_includes_resolved_citations(test_client, test_db):
    doc = Document(id=str(uuid.uuid4()), filename="OISD-STD-999.pdf", original_name="OISD-STD-999.pdf", status="done")
    test_db.add(doc)
    test_db.commit()
    _alert(test_db, source_doc_ids=json.dumps([doc.id]))

    response = test_client.get("/api/v1/alerts")
    alert = response.json()["data"][0]
    assert alert["citations"] == [{"document_id": doc.id, "filename": doc.filename, "page_number": 1}]
    assert "source_doc_ids" not in alert


def test_alert_count_reflects_non_dismissed(test_client, test_db):
    _alert(test_db, is_dismissed=0)
    _alert(test_db, is_dismissed=0)
    _alert(test_db, is_dismissed=1)
    response = test_client.get("/api/v1/alerts/count")
    assert response.json()["data"] == {"unread_count": 2}


def test_check_now_creates_alerts_from_current_data(test_client, test_db):
    reg = Document(id=str(uuid.uuid4()), filename="OISD-STD-999.pdf", original_name="OISD-STD-999.pdf",
                    doc_type="regulation", status="done")
    test_db.add(reg)
    test_db.commit()
    test_db.add(Entity(id=str(uuid.uuid4()), document_id=reg.id, entity_type="regulation_ref",
                        value="OISD-STD-999", normalized_value="OISD-STD-999"))
    test_db.commit()

    response = test_client.post("/api/v1/alerts/check")
    assert response.status_code == 200
    assert response.json()["data"]["created"] == 1
    assert test_db.query(Alert).count() == 1


def test_dismiss_alert_validates_uuid(test_client):
    response = test_client.post("/api/v1/alerts/not-a-uuid/dismiss")
    assert response.status_code == 400


def test_dismiss_alert_returns_404_for_unknown_id(test_client):
    response = test_client.post(f"/api/v1/alerts/{uuid.uuid4()}/dismiss")
    assert response.status_code == 404


def test_dismiss_alert_marks_dismissed(test_client, test_db):
    a = _alert(test_db)
    response = test_client.post(f"/api/v1/alerts/{a.id}/dismiss")
    assert response.status_code == 200
    test_db.refresh(a)
    assert a.is_dismissed == 1


def test_dismiss_all_marks_every_non_dismissed(test_client, test_db):
    a1 = _alert(test_db, is_dismissed=0)
    a2 = _alert(test_db, is_dismissed=0)
    response = test_client.post("/api/v1/alerts/dismiss-all")
    assert response.status_code == 200
    test_db.refresh(a1)
    test_db.refresh(a2)
    assert a1.is_dismissed == 1
    assert a2.is_dismissed == 1
