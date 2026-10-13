from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.system_storage.schemas import SystemStorageStateResponse
from app.system_storage.service import get_system_storage_state


router = APIRouter(
    prefix="/system-storage",
    tags=["system-storage"],
)


@router.get(
    "/current",
    response_model=SystemStorageStateResponse,
)
def read_current_system_storage(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> SystemStorageStateResponse:
    return get_system_storage_state(
        db=db,
        telegram_id=telegram_id,
    )