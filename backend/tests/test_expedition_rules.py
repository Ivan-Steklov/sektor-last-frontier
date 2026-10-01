from app.expeditions.rules import expedition_duration_seconds, roll_expedition_result


def test_expedition_duration_is_fixed() -> None:
    assert expedition_duration_seconds() == 60


def test_roll_expedition_result_returns_expected_shape() -> None:
    result = roll_expedition_result(
        {
            "scout": 2,
            "transport": 1,
            "fighter": 1,
        }
    )

    assert "outcome" in result
    assert "metal_found" in result
    assert "crystal_found" in result
    assert "lost_ships" in result
    assert "returned_ships" in result
    assert "description" in result