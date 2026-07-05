"""F4 Failure Pattern Engine (BP-06): LangGraph collect -> cluster -> synthesise.

Free tier is 15 req/min: asyncio.sleep(4) between Gemini calls is mandatory —
do not remove it (CLAUDE.md permanent rule).
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import TypedDict

import google.generativeai as genai
import numpy as np
from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from core.config import settings
from core.database import SessionLocal
from models.chunk import Chunk
from models.document import Document
from models.entity import Entity
from models.pattern import Pattern
from prompts.root_cause_synthesis import root_cause_synthesis_prompt
from services.embeddings import embedding_service

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)

SIMILARITY_THRESHOLD = 0.65
FEATURE_TEXT_CHAR_LIMIT = 2000


class IncidentFeature(TypedDict):
    document_id: str
    filename: str
    text: str
    equipment_tags: list[str]


class PatternState(TypedDict):
    incident_features: list[IncidentFeature]
    clusters: list[list[IncidentFeature]]
    patterns: list[dict]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    return float(np.dot(a_arr, b_arr) / denom) if denom else 0.0


def assign_severity(incident_count: int, has_major_incident: bool) -> str:
    """BP-06 severity assignment logic."""
    if incident_count >= 3 and has_major_incident:
        return "Critical"
    if incident_count >= 3:
        return "High"
    if incident_count == 2 and has_major_incident:
        return "High"
    return "Medium"


def _parse_pattern_json(raw_response: str) -> dict | None:
    """SO-06: validate the model output; malformed responses yield None instead of crashing."""
    try:
        data = json.loads(raw_response)
        title = str(data.get("title", "")).strip()
        root_cause = str(data.get("root_cause", "")).strip()
        recommendation = str(data.get("recommendation", "")).strip()
        if not title or not root_cause or not recommendation:
            return None
        return {
            "title": title[:200],
            "root_cause": root_cause[:2000],
            "recommendation": recommendation[:1000],
            "has_major_incident": bool(data.get("has_major_incident", False)),
        }
    except (json.JSONDecodeError, AttributeError, TypeError):
        return None


def collect_incidents(state: PatternState, db: Session) -> PatternState:
    """Node 1: build one feature summary per incident document, via the ORM only (SO-07)."""
    features: list[IncidentFeature] = []
    incident_docs = db.query(Document).filter_by(doc_type="incident", status="done").all()
    for doc in incident_docs:
        entities = db.query(Entity).filter_by(document_id=doc.id).all()
        equipment_tags = sorted({e.normalized_value or e.value for e in entities if e.entity_type == "equipment_tag"})
        chunks = (
            db.query(Chunk).filter_by(document_id=doc.id).order_by(Chunk.chunk_index).all()
        )
        body_text = " ".join(c.text for c in chunks)[:FEATURE_TEXT_CHAR_LIMIT]
        summary = f"Equipment: {', '.join(equipment_tags) or 'unknown'}. {body_text}"
        features.append(
            {
                "document_id": doc.id,
                "filename": doc.filename,
                "text": summary,
                "equipment_tags": equipment_tags,
            }
        )
    state["incident_features"] = features
    logger.info("Pattern engine collected %d incident documents", len(features))
    return state


def cluster_by_similarity(state: PatternState) -> PatternState:
    """Node 2: group incidents whose feature summaries have cosine similarity > 0.65."""
    features = state["incident_features"]
    n = len(features)
    if n < 2:
        state["clusters"] = []
        return state

    embeddings = [embedding_service.embed(f["text"]) for f in features]
    parent = list(range(n))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    for i in range(n):
        for j in range(i + 1, n):
            if _cosine_similarity(embeddings[i], embeddings[j]) > SIMILARITY_THRESHOLD:
                union(i, j)

    groups: dict[int, list[IncidentFeature]] = {}
    for idx, feature in enumerate(features):
        groups.setdefault(find(idx), []).append(feature)

    state["clusters"] = [group for group in groups.values() if len(group) >= 2]
    logger.info("Pattern engine formed %d clusters from %d incidents", len(state["clusters"]), n)
    return state


async def synthesise_root_cause(state: PatternState) -> PatternState:
    """Node 3: one Gemini call per qualifying cluster, rate-limited to 15 req/min."""
    patterns: list[dict] = []
    for index, cluster in enumerate(state["clusters"]):
        if index > 0:
            await asyncio.sleep(4)  # Gemini free tier 15 req/min — never remove

        incident_text = "\n\n".join(f"{f['filename']}: {f['text']}" for f in cluster)
        prompt = root_cause_synthesis_prompt(incident_text)
        try:
            response = gemini_model.generate_content(
                prompt, generation_config={"response_mime_type": "application/json"}
            )
            parsed = _parse_pattern_json(response.text)
        except Exception:
            logger.exception("Gemini root cause synthesis failed for a cluster of %d incidents", len(cluster))
            continue
        if parsed is None:
            continue

        equipment_tags = sorted({tag for f in cluster for tag in f["equipment_tags"]})
        patterns.append(
            {
                "title": parsed["title"],
                "root_cause": parsed["root_cause"],
                "recommendation": parsed["recommendation"],
                "severity": assign_severity(len(cluster), parsed["has_major_incident"]),
                "incident_count": len(cluster),
                "incident_ids": [f["document_id"] for f in cluster],
                "equipment_tags": equipment_tags,
            }
        )
    state["patterns"] = patterns
    return state


def _build_graph(db: Session):
    def _collect(state: PatternState) -> PatternState:
        return collect_incidents(state, db)

    graph = StateGraph(PatternState)
    graph.add_node("collect_incidents", _collect)
    graph.add_node("cluster_by_similarity", cluster_by_similarity)
    graph.add_node("synthesise_root_cause", synthesise_root_cause)
    graph.set_entry_point("collect_incidents")
    graph.add_edge("collect_incidents", "cluster_by_similarity")
    graph.add_edge("cluster_by_similarity", "synthesise_root_cause")
    graph.add_edge("synthesise_root_cause", END)
    return graph.compile()


async def _run_graph(db: Session) -> list[dict]:
    compiled = _build_graph(db)
    initial_state: PatternState = {"incident_features": [], "clusters": [], "patterns": []}
    result = await compiled.ainvoke(initial_state)
    return result["patterns"]


def run_pattern_analysis() -> int:
    """Background task entry point. Returns the number of patterns stored.

    Never raises: a failed run is logged server-side and leaves the
    existing patterns table untouched (SO-03).
    """
    with SessionLocal() as db:
        try:
            patterns = asyncio.run(_run_graph(db))
        except Exception:
            logger.exception("Pattern engine run failed")
            return 0

        now = datetime.now(timezone.utc).isoformat()
        db.query(Pattern).delete()
        for pattern in patterns:
            db.add(
                Pattern(
                    id=str(uuid.uuid4()),
                    title=pattern["title"],
                    root_cause=pattern["root_cause"],
                    recommendation=pattern["recommendation"],
                    severity=pattern["severity"],
                    incident_count=pattern["incident_count"],
                    incident_ids=json.dumps(pattern["incident_ids"]),
                    equipment_tags=json.dumps(pattern["equipment_tags"]),
                    created_at=now,
                    last_run_at=now,
                )
            )
        db.commit()
        logger.info("Pattern engine stored %d patterns", len(patterns))
        return len(patterns)
