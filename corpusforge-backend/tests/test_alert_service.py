import json
import uuid

from models.chunk import Chunk
from models.document import Document
from models.entity import Entity
from models.pattern import Pattern
from models.alert import Alert
from services.alert_service import (
    check_after_ingestion,
    create_alert,
    run_all_checks,
    _check_knowledge_cliff,
    _check_no_coverage,
    _check_pattern_match,
    _check_procedure_outdated,
)


def _doc(db, **kwargs):
    defaults = dict(id=str(uuid.uuid4()), filename="doc.txt", original_name="doc.txt", status="done")
    defaults.update(kwargs)
    doc = Document(**defaults)
    db.add(doc)
    db.commit()
    return doc


def _entity(db, document_id, entity_type, value, chunk_id=None):
    e = Entity(id=str(uuid.uuid4()), document_id=document_id, chunk_id=chunk_id,
               entity_type=entity_type, value=value, normalized_value=value)
    db.add(e)
    db.commit()
    return e


def _chunk(db, document_id, text, chunk_index=0):
    c = Chunk(id=str(uuid.uuid4()), document_id=document_id, chunk_index=chunk_index, text=text)
    db.add(c)
    db.commit()
    return c


def test_create_alert_dedups_same_type_and_source(test_db):
    first = create_alert("no_coverage", "t", "d", "High", ["OISD-1"], ["doc-1"], "r", test_db)
    second = create_alert("no_coverage", "t", "d2", "High", ["OISD-1"], ["doc-1"], "r2", test_db)
    assert first is not None
    assert second is None
    assert test_db.query(Alert).count() == 1


def test_create_alert_allows_different_source(test_db):
    first = create_alert("no_coverage", "t", "d", "High", ["OISD-1"], ["doc-1"], "r", test_db)
    second = create_alert("no_coverage", "t", "d", "High", ["OISD-1"], ["doc-2"], "r", test_db)
    assert first is not None
    assert second is not None
    assert test_db.query(Alert).count() == 2


def test_create_alert_allows_different_title_same_source(test_db):
    """Finding 1: _check_no_coverage and _check_pattern_match can each legitimately raise
    multiple distinct alerts for the same alert_type + source_doc_ids (e.g. two uncovered
    regulation_refs on the same regulation doc). Distinct titles must not dedup away."""
    first = create_alert("no_coverage", "t1", "d", "High", ["OISD-1"], ["doc-1"], "r", test_db)
    second = create_alert("no_coverage", "t2", "d", "High", ["OISD-1"], ["doc-1"], "r", test_db)
    assert first is not None
    assert second is not None
    assert test_db.query(Alert).count() == 2


def test_create_alert_does_not_resurrect_dismissed_alert(test_db):
    """Finding 2: dismiss is meant to be permanent, so a dismissed alert must still block
    recreation of the identical finding (same type, source docs, and title)."""
    first = create_alert("no_coverage", "t", "d", "High", ["OISD-1"], ["doc-1"], "r", test_db)
    assert first is not None
    first.is_dismissed = 1
    test_db.commit()

    second = create_alert("no_coverage", "t", "d", "High", ["OISD-1"], ["doc-1"], "r", test_db)
    assert second is None
    assert test_db.query(Alert).count() == 1


def test_check_pattern_match_flags_similar_incident(test_db):
    old1 = _doc(test_db, filename="INC-1.txt", doc_type="incident")
    old2 = _doc(test_db, filename="INC-2.txt", doc_type="incident")
    new_incident = _doc(test_db, filename="INC-3.txt", doc_type="incident")
    _entity(test_db, new_incident.id, "equipment_tag", "P-101")
    _chunk(test_db, new_incident.id, "bearing failure after contractor maintenance during P-101 assembly")

    pattern = Pattern(
        id=str(uuid.uuid4()), title="Bearing failures", root_cause="bearing failure after contractor maintenance",
        recommendation="Audit contractor QA", severity="Critical", incident_count=2,
        incident_ids=json.dumps([old1.id, old2.id]), equipment_tags=json.dumps(["P-101"]),
        created_at="2026-01-01T00:00:00",
    )
    test_db.add(pattern)
    test_db.commit()

    created = _check_pattern_match(test_db, incident_doc_ids=[new_incident.id])
    assert created == 1
    alert = test_db.query(Alert).filter_by(alert_type="pattern_match").first()
    assert alert is not None
    assert alert.severity == "Critical"
    assert json.loads(alert.source_doc_ids) == [new_incident.id]


def test_check_pattern_match_skips_incidents_already_in_pattern(test_db):
    member = _doc(test_db, filename="INC-1.txt", doc_type="incident")
    pattern = Pattern(
        id=str(uuid.uuid4()), title="Bearing failures", root_cause="bearing failure after contractor maintenance",
        recommendation="Audit contractor QA", severity="Critical", incident_count=1,
        incident_ids=json.dumps([member.id]), equipment_tags=json.dumps([]),
        created_at="2026-01-01T00:00:00",
    )
    test_db.add(pattern)
    test_db.commit()

    created = _check_pattern_match(test_db, incident_doc_ids=[member.id])
    assert created == 0
    assert test_db.query(Alert).count() == 0


def test_check_procedure_outdated_flags_newer_regulation(test_db):
    reg = _doc(test_db, filename="OISD-STD-105.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-105")
    _entity(test_db, reg.id, "date", "October 2024")

    sop = _doc(test_db, filename="SOP-12.txt", doc_type="sop")
    _entity(test_db, sop.id, "regulation_ref", "OISD-STD-105")
    _entity(test_db, sop.id, "date", "15 January 2023")

    created = _check_procedure_outdated(test_db, regulation_doc_ids=[reg.id])
    assert created == 1
    alert = test_db.query(Alert).filter_by(alert_type="procedure_outdated").first()
    assert alert is not None
    assert sorted(json.loads(alert.source_doc_ids)) == sorted([reg.id, sop.id])


def test_check_procedure_outdated_skips_when_procedure_is_newer(test_db):
    reg = _doc(test_db, filename="OISD-STD-105.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-105")
    _entity(test_db, reg.id, "date", "October 2019")

    sop = _doc(test_db, filename="SOP-12.txt", doc_type="sop")
    _entity(test_db, sop.id, "regulation_ref", "OISD-STD-105")
    _entity(test_db, sop.id, "date", "January 2025")

    created = _check_procedure_outdated(test_db, regulation_doc_ids=[reg.id])
    assert created == 0


def test_check_no_coverage_flags_uncovered_regulation(test_db):
    reg = _doc(test_db, filename="OISD-STD-999.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-999")

    created = _check_no_coverage(test_db, regulation_doc_ids=[reg.id])
    assert created == 1
    alert = test_db.query(Alert).filter_by(alert_type="no_coverage").first()
    assert alert is not None
    assert json.loads(alert.affected_entities) == ["OISD-STD-999"]


def test_check_no_coverage_skips_when_procedure_exists(test_db):
    reg = _doc(test_db, filename="OISD-STD-105.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-105")
    sop = _doc(test_db, filename="SOP-12.txt", doc_type="sop")
    _entity(test_db, sop.id, "regulation_ref", "OISD-STD-105")

    created = _check_no_coverage(test_db, regulation_doc_ids=[reg.id])
    assert created == 0


def test_check_knowledge_cliff_flags_old_sole_source(test_db):
    doc = _doc(test_db, filename="SOP-OLD.txt", doc_type="sop")
    _entity(test_db, doc.id, "equipment_tag", "V-999")
    _entity(test_db, doc.id, "date", "January 2015")

    created = _check_knowledge_cliff(test_db, candidate_doc_ids=[doc.id])
    assert created == 1
    alert = test_db.query(Alert).filter_by(alert_type="knowledge_cliff").first()
    assert alert is not None
    assert alert.severity == "Medium"


def test_check_knowledge_cliff_skips_when_recent(test_db):
    doc = _doc(test_db, filename="SOP-NEW.txt", doc_type="sop")
    _entity(test_db, doc.id, "equipment_tag", "V-998")
    _entity(test_db, doc.id, "date", "January 2025")

    created = _check_knowledge_cliff(test_db, candidate_doc_ids=[doc.id])
    assert created == 0


def test_check_knowledge_cliff_skips_when_covered_elsewhere(test_db):
    doc1 = _doc(test_db, filename="SOP-A.txt", doc_type="sop")
    doc2 = _doc(test_db, filename="SOP-B.txt", doc_type="sop")
    _entity(test_db, doc1.id, "equipment_tag", "V-997")
    _entity(test_db, doc1.id, "date", "January 2015")
    _entity(test_db, doc2.id, "equipment_tag", "V-997")

    created = _check_knowledge_cliff(test_db, candidate_doc_ids=[doc1.id])
    assert created == 0


def test_check_after_ingestion_routes_by_doc_type(test_db):
    reg = _doc(test_db, filename="OISD-STD-999.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-999")

    check_after_ingestion(reg.id, test_db)
    assert test_db.query(Alert).filter_by(alert_type="no_coverage").count() == 1


def test_run_all_checks_is_idempotent(test_db):
    reg = _doc(test_db, filename="OISD-STD-999.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-999")

    first = run_all_checks(test_db)
    second = run_all_checks(test_db)
    assert first == 1
    assert second == 0


def test_check_no_coverage_ignores_procedure_that_is_not_done(test_db):
    """A procedure document still processing (or failed) must not count as real coverage —
    its entity extraction may not have completed, so treating it as covering the regulation
    would be trusting data that doesn't exist yet."""
    reg = _doc(test_db, filename="OISD-STD-105.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-105")
    sop = _doc(test_db, filename="SOP-12.txt", doc_type="sop", status="processing")
    _entity(test_db, sop.id, "regulation_ref", "OISD-STD-105")

    created = _check_no_coverage(test_db, regulation_doc_ids=[reg.id])
    assert created == 1


def test_check_knowledge_cliff_ignores_other_document_that_is_not_done(test_db):
    """A second document mentioning the same equipment tag must not suppress a
    knowledge_cliff alert if that second document isn't 'done' — an incomplete document
    isn't a real second source yet."""
    doc1 = _doc(test_db, filename="SOP-A.txt", doc_type="sop")
    doc2 = _doc(test_db, filename="SOP-B.txt", doc_type="sop", status="processing")
    _entity(test_db, doc1.id, "equipment_tag", "V-996")
    _entity(test_db, doc1.id, "date", "January 2015")
    _entity(test_db, doc2.id, "equipment_tag", "V-996")

    created = _check_knowledge_cliff(test_db, candidate_doc_ids=[doc1.id])
    assert created == 1


def test_check_after_ingestion_checks_procedure_side_too(test_db):
    """Ingesting a new regulation already checks it against every existing procedure. The
    reverse must also fire: ingesting a new procedure that's already outdated against an
    existing regulation must trigger procedure_outdated too, not just wait for the next
    manual 'Check Now'."""
    reg = _doc(test_db, filename="OISD-STD-105.txt", doc_type="regulation")
    _entity(test_db, reg.id, "regulation_ref", "OISD-STD-105")
    _entity(test_db, reg.id, "date", "October 2024")

    sop = _doc(test_db, filename="SOP-12.txt", doc_type="sop")
    _entity(test_db, sop.id, "regulation_ref", "OISD-STD-105")
    _entity(test_db, sop.id, "date", "15 January 2023")

    check_after_ingestion(sop.id, test_db)
    assert test_db.query(Alert).filter_by(alert_type="procedure_outdated").count() == 1
    assert test_db.query(Alert).count() == 1
