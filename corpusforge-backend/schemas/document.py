from pydantic import BaseModel


class UploadResult(BaseModel):
    document_id: str
    status: str
    filename: str


class DocumentItem(BaseModel):
    id: str
    filename: str
    doc_type: str | None
    status: str
    page_count: int
    entity_count: int
    uploaded_at: str | None
    error_msg: str | None
    cast_number: int


class DocumentStatus(BaseModel):
    status: str
    entity_count: int
    error_msg: str | None
