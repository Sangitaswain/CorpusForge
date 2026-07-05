import io
import uuid

# Response assertions follow the Rule 9 envelope:
# success bodies are {"data": ..., "status": "ok"}, errors are {"error": ..., "code": ...}.


def test_upload_rejects_unsupported_format(test_client):
    file = ("test.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")
    response = test_client.post("/api/v1/documents/upload", files={"file": file})
    assert response.status_code == 415
    assert "not supported" in response.json()["error"].lower()


def test_upload_rejects_oversized_file(test_client):
    large_content = b"x" * (51 * 1024 * 1024)  # 51 MB
    file = ("big.pdf", io.BytesIO(large_content), "application/pdf")
    response = test_client.post("/api/v1/documents/upload", files={"file": file})
    assert response.status_code == 413


def test_upload_rejects_extension_mismatch(test_client):
    # File named .pdf but contains EXE magic bytes
    file = ("legit.pdf", io.BytesIO(b"MZ\x90\x00" + b"\x00" * 100), "application/pdf")
    response = test_client.post("/api/v1/documents/upload", files={"file": file})
    assert response.status_code == 415


def test_upload_accepts_valid_txt(test_client):
    txt_content = b"P-101 pump pressure is 18 bar."
    file = ("test.txt", io.BytesIO(txt_content), "text/plain")
    response = test_client.post("/api/v1/documents/upload", files={"file": file})
    assert response.status_code in [200, 201]
    body = response.json()
    assert body["status"] == "ok"
    data = body["data"]
    assert "document_id" in data
    assert data["status"] == "processing"


def test_upload_returns_document_id_as_uuid(test_client):
    file = ("test.txt", io.BytesIO(b"test content"), "text/plain")
    response = test_client.post("/api/v1/documents/upload", files={"file": file})
    uuid.UUID(response.json()["data"]["document_id"])  # raises if not valid UUID


def test_duplicate_upload_returns_409(test_client):
    content = b"Unique content for duplicate test"
    file1 = ("doc1.txt", io.BytesIO(content), "text/plain")
    file2 = ("doc2.txt", io.BytesIO(content), "text/plain")
    r1 = test_client.post("/api/v1/documents/upload", files={"file": file1})
    r2 = test_client.post("/api/v1/documents/upload", files={"file": file2})
    assert r1.status_code in [200, 201]
    assert r2.status_code == 409


def test_list_documents_returns_array(test_client):
    response = test_client.get("/api/v1/documents")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["data"], list)


def test_delete_document_removes_from_db(test_client, test_db):
    file = ("del_test.txt", io.BytesIO(b"delete me"), "text/plain")
    upload = test_client.post("/api/v1/documents/upload", files={"file": file})
    doc_id = upload.json()["data"]["document_id"]
    delete = test_client.delete(f"/api/v1/documents/{doc_id}")
    assert delete.status_code == 200
    from models.document import Document

    doc = test_db.query(Document).filter_by(id=doc_id).first()
    assert doc is None


def test_get_document_status_returns_valid_status(test_client, test_db):
    file = ("status_test.txt", io.BytesIO(b"status content"), "text/plain")
    upload = test_client.post("/api/v1/documents/upload", files={"file": file})
    doc_id = upload.json()["data"]["document_id"]
    response = test_client.get(f"/api/v1/documents/{doc_id}/status")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] in ["queued", "processing", "done", "failed"]
