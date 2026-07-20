"""Per-entity AI summary (Knowledge_Graph_Design_Bible.md PANEL-9).

Explicit, user-triggered only — never called automatically when a panel opens.
The Gemini free tier is a hard daily cap (see Zero_Cost_Stack.md); a summary
is generated once per entity per process lifetime and served from this cache
on every subsequent panel open, rather than re-spending quota on a repeat view.
"""
import json
import logging

import google.generativeai as genai
from sqlalchemy.orm import Session

from core.config import settings
from core.responses import ApiError
from prompts.node_summary import node_summary_prompt
from services.graph_builder import graph_builder

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)

_cache: dict[str, dict] = {}


def format_connections(connected: list[dict]) -> str:
    lines = [f"{c['relationship']} {c['entity']}" for c in connected]
    return "\n".join(lines)


def parse_summary_response(raw_response: str) -> dict:
    """SO-06 rule 4 — never trust the model's output shape."""
    try:
        data = json.loads(raw_response)
        return {
            "summary": str(data.get("summary", "")).strip(),
            "recommended_next_step": str(data.get("recommended_next_step", "")).strip(),
        }
    except (json.JSONDecodeError, AttributeError, TypeError):
        return {"summary": "", "recommended_next_step": ""}


def get_node_summary(entity_id: str, db: Session) -> dict:
    if entity_id in _cache:
        return _cache[entity_id]

    if entity_id not in graph_builder.G:
        raise ApiError(404, "Entity not found.", "not_found")

    attrs = graph_builder.G.nodes[entity_id]
    connected = graph_builder.get_neighbours_with_metadata(entity_id, db)
    prompt = node_summary_prompt(attrs.get("name") or "", attrs.get("type") or "", format_connections(connected))

    try:
        response = gemini_model.generate_content(
            prompt, generation_config={"response_mime_type": "application/json"}
        )
        raw_text = response.text
    except Exception:
        # SO-05 — never log internal IDs; the stack trace from logger.exception is enough
        # to debug a Gemini failure without naming which entity triggered it.
        logger.exception("Gemini call failed for node summary request")
        raise ApiError(502, "The AI summary service is temporarily unavailable. Please try again.", "llm_unavailable")

    parsed = parse_summary_response(raw_text)
    if not parsed["summary"]:
        raise ApiError(502, "The AI summary service returned an unusable response. Please try again.", "llm_bad_response")

    _cache[entity_id] = parsed
    return parsed
