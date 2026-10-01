import type { HomePlanet } from "../app/types";

type HeaderBarProps = {
  planet: HomePlanet | null;
};

export function HeaderBar({ planet }: HeaderBarProps) {
  const coordinates = planet
    ? `${planet.galaxy}:${planet.system}:${planet.position}`
    : "...";

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Сектор: Последний Рубеж</p>
        <h1>{planet?.name ?? "Загрузка..."}</h1>
      </div>

      <div className="status">
        <span className="status-dot" />
        Координаты {coordinates}
      </div>
    </header>
  );
}