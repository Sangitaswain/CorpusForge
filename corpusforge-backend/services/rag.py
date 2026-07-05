"""F3 Expert Copilot RAG pipeline (BP-04, thin slice for Step 3).

Graph context (Step 5) and follow-up suggestions (Step 4) are wired in later.
"""
import json
import logging
import re

import google.generativeai as genai
from sqlalchemy.orm import Session

from core.config import settings
from models.document import Document
from prompts.answer_generation import answer_generation_prompt
from schemas.query import Citation, QueryResponse

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)

NOT_FOUND_ANSWER = (
    "I don't have that information in the documents uploaded to CorpusForge. "
    "If you upload the relevant document, I will be able to answer this."
)

NOT_FOUND_RESPONSE = QueryResponse(
    answer=NOT_FOUND_ANSWER,
    confidence="Low",
    citations=[],
    used_graph=False,
    follow_ups=[],
)

CITATION_MARKER = re.compile(r"\s*\[DOC:\s*([^\]]+)\]")

# Industrial identifiers: P-101, C-205, FT-401, SOP-07, INC-2022-07, WO-2024-0312, OISD-STD-105
CODE_PATTERN = re.compile(r"\b(?:OISD(?:-[A-Z]+)?-\d+|[A-Z]{1,4}-\d{2,6}(?:-\d+)?)\b")

FOLLOW_UP_TEMPLATES = {
    "SOP": [
        "Which equipment does {e} apply to?",
        "What does {e} require?",
        "When was {e} last revised?",
    ],
    "INC": [
        "What caused {e}?",
        "Which equipment was involved in {e}?",
        "What corrective actions followed {e}?",
    ],
    "WO": [
        "Who performed {e}?",
        "Which equipment does {e} cover?",
        "When was {e} completed?",
    ],
    "OISD": [
        "Which procedures implement {e}?",
        "What does {e} require for compliance?",
        "Are there any gaps against {e}?",
    ],
    "default": [
        "What is the maintenance procedure for {e}?",
        "Has {e} been involved in any incidents?",
        "When was {e} last serviced?",
    ],
}


def generate_follow_up_questions(answer_text: str, entity_mentions: list[str]) -> list[str]:
    """Up to 3 follow-up questions built from entities in the answer/question (BP-04 step 10)."""
    candidates = list(dict.fromkeys(list(entity_mentions) + CODE_PATTERN.findall(answer_text)))
    follow_ups: list[str] = []
    for entity in candidates:
        prefix = entity.split("-")[0].upper()
        templates = FOLLOW_UP_TEMPLATES.get(prefix, FOLLOW_UP_TEMPLATES["default"])
        for template in templates:
            question = template.format(e=entity)
            if question not in follow_ups:
                follow_ups.append(question)
            if len(follow_ups) == 3:
                return follow_ups
    return follow_ups


def compute_confidence(distance: float) -> str:
    if distance < 0.3:
        return "High"
    if distance <= 0.5:
        return "Medium"
    return "Low"


def format_chunks_with_citations(hits: list[dict]) -> str:
    blocks = []
    for hit in hits:
        blocks.append(f"[chunk_id: {hit['chunk_id']}] (page {hit['page_number']})\n{hit['text']}")
    return "\n\n---\n\n".join(blocks)


def parse_answer_response(raw_response: str) -> dict:
    """SO-06 rule 4: never trust the model's output shape."""
    try:
        data = json.loads(raw_response)
        answer = str(data.get("answer", "")).strip()
        citations = data.get("raw_citations", [])
        if not isinstance(citations, list):
            citations = []
        return {"answer": answer, "raw_citations": [str(c) for c in citations]}
    except (json.JSONDecodeError, AttributeError, TypeError):
        return {"answer": "NOT_FOUND", "raw_citations": []}


def resolve_citations(raw_citations: list[str], hits: list[dict], db: Session) -> list[Citation]:
    """Map cited chunk_ids back to document filename + page number, deduplicated."""
    hits_by_chunk = {h["chunk_id"]: h for h in hits}
    citations: list[Citation] = []
    seen: set[tuple[str, int]] = set()
    for raw in raw_citations:
        chunk_id = raw.removeprefix("chunk_").strip()
        hit = hits_by_chunk.get(chunk_id) or hits_by_chunk.get(raw.strip())
        if hit is None:
            continue
        key = (hit["document_id"], hit["page_number"])
        if key in seen:
            continue
        doc = db.query(Document).filter_by(id=hit["document_id"]).first()
        if doc is None:
            continue
        seen.add(key)
        citations.append(
            Citation(document_id=doc.id, filename=doc.filename, page_number=hit["page_number"])
        )
    return citations


def answer_question(question: str, db: Session) -> QueryResponse:
    question = question.strip()[:500]  # SO-06 rule 2
    logger.info("Query received: %.100s...", question)  # SO-06 rule 5: first 100 chars only

    from services.embeddings import embedding_service
    from services.vector_store import vector_store

    question_embedding = embedding_service.embed(question)
    hits = vector_store.query(question_embedding, n_results=6)

    best_distance = hits[0]["distance"] if hits else 1.0
    if best_distance > 0.7:
        return NOT_FOUND_RESPONSE

    context_text = format_chunks_with_citations(hits)
    prompt = answer_generation_prompt(question, context_text)

    try:
        response = gemini_model.generate_content(
            prompt, generation_config={"response_mime_type": "application/json"}
        )
        raw_text = response.text
    except Exception:
        logger.exception("Gemini call failed for query")
        from core.responses import ApiError

        raise ApiError(502, "The answer service is temporarily unavailable. Please try again.", "llm_unavailable")

    parsed = parse_answer_response(raw_text)
    if parsed["answer"].strip() == "NOT_FOUND" or not parsed["answer"].strip():
        return NOT_FOUND_RESPONSE

    # Collect inline [DOC: ...] markers too, then strip them from the display text
    inline_ids = CITATION_MARKER.findall(parsed["answer"])
    answer_text = CITATION_MARKER.sub("", parsed["answer"]).strip()
    raw_citations = parsed["raw_citations"] + [i.strip() for i in inline_ids]

    citations = resolve_citations(raw_citations, hits, db)
    confidence = compute_confidence(best_distance)
    follow_ups = generate_follow_up_questions(answer_text, CODE_PATTERN.findall(question))

    return QueryResponse(
        answer=answer_text,
        confidence=confidence,
        citations=citations,
        used_graph=False,
        follow_ups=follow_ups,
    )
