from fastapi import FastAPI
from sqlalchemy.exc import SQLAlchemyError

from app.db import check_database


app = FastAPI(
    title="Сектор: Последний Рубеж API",
    version="0.1.0",
)


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