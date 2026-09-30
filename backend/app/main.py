from fastapi import FastAPI


app = FastAPI(
    title="Сектор: Последний Рубеж API",
    version="0.1.0",
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}