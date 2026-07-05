"""Supabase Storage wrapper (SO-08).

The bucket is private. Files are addressed by storage path
(documents/{document_id}{ext}) and served only via signed URLs.
"""
import logging

from supabase import Client, create_client

from core.config import settings

logger = logging.getLogger(__name__)

BUCKET = "corpusforge-docs"

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client


def upload_file(file_bytes: bytes, storage_path: str, content_type: str) -> str:
    """Upload bytes to the private bucket. Returns the storage path."""
    _get_client().storage.from_(BUCKET).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type},
    )
    logger.info("Uploaded file to storage path %s", storage_path)
    return storage_path


def get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    """Create a time-limited signed URL for a stored file (SO-08)."""
    response = _get_client().storage.from_(BUCKET).create_signed_url(
        path=storage_path,
        expires_in=expires_in,
    )
    return response["signedURL"]


def delete_file(storage_path: str) -> None:
    _get_client().storage.from_(BUCKET).remove([storage_path])
    logger.info("Deleted file at storage path %s", storage_path)
