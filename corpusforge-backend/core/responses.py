"""API response envelope helpers (Rule 9).

Success: {"data": ..., "status": "ok"}
Error:   {"error": "<human-readable message>", "code": "<short_error_code>"}
"""
from fastapi import HTTPException


def ok(data):
    return {"data": data, "status": "ok"}


class ApiError(HTTPException):
    """HTTPException carrying a short error code alongside the message.

    Rendered by the exception handlers in main.py as
    {"error": message, "code": code}.
    """

    def __init__(self, status_code: int, message: str, code: str):
        super().__init__(status_code=status_code, detail={"message": message, "code": code})
