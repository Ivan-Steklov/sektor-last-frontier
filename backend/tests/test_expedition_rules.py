from app.expeditions.rules import (
    cargo_multiplier,
    expedition_duration_seconds,
    expedition_outcome_chances,
    roll_expedition_result,
)


def test_expedition_duration_is_reduced_by_engines() -> None:
    assert expedition_duration_seconds(0) == 60
    assert expedition_duration_seconds(1) == 57
    assert expedition_duration_seconds(2) == 54


def test_expedition_duration_has_minimum_limit() -> None:
    assert expedition_duration_seconds(20) == 30


def test_cargo_multiplier_grows_with_level() -> None:
    assert cargo_multiplier(0) == 1.0
    assert cargo_multiplier(1) == 1.1
    assert cargo_multiplier(3) == 1.3


def test_recon_reduces_loss_chance() -> None:
    chances_zero = expedition_outcome_chances(0)
    chances_two = expedition_outcome_chances(2)
    chances_ten = expedition_outcome_chances(10)

    assert chances_zero["loss"] == 20
    assert chances_two["loss"] == 14
    assert chances_ten["loss"] == 5


def test_outcome_chances_always_sum_to_100() -> None:
    for recon_level in range(0, 20):
        chances = expedition_outcome_chances(recon_level)
        assert sum(chances.values()) == 100


def test_roll_expedition_result_returns_expected_shape() -> None:
    result = roll_expedition_result(
        {
            "scout": 2,
            "transport": 1,
            "fighter": 1,
        },
        recon_level=0,
        cargo_level=0,
    )

    assert "outcome" in result
    assert "metal_found" in result
    assert "crystal_found" in result
    assert "lost_ships" in result
    assert "returned_ships" in result
    assert "description" in result