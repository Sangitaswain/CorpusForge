import logging
import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ApiError, ok
from models.entity import Entity
from routers.documents import validate_uuid
from services.graph_builder import graph_builder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["graph"])


def validate_entity_focus(value: str) -> str:
    # SO-05: strip whitespace, max 100 chars, alphanumeric + common symbols only
    if len(value) > 100:
        raise ApiError(400, "Focus parameter too long.", "invalid_focus")
    return re.sub(r"[^a-zA-Z0-9 ._\-()]", "", value).strip()


@router.get("")
def get_graph(focus: str | None = None):
    focus_value = validate_entity_focus(focus) if focus else None
    return ok(graph_builder.to_frontend_json(focus_value or None))


@router.get("/search")
def search_graph_entities(q: str | None = None):
    # SEARCH-2 — autocomplete-as-you-type backing endpoint.
    query = validate_entity_focus(q) if q else ""
    if not query:
        return ok([])
    return ok(graph_builder.search_entities(query))


@router.get("/node/{entity_id}")
def get_graph_node(entity_id: str, db: Session = Depends(get_db)):
    validate_uuid(entity_id)
    if entity_id not in graph_builder.G:
        # Fall back to the entity row: any duplicate row id maps to a canonical node
        entity_row = db.query(Entity).filter_by(id=entity_id).first()
        if entity_row is None:
            raise ApiError(404, "Entity not found.", "not_found")
        node_id = graph_builder.find_node_by_value(entity_row.normalized_value or entity_row.value)
        if node_id is None:
            raise ApiError(404, "Entity not found.", "not_found")
        entity_id = node_id

    attrs = graph_builder.G.nodes[entity_id]
    connected = graph_builder.get_neighbours_with_metadata(entity_id, db)
    return ok(
        {
            "entity": {
                "id": entity_id,
                "name": attrs.get("name"),
                "type": attrs.get("type"),
                "document_count": len(set(attrs.get("document_ids", []))),
            },
            "connected": connected,
        }
    )
