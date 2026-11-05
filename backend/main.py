import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.core.database import init_db
from backend.api.routes.health import router as health_router
from backend.api.routes.monitors import router as monitors_router
from backend.api.routes.incidents import router as incidents_router
from backend.api.routes.overview import router as overview_router
from backend.api.routes.auth import router as auth_router

# Configure root logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("apisentinel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown hooks."""
    logger.info("Initializing API Sentinel database schema...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down API Sentinel API server...")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production-minded, open-source API monitoring platform. Know when your API fails, before your users do.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )

    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount Route Handlers
    app.include_router(health_router)
    app.include_router(overview_router)
    app.include_router(monitors_router)
    app.include_router(incidents_router)
    app.include_router(auth_router)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
