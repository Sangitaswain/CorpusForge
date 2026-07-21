"""F6 Proactive Alerts API endpoints (BP-08)."""
import json
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ApiError, ok
from models.alert import Alert
from models.document import Document
from routers.documents import validate_uuid
from services.alert_service import run_all_checks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _citations_for(source_doc_ids: list[str], db: Session) -> list[dict]:
    citations = []
    for doc_id in source_doc_ids:
        doc = db.query(Document).filter_by(id=doc_id).first()
        if doc is not None:
            citations.append({"document_id": doc.id, "filename": doc.filename, "page_number": 1})
    return citations


def _alert_to_dict(alert: Alert, db: Session) -> dict:
    source_doc_ids = json.loads(alert.source_doc_ids or "[]")
    return {
        "id": alert.id,
        "alert_type": alert.alert_type,
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity,
        "affected_entities": json.loads(alert.affected_entities or "[]"),
        "citations": _citations_for(source_doc_ids, db),
        "recommendation": alert.recommendation,
        "created_at": alert.created_at,
    }


@router.get("")
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter_by(is_dismissed=0).order_by(Alert.created_at.desc()).all()
    return ok([_alert_to_dict(a, db) for a in alerts])


@router.get("/count")
def get_alert_count(db: Session = Depends(get_db)):
    count = db.query(Alert).filter_by(is_dismissed=0).count()
    return ok({"unread_count": count})


@router.post("/check")
def check_alerts_now(db: Session = Depends(get_db)):
    created = run_all_checks(db)
    return ok({"created": created})


@router.post("/{alert_id}/dismiss")
def dismiss_alert(alert_id: str, db: Session = Depends(get_db)):
    validate_uuid(alert_id)
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if alert is None:
        raise ApiError(404, "Alert not found.", "not_found")
    alert.is_dismissed = 1
    db.commit()
    return ok({"message": "Alert dismissed."})


@router.post("/dismiss-all")
def dismiss_all_alerts(db: Session = Depends(get_db)):
    db.query(Alert).filter_by(is_dismissed=0).update({"is_dismissed": 1})
    db.commit()
    return ok({"message": "All alerts dismissed."})
