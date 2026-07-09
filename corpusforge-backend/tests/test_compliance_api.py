import uuid

from models.compliance_gap import ComplianceGap
from models.document import Document


def test_compliance_run_endpoint_returns_accepted(test_client):
    response = test_client.post("/api/v1/intelligence/compliance/run")
    assert response.status_code in [200, 202]
    assert "message" in response.json()["data"]


def test_get_compliance_returns_correct_schema(test_client):
    response = test_client.get("/api/v1/intelligence/compliance")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "summary" in data
    assert "gaps" in data
    summary = data["summary"]
    for field in ["total_clauses", "compliant", "gap", "outdated", "undetermined"]:
        assert field in summary


def test_compliance_summary_counts_are_consistent(test_client, test_db):
    gap = ComplianceGap(
        id=str(uuid.uuid4()), regulation_ref="OISD-STD-105", clause_number="4.2",
        clause_text="Calibrate every 6 months", verdict="gap", severity="Audit-Critical",
        explanation="Procedure says annual", recommendation="Update SOP-12",
        created_at="2026-06-26T10:00:00",
    )
    test_db.add(gap)
    test_db.commit()

    response = test_client.get("/api/v1/intelligence/compliance")
    summary = response.json()["data"]["summary"]
    assert summary["total_clauses"] == summary["compliant"] + summary["gap"] + summary["outdated"] + summary["undetermined"]


def test_compliance_export_returns_file(test_client):
    response = test_client.get("/api/v1/intelligence/compliance/export")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    assert "attachment" in response.headers.get("content-disposition", "")


def test_compliance_export_contains_no_internal_paths(test_client, test_db):
    gap = ComplianceGap(
        id=str(uuid.uuid4()), regulation_ref="OISD-STD-105", clause_number="4.2",
        clause_text="Calibrate every 6 months", verdict="gap", severity="Audit-Critical",
        explanation="Procedure says annual", recommendation="Update SOP-12",
        created_at="2026-06-26T10:00:00",
    )
    test_db.add(gap)
    test_db.commit()

    response = test_client.get("/api/v1/intelligence/compliance/export")
    content = response.text
    assert "/app/data" not in content
    assert "sqlite" not in content.lower()
    assert "traceback" not in content.lower()


def test_verdict_values_are_valid(test_client, test_db):
    gap = ComplianceGap(
        id=str(uuid.uuid4()), regulation_ref="OISD-STD-105", clause_number="4.2",
        clause_text="Calibrate every 6 months", verdict="gap", severity="Audit-Critical",
        explanation="Procedure says annual", recommendation="Update SOP-12",
        created_at="2026-06-26T10:00:00",
    )
    test_db.add(gap)
    test_db.commit()

    response = test_client.get("/api/v1/intelligence/compliance")
    gap_data = response.json()["data"]["gaps"]
    for g in gap_data:
        assert g["verdict"] in ["compliant", "gap", "outdated", "undetermined"]
        assert g["severity"] in ["Audit-Critical", "High", "Medium", "Low"]


def test_gap_includes_both_citations_when_procedure_matched(test_client, test_db):
    reg_doc = Document(
        id=str(uuid.uuid4()), filename="OISD-STD-105.pdf", original_name="OISD-STD-105.pdf",
        doc_type="regulation", status="done",
    )
    sop_doc = Document(
        id=str(uuid.uuid4()), filename="SOP-12.pdf", original_name="SOP-12.pdf",
        doc_type="sop", status="done",
    )
    test_db.add_all([reg_doc, sop_doc])
    test_db.commit()

    gap = ComplianceGap(
        id=str(uuid.uuid4()), regulation_ref="OISD-STD-105", clause_number="4.2",
        clause_text="Calibrate every 6 months", verdict="gap", severity="Audit-Critical",
        explanation="Procedure says annual", recommendation="Update SOP-12",
        reg_document_id=reg_doc.id, matched_procedure_id=sop_doc.id,
        created_at="2026-06-26T10:00:00",
    )
    test_db.add(gap)
    test_db.commit()

    response = test_client.get("/api/v1/intelligence/compliance")
    gap_data = response.json()["data"]["gaps"][0]
    assert gap_data["regulation_citation"] == {"document_id": reg_doc.id, "filename": reg_doc.filename, "page_number": 1}
    assert gap_data["procedure_citation"] == {"document_id": sop_doc.id, "filename": sop_doc.filename, "page_number": 1}


def test_gap_omits_procedure_citation_when_no_match(test_client, test_db):
    reg_doc = Document(
        id=str(uuid.uuid4()), filename="OISD-STD-105.pdf", original_name="OISD-STD-105.pdf",
        doc_type="regulation", status="done",
    )
    test_db.add(reg_doc)
    test_db.commit()

    gap = ComplianceGap(
        id=str(uuid.uuid4()), regulation_ref="OISD-STD-105", clause_number="9.1",
        clause_text="Undeterminable clause", verdict="undetermined", severity="Low",
        explanation="No matching plant procedure was found for this clause.", recommendation="",
        reg_document_id=reg_doc.id, matched_procedure_id=None,
        created_at="2026-06-26T10:00:00",
    )
    test_db.add(gap)
    test_db.commit()

    response = test_client.get("/api/v1/intelligence/compliance")
    gap_data = response.json()["data"]["gaps"][0]
    assert gap_data["procedure_citation"] is None
    assert gap_data["regulation_citation"]["document_id"] == reg_doc.id
