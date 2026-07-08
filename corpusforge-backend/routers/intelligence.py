"""F4 pattern intelligence API endpoints (BP-06)."""
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ApiError, ok
from models.document import Document
from models.pattern import Pattern
from routers.documents import validate_uuid
from services.pattern_engine import run_pattern_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

SEVERITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


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
