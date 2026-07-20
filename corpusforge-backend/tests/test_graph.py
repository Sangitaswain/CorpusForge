import json
import uuid
from unittest.mock import MagicMock, patch

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


import pytest


@pytest.fixture
def fresh_graph(test_db, monkeypatch):
    """Reset the shared graph singleton to the (empty) test DB for router tests."""
    import routers.graph as graph_router_module
    import services.graph_builder as gb_module
    import services.node_summary as node_summary_module

    fresh = GraphBuilder()
    fresh.load_from_db(test_db)
    monkeypatch.setattr(gb_module, "graph_builder", fresh)
    monkeypatch.setattr(graph_router_module, "graph_builder", fresh)
    # services/node_summary.py does `from services.graph_builder import graph_builder` —
    # a value import, so patching the source module alone doesn't reach this local binding.
    monkeypatch.setattr(node_summary_module, "graph_builder", fresh)
    return fresh


def test_graph_endpoint_returns_correct_schema(test_client, fresh_graph):
    response = test_client.get("/api/v1/graph")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "nodes" in data
    assert "links" in data
    assert "node_count" in data
    assert "edge_count" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["links"], list)


def test_graph_returns_empty_when_no_data(test_client, fresh_graph):
    response = test_client.get("/api/v1/graph")
    data = response.json()["data"]
    assert data["node_count"] == 0
    assert data["edge_count"] == 0


def test_graph_node_endpoint_validates_uuid(test_client, fresh_graph):
    response = test_client.get("/api/v1/graph/node/not-a-uuid")
    assert response.status_code == 400


def test_graph_node_returns_404_for_unknown_id(test_client, fresh_graph):
    response = test_client.get(f"/api/v1/graph/node/{uuid.uuid4()}")
    assert response.status_code == 404


def test_graph_focus_param_sanitized(test_client, fresh_graph):
    # SQL injection attempt in focus param — must not 500
    response = test_client.get("/api/v1/graph?focus='; DROP TABLE entities;--")
    assert response.status_code in [200, 400]


def test_graph_focus_returns_one_hop(test_client, test_db, fresh_graph):
    e1 = _entity("equipment_tag", "P-101")
    e2 = _entity("procedure_code", "SOP-07")
    e3 = _entity("person", "Someone Unrelated", doc="doc9")
    test_db.add_all([e1, e2, e3])
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
    fresh_graph.load_from_db(test_db)
    response = test_client.get("/api/v1/graph?focus=P-101")
    data = response.json()["data"]
    names = {n["name"] for n in data["nodes"]}
    assert names == {"P-101", "SOP-07"}


def test_graph_node_detail_lists_connections(test_client, test_db, fresh_graph):
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
    fresh_graph.load_from_db(test_db)
    response = test_client.get(f"/api/v1/graph/node/{e1.id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["entity"]["name"] == "P-101"
    assert len(data["connected"]) == 1
    assert data["connected"][0]["entity"] == "SOP-07"
    assert data["connected"][0]["relationship"] == "MAINTAINED_BY"


def _gemini_response(payload: dict):
    mock = MagicMock()
    mock.generate_content.return_value.text = json.dumps(payload)
    return mock


def test_node_summary_endpoint_returns_correct_schema(test_client, test_db, fresh_graph):
    e = _entity("equipment_tag", "P-101")
    test_db.add(e)
    test_db.commit()
    fresh_graph.load_from_db(test_db)
    gemini = _gemini_response({"summary": "P-101 is a pump.", "recommended_next_step": "Review SOP-07."})
    with patch("services.node_summary.gemini_model", gemini):
        response = test_client.get(f"/api/v1/graph/node/{e.id}/summary")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["summary"] == "P-101 is a pump."
    assert data["recommended_next_step"] == "Review SOP-07."


def test_node_summary_is_cached_across_requests(test_client, test_db, fresh_graph):
    e = _entity("equipment_tag", "P-101")
    test_db.add(e)
    test_db.commit()
    fresh_graph.load_from_db(test_db)
    gemini = _gemini_response({"summary": "P-101 is a pump.", "recommended_next_step": "Review SOP-07."})
    import services.node_summary as node_summary_module

    node_summary_module._cache.clear()
    with patch("services.node_summary.gemini_model", gemini):
        test_client.get(f"/api/v1/graph/node/{e.id}/summary")
        test_client.get(f"/api/v1/graph/node/{e.id}/summary")
    assert gemini.generate_content.call_count == 1


def test_node_summary_returns_502_on_gemini_failure(test_client, test_db, fresh_graph):
    e = _entity("equipment_tag", "P-101")
    test_db.add(e)
    test_db.commit()
    fresh_graph.load_from_db(test_db)
    gemini = MagicMock()
    gemini.generate_content.side_effect = RuntimeError("boom")
    import services.node_summary as node_summary_module

    node_summary_module._cache.clear()
    with patch("services.node_summary.gemini_model", gemini):
        response = test_client.get(f"/api/v1/graph/node/{e.id}/summary")
    assert response.status_code == 502


def test_node_summary_endpoint_validates_uuid(test_client, fresh_graph):
    response = test_client.get("/api/v1/graph/node/not-a-uuid/summary")
    assert response.status_code == 400
