from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, auth, health
from app.core.config import get_settings
from app.memory.bootstrap import bootstrap_storage
from app.rag.seed import seed_knowledge_base


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap_storage()
    seed_knowledge_base()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    description=(
        "AI-assisted MRI analysis API with CPU-first inference, retrieval grounding, "
        "report generation, and verification."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(analysis.router, prefix=settings.api_prefix)
