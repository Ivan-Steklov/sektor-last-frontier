from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.buildings.router import router as buildings_router
from app.db import check_database
from app.expeditions.router import router as expeditions_router
from app.galaxy.router import router as galaxy_router
from app.planets.router import router as planets_router
from app.research.router import router as research_router
from app.resources.router import router as resources_router
from app.ships.router import router as ships_router


app = FastAPI(
    title="Сектор: Последний Рубеж API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(planets_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(buildings_router, prefix="/api")
app.include_router(research_router, prefix="/api")
app.include_router(ships_router, prefix="/api")
app.include_router(expeditions_router, prefix="/api")
app.include_router(galaxy_router, prefix="/api")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_health_check() -> dict[str, str]:
    try:
        check_database()
    except SQLAlchemyError:
        return {
            "status": "error",
            "database": "unavailable",
        }

    return {
        "status": "ok",
        "database": "connected",
    }