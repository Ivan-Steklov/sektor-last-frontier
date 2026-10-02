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

type GalaxyScoutStateResponse = {
  active_mission: {
    id: number;
    target_galaxy: number;
    target_system: number;
    started_at: string;
    finishes_at: string;
    remaining_seconds: number;
  } | null;
  last_report: {
    target_galaxy: number;
    target_system: number;
    richness: string;
    danger: string;
    danger_level: number;
    discovered_signals: number;
    description: string;
    completed_at: string;
  } | null;
};

export function GalaxyPanel() {
  const [sector, setSector] = useState<GalaxySectorResponse | null>(null);
  const [scoutState, setScoutState] = useState<GalaxyScoutStateResponse | null>(
    null,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingScout, setIsStartingScout] = useState(false);

  async function loadGalaxyData() {
    setIsLoading(true);
    setError("");

    try {
      const [sectorResponse, scoutResponse] = await Promise.all([
        fetch(`${API_URL}/api/galaxy/sector?telegram_id=${TELEGRAM_ID}`),
        fetch(`${API_URL}/api/galaxy/scout/current?telegram_id=${TELEGRAM_ID}`),
      ]);

      if (!sectorResponse.ok || !scoutResponse.ok) {
        throw new Error("Не удалось загрузить карту галактики");
      }

      const sectorData: GalaxySectorResponse = await sectorResponse.json();
      const scoutData: GalaxyScoutStateResponse = await scoutResponse.json();

      setSector(sectorData);
      setScoutState(scoutData);
      setRemainingSeconds(scoutData.active_mission?.remaining_seconds ?? 0);
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
    void loadGalaxyData();
  }, []);

  useEffect(() => {
    if (!scoutState?.active_mission) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          void loadGalaxyData();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [scoutState?.active_mission?.id]);

  async function startScoutMission(system: GalaxySystemItem) {
    setIsStartingScout(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/galaxy/scout/start?telegram_id=${TELEGRAM_ID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_galaxy: system.galaxy,
            target_system: system.system,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.detail ?? "Не удалось начать разведку.");
      }

      const scoutData: GalaxyScoutStateResponse = await response.json();

      setScoutState(scoutData);
      setRemainingSeconds(scoutData.active_mission?.remaining_seconds ?? 0);

      await loadGalaxyData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось начать разведку.",
      );
    } finally {
      setIsStartingScout(false);
    }
  }

  const hasActiveScout = scoutState?.active_mission !== null
    && scoutState?.active_mission !== undefined;

  return (
    <section className="galaxy-section">
      <div className="galaxy-heading">
        <div>
          <p className="galaxy-label">Галактика</p>
          <h2>Карта ближайшего сектора</h2>
          <p className="galaxy-description">
            Это первый обзор окружающих систем. Отсюда можно отправить
            разведчика и получить отчёт по соседним системам.
          </p>
        </div>

        <button
          className="galaxy-refresh-button"
          disabled={isLoading}
          onClick={() => {
            void loadGalaxyData();
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

      {scoutState?.active_mission && (
        <div className="galaxy-scout-active">
          <strong>
            Разведка системы {scoutState.active_mission.target_galaxy}:
            {scoutState.active_mission.target_system}
          </strong>
          <span>Осталось: {formatDuration(remainingSeconds)}</span>
        </div>
      )}

      {scoutState?.last_report && (
        <div className="galaxy-scout-report">
          <strong>
            Последний отчёт: {scoutState.last_report.target_galaxy}:
            {scoutState.last_report.target_system}
          </strong>
          <p>{scoutState.last_report.description}</p>
          <div className="galaxy-report-grid">
            <span>Ресурсы: {scoutState.last_report.richness}</span>
            <span>Опасность: {scoutState.last_report.danger}</span>
            <span>Сигналы: {scoutState.last_report.discovered_signals}</span>
          </div>
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
              isScoutBlocked={hasActiveScout || isStartingScout}
              onScout={startScoutMission}
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
  isScoutBlocked: boolean;
  onScout: (system: GalaxySystemItem) => Promise<void>;
};

function GalaxySystemCard({
  system,
  isCurrentSystem,
  isScoutBlocked,
  onScout,
}: GalaxySystemCardProps) {
  const canScout = !isCurrentSystem && !isScoutBlocked;

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

      {isCurrentSystem && (
        <p className="galaxy-action-hint">Это домашняя система.</p>
      )}

      {!isCurrentSystem && isScoutBlocked && (
        <p className="galaxy-action-hint">Другая разведка уже выполняется.</p>
      )}

      <button
        className="galaxy-action-button"
        disabled={!canScout}
        onClick={() => {
          void onScout(system);
        }}
      >
        Разведать
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

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}