import { useEffect, useState } from "react";

import { API_URL, TELEGRAM_ID } from "../app/constants";
import "./GalaxyPanel.css";

type GalaxyPlanetMarker = {
  name: string;
  position: number;
  owner_name: string | null;
  is_home_planet: boolean;
};

type GalaxySystemItem = {
  galaxy: number;
  system: number;
  name: string;
  distance: number;
  richness: string;
  danger: string;
  danger_level: number;
  has_home_planet: boolean;
  planets: GalaxyPlanetMarker[];
};

type GalaxySectorResponse = {
  current_galaxy: number;
  current_system: number;
  current_position: number;
  systems: GalaxySystemItem[];
};

export function GalaxyPanel() {
  const [sector, setSector] = useState<GalaxySectorResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadSector() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/galaxy/sector?telegram_id=${TELEGRAM_ID}`,
      );

      if (!response.ok) {
        throw new Error("Не удалось загрузить карту галактики");
      }

      const data: GalaxySectorResponse = await response.json();

      setSector(data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось загрузить карту галактики",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSector();
  }, []);

  return (
    <section className="galaxy-section">
      <div className="galaxy-heading">
        <div>
          <p className="galaxy-label">Галактика</p>
          <h2>Карта ближайшего сектора</h2>
          <p className="galaxy-description">
            Это первый обзор окружающих систем. Позже отсюда будут запускаться
            разведка, экспедиции, атаки и колонизация.
          </p>
        </div>

        <button
          className="galaxy-refresh-button"
          disabled={isLoading}
          onClick={() => {
            void loadSector();
          }}
        >
          {isLoading ? "Загрузка..." : "Обновить"}
        </button>
      </div>

      {error !== "" && <div className="galaxy-error">{error}</div>}

      {sector && (
        <div className="galaxy-current">
          <strong>
            Текущие координаты: {sector.current_galaxy}:
            {sector.current_system}:{sector.current_position}
          </strong>
          <span>
            Домашняя планета отмечена в системе {sector.current_system}.
          </span>
        </div>
      )}

      {!sector && error === "" && (
        <p className="galaxy-description">Загрузка сектора...</p>
      )}

      {sector && (
        <div className="galaxy-grid">
          {sector.systems.map((system) => (
            <GalaxySystemCard
              key={`${system.galaxy}-${system.system}`}
              system={system}
              isCurrentSystem={system.system === sector.current_system}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type GalaxySystemCardProps = {
  system: GalaxySystemItem;
  isCurrentSystem: boolean;
};

function GalaxySystemCard({
  system,
  isCurrentSystem,
}: GalaxySystemCardProps) {
  return (
    <article
      className={
        isCurrentSystem
          ? "galaxy-system-card galaxy-system-card-current"
          : "galaxy-system-card"
      }
    >
      <div className="galaxy-system-header">
        <div>
          <p className="galaxy-system-code">
            {system.galaxy}:{system.system}
          </p>
          <h3>{system.name}</h3>
        </div>

        <DangerBadge dangerLevel={system.danger_level} danger={system.danger} />
      </div>

      <div className="galaxy-system-stats">
        <span>Дистанция: {system.distance}</span>
        <span>Ресурсы: {system.richness}</span>
      </div>

      {system.planets.length > 0 ? (
        <div className="galaxy-planets">
          {system.planets.map((planet) => (
            <div
              key={`${planet.name}-${planet.position}`}
              className="galaxy-planet-row"
            >
              <span>
                Позиция {planet.position}: {planet.name}
              </span>

              {planet.is_home_planet && (
                <strong className="galaxy-home-badge">Дом</strong>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="galaxy-empty-system">Нет известных планет.</p>
      )}

      <button className="galaxy-action-button" disabled>
        Миссии скоро
      </button>
    </article>
  );
}

type DangerBadgeProps = {
  dangerLevel: number;
  danger: string;
};

function DangerBadge({ dangerLevel, danger }: DangerBadgeProps) {
  const className =
    dangerLevel >= 3
      ? "galaxy-danger galaxy-danger-high"
      : dangerLevel === 2
        ? "galaxy-danger galaxy-danger-medium"
        : "galaxy-danger galaxy-danger-low";

  return <span className={className}>Опасность: {danger}</span>;
}