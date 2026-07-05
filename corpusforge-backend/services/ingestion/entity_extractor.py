"""Gemini entity extraction (BP-03 step 6).

Free tier is 15 req/min: asyncio.sleep(4) between calls is mandatory —
do not remove it (CLAUDE.md permanent rule).
"""
import asyncio
import json
import logging
import uuid

import google.generativeai as genai

from core.config import settings
from models.entity import Entity
from prompts.entity_extraction import entity_extraction_prompt

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)

VALID_ENTITY_TYPES = {
    "equipment_tag",
    "procedure_code",
    "regulation_ref",
    "incident_id",
    "work_order_id",
    "date",
    "person",
    "parameter",
}

UPPERCASE_TYPES = {"equipment_tag", "procedure_code", "regulation_ref", "incident_id", "work_order_id"}


def normalize_value(entity_type: str, value: str) -> str:
    normalized = " ".join(value.split())
    if entity_type in UPPERCASE_TYPES:
        normalized = normalized.upper()
    return normalized[:100]


def parse_entity_json(raw_response: str) -> list[dict]:
    """SO-06: validate the model output; malformed responses yield [] instead of crashing."""
    try:
        data = json.loads(raw_response)
        entities = data.get("entities", [])
        if not isinstance(entities, list):
            return []
        valid = []
        for item in entities:
            if not isinstance(item, dict):
                continue
            entity_type = str(item.get("entity_type", "")).strip()
            value = str(item.get("value", "")).strip()
            if entity_type not in VALID_ENTITY_TYPES or not value:
                continue
            try:
                confidence = min(max(float(item.get("confidence", 1.0)), 0.0), 1.0)
            except (TypeError, ValueError):
                confidence = 1.0
            valid.append({"entity_type": entity_type, "value": value[:100], "confidence": confidence})
        return valid
    except (json.JSONDecodeError, AttributeError, TypeError):
        return []


async def extract_entities_for_document(document_id: str, chunks: list[dict], db) -> int:
    """Extract entities chunk by chunk and insert rows via the ORM.

    Returns the number of entities stored. Individual chunk failures are
    logged and skipped — one bad Gemini response must not fail ingestion.
    """
    total = 0
    for index, chunk in enumerate(chunks):
        if index > 0:
            await asyncio.sleep(4)  # 15 req/min Gemini free tier — never remove
        prompt = entity_extraction_prompt(chunk["text"])
        try:
            response = gemini_model.generate_content(
                prompt, generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text
        except Exception:
            logger.exception("Gemini entity extraction failed for a chunk of document %s", document_id)
            continue

        for item in parse_entity_json(raw_text):
            db.add(
                Entity(
                    id=str(uuid.uuid4()),
                    document_id=document_id,
                    chunk_id=chunk["chunk_id"],
                    entity_type=item["entity_type"],
                    value=item["value"],
                    normalized_value=normalize_value(item["entity_type"], item["value"]),
                    confidence=item["confidence"],
                )
            )
            total += 1
        db.commit()

    logger.info("Entity extraction stored %d entities for document %s", total, document_id)
    return total
