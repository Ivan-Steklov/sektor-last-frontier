import { useEffect, useRef, useState } from "react";

import { API_URL, TELEGRAM_ID } from "../app/constants";
import "./GalaxyPanel.css";

type GalaxyPlanetMarker = {
  name: string;
  position: number;
  owner_name: string | null;
  is_home_planet: boolean;
};

type GalaxyScoutReport = {
  target_galaxy: number;
  target_system: number;
  richness: string;
  danger: string;
  danger_level: number;
  discovered_signals: number;
  description: string;
  completed_at: string;
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
  is_scouted: boolean;
  scout_report: GalaxyScoutReport | null;
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
  last_report: GalaxyScoutReport | null;
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

  const isTimerRefreshInProgressRef = useRef(false);

  async function loadGalaxyData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setIsLoading(true);
    }

    setError("");

    try {
      const scoutResponse = await fetch(
        `${API_URL}/api/galaxy/scout/current?telegram_id=${TELEGRAM_ID}`,
      );

      if (!scoutResponse.ok) {
        throw new Error("Не удалось обновить состояние разведки.");
      }

      const scoutData: GalaxyScoutStateResponse = await scoutResponse.json();

      const sectorResponse = await fetch(
        `${API_URL}/api/galaxy/sector?telegram_id=${TELEGRAM_ID}`,
      );

      if (!sectorResponse.ok) {
        throw new Error("Не удалось загрузить карту галактики.");
      }

      const sectorData: GalaxySectorResponse = await sectorResponse.json();

      setScoutState(scoutData);
      setSector(sectorData);
      setRemainingSeconds(scoutData.active_mission?.remaining_seconds ?? 0);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось загрузить карту галактики.";

      setError(
        message === "Failed to fetch"
          ? "Не удалось связаться с backend. Проверь, что сервер запущен."
          : message,
      );
    } finally {
      setIsLoading(false);
      isTimerRefreshInProgressRef.current = false;
    }
  }

  useEffect(() => {
    void loadGalaxyData();
  }, []);

  useEffect(() => {
    if (!scoutState?.active_mission) {
      isTimerRefreshInProgressRef.current = false;
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (!isTimerRefreshInProgressRef.current) {
            isTimerRefreshInProgressRef.current = true;

            window.setTimeout(() => {
              void loadGalaxyData({ silent: true });
            }, 350);
          }

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

      await loadGalaxyData({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось начать разведку.";

      setError(
        message === "Failed to fetch"
          ? "Не удалось связаться с backend. Проверь, что сервер запущен."
          : message,
      );
    } finally {
      setIsStartingScout(false);
    }
  }

  const hasActiveScout =
    scoutState?.active_mission !== null &&
    scoutState?.active_mission !== undefined;

  const explorableSystems =
    sector?.systems.filter((system) => !system.has_home_planet) ?? [];

  const scoutedCount = explorableSystems.filter(
    (system) => system.is_scouted,
  ).length;

  return (
    <section className="galaxy-section">
      <div className="galaxy-heading">
        <div>
          <p className="galaxy-label">Галактика</p>
          <h2>Карта ближайшего сектора</h2>
          <p className="galaxy-description">
            Неизвестные системы скрывают ресурсы и опасность до разведки.
            Домашняя система не входит в счётчик разведки.
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
            Текущие координаты: {sector.current_galaxy}:{sector.current_system}:
            {sector.current_position}
          </strong>
          <span>
            Разведано систем в секторе: {scoutedCount} из{" "}
            {explorableSystems.length}.
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

  const cardClassName = [
    "galaxy-system-card",
    isCurrentSystem ? "galaxy-system-card-current" : "",
    system.is_scouted ? "galaxy-system-card-scouted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClassName}>
      <div className="galaxy-system-header">
        <div>
          <p className="galaxy-system-code">
            {system.galaxy}:{system.system}
          </p>
          <h3>{system.name}</h3>
        </div>

        <div className="galaxy-card-badges">
          {isCurrentSystem && <span className="galaxy-scouted-badge">Дом</span>}

          {!isCurrentSystem && system.is_scouted && (
            <span className="galaxy-scouted-badge">Разведано</span>
          )}

          {!isCurrentSystem && !system.is_scouted && (
            <span className="galaxy-danger galaxy-danger-medium">
              Не разведано
            </span>
          )}

          {!isCurrentSystem && system.is_scouted && (
            <DangerBadge
              dangerLevel={system.danger_level}
              danger={system.danger}
            />
          )}
        </div>
      </div>

      <div className="galaxy-system-stats">
        <span>Дистанция: {system.distance}</span>

        {isCurrentSystem && <span>Домашняя система</span>}

        {!isCurrentSystem && !system.is_scouted && (
          <>
            <span>Ресурсы: неизвестно</span>
            <span>Опасность: неизвестно</span>
          </>
        )}

        {!isCurrentSystem && system.is_scouted && (
          <span>Данные разведки получены</span>
        )}
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

      {system.scout_report && (
        <div className="galaxy-card-report">
          <strong>Отчёт разведки</strong>
          <p>{system.scout_report.description}</p>
          <div className="galaxy-card-report-grid">
            <span>Ресурсы: {system.scout_report.richness}</span>
            <span>Опасность: {system.scout_report.danger}</span>
            <span>Сигналы: {system.scout_report.discovered_signals}</span>
          </div>
        </div>
      )}

      {isCurrentSystem && (
        <p className="galaxy-action-hint">
          Это домашняя система. Разведка не требуется.
        </p>
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
        {system.is_scouted ? "Разведать снова" : "Разведать"}
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
