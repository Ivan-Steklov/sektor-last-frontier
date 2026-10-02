from datetime import datetime, timedelta, timezone

from app.galaxy.schemas import (
    GalaxyResourceMissionResponse,
    GalaxyResourceMissionResultResponse,
    GalaxyResourceMissionStateResponse,
    GalaxyScoutMissionResponse,
    GalaxyScoutReportResponse,
    GalaxyScoutStateResponse,
)


def test_galaxy_scout_state_serializes_active_mission_datetimes_to_iso_strings():
    now = datetime(2026, 10, 2, 16, 30, 0, tzinfo=timezone.utc)

    state = GalaxyScoutStateResponse(
        active_mission=GalaxyScoutMissionResponse(
            id=1,
            target_galaxy=1,
            target_system=2,
            started_at=now,
            finishes_at=now + timedelta(seconds=90),
            remaining_seconds=90,
        ),
        last_report=None,
    )

    payload = state.model_dump(mode="json")

    assert payload["active_mission"] is not None
    assert payload["active_mission"]["started_at"] == "2026-10-02T16:30:00+00:00"
    assert payload["active_mission"]["finishes_at"] == "2026-10-02T16:31:30+00:00"


def test_galaxy_scout_state_serializes_last_report_completed_at_to_iso_string():
    completed_at = datetime(2026, 10, 2, 16, 29, 44, 191563, tzinfo=timezone.utc)

    state = GalaxyScoutStateResponse(
        active_mission=None,
        last_report=GalaxyScoutReportResponse(
            target_galaxy=1,
            target_system=2,
            richness="обычная",
            danger="средняя",
            danger_level=2,
            discovered_signals=2,
            description="Разведка завершена.",
            completed_at=completed_at,
        ),
    )

    payload = state.model_dump(mode="json")

    assert payload["last_report"] is not None
    assert (
        payload["last_report"]["completed_at"]
        == "2026-10-02T16:29:44.191563+00:00"
    )


def test_galaxy_resource_state_serializes_active_mission_datetimes_to_iso_strings():
    now = datetime(2026, 10, 2, 15, 0, 0, tzinfo=timezone.utc)

    state = GalaxyResourceMissionStateResponse(
        active_mission=GalaxyResourceMissionResponse(
            id=10,
            target_galaxy=1,
            target_system=3,
            started_at=now,
            finishes_at=now + timedelta(seconds=120),
            remaining_seconds=120,
        ),
        last_result=None,
    )

    payload = state.model_dump(mode="json")

    assert payload["active_mission"] is not None
    assert payload["active_mission"]["started_at"] == "2026-10-02T15:00:00+00:00"
    assert payload["active_mission"]["finishes_at"] == "2026-10-02T15:02:00+00:00"


def test_galaxy_resource_state_serializes_last_result_completed_at_to_iso_string():
    completed_at = datetime(2026, 10, 2, 15, 30, 33, 277785, tzinfo=timezone.utc)

    state = GalaxyResourceMissionStateResponse(
        active_mission=None,
        last_result=GalaxyResourceMissionResultResponse(
            target_galaxy=1,
            target_system=3,
            metal_found=395,
            crystal_found=155,
            danger="низкая",
            danger_level=1,
            transport_lost=False,
            cargo_loss_percent=0,
            description="Транспорт вернулся.",
            completed_at=completed_at,
        ),
    )

    payload = state.model_dump(mode="json")

    assert payload["last_result"] is not None
    assert (
        payload["last_result"]["completed_at"]
        == "2026-10-02T15:30:33.277785+00:00"
    )


def test_galaxy_datetime_serializer_adds_utc_to_naive_datetime():
    naive_started_at = datetime(2026, 10, 2, 18, 45, 10)
    naive_finishes_at = datetime(2026, 10, 2, 18, 46, 10)

    state = GalaxyScoutStateResponse(
        active_mission=GalaxyScoutMissionResponse(
            id=99,
            target_galaxy=1,
            target_system=5,
            started_at=naive_started_at,
            finishes_at=naive_finishes_at,
            remaining_seconds=60,
        ),
        last_report=None,
    )

    payload = state.model_dump(mode="json")

    assert payload["active_mission"] is not None
    assert payload["active_mission"]["started_at"] == "2026-10-02T18:45:10+00:00"
    assert payload["active_mission"]["finishes_at"] == "2026-10-02T18:46:10+00:00"