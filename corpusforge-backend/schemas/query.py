from pydantic import BaseModel, field_validator


class QueryRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty.")
        if len(v) > 500:
            raise ValueError("Question must be 500 characters or fewer.")
        return v


class Citation(BaseModel):
    document_id: str
    filename: str
    page_number: int


class QueryResponse(BaseModel):
    answer: str
    confidence: str
    citations: list[Citation]
    used_graph: bool
    follow_ups: list[str]
