def test_follow_up_questions_are_strings():
    from services.rag import generate_follow_up_questions

    follow_ups = generate_follow_up_questions("P-101 pressure is 18 bar.", ["P-101"])
    assert isinstance(follow_ups, list)
    assert all(isinstance(q, str) for q in follow_ups)
    assert len(follow_ups) <= 3


def test_follow_up_questions_end_with_question_mark():
    from services.rag import generate_follow_up_questions

    follow_ups = generate_follow_up_questions("P-101 pressure is 18 bar.", ["P-101"])
    for q in follow_ups:
        assert q.endswith("?"), f"Follow-up '{q}' does not end with '?'"


def test_follow_ups_cover_multiple_entity_kinds():
    from services.rag import generate_follow_up_questions

    follow_ups = generate_follow_up_questions("SOP-07 applies to P-101.", [])
    assert len(follow_ups) == 3
    assert any("SOP-07" in q for q in follow_ups)


def test_follow_ups_empty_when_no_entities():
    from services.rag import generate_follow_up_questions

    assert generate_follow_up_questions("No identifiers here.", []) == []
