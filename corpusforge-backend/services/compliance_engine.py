"""F5 Compliance Gap Detection Engine (BP-07): LangGraph
extract_clauses -> retrieve_best_procedure -> compare_and_verdict.

Free tier is 15 req/min: asyncio.sleep(4) between Gemini calls is mandatory —
do not remove it (CLAUDE.md permanent rule). Calls happen in two nodes
(extract_clauses, compare_and_verdict), so the rate limit is tracked with a
single counter threaded through the graph state rather than per-node.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

import google.generativeai as genai
from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from core.config import settings
from core.database import SessionLocal
from models.chunk import Chunk
from models.compliance_gap import ComplianceGap
from models.document import Document
from prompts.clause_comparison import clause_comparison_prompt, clause_extraction_prompt
from services.embeddings import embedding_service
from services.graph_builder import build_violates_edges
from services.vector_store import vector_store

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)

CLAUSE_TEXT_CHAR_LIMIT = 2000
DOCUMENT_TEXT_CHAR_LIMIT = 6000
PROCEDURE_DOC_TYPES = {"sop", "inspection"}
PROCEDURE_OVER_FETCH = 15
PROCEDURE_TOP_N = 3
UNDETERMINED_DISTANCE_THRESHOLD = 0.8
VALID_VERDICTS = {"compliant", "gap", "outdated", "undetermined"}
VALID_SEVERITIES = {"Audit-Critical", "High", "Medium", "Low"}


class ClauseRecord(TypedDict, total=False):
    clause_number: str
    clause_text: str
    regulation_ref: str
    reg_document_id: str
    procedure_document_id: str | None
    procedure_chunk_id: str | None
    procedure_filename: str
    procedure_text: str
    matched_procedure_id: str | None
    matched_chunk_id: str | None
    verdict: str
    explanation: str
    severity: str
    recommendation: str


class ComplianceState(TypedDict):
    clauses: list[ClauseRecord]
    gaps: list[dict]
    gemini_calls: int


def _derive_regulation_ref(filename: str) -> str:
    return Path(filename).stem[:100]


def _parse_clause_json(raw_response: str) -> list[dict]:
    """SO-06: validate the model output; malformed responses yield [] instead of crashing."""
    try:
        data = json.loads(raw_response)
        clauses = data.get("clauses", [])
        if not isinstance(clauses, list):
            return []
        valid = []
        for item in clauses:
            if not isinstance(item, dict):
                continue
            clause_number = str(item.get("clause_number", "")).strip()[:50]
            clause_text = str(item.get("clause_text", "")).strip()[:CLAUSE_TEXT_CHAR_LIMIT]
            regulation_ref = str(item.get("regulation_ref", "")).strip()[:100]
            if not clause_number or not clause_text:
                continue
            valid.append(
                {"clause_number": clause_number, "clause_text": clause_text, "regulation_ref": regulation_ref}
            )
        return valid
    except (json.JSONDecodeError, AttributeError, TypeError):
        return []


def _parse_verdict_json(raw_response: str) -> dict | None:
    """SO-06: validate the model output; malformed responses yield None instead of crashing."""
    try:
        data = json.loads(raw_response)
        verdict = str(data.get("verdict", "")).strip().lower()
        if verdict not in VALID_VERDICTS:
            return None
        explanation = str(data.get("explanation", "")).strip()[:2000]
        severity = str(data.get("severity", "")).strip()
        if severity not in VALID_SEVERITIES:
            severity = "Low"
        recommendation = str(data.get("recommendation", "")).strip()[:1000]
        return {
            "verdict": verdict,
            "explanation": explanation,
            "severity": severity,
            "recommendation": recommendation,
        }
    except (json.JSONDecodeError, AttributeError, TypeError):
        return None


def _filter_procedure_hits(hits: list[dict], doc_types: dict[str, str]) -> list[dict]:
    """Keep only hits from sop/inspection documents, best match first."""
    return [h for h in hits if doc_types.get(h["document_id"]) in PROCEDURE_DOC_TYPES][:PROCEDURE_TOP_N]


def _to_gap_row(clause: ClauseRecord) -> dict:
    return {
        "regulation_ref": clause["regulation_ref"],
        "clause_number": clause["clause_number"],
        "clause_text": clause["clause_text"],
        "reg_document_id": clause["reg_document_id"],
        "matched_procedure_id": clause.get("matched_procedure_id"),
        "matched_chunk_id": clause.get("matched_chunk_id"),
        "verdict": clause["verdict"],
        "explanation": clause["explanation"],
        "severity": clause["severity"],
        "recommendation": clause["recommendation"],
    }


async def _gemini_call(prompt: str, state: ComplianceState) -> str | None:
    """Shared rate-limited Gemini call, tracked across both nodes that use it."""
    if state["gemini_calls"] > 0:
        await asyncio.sleep(4)  # 15 req/min Gemini free tier — never remove
    state["gemini_calls"] += 1
    try:
        response = gemini_model.generate_content(
            prompt, generation_config={"response_mime_type": "application/json"}
        )
        return response.text
    except Exception:
        logger.exception("Gemini compliance engine call failed")
        return None


async def extract_clauses(state: ComplianceState, db: Session) -> ComplianceState:
    """Node 1: split every regulation document into numbered clauses via the ORM only (SO-07)."""
    clauses: list[ClauseRecord] = []
    reg_docs = db.query(Document).filter_by(doc_type="regulation", status="done").all()
    for doc in reg_docs:
        chunks = db.query(Chunk).filter_by(document_id=doc.id).order_by(Chunk.chunk_index).all()
        doc_text = " ".join(c.text for c in chunks)[:DOCUMENT_TEXT_CHAR_LIMIT]
        if not doc_text:
            continue

        prompt = clause_extraction_prompt(doc.original_name, doc_text)
        raw_text = await _gemini_call(prompt, state)
        if raw_text is None:
            continue

        for item in _parse_clause_json(raw_text):
            clauses.append(
                {
                    "clause_number": item["clause_number"],
                    "clause_text": item["clause_text"],
                    "regulation_ref": item["regulation_ref"] or _derive_regulation_ref(doc.original_name),
                    "reg_document_id": doc.id,
                }
            )
    state["clauses"] = clauses
    logger.info("Compliance engine extracted %d clauses from %d regulation documents", len(clauses), len(reg_docs))
    return state


def retrieve_best_procedure(state: ComplianceState, db: Session) -> ComplianceState:
    """Node 2: embed each clause and find the best matching SOP/inspection chunk (SO-07)."""
    doc_types = {d.id: d.doc_type for d in db.query(Document).all()}
    filenames = {d.id: d.filename for d in db.query(Document).all()}

    matched: list[ClauseRecord] = []
    for clause in state["clauses"]:
        embedding = embedding_service.embed(clause["clause_text"])
        hits = vector_store.query(embedding, n_results=PROCEDURE_OVER_FETCH)
        procedure_hits = _filter_procedure_hits(hits, doc_types)
        best = procedure_hits[0] if procedure_hits else None

        entry: ClauseRecord = dict(clause)  # type: ignore[assignment]
        if best is None or best["distance"] > UNDETERMINED_DISTANCE_THRESHOLD:
            entry["verdict"] = "undetermined"
            entry["explanation"] = "No matching plant procedure was found for this clause."
            entry["severity"] = "Low"
            entry["recommendation"] = ""
            entry["matched_procedure_id"] = None
            entry["matched_chunk_id"] = None
        else:
            entry["procedure_document_id"] = best["document_id"]
            entry["procedure_chunk_id"] = best["chunk_id"]
            entry["procedure_filename"] = filenames.get(best["document_id"], "")
            entry["procedure_text"] = best["text"]
        matched.append(entry)

    state["clauses"] = matched
    logger.info("Compliance engine matched procedures for %d clauses", len(matched))
    return state


async def compare_and_verdict(state: ComplianceState) -> ComplianceState:
    """Node 3: one Gemini call per matched clause, rate-limited to 15 req/min (SO-06)."""
    gaps: list[dict] = []
    for clause in state["clauses"]:
        if "verdict" in clause:
            gaps.append(_to_gap_row(clause))
            continue

        prompt = clause_comparison_prompt(
            regulation_ref=clause["regulation_ref"],
            clause_number=clause["clause_number"],
            clause_text=clause["clause_text"],
            procedure_filename=clause["procedure_filename"],
            procedure_text=clause["procedure_text"],
        )
        raw_text = await _gemini_call(prompt, state)
        parsed = _parse_verdict_json(raw_text) if raw_text is not None else None
        if parsed is None:
            parsed = {
                "verdict": "undetermined",
                "explanation": "Automatic comparison could not be completed for this clause.",
                "severity": "Low",
                "recommendation": "",
            }

        clause.update(parsed)  # type: ignore[typeddict-item]
        clause["matched_procedure_id"] = clause.get("procedure_document_id")
        clause["matched_chunk_id"] = clause.get("procedure_chunk_id")
        gaps.append(_to_gap_row(clause))

    state["gaps"] = gaps
    return state


def _build_graph(db: Session):
    async def _extract(state: ComplianceState) -> ComplianceState:
        return await extract_clauses(state, db)

    def _retrieve(state: ComplianceState) -> ComplianceState:
        return retrieve_best_procedure(state, db)

    graph = StateGraph(ComplianceState)
    graph.add_node("extract_clauses", _extract)
    graph.add_node("retrieve_best_procedure", _retrieve)
    graph.add_node("compare_and_verdict", compare_and_verdict)
    graph.set_entry_point("extract_clauses")
    graph.add_edge("extract_clauses", "retrieve_best_procedure")
    graph.add_edge("retrieve_best_procedure", "compare_and_verdict")
    graph.add_edge("compare_and_verdict", END)
    return graph.compile()


async def _run_graph(db: Session) -> list[dict]:
    compiled = _build_graph(db)
    initial_state: ComplianceState = {"clauses": [], "gaps": [], "gemini_calls": 0}
    result = await compiled.ainvoke(initial_state)
    return result["gaps"]


def run_compliance_check() -> int:
    """Background task entry point. Returns the number of compliance_gaps rows stored.

    Never raises: a failed run is logged server-side and leaves the
    existing compliance_gaps table untouched (SO-03).
    """
    with SessionLocal() as db:
        try:
            gaps = asyncio.run(_run_graph(db))
        except Exception:
            logger.exception("Compliance engine run failed")
            return 0

        now = datetime.now(timezone.utc).isoformat()
        db.query(ComplianceGap).delete()
        for gap in gaps:
            db.add(
                ComplianceGap(
                    id=str(uuid.uuid4()),
                    regulation_ref=gap["regulation_ref"],
                    clause_number=gap["clause_number"],
                    clause_text=gap["clause_text"],
                    reg_document_id=gap["reg_document_id"],
                    matched_procedure_id=gap["matched_procedure_id"],
                    matched_chunk_id=gap["matched_chunk_id"],
                    verdict=gap["verdict"],
                    explanation=gap["explanation"],
                    severity=gap["severity"],
                    recommendation=gap["recommendation"],
                    created_at=now,
                )
            )
        db.commit()
        logger.info("Compliance engine stored %d gap rows", len(gaps))

        # GB-3/PANEL-10 — turn genuine violations into real graph edges now that the fresh
        # gap rows are committed; never fabricated, only built from what matched above.
        build_violates_edges(db)

        return len(gaps)
