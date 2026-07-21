"""F6 Proactive Alerts Service (BP-08).

Called after every successful document ingestion (check_after_ingestion) and on demand via
the Alerts page "Check Now" button (run_all_checks). Every check here is pure DB/embedding
logic — none of the 4 checks call Gemini, so this feature costs zero Gemini quota.
"""
import json
import logging
import uuid
from datetime import datetime, timezone

import numpy as np
from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from models.alert import Alert
from models.chunk import Chunk
from models.document import Document
from models.entity import Entity
from models.pattern import Pattern
from services.compliance_engine import _derive_regulation_ref
from services.embeddings import embedding_service

logger = logging.getLogger(__name__)

PATTERN_MATCH_SIMILARITY_THRESHOLD = 0.7
KNOWLEDGE_CLIFF_YEARS = 5
FEATURE_TEXT_CHAR_LIMIT = 2000
PROCEDURE_DOC_TYPES = ("sop", "inspection", "manual")


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    return float(np.dot(a_arr, b_arr) / denom) if denom else 0.0


def _most_recent_date(document_id: str, db: Session) -> datetime | None:
    """Most recent parseable content date for a document, from its extracted `date`
    entities — never from Document.uploaded_at, which reflects when the file was
    physically uploaded, not what real-world date its content describes (every document
    in this project was uploaded within days of every other one, regardless of content)."""
    dates: list[datetime] = []
    for entity in db.query(Entity).filter_by(document_id=document_id, entity_type="date").all():
        label = entity.normalized_value or entity.value
        try:
            dates.append(date_parser.parse(label))
        except (ValueError, OverflowError):
            continue
    return max(dates) if dates else None


def _regulation_refs_for(document_id: str, filename: str, db: Session) -> set[str]:
    refs = {
        (e.normalized_value or e.value)
        for e in db.query(Entity).filter_by(document_id=document_id, entity_type="regulation_ref").all()
    }
    return refs or {_derive_regulation_ref(filename)}


def _incident_summary_text(doc: Document, db: Session) -> tuple[str, list[str]]:
    entities = db.query(Entity).filter_by(document_id=doc.id).all()
    equipment_tags = sorted({e.normalized_value or e.value for e in entities if e.entity_type == "equipment_tag"})
    chunks = db.query(Chunk).filter_by(document_id=doc.id).order_by(Chunk.chunk_index).all()
    body_text = " ".join(c.text for c in chunks)[:FEATURE_TEXT_CHAR_LIMIT]
    return f"Equipment: {', '.join(equipment_tags) or 'unknown'}. {body_text}", equipment_tags


def _alert_exists(alert_type: str, source_doc_ids: list[str], title: str, db: Session) -> bool:
    """Dedup guard: skip creating an alert if one with the same type, same source documents,
    AND same title already exists, so re-running 'Check Now' never spams duplicates.

    `title` is required in the key because `alert_type` + `source_doc_ids` alone is not
    unique per finding: _check_no_coverage can raise multiple alerts for the same
    regulation doc (one per uncovered regulation_ref), and _check_pattern_match can raise
    multiple alerts for the same incident doc (one per matched pattern). In both cases the
    distinct findings share alert_type and source_doc_ids but always have a distinct title
    (per-ref, per-pattern respectively), so title is what tells them apart.

    This check intentionally includes dismissed alerts (no `is_dismissed` filter): dismiss
    is meant to be permanent (there is no History view to bring a dismissed alert back), so
    a dismissed alert must still block recreation of the identical finding — otherwise
    clicking "Check Now" again, or re-ingesting the same document, would resurrect it under
    a new id."""
    key = sorted(source_doc_ids)
    for alert in db.query(Alert).filter_by(alert_type=alert_type).all():
        if sorted(json.loads(alert.source_doc_ids or "[]")) == key and alert.title == title:
            return True
    return False


def create_alert(
    alert_type: str,
    title: str,
    description: str,
    severity: str,
    affected_entities: list[str],
    source_doc_ids: list[str],
    recommendation: str,
    db: Session,
) -> Alert | None:
    """Creates and commits a new Alert row, unless a matching alert (same type, source docs,
    and title — dismissed or not, see _alert_exists) already exists. Returns the created
    row, or None if it was a duplicate."""
    if _alert_exists(alert_type, source_doc_ids, title, db):
        return None
    alert = Alert(
        id=str(uuid.uuid4()),
        alert_type=alert_type,
        title=title,
        description=description,
        severity=severity,
        affected_entities=json.dumps(affected_entities),
        source_doc_ids=json.dumps(source_doc_ids),
        recommendation=recommendation,
        is_dismissed=0,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(alert)
    db.commit()
    return alert


def _check_pattern_match(db: Session, incident_doc_ids: list[str] | None = None) -> int:
    """A candidate incident document whose embedded text is similar (cosine > 0.7) to an
    existing Pattern's root_cause becomes a pattern_match alert, inheriting that pattern's
    severity. An incident already listed in a pattern's own incident_ids is skipped — it
    trivially "matches" the pattern it helped form, which is not a new finding."""
    patterns = db.query(Pattern).all()
    if not patterns:
        return 0
    pattern_embeddings = [(p, embedding_service.embed(p.root_cause)) for p in patterns]

    query = db.query(Document).filter_by(doc_type="incident", status="done")
    if incident_doc_ids is not None:
        query = query.filter(Document.id.in_(incident_doc_ids))

    created = 0
    for doc in query.all():
        summary, equipment_tags = _incident_summary_text(doc, db)
        doc_embedding = embedding_service.embed(summary)

        for pattern, pattern_embedding in pattern_embeddings:
            if doc.id in json.loads(pattern.incident_ids or "[]"):
                continue
            if _cosine_similarity(doc_embedding, pattern_embedding) <= PATTERN_MATCH_SIMILARITY_THRESHOLD:
                continue
            alert = create_alert(
                alert_type="pattern_match",
                title=f"New incident matches known pattern: {pattern.title}",
                description=(
                    f"{doc.filename} closely resembles the existing pattern '{pattern.title}' "
                    f"({pattern.incident_count} prior incidents)."
                ),
                severity=pattern.severity or "Medium",
                affected_entities=equipment_tags,
                source_doc_ids=[doc.id],
                recommendation=pattern.recommendation,
                db=db,
            )
            if alert is not None:
                created += 1
    return created


def _check_procedure_outdated(db: Session, regulation_doc_ids: list[str] | None = None) -> int:
    """A regulation document whose most recent content date is newer than a procedure
    document that references the same regulation_ref becomes a procedure_outdated alert."""
    query = db.query(Document).filter_by(doc_type="regulation", status="done")
    if regulation_doc_ids is not None:
        query = query.filter(Document.id.in_(regulation_doc_ids))

    created = 0
    for reg_doc in query.all():
        reg_refs = _regulation_refs_for(reg_doc.id, reg_doc.original_name, db)
        reg_date = _most_recent_date(reg_doc.id, db)
        if reg_date is None:
            continue

        procedures = (
            db.query(Document)
            .filter(Document.doc_type.in_(PROCEDURE_DOC_TYPES), Document.status == "done")
            .all()
        )
        for proc_doc in procedures:
            proc_refs = _regulation_refs_for(proc_doc.id, proc_doc.original_name, db)
            if not (reg_refs & proc_refs):
                continue
            proc_date = _most_recent_date(proc_doc.id, db)
            if proc_date is None or reg_date <= proc_date:
                continue
            alert = create_alert(
                alert_type="procedure_outdated",
                title=f"{proc_doc.filename} may be outdated against {reg_doc.filename}",
                description=(
                    f"{reg_doc.filename} is dated {reg_date.date().isoformat()}, more recent than "
                    f"{proc_doc.filename} ({proc_date.date().isoformat()}). The procedure may not "
                    f"reflect the latest regulatory requirements."
                ),
                severity="High",
                affected_entities=sorted(reg_refs & proc_refs),
                source_doc_ids=[reg_doc.id, proc_doc.id],
                recommendation=f"Review {proc_doc.filename} against {reg_doc.filename} and update if needed.",
                db=db,
            )
            if alert is not None:
                created += 1
    return created


def _check_knowledge_cliff(db: Session, candidate_doc_ids: list[str] | None = None) -> int:
    """A sop/manual document is the sole source for one of its equipment tags, and its most
    recent content date is 5+ years old, becomes a knowledge_cliff alert."""
    now = datetime.now()
    query = db.query(Document).filter(Document.doc_type.in_(("sop", "manual")), Document.status == "done")
    if candidate_doc_ids is not None:
        query = query.filter(Document.id.in_(candidate_doc_ids))

    created = 0
    for doc in query.all():
        doc_date = _most_recent_date(doc.id, db)
        if doc_date is None or (now - doc_date).days / 365.25 < KNOWLEDGE_CLIFF_YEARS:
            continue

        tags = {
            (e.normalized_value or e.value)
            for e in db.query(Entity).filter_by(document_id=doc.id, entity_type="equipment_tag").all()
        }
        sole_coverage_tags = sorted(
            tag
            for tag in tags
            if db.query(Entity)
            .join(Document, Document.id == Entity.document_id)
            .filter(
                Entity.entity_type == "equipment_tag",
                Entity.normalized_value == tag,
                Entity.document_id != doc.id,
                Document.status == "done",
            )
            .first()
            is None
        )
        if not sole_coverage_tags:
            continue

        alert = create_alert(
            alert_type="knowledge_cliff",
            title=f"{doc.filename} is the only source for {', '.join(sole_coverage_tags)}",
            description=(
                f"{doc.filename} (dated {doc_date.date().isoformat()}) is over {KNOWLEDGE_CLIFF_YEARS} "
                f"years old and the only document covering {', '.join(sole_coverage_tags)}."
            ),
            severity="Medium",
            affected_entities=sole_coverage_tags,
            source_doc_ids=[doc.id],
            recommendation=f"Review and refresh {doc.filename}, or add a second source covering the same equipment.",
            db=db,
        )
        if alert is not None:
            created += 1
    return created


def _check_no_coverage(db: Session, regulation_doc_ids: list[str] | None = None) -> int:
    """A regulation_ref with zero sop/inspection/manual documents referencing it becomes a
    no_coverage alert."""
    query = db.query(Document).filter_by(doc_type="regulation", status="done")
    if regulation_doc_ids is not None:
        query = query.filter(Document.id.in_(regulation_doc_ids))

    created = 0
    for reg_doc in query.all():
        reg_refs = _regulation_refs_for(reg_doc.id, reg_doc.original_name, db)
        for ref in sorted(reg_refs):
            covered = (
                db.query(Entity)
                .join(Document, Document.id == Entity.document_id)
                .filter(
                    Entity.entity_type == "regulation_ref",
                    Entity.normalized_value == ref,
                    Document.doc_type.in_(PROCEDURE_DOC_TYPES),
                    Document.status == "done",
                )
                .first()
            )
            if covered is not None:
                continue
            alert = create_alert(
                alert_type="no_coverage",
                title=f"No procedure covers {ref}",
                description=(
                    f"{reg_doc.filename} references {ref}, but no SOP, inspection, or manual "
                    f"document references it."
                ),
                severity="High",
                affected_entities=[ref],
                source_doc_ids=[reg_doc.id],
                recommendation=f"Create or update a procedure that explicitly addresses {ref}.",
                db=db,
            )
            if alert is not None:
                created += 1
    return created


def check_after_ingestion(document_id: str, db: Session) -> None:
    """Called at the end of every successful document ingest (services/ingestion/pipeline.py).

    A newly-ingested regulation checks itself against every existing procedure — but the
    reverse direction matters too: a newly-ingested procedure can just as easily be outdated
    against an existing regulation, and that side was missing until now. _check_procedure_
    outdated does a full scan regardless of which side triggered it, so either direction
    finds the same pair.
    """
    doc = db.query(Document).filter_by(id=document_id).first()
    if doc is None:
        return
    if doc.doc_type == "incident":
        _check_pattern_match(db, incident_doc_ids=[document_id])
    elif doc.doc_type == "regulation":
        _check_procedure_outdated(db, regulation_doc_ids=[document_id])
        _check_no_coverage(db, regulation_doc_ids=[document_id])
    elif doc.doc_type in PROCEDURE_DOC_TYPES:
        _check_procedure_outdated(db)
    if doc.doc_type in ("sop", "manual"):
        _check_knowledge_cliff(db, candidate_doc_ids=[document_id])


def run_all_checks(db: Session) -> int:
    """Manual 'Check Now' trigger — scans current DB state, not just one new document.
    Returns the number of new (non-duplicate) alerts created. Never raises: a failed check
    is logged and simply contributes 0 new alerts (SO-03)."""
    created = 0
    for check in (_check_pattern_match, _check_procedure_outdated, _check_knowledge_cliff, _check_no_coverage):
        try:
            created += check(db)
        except Exception:
            logger.exception("Alert check %s failed", check.__name__)
    return created
