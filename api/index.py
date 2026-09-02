from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.config import settings
from api.routers import (
    auth_routes,
    challenge_routes,
    evidence_routes,
    echo_routes,
    timeline_routes,
    submission_routes,
    timer_routes,
    admin_routes,
    finale_routes,
)

app = FastAPI(
    title=settings.APP_NAME,
    description="DEAD AIR Escape-Room & Mystery Event Platform API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS middleware for local dev and Vercel full-stack deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include versioned API routers
app.include_router(auth_routes.router)
app.include_router(challenge_routes.router)
app.include_router(evidence_routes.router)
app.include_router(echo_routes.router)
app.include_router(timeline_routes.router)
app.include_router(submission_routes.router)
app.include_router(timer_routes.router)
app.include_router(admin_routes.router)
app.include_router(finale_routes.router)


@app.get("/api/health")
async def health_check():
    """Health and status check."""
    return {
        "status": "healthy",
        "service": "DEAD AIR API",
        "env": settings.ENV,
        "llm_provider": settings.LLM_PROVIDER
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global unhandled exception catcher to avoid leaking raw server internals."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server transmission error. Please retry."}
    )
