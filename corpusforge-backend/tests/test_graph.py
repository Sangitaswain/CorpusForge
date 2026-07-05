import uuid

from models.entity import Entity
from models.relationship import Relationship
from services.graph_builder import GraphBuilder, build_cooccurrence_edges


def _entity(entity_type, value, doc="doc1"):
    return Entity(
        id=str(uuid.uuid4()),
        document_id=doc,
        chunk_id="chunk1",
        entity_type=entity_type,
        value=value,
        normalized_value=value,
    )


def test_graph_builder_loads_from_db(test_db):
    e1 = _entity("equipment_tag", "P-101")
    e2 = _entity("procedure_code", "SOP-07")
    test_db.add_all([e1, e2])
    test_db.commit()
    r = Relationship(
        id=str(uuid.uuid4()),
        source_entity_id=e1.id,
        target_entity_id=e2.id,
        rel_type="MAINTAINED_BY",
        source_document_id="doc1",
    )
    test_db.add(r)
    test_db.commit()
    builder = GraphBuilder()
    builder.load_from_db(test_db)
    assert builder.G.number_of_nodes() == 2
    assert builder.G.number_of_edges() == 1
    assert builder.G.has_edge(e1.id, e2.id)


def test_graph_find_node_by_value(test_db):
    e = _entity("equipment_tag", "P-101")
    test_db.add(e)
    test_db.commit()
    builder = GraphBuilder()
    builder.load_from_db(test_db)
    assert builder.find_node_by_value("P-101") == e.id
    assert builder.find_node_by_value("p-101") == e.id
    assert builder.find_node_by_value("X-999") is None


def test_graph_to_frontend_json_format(test_db):
    e = _entity("equipment_tag", "P-101")
    test_db.add(e)
    test_db.commit()
    builder = GraphBuilder()
    builder.load_from_db(test_db)
    result = builder.to_frontend_json()
    assert all("id" in n and "name" in n and "type" in n for n in result["nodes"])
    assert result["node_count"] == 1
    assert result["edge_count"] == 0


def test_graph_merges_same_entity_across_documents(test_db):
    e1 = _entity("equipment_tag", "P-101", doc="doc1")
    e2 = _entity("equipment_tag", "P-101", doc="doc2")
    test_db.add_all([e1, e2])
    test_db.commit()
    builder = GraphBuilder()
    builder.load_from_db(test_db)
    assert builder.G.number_of_nodes() == 1
    node = builder.to_frontend_json()["nodes"][0]
    assert node["document_count"] == 2


def test_cooccurrence_rules_create_edges(test_db, monkeypatch):
    import services.graph_builder as gb_module

    fresh = GraphBuilder()
    monkeypatch.setattr(gb_module, "graph_builder", fresh)

    entities = [
        _entity("equipment_tag", "P-101"),
        _entity("procedure_code", "SOP-07"),
        _entity("incident_id", "INC-2022-07"),
        _entity("work_order_id", "WO-2024-0312"),
        _entity("person", "Rajesh Nair"),
    ]
    test_db.add_all(entities)
    test_db.commit()
    for e in entities:
        fresh.add_entity_node(e)

    created = build_cooccurrence_edges("doc1", test_db)
    # MAINTAINED_BY, INVOLVES, PERFORMED_BY fire; GOVERNED_BY has no regulation_ref
    assert created == 3
    rel_types = {r.rel_type for r in test_db.query(Relationship).all()}
    assert rel_types == {"MAINTAINED_BY", "INVOLVES", "PERFORMED_BY"}

    # Re-running must not duplicate edges
    assert build_cooccurrence_edges("doc1", test_db) == 0
