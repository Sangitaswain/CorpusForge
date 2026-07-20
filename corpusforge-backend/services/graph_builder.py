"""F2 Knowledge Graph service (BP-05).

In-memory NetworkX DiGraph, loaded from SQLite at startup and updated after
every ingestion. Entity rows that share (entity_type, normalized_value) are
merged into one canonical node — the node id is the first entity row's id —
so P-101 mentioned in three documents is a single node.
"""
import logging
import uuid as uuid_lib

import networkx as nx
from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from models.document import Document
from models.entity import Entity
from models.relationship import Relationship

logger = logging.getLogger(__name__)


def _canonical_key(entity_type: str, normalized_value: str) -> tuple[str, str]:
    return (entity_type, (normalized_value or "").lower())


class GraphBuilder:
    def __init__(self):
        self.G = nx.DiGraph()
        self._key_to_node: dict[tuple[str, str], str] = {}
        # entity row id -> canonical node id (for resolving relationship endpoints)
        self._entity_to_node: dict[str, str] = {}

    def load_from_db(self, db: Session):
        self.__init__()
        for entity in db.query(Entity).all():
            self.add_entity_node(entity)
        for rel in db.query(Relationship).all():
            self.add_relationship_edge(rel)
        logger.info(
            "Knowledge graph loaded: %d nodes, %d edges",
            self.G.number_of_nodes(), self.G.number_of_edges(),
        )

    def add_entity_node(self, entity: Entity) -> str:
        """Add or merge an entity into the graph. Returns the canonical node id."""
        key = _canonical_key(entity.entity_type, entity.normalized_value or entity.value)
        node_id = self._key_to_node.get(key)
        if node_id is None:
            node_id = entity.id
            self._key_to_node[key] = node_id
            self.G.add_node(
                node_id,
                name=entity.normalized_value or entity.value,
                type=entity.entity_type,
                document_ids=[entity.document_id],
            )
        else:
            docs = self.G.nodes[node_id]["document_ids"]
            if entity.document_id not in docs:
                docs.append(entity.document_id)
        self._entity_to_node[entity.id] = node_id
        return node_id

    def add_relationship_edge(self, rel: Relationship):
        source = self._entity_to_node.get(rel.source_entity_id, rel.source_entity_id)
        target = self._entity_to_node.get(rel.target_entity_id, rel.target_entity_id)
        if source not in self.G or target not in self.G:
            return
        self.G.add_edge(source, target, type=rel.rel_type, document_id=rel.source_document_id)

    def find_node_by_value(self, value: str) -> str | None:
        needle = value.strip().lower()
        for node_id, attrs in self.G.nodes(data=True):
            if attrs.get("name", "").lower() == needle:
                return node_id
        return None

    def search_entities(self, query: str, limit: int = 8) -> list[dict]:
        """Knowledge_Graph_Design_Bible.md SEARCH-2 — case-insensitive substring match
        over node names, prefix matches ranked ahead of mid-string matches. Simple on
        purpose: the corpus is small enough that a fuzzy/edit-distance library would be
        unjustified complexity (see SEARCH-2 scope decision)."""
        needle = query.strip().lower()
        if not needle:
            return []
        prefix_matches: list[tuple[str, dict]] = []
        substring_matches: list[tuple[str, dict]] = []
        for node_id, attrs in self.G.nodes(data=True):
            name_lower = (attrs.get("name") or "").lower()
            if name_lower.startswith(needle):
                prefix_matches.append((node_id, attrs))
            elif needle in name_lower:
                substring_matches.append((node_id, attrs))
        ordered = prefix_matches + substring_matches
        return [
            {"id": node_id, "name": attrs.get("name"), "type": attrs.get("type")}
            for node_id, attrs in ordered[:limit]
        ]

    def to_frontend_json(self, focus_entity_value: str | None = None) -> dict:
        G_sub = self.G
        if focus_entity_value:
            focus_id = self.find_node_by_value(focus_entity_value)
            if focus_id:
                subgraph_nodes = (
                    {focus_id} | set(self.G.neighbors(focus_id)) | set(self.G.predecessors(focus_id))
                )
                G_sub = self.G.subgraph(subgraph_nodes)
        # NODE-4 — `date` entities are never drawn as floating canvas nodes; they surface
        # only through the Coordinate Rail (PANEL-8, get_timeline_for_node), which reads
        # them straight from the DB rather than from graph edges.
        drawable_nodes = [(nid, a) for nid, a in G_sub.nodes(data=True) if a.get("type") != "date"]
        drawable_ids = {nid for nid, _ in drawable_nodes}
        drawable_links = [
            (u, v, a) for u, v, a in G_sub.edges(data=True) if u in drawable_ids and v in drawable_ids
        ]
        return {
            "nodes": [
                {
                    "id": node_id,
                    "name": attrs.get("name"),
                    "type": attrs.get("type"),
                    "document_count": len(set(attrs.get("document_ids", []))),
                    # IA-4/IA-5 — total real connections in the full graph, vs. however many
                    # of them are actually drawn in this (possibly ego-limited) response. Lets
                    # the frontend render a "+N more" affordance honestly instead of guessing.
                    "degree": len(set(self.G.neighbors(node_id)) | set(self.G.predecessors(node_id))),
                }
                for node_id, attrs in drawable_nodes
            ],
            "links": [
                {
                    "source": u,
                    "target": v,
                    "type": attrs.get("type"),
                    "document_id": attrs.get("document_id"),
                }
                for u, v, attrs in drawable_links
            ],
            "node_count": len(drawable_nodes),
            "edge_count": len(drawable_links),
        }

    def get_neighbours_with_metadata(self, node_id: str, db: Session) -> list[dict]:
        if node_id not in self.G:
            return []
        result = []
        seen: set[str] = set()
        for neighbour_id in list(self.G.neighbors(node_id)) + list(self.G.predecessors(node_id)):
            if neighbour_id in seen:
                continue
            seen.add(neighbour_id)
            edge_data = (
                self.G.edges[node_id, neighbour_id]
                if self.G.has_edge(node_id, neighbour_id)
                else self.G.edges[neighbour_id, node_id]
            )
            neighbour_attrs = self.G.nodes[neighbour_id]
            doc = db.query(Document).filter_by(id=edge_data.get("document_id")).first()
            result.append(
                {
                    "id": neighbour_id,
                    "entity": neighbour_attrs.get("name"),
                    "type": neighbour_attrs.get("type"),
                    "relationship": edge_data.get("type"),
                    "source_document": doc.filename if doc else None,
                    "source_document_id": doc.id if doc else None,
                }
            )
        return result

    def get_timeline_for_node(self, node_id: str, db: Session) -> list[dict]:
        """PANEL-8 — the Coordinate Rail: `date` entities co-occurring with the focus,
        most recent first. "Co-occurring" means sharing a source document with the focus
        entity, same as every other co-occurrence relationship on this graph (BP-03 step
        7) — dates just never get a drawn edge for it (NODE-4)."""
        if node_id not in self.G:
            return []
        document_ids = set(self.G.nodes[node_id].get("document_ids", []))
        if not document_ids:
            return []
        date_entities = (
            db.query(Entity)
            .filter(Entity.entity_type == "date", Entity.document_id.in_(document_ids))
            .all()
        )
        doc_cache: dict[str, Document | None] = {}
        entries = []
        for entity in date_entities:
            if entity.document_id not in doc_cache:
                doc_cache[entity.document_id] = db.query(Document).filter_by(id=entity.document_id).first()
            doc = doc_cache[entity.document_id]
            label = entity.normalized_value or entity.value
            try:
                # Entity extraction already isolated the date string, so this must parse
                # as a clean date on its own — `fuzzy=True` would happily pull a bogus
                # date out of unrelated digits in genuinely non-date text.
                sort_key = date_parser.parse(label)
            except (ValueError, OverflowError):
                sort_key = None
            entries.append(
                {
                    "id": entity.id,
                    "label": label,
                    "sort_date": sort_key.date().isoformat() if sort_key else None,
                    "source_document": doc.filename if doc else None,
                    "source_document_id": doc.id if doc else None,
                    "_sort_key": sort_key,
                }
            )
        # Unparseable dates are low-priority context (NODE-4) — sorted after every real date.
        parsed = [e for e in entries if e["_sort_key"] is not None]
        unparsed = [e for e in entries if e["_sort_key"] is None]
        parsed.sort(key=lambda e: e["_sort_key"], reverse=True)
        for e in parsed + unparsed:
            del e["_sort_key"]
        return parsed + unparsed


# BP-03 step 7 co-occurrence rules: (source_type, target_type, rel_type)
# Directions read as: SOURCE --REL--> TARGET
COOCCURRENCE_RULES = [
    ("equipment_tag", "procedure_code", "MAINTAINED_BY"),
    ("incident_id", "equipment_tag", "INVOLVES"),
    ("procedure_code", "regulation_ref", "GOVERNED_BY"),
    ("work_order_id", "person", "PERFORMED_BY"),
]


def build_cooccurrence_edges(document_id: str, db: Session) -> int:
    """BP-03 step 7: create relationship rows + in-memory edges for one document.

    Entities are grouped per canonical value inside the document, then each
    rule links every (source, target) pair of matching types.
    """
    entities = db.query(Entity).filter_by(document_id=document_id).all()
    by_type: dict[str, dict[tuple[str, str], Entity]] = {}
    for entity in entities:
        key = _canonical_key(entity.entity_type, entity.normalized_value or entity.value)
        by_type.setdefault(entity.entity_type, {}).setdefault(key, entity)

    created = 0
    for source_type, target_type, rel_type in COOCCURRENCE_RULES:
        for source in by_type.get(source_type, {}).values():
            for target in by_type.get(target_type, {}).values():
                exists = (
                    db.query(Relationship)
                    .filter_by(
                        source_entity_id=source.id,
                        target_entity_id=target.id,
                        rel_type=rel_type,
                        source_document_id=document_id,
                    )
                    .first()
                )
                if exists:
                    continue
                rel = Relationship(
                    id=str(uuid_lib.uuid4()),
                    source_entity_id=source.id,
                    target_entity_id=target.id,
                    rel_type=rel_type,
                    source_document_id=document_id,
                )
                db.add(rel)
                graph_builder.add_relationship_edge(rel)
                created += 1
    db.commit()
    logger.info("Co-occurrence rules created %d edges for document %s", created, document_id)
    return created


# Singleton — one shared graph per process
graph_builder = GraphBuilder()
