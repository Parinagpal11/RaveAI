from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers import graph, health, papers, reasoning, reviews

app = FastAPI(title="Rave API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(papers.router, prefix="/api/v1", tags=["papers"])
app.include_router(reasoning.router, prefix="/api/v1", tags=["reasoning"])
app.include_router(reviews.router, prefix="/api/v1", tags=["reviews"])
app.include_router(graph.router, prefix="/api/v1", tags=["graph"])
