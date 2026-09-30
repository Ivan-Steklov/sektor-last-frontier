from dataclasses import dataclass


@dataclass(frozen=True)
class BuildingDefinition:
    code: str
    name: str
    description: str


BUILDINGS: tuple[BuildingDefinition, ...] = (
    BuildingDefinition(
        code="metal_mine",
        name="Шахта металла",
        description="Производит металл.",
    ),
    BuildingDefinition(
        code="crystal_mine",
        name="Шахта кристалла",
        description="Производит кристалл.",
    ),
    BuildingDefinition(
        code="power_plant",
        name="Электростанция",
        description="Производит энергию.",
    ),
    BuildingDefinition(
        code="warehouse",
        name="Склад",
        description="Увеличивает вместимость ресурсов.",
    ),
    BuildingDefinition(
        code="shipyard",
        name="Верфь",
        description="Позволяет строить корабли.",
    ),
    BuildingDefinition(
        code="research_center",
        name="Исследовательский центр",
        description="Открывает исследования.",
    ),
    BuildingDefinition(
        code="defense_module",
        name="Оборонный модуль",
        description="Защищает планету.",
    ),
)


BUILDINGS_BY_CODE = {building.code: building for building in BUILDINGS}