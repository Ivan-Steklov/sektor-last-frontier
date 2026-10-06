from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.expeditions.service import (
    ExpeditionBusyError,
    InvalidExpeditionFleetError,
    NotEnoughShipsError,
)
from app.galaxy.service import (
    GalaxyResourceMissionBusyError,
    GalaxyResourceMissionInvalidTargetError,
    GalaxyResourceMissionTargetNotScoutedError,
    GalaxyScoutInvalidTargetError,
    GalaxyScoutMissionBusyError,
    GalaxyScoutTargetTooFarError,
    NotEnoughScoutsError,
    NotEnoughTransportsError,
)
from app.missions.schemas import MissionsStateResponse, StartMissionRequest
from app.missions.service import (
    MissionStartNotImplementedError,
    MissionStartPayloadError,
    get_current_missions_state,
    start_mission,
)
from app.transport.service import (
    InvalidTransportPayloadError,
    NotEnoughResourcesForTransportError,
    NotEnoughTransportShipsError,
    TransportMissionBusyError,
    TransportMissionInvalidTargetError,
    TransportMissionTargetNotScoutedError,
)

router = APIRouter(prefix="/missions", tags=["missions"])


@router.get("/current", response_model=MissionsStateResponse)
def get_current_missions(
    telegram_id: int,
    db: Session = Depends(get_db),
) -> MissionsStateResponse:
    return get_current_missions_state(db, telegram_id)


@router.post("/start")
def start_mission_route(
    payload: StartMissionRequest,
    db: Session = Depends(get_db),
):
    try:
        mission = start_mission(db, payload)
    except MissionStartPayloadError:
        raise HTTPException(status_code=400, detail="Недостаточно данных для запуска миссии.")
    except ExpeditionBusyError:
        raise HTTPException(status_code=409, detail="Экспедиция уже выполняется.")
    except InvalidExpeditionFleetError:
        raise HTTPException(status_code=400, detail="Нужно отправить хотя бы один корабль в экспедицию.")
    except NotEnoughShipsError:
        raise HTTPException(status_code=400, detail="Недостаточно кораблей для экспедиции.")
    except GalaxyScoutMissionBusyError:
        raise HTTPException(status_code=409, detail="Разведка уже выполняется.")
    except GalaxyScoutTargetTooFarError:
        raise HTTPException(status_code=400, detail="Система слишком далеко для разведки.")
    except GalaxyScoutInvalidTargetError:
        raise HTTPException(status_code=400, detail="Недопустимая цель разведки.")
    except NotEnoughScoutsError:
        raise HTTPException(status_code=400, detail="Для разведки нужен хотя бы один разведчик.")
    except GalaxyResourceMissionBusyError:
        raise HTTPException(status_code=409, detail="Сбор ресурсов уже выполняется.")
    except GalaxyResourceMissionInvalidTargetError:
        raise HTTPException(status_code=400, detail="Недопустимая цель сбора ресурсов.")
    except GalaxyResourceMissionTargetNotScoutedError:
        raise HTTPException(status_code=400, detail="Сначала нужно разведать систему.")
    except NotEnoughTransportsError:
        raise HTTPException(status_code=400, detail="Для сбора ресурсов нужен хотя бы один транспорт.")
    except TransportMissionBusyError:
        raise HTTPException(status_code=409, detail="Транспортная миссия уже выполняется.")
    except TransportMissionInvalidTargetError:
        raise HTTPException(status_code=400, detail="Недопустимая цель транспортировки.")
    except TransportMissionTargetNotScoutedError:
        raise HTTPException(status_code=400, detail="Сначала нужно разведать систему для транспортировки.")
    except NotEnoughTransportShipsError:
        raise HTTPException(status_code=400, detail="Для транспортировки нужен хотя бы один транспорт.")
    except NotEnoughResourcesForTransportError:
        raise HTTPException(status_code=400, detail="Недостаточно ресурсов для транспортировки.")
    except InvalidTransportPayloadError:
        raise HTTPException(status_code=400, detail="Укажите корректное количество ресурсов для транспортировки.")
    except MissionStartNotImplementedError:
        raise HTTPException(status_code=501, detail="Этот тип миссии пока не реализован.")

    return {
        "ok": True,
        "mission_id": getattr(mission, "id", None),
    }