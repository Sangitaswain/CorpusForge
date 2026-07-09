"""F4 pattern intelligence and F5 compliance gap API endpoints (BP-06, BP-07)."""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ApiError, ok
from models.chunk import Chunk
from models.compliance_gap import ComplianceGap
from models.document import Document
from models.pattern import Pattern
from routers.documents import validate_uuid
from services.compliance_engine import run_compliance_check
from services.pattern_engine import run_pattern_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

SEVERITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
COMPLIANCE_SEVERITY_ORDER = {"Audit-Critical": 0, "High": 1, "Medium": 2, "Low": 3}
VERDICT_KEYS = ["compliant", "gap", "outdated", "undetermined"]


def _pattern_to_dict(pattern: Pattern, db: Session) -> dict:
    incident_ids = json.loads(pattern.incident_ids or "[]")
    citations = []
    for document_id in incident_ids:
        doc = db.query(Document).filter_by(id=document_id).first()
        if doc is not None:
            citations.append({"document_id": doc.id, "filename": doc.filename, "page_number": 1})
    return {
        "id": pattern.id,
        "title": pattern.title,
        "root_cause": pattern.root_cause,
        "recommendation": pattern.recommendation,
        "severity": pattern.severity,
        "incident_count": pattern.incident_count,
        "citations": citations,
        "equipment_tags": json.loads(pattern.equipment_tags or "[]"),
        "created_at": pattern.created_at,
        "last_run_at": pattern.last_run_at,
    }


@router.post("/patterns/run", status_code=202)
def trigger_pattern_analysis(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pattern_analysis)
    return ok({"message": "Pattern analysis started"})


@router.get("/patterns")
def list_patterns(db: Session = Depends(get_db)):
    patterns = db.query(Pattern).all()
    patterns.sort(key=lambda p: SEVERITY_ORDER.get(p.severity, 99))
    return ok([_pattern_to_dict(p, db) for p in patterns])


@router.get("/patterns/{pattern_id}")
def get_pattern(pattern_id: str, db: Session = Depends(get_db)):
    validate_uuid(pattern_id)
    pattern = db.query(Pattern).filter_by(id=pattern_id).first()
    if pattern is None:
        raise ApiError(404, "Pattern not found.", "not_found")
    return ok(_pattern_to_dict(pattern, db))


def _citation(doc: Document | None) -> dict | None:
    if doc is None:
        return None
    return {"document_id": doc.id, "filename": doc.filename, "page_number": 1}


def _gap_to_dict(gap: ComplianceGap, db: Session) -> dict:
    reg_doc = db.query(Document).filter_by(id=gap.reg_document_id).first()
    procedure_doc = (
        db.query(Document).filter_by(id=gap.matched_procedure_id).first() if gap.matched_procedure_id else None
    )
    procedure_chunk = db.query(Chunk).filter_by(id=gap.matched_chunk_id).first() if gap.matched_chunk_id else None
    return {
        "id": gap.id,
        "regulation_ref": gap.regulation_ref,
        "clause_number": gap.clause_number,
        "clause_text": gap.clause_text,
        "verdict": gap.verdict,
        "explanation": gap.explanation,
        "severity": gap.severity,
        "recommendation": gap.recommendation,
        "procedure_text": procedure_chunk.text if procedure_chunk else None,
        "regulation_citation": _citation(reg_doc),
        "procedure_citation": _citation(procedure_doc),
        "created_at": gap.created_at,
    }


def _compliance_summary(gaps: list[ComplianceGap]) -> dict:
    counts = {key: 0 for key in VERDICT_KEYS}
    for gap in gaps:
        if gap.verdict in counts:
            counts[gap.verdict] += 1
    last_run_at = max((g.created_at for g in gaps if g.created_at), default=None)
    return {"total_clauses": len(gaps), **counts, "last_run_at": last_run_at}


def _sorted_gaps(db: Session) -> list[ComplianceGap]:
    gaps = db.query(ComplianceGap).all()
    gaps.sort(key=lambda g: COMPLIANCE_SEVERITY_ORDER.get(g.severity, 99))
    return gaps


@router.post("/compliance/run", status_code=202)
def trigger_compliance_check(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_compliance_check)
    return ok({"message": "Compliance check started"})


@router.get("/compliance")
def list_compliance_gaps(db: Session = Depends(get_db)):
    gaps = _sorted_gaps(db)
    return ok({"summary": _compliance_summary(gaps), "gaps": [_gap_to_dict(g, db) for g in gaps]})


@router.get("/compliance/export")
def export_compliance_report(db: Session = Depends(get_db)):
    """SO-03: the report is built from filenames and clause text only — never a
    storage path, database ID, or exception detail."""
    gaps = _sorted_gaps(db)
    lines = [
        "CorpusForge Compliance Gap Report",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Total clauses assessed: {len(gaps)}",
        "",
    ]
    for gap in gaps:
        reg_doc = db.query(Document).filter_by(id=gap.reg_document_id).first()
        procedure_doc = (
            db.query(Document).filter_by(id=gap.matched_procedure_id).first() if gap.matched_procedure_id else None
        )
        lines.append(f"{gap.regulation_ref} Clause {gap.clause_number} - {gap.verdict.upper()} ({gap.severity})")
        lines.append(f"Regulation document: {reg_doc.filename if reg_doc else 'Unknown'}")
        lines.append(f"Plant procedure: {procedure_doc.filename if procedure_doc else 'No matching procedure found'}")
        lines.append(f"Explanation: {gap.explanation}")
        if gap.recommendation:
            lines.append(f"Recommendation: {gap.recommendation}")
        lines.append("")

    return PlainTextResponse(
        "\n".join(lines),
        headers={"Content-Disposition": "attachment; filename=compliance_report.txt"},
    )
