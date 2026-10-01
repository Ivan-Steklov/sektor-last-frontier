from dataclasses import dataclass


@dataclass(frozen=True)
class ResearchDefinition:
    code: str
    name: str
    description: str
    effect: str


RESEARCH: tuple[ResearchDefinition, ...] = (
    ResearchDefinition(
        code="metal_mining",
        name="Добыча металла",
        description="Улучшает работу шахт металла.",
        effect="Плюс 8% к добыче металла за уровень.",
    ),
    ResearchDefinition(
        code="crystal_mining",
        name="Добыча кристалла",
        description="Улучшает работу шахт кристалла.",
        effect="Плюс 8% к добыче кристалла за уровень.",
    ),
    ResearchDefinition(
        code="energy",
        name="Энергетика",
        description="Повышает отдачу электростанции.",
        effect="Плюс 8% к выработке энергии за уровень.",
    ),
    ResearchDefinition(
        code="armor",
        name="Броня",
        description="Усиливает корпус кораблей и обороны.",
        effect="Подключится вместе с флотом.",
    ),
    ResearchDefinition(
        code="weapons",
        name="Оружие",
        description="Увеличивает огневую мощь.",
        effect="Подключится вместе с флотом.",
    ),
    ResearchDefinition(
        code="shields",
        name="Щиты",
        description="Усиливает защиту кораблей и обороны.",
        effect="Подключится вместе с флотом.",
    ),
    ResearchDefinition(
        code="engines",
        name="Двигатели",
        description="Ускоряет полёты флота.",
        effect="Подключится вместе с флотом.",
    ),
    ResearchDefinition(
        code="recon",
        name="Разведка",
        description="Даёт больше сведений об экспедициях и целях.",
        effect="Подключится вместе с экспедициями.",
    ),
    ResearchDefinition(
        code="cargo",
        name="Грузовые отсеки",
        description="Увеличивает вместимость транспорта.",
        effect="Подключится вместе с флотом.",
    ),
    ResearchDefinition(
        code="flight_range",
        name="Дальность полёта",
        description="Позволяет отправлять флот дальше.",
        effect="Подключится вместе с флотом.",
    ),
)


RESEARCH_BY_CODE = {
    research.code: research
    for research in RESEARCH
}