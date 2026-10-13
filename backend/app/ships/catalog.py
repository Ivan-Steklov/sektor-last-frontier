from dataclasses import dataclass


@dataclass(frozen=True)
class ShipDefinition:
    code: str
    name: str
    description: str
    role: str
    attack: int
    defense: int
    speed: int
    cargo_capacity: int
    fuel_usage: int


SHIPS: tuple[ShipDefinition, ...] = (
    ShipDefinition(
        code="scout",
        name="Разведчик",
        description="Лёгкий корабль для разведки систем и быстрых операций.",
        role="Разведка",
        attack=1,
        defense=1,
        speed=10,
        cargo_capacity=50,
        fuel_usage=1,
    ),
    ShipDefinition(
        code="transport",
        name="Транспортник",
        description="Базовый логистический корабль для перевозки ресурсов между системами.",
        role="Логистика",
        attack=0,
        defense=2,
        speed=5,
        cargo_capacity=1000,
        fuel_usage=2,
    ),
    ShipDefinition(
        code="fighter",
        name="Истребитель",
        description="Базовый боевой корабль для охраны флота и будущих атак.",
        role="Бой",
        attack=6,
        defense=3,
        speed=7,
        cargo_capacity=80,
        fuel_usage=3,
    ),
    ShipDefinition(
        code="heavy_transport",
        name="Тяжёлый транспорт",
        description="Медленный, но вместительный корабль для крупных ресурсных перевозок.",
        role="Тяжёлая логистика",
        attack=1,
        defense=6,
        speed=3,
        cargo_capacity=5000,
        fuel_usage=5,
    ),
    ShipDefinition(
        code="corvette",
        name="Корвет",
        description="Универсальный боевой корабль сопровождения с хорошей защитой.",
        role="Эскорт",
        attack=12,
        defense=9,
        speed=6,
        cargo_capacity=150,
        fuel_usage=6,
    ),
)


SHIPS_BY_CODE = {
    ship.code: ship
    for ship in SHIPS
}