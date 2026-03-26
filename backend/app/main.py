from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import clients, integrations, projects, reports, tasks, transactions, webhooks
from app.core.config import settings
from app.core.database import engine
from app.core.security import authenticate_user, create_access_token
from app.core.storage import storage_manager
from app.schemas.schemas import AuthLoginRequest, TokenResponse


logger = logging.getLogger(__name__)


def resolve_frontend_dist() -> Path | None:
    backend_root = Path(__file__).resolve().parents[1]
    candidates = [
        settings.frontend_dist_path,
        backend_root / "frontend_dist",
        backend_root.parent / "frontend" / "dist",
    ]

    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate.resolve()

    return None


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        storage_manager.ensure_bucket()
    except Exception as exc:  # pragma: no cover - external dependency
        logger.warning("MinIO indisponivel no startup: %s", exc)
    yield
    await engine.dispose()


app = FastAPI(title="InfraCode CRM API", version="0.1.0", lifespan=lifespan)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(clients.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(transactions.router)
api_router.include_router(reports.router)
api_router.include_router(integrations.router)
api_router.include_router(webhooks.router)


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: AuthLoginRequest) -> TokenResponse:
    if not authenticate_user(payload.email, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas.")
    token = create_access_token(payload.email)
    return TokenResponse(access_token=token)


app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


frontend_dist = resolve_frontend_dist()

if frontend_dist:
    index_file = frontend_dist / "index.html"

    @app.get("/", include_in_schema=False)
    async def serve_frontend_index() -> FileResponse:
        return FileResponse(index_file)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_assets(full_path: str) -> FileResponse:
        requested_path = (frontend_dist / full_path).resolve()
        try:
            requested_path.relative_to(frontend_dist)
        except ValueError:
            return FileResponse(index_file)

        if requested_path.is_file():
            return FileResponse(requested_path)

        return FileResponse(index_file)
