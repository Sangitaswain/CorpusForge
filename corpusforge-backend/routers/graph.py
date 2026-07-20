import logging
import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.responses import ApiError, ok
from models.entity import Entity
from routers.documents import validate_uuid
from services.graph_builder import graph_builder
from services.node_summary import get_node_summary

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


def resolve_canonical_node_id(entity_id: str, db: Session) -> str:
    """Any duplicate entity row id maps to a canonical node id (see GraphBuilder)."""
    if entity_id in graph_builder.G:
        return entity_id
    entity_row = db.query(Entity).filter_by(id=entity_id).first()
    if entity_row is None:
        raise ApiError(404, "Entity not found.", "not_found")
    node_id = graph_builder.find_node_by_value(entity_row.normalized_value or entity_row.value)
    if node_id is None:
        raise ApiError(404, "Entity not found.", "not_found")
    return node_id


@router.get("/node/{entity_id}")
def get_graph_node(entity_id: str, db: Session = Depends(get_db)):
    validate_uuid(entity_id)
    entity_id = resolve_canonical_node_id(entity_id, db)

    attrs = graph_builder.G.nodes[entity_id]
    connected = graph_builder.get_neighbours_with_metadata(entity_id, db)
    return ok(
        {
            "entity": {
                "id": entity_id,
                "name": attrs.get("name"),
                "type": attrs.get("type"),
                "document_count": len(set(attrs.get("document_ids", []))),
                "degree": len(
                    set(graph_builder.G.neighbors(entity_id)) | set(graph_builder.G.predecessors(entity_id))
                ),
            },
            "connected": connected,
        }
    )


@router.get("/node/{entity_id}/summary")
def get_graph_node_summary(entity_id: str, db: Session = Depends(get_db)):
    # PANEL-9 — explicit, user-triggered only; never fired automatically on panel open.
    # get_node_summary itself caches per entity_id so a repeat view never re-spends quota.
    validate_uuid(entity_id)
    entity_id = resolve_canonical_node_id(entity_id, db)
    return ok(get_node_summary(entity_id, db))
