import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.database import init_db

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="CorpusForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    # SO-04: reject oversized uploads before reading the body
    if request.url.path == "/api/v1/documents/upload":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 50 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={"error": "File too large. Maximum size is 50 MB.", "code": "file_too_large"},
            )
    return await call_next(request)


# Rule 9: error responses are always {"error": message, "code": short_code}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "message" in exc.detail:
        content = {"error": exc.detail["message"], "code": exc.detail.get("code", "error")}
    else:
        content = {"error": str(exc.detail), "code": "error"}
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Invalid request.", "code": "validation_error"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "An error occurred while processing your request. Please try again.", "code": "internal_error"},
    )


init_db()

# BP-05: load the knowledge graph from SQLite once at startup
from core.database import SessionLocal  # noqa: E402
from services.graph_builder import graph_builder  # noqa: E402

with SessionLocal() as _db:
    graph_builder.load_from_db(_db)

from routers.documents import router as documents_router  # noqa: E402
from routers.graph import router as graph_router  # noqa: E402
from routers.query import router as query_router  # noqa: E402

app.include_router(documents_router, prefix="/api/v1")
app.include_router(graph_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
