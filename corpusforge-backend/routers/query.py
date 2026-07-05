import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ok
from schemas.query import QueryRequest
from services.rag import answer_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])


@router.post("")
def query(request: QueryRequest, db: Session = Depends(get_db)):
    result = answer_question(request.question, db)
    return ok(result.model_dump())
