from services.compliance_engine import (
    _derive_regulation_ref,
    _filter_procedure_hits,
    _parse_clause_json,
    _parse_verdict_json,
    _to_gap_row,
)


def test_parse_clause_json_valid():
    raw = '{"clauses": [{"clause_number": "4.2", "clause_text": "Calibrate every 6 months", "regulation_ref": "OISD-STD-105"}]}'
    clauses = _parse_clause_json(raw)
    assert clauses == [
        {"clause_number": "4.2", "clause_text": "Calibrate every 6 months", "regulation_ref": "OISD-STD-105"}
    ]


def test_parse_clause_json_drops_incomplete_entries():
    raw = '{"clauses": [{"clause_number": "", "clause_text": "no number"}, {"clause_number": "1", "clause_text": ""}]}'
    assert _parse_clause_json(raw) == []


def test_parse_clause_json_malformed_returns_empty_list():
    assert _parse_clause_json("not json") == []
    assert _parse_clause_json('{"clauses": "not a list"}') == []


def test_parse_verdict_json_valid():
    raw = '{"verdict": "GAP", "explanation": "Procedure says annual", "severity": "Audit-Critical", "recommendation": "Update SOP-12"}'
    parsed = _parse_verdict_json(raw)
    assert parsed == {
        "verdict": "gap",
        "explanation": "Procedure says annual",
        "severity": "Audit-Critical",
        "recommendation": "Update SOP-12",
    }


def test_parse_verdict_json_invalid_verdict_returns_none():
    raw = '{"verdict": "maybe", "explanation": "x", "severity": "Low", "recommendation": ""}'
    assert _parse_verdict_json(raw) is None


def test_parse_verdict_json_invalid_severity_falls_back_to_low():
    raw = '{"verdict": "compliant", "explanation": "x", "severity": "Extreme", "recommendation": ""}'
    parsed = _parse_verdict_json(raw)
    assert parsed["severity"] == "Low"


def test_parse_verdict_json_malformed_returns_none():
    assert _parse_verdict_json("not json") is None


def test_derive_regulation_ref_strips_extension():
    assert _derive_regulation_ref("OISD-STD-105.pdf") == "OISD-STD-105"


def test_filter_procedure_hits_keeps_only_sop_and_inspection():
    hits = [
        {"document_id": "reg1", "distance": 0.1},
        {"document_id": "sop1", "distance": 0.2},
        {"document_id": "insp1", "distance": 0.3},
        {"document_id": "manual1", "distance": 0.05},
    ]
    doc_types = {"reg1": "regulation", "sop1": "sop", "insp1": "inspection", "manual1": "manual"}
    filtered = _filter_procedure_hits(hits, doc_types)
    assert [h["document_id"] for h in filtered] == ["sop1", "insp1"]


def test_filter_procedure_hits_caps_at_top_n():
    hits = [{"document_id": f"sop{i}", "distance": 0.1 * i} for i in range(10)]
    doc_types = {f"sop{i}": "sop" for i in range(10)}
    assert len(_filter_procedure_hits(hits, doc_types)) == 3


def test_to_gap_row_maps_matched_ids():
    clause = {
        "regulation_ref": "OISD-STD-105",
        "clause_number": "4.2",
        "clause_text": "Calibrate every 6 months",
        "reg_document_id": "reg1",
        "matched_procedure_id": "sop1",
        "matched_chunk_id": "chunk1",
        "verdict": "gap",
        "explanation": "Procedure says annual",
        "severity": "Audit-Critical",
        "recommendation": "Update SOP-12",
    }
    row = _to_gap_row(clause)
    assert row["matched_procedure_id"] == "sop1"
    assert row["matched_chunk_id"] == "chunk1"
    assert row["verdict"] == "gap"


def test_to_gap_row_defaults_missing_matches_to_none():
    clause = {
        "regulation_ref": "OISD-STD-105",
        "clause_number": "9.1",
        "clause_text": "Undeterminable clause",
        "reg_document_id": "reg1",
        "verdict": "undetermined",
        "explanation": "No matching plant procedure was found for this clause.",
        "severity": "Low",
        "recommendation": "",
    }
    row = _to_gap_row(clause)
    assert row["matched_procedure_id"] is None
    assert row["matched_chunk_id"] is None
