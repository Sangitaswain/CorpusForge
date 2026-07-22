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

from models.compliance_gap import ComplianceGap
from models.document import Document
from models.entity import Entity
from models.relationship import Relationship

# GB-3/PANEL-10 — only these verdicts represent an actual violation worth drawing an edge
# for; 'compliant' has nothing to flag and 'undetermined' has no matched procedure to link.
VIOLATION_VERDICTS = ("gap", "outdated")

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
                # Cast Number: node_id is this (canonical/first) row's id, so its cast_number
                # is the one permanent number for the whole merged node too.
                cast_number=entity.cast_number,
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
            else:
                # A focus value that matches no real node must return an empty result, not
                # silently fall back to the entire graph.
                G_sub = self.G.subgraph(set())
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
                    "cast_number": attrs.get("cast_number"),
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
        seen: set[str] = set()
        neighbours: list[tuple[str, dict]] = []
        for neighbour_id in list(self.G.neighbors(node_id)) + list(self.G.predecessors(node_id)):
            if neighbour_id in seen:
                continue
            seen.add(neighbour_id)
            edge_data = (
                self.G.edges[node_id, neighbour_id]
                if self.G.has_edge(node_id, neighbour_id)
                else self.G.edges[neighbour_id, node_id]
            )
            neighbours.append((neighbour_id, edge_data))

        # One batched query for every edge's document instead of one query per neighbour,
        # same fix as get_timeline_for_node.
        doc_ids = {edge_data.get("document_id") for _, edge_data in neighbours if edge_data.get("document_id")}
        doc_cache: dict[str, Document] = {
            doc.id: doc for doc in db.query(Document).filter(Document.id.in_(doc_ids)).all()
        }

        result = []
        for neighbour_id, edge_data in neighbours:
            neighbour_attrs = self.G.nodes[neighbour_id]
            doc = doc_cache.get(edge_data.get("document_id"))
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
        # One batched query for every source document instead of one query per unique
        # document_id — an entity spans few documents in practice, but there's no reason to
        # pay N round trips for it.
        entity_doc_ids = {e.document_id for e in date_entities}
        doc_cache: dict[str, Document] = {
            doc.id: doc for doc in db.query(Document).filter(Document.id.in_(entity_doc_ids)).all()
        }
        entries = []
        for entity in date_entities:
            doc = doc_cache.get(entity.document_id)
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

    def get_compliance_findings_for_node(self, node_id: str, db: Session) -> list[dict]:
        """PANEL-10 — compliance gaps naming this entity as the violating procedure or the
        violated regulation. A richer record (severity, explanation, recommendation) than a
        Connections row can hold, so it gets its own panel section rather than being folded
        into the generic ledger — same reasoning as the Timeline getting its own section
        instead of living in Connections (PANEL-8)."""
        if node_id not in self.G:
            return []
        attrs = self.G.nodes[node_id]
        node_type = attrs.get("type")
        node_name = (attrs.get("name") or "").strip().lower()

        query = db.query(ComplianceGap).filter(ComplianceGap.verdict.in_(VIOLATION_VERDICTS))
        if node_type == "regulation_ref":
            gaps = [g for g in query.all() if (g.regulation_ref or "").strip().lower() == node_name]
        elif node_type == "procedure_code":
            document_ids = set(attrs.get("document_ids", []))
            gaps = [g for g in query.all() if g.matched_procedure_id in document_ids]
        else:
            return []

        reg_doc_ids = {g.reg_document_id for g in gaps if g.reg_document_id}
        docs = {d.id: d for d in db.query(Document).filter(Document.id.in_(reg_doc_ids)).all()}
        return [
            {
                "id": g.id,
                "regulation_ref": g.regulation_ref,
                "clause_number": g.clause_number,
                "verdict": g.verdict,
                "severity": g.severity,
                "explanation": g.explanation,
                "recommendation": g.recommendation,
                "source_document": docs[g.reg_document_id].filename if g.reg_document_id in docs else None,
                "source_document_id": g.reg_document_id,
            }
            for g in gaps
        ]


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


def build_violates_edges(db: Session) -> int:
    """GB-3/PANEL-10 — one procedure_code --VIOLATES--> regulation_ref edge per compliance
    gap, for every gap that names a real regulation entity (matched by exact value, same
    canonicalization as everywhere else on this graph) and at least one real procedure_code
    entity in its matched procedure document. A gap that can't be matched to real entities on
    both ends is skipped outright — PANEL-10 is explicit that this must never fabricate a
    link the entity graph doesn't actually support.

    Call after every compliance engine run. `run_compliance_check` deletes and recreates
    every ComplianceGap row each time, so this always clears every prior VIOLATES
    relationship first — otherwise a regulation fixed by a later procedure revision would
    keep a stale violation edge forever. Clears both the DB rows and the in-memory graph
    edges — a bulk DB delete alone leaves the NetworkX graph (which only ever gains edges
    via add_relationship_edge, never loses them) silently out of sync with the database.
    """
    db.query(Relationship).filter_by(rel_type="VIOLATES").delete()
    stale_edges = [(u, v) for u, v, attrs in graph_builder.G.edges(data=True) if attrs.get("type") == "VIOLATES"]
    graph_builder.G.remove_edges_from(stale_edges)

    created = 0
    gaps = db.query(ComplianceGap).filter(ComplianceGap.verdict.in_(VIOLATION_VERDICTS)).all()
    for gap in gaps:
        if not gap.matched_procedure_id or not gap.regulation_ref:
            continue
        regulation_node_id = graph_builder.find_node_by_value(gap.regulation_ref)
        if regulation_node_id is None:
            continue
        # Only the procedure this document actually IS (its own designation, derived from
        # the filename convention "<CODE>_description.ext") gets a VIOLATES edge — not every
        # procedure_code entity merely referenced inside its text. SOP-12's document body
        # names "Related Procedures: SOP-03, SOP-14" in passing; those were never themselves
        # compared against the regulation, so drawing them a VIOLATES edge would assert a
        # finding the compliance engine never made — exactly what PANEL-10 forbids.
        procedure_doc = db.query(Document).filter_by(id=gap.matched_procedure_id).first()
        own_code = procedure_doc.filename.split("_")[0].strip().lower() if procedure_doc else None
        procedure_entities = (
            db.query(Entity)
            .filter_by(entity_type="procedure_code", document_id=gap.matched_procedure_id)
            .all()
        )
        if own_code:
            procedure_entities = [
                e for e in procedure_entities if (e.normalized_value or e.value or "").strip().lower() == own_code
            ]
        seen_procedure_nodes: set[str] = set()
        for proc_entity in procedure_entities:
            proc_node_id = graph_builder._entity_to_node.get(proc_entity.id, proc_entity.id)
            if proc_node_id in seen_procedure_nodes:
                continue
            seen_procedure_nodes.add(proc_node_id)
            rel = Relationship(
                id=str(uuid_lib.uuid4()),
                source_entity_id=proc_entity.id,
                target_entity_id=regulation_node_id,
                rel_type="VIOLATES",
                source_document_id=gap.matched_procedure_id,
            )
            db.add(rel)
            graph_builder.add_relationship_edge(rel)
            created += 1
    db.commit()
    logger.info("Compliance engine linked %d VIOLATES edges from %d gaps", created, len(gaps))
    return created


# Singleton — one shared graph per process
graph_builder = GraphBuilder()
