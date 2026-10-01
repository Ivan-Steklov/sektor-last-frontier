from dataclasses import dataclass


@dataclass(frozen=True)
class ShipDefinition:
    code: str
    name: str
    description: str


SHIPS: tuple[ShipDefinition, ...] = (
    ShipDefinition(
        code="scout",
        name="Разведчик",
        description="Лёгкий корабль для разведки и быстрых операций.",
    ),
    ShipDefinition(
        code="transport",
        name="Транспортник",
        description="Перевозит ресурсы и добычу экспедиций.",
    ),
    ShipDefinition(
        code="fighter",
        name="Истребитель",
        description="Базовый боевой корабль для охраны и атак.",
    ),
)


SHIPS_BY_CODE = {
    ship.code: ship
    for ship in SHIPS
}