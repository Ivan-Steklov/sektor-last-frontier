import { useCallback, useEffect, useMemo, useState } from "react";
import "./MissionsPanel.css";

const TELEGRAM_ID = 1;

type MissionStatus = "active" | "completed" | string;
type MissionType =
  | "scout"
  | "harvest"
  | "expedition"
  | "attack"
  | "transport"
  | string;

type MissionDetails = Record<string, unknown>;

interface MissionItem {
  source: string;
  type: MissionType;
  status: MissionStatus;
  title: string;
  started_at?: string | null;
  finishes_at?: string | null;
  completed_at?: string | null;
  details?: MissionDetails | null;
}

interface MissionsStateResponse {
  items: MissionItem[];
}

type ShipsResponse = {
  ships: {
    code: string;
    name: string;
    quantity: number;
  }[];
};

type FleetForm = {
  scout: number;
  transport: number;
  fighter: number;
};

const EMPTY_FLEET: FleetForm = {
  scout: 0,
  transport: 0,
  fighter: 0,
};

export function MissionsPanel() {
  const apiUrl = useMemo(() => {
    return (
      (import.meta.env.VITE_API_URL as string | undefined) ??
      "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
  }, []);

  const [state, setState] = useState<MissionsStateResponse | null>(null);
  const [availableShips, setAvailableShips] = useState<FleetForm>(EMPTY_FLEET);
  const [fleet, setFleet] = useState<FleetForm>(EMPTY_FLEET);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingExpedition, setIsStartingExpedition] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadMissions = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setErrorText(null);

      try {
        const response = await fetch(
          `${apiUrl}/api/missions/current?telegram_id=${TELEGRAM_ID}`,
          {
            signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as MissionsStateResponse;
        setState({
          items: Array.isArray(data.items) ? data.items : [],
        });
        setLastUpdatedAt(new Date());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Неизвестная ошибка";
        setErrorText(`Не удалось загрузить миссии: ${message}`);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [apiUrl],
  );

  const loadShips = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `${apiUrl}/api/ships/current?telegram_id=${TELEGRAM_ID}`,
          {
            signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as ShipsResponse;

        const mappedShips: FleetForm = {
          scout: 0,
          transport: 0,
          fighter: 0,
        };

        for (const ship of data.ships) {
          if (
            ship.code === "scout" ||
            ship.code === "transport" ||
            ship.code === "fighter"
          ) {
            mappedShips[ship.code] = ship.quantity;
          }
        }

        setAvailableShips(mappedShips);
        setFleet((current) => clampFleetToAvailable(current, mappedShips));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Неизвестная ошибка";
        setErrorText(`Не удалось загрузить корабли: ${message}`);
      }
    },
    [apiUrl],
  );

  const refreshAll = useCallback(
    async (signal?: AbortSignal) => {
      await Promise.all([loadMissions(signal), loadShips(signal)]);
    },
    [loadMissions, loadShips],
  );

  useEffect(() => {
    const controller = new AbortController();

    void refreshAll(controller.signal);

    return () => {
      controller.abort();
    };
  }, [refreshAll]);

  async function startExpedition() {
    const selectedShips = fleet.scout + fleet.transport + fleet.fighter;

    if (selectedShips <= 0) {
      setErrorText("Нужно выбрать хотя бы один корабль для экспедиции.");
      return;
    }

    setIsStartingExpedition(true);
    setErrorText(null);

    try {
      const response = await fetch(`${apiUrl}/api/missions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: TELEGRAM_ID,
          type: "expedition",
          ships: fleet,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? "Не удалось отправить экспедицию");
      }

      setFleet(EMPTY_FLEET);
      await refreshAll();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      setErrorText(message);
    } finally {
      setIsStartingExpedition(false);
    }
  }

  function updateFleet(shipCode: keyof FleetForm, value: string) {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }

    const maxValue = availableShips[shipCode] ?? 0;

    setFleet((current) => ({
      ...current,
      [shipCode]: Math.min(parsed, maxValue),
    }));
  }

  const allMissions = state?.items ?? [];
  const activeMissions = allMissions.filter(
    (mission) => mission.status === "active",
  );
  const completedMissions = allMissions.filter(
    (mission) => mission.status === "completed",
  );

  const expeditionActive = activeMissions.some(
    (mission) => mission.type === "expedition",
  );
  const startDisabled = expeditionActive || isStartingExpedition;

  return (
    <section className="missions-panel">
      <div className="missions-panel-header">
        <div>
          <h2>Миссии</h2>
          <p>
            Единый центр полётов: разведка систем, сбор ресурсов, экспедиции,
            транспорт, а позже — атаки.
          </p>
        </div>

        <div className="missions-panel-actions">
          {lastUpdatedAt && (
            <div className="missions-last-updated">
              Обновлено: {formatTime(lastUpdatedAt)}
            </div>
          )}

          <button
            type="button"
            className="missions-refresh-button"
            onClick={() => void refreshAll()}
            disabled={isLoading || isStartingExpedition}
          >
            {isLoading ? "Обновление..." : "Обновить"}
          </button>
        </div>
      </div>

      <div className="missions-panel-note">
        Этот экран показывает единый список активных полётов из разных
        подсистем: разведка, сбор ресурсов, экспедиции и транспорт.
      </div>

      {errorText && <div className="missions-error">{errorText}</div>}

      <section className="mission-start-card">
        <div className="mission-start-header">
          <div>
            <h3>Запуск экспедиции</h3>
            <p>Выбери корабли и отправь их через общий API миссий.</p>
          </div>

          {expeditionActive && (
            <span className="mission-start-badge">Экспедиция уже в пути</span>
          )}
        </div>

        <div className="mission-start-grid">
          <FleetInput
            label={`Разведчик (доступно: ${availableShips.scout})`}
            value={fleet.scout}
            disabled={startDisabled}
            onChange={(value) => updateFleet("scout", value)}
            onDecrease={() => updateFleet("scout", String(fleet.scout - 1))}
            onIncrease={() => updateFleet("scout", String(fleet.scout + 1))}
          />

          <FleetInput
            label={`Транспортник (доступно: ${availableShips.transport})`}
            value={fleet.transport}
            disabled={startDisabled}
            onChange={(value) => updateFleet("transport", value)}
            onDecrease={() =>
              updateFleet("transport", String(fleet.transport - 1))
            }
            onIncrease={() =>
              updateFleet("transport", String(fleet.transport + 1))
            }
          />

          <FleetInput
            label={`Истребитель (доступно: ${availableShips.fighter})`}
            value={fleet.fighter}
            disabled={startDisabled}
            onChange={(value) => updateFleet("fighter", value)}
            onDecrease={() => updateFleet("fighter", String(fleet.fighter - 1))}
            onIncrease={() => updateFleet("fighter", String(fleet.fighter + 1))}
          />
        </div>

        <button
          type="button"
          className="mission-start-button"
          disabled={startDisabled}
          onClick={() => {
            void startExpedition();
          }}
        >
          {isStartingExpedition ? "Отправка..." : "Отправить экспедицию"}
        </button>
      </section>

      {!state && isLoading && (
        <div className="missions-empty">Загрузка миссий...</div>
      )}

      {state && (
        <div className="missions-sections">
          <section className="missions-section">
            <h3>Активные миссии</h3>

            {activeMissions.length === 0 ? (
              <div className="missions-empty">Активных миссий сейчас нет.</div>
            ) : (
              <div className="missions-list">
                {activeMissions.map((mission, index) => (
                  <MissionCard
                    key={missionKey(mission, index)}
                    mission={mission}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="missions-section">
            <h3>Последние результаты</h3>

            {completedMissions.length === 0 ? (
              <div className="missions-empty">
                Завершённых результатов пока нет.
              </div>
            ) : (
              <div className="missions-list">
                {completedMissions.map((mission, index) => (
                  <MissionCard
                    key={missionKey(mission, index)}
                    mission={mission}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function FleetInput({
  label,
  value,
  disabled,
  onChange,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <label className="mission-start-input">
      <span>{label}</span>

      <div className="mission-start-counter">
        <button
          type="button"
          className="mission-start-counter-button"
          disabled={disabled || value <= 0}
          onClick={onDecrease}
          aria-label={`Уменьшить: ${label}`}
        >
          −
        </button>

        <input
          type="number"
          min={0}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />

        <button
          type="button"
          className="mission-start-counter-button"
          disabled={disabled}
          onClick={onIncrease}
          aria-label={`Увеличить: ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

function MissionCard({ mission }: { mission: MissionItem }) {
  const title = missionTitle(mission);

  return (
    <article className={`mission-card mission-card-${mission.status}`}>
      <div className="mission-card-header">
        <div>
          <div className="mission-label">{title}</div>
          <div className="mission-type">{missionTypeLabel(mission.type)}</div>
        </div>

        <div className="mission-status">
          {missionStatusLabel(mission.status)}
        </div>
      </div>

      <div className="mission-details">
        <MissionDetail
          label="Источник"
          value={missionSourceLabel(mission.source)}
        />
        <MissionDetail label="Цель" value={formatTarget(mission)} />

        {mission.started_at && (
          <MissionDetail
            label="Старт"
            value={formatDateTime(mission.started_at)}
          />
        )}

        {mission.finishes_at && (
          <MissionDetail
            label="Завершение"
            value={formatDateTime(mission.finishes_at)}
          />
        )}

        {mission.completed_at && (
          <MissionDetail
            label="Итог получен"
            value={formatDateTime(mission.completed_at)}
          />
        )}
      </div>

      <MissionPayloadBlock details={mission.details} />
    </article>
  );
}

function MissionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mission-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MissionPayloadBlock({ details }: { details?: MissionDetails | null }) {
  if (!details || Object.keys(details).length === 0) {
    return null;
  }

  const rows = detailsRows(details);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mission-payload">
      {rows.map((row) => (
        <MissionDetail key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function detailsRows(
  details: MissionDetails,
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  addDetailRow(rows, details, "remaining_seconds", "Осталось");
  addDetailRow(rows, details, "target_galaxy", "Галактика");
  addDetailRow(rows, details, "target_system", "Система");
  addDetailRow(rows, details, "sent_ships", "Отправлено");
  addDetailRow(rows, details, "metal", "Металл");
  addDetailRow(rows, details, "crystal", "Кристалл");
  addDetailRow(rows, details, "transport_count", "Транспортники");
  addDetailRow(rows, details, "description", "Описание");
  addDetailRow(rows, details, "outcome", "Исход");
  addDetailRow(rows, details, "metal_found", "Найдено металла");
  addDetailRow(rows, details, "crystal_found", "Найдено кристаллов");
  addDetailRow(rows, details, "danger", "Опасность");
  addDetailRow(rows, details, "danger_level", "Уровень опасности");
  addDetailRow(rows, details, "richness", "Богатство");
  addDetailRow(rows, details, "discovered_signals", "Сигналы");

  return rows;
}

function addDetailRow(
  rows: Array<{ label: string; value: string }>,
  details: MissionDetails,
  key: string,
  label: string,
) {
  if (!(key in details)) {
    return;
  }

  const value = details[key];

  if (value === null || value === undefined || value === "") {
    return;
  }

  rows.push({
    label,
    value: detailValueToText(key, value),
  });
}

function detailValueToText(key: string, value: unknown): string {
  if (key === "remaining_seconds" && typeof value === "number") {
    return formatDuration(value);
  }

  if (key === "sent_ships" && isRecord(value)) {
    return formatShips(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => detailValueToText("", item)).join(", ");
  }

  return JSON.stringify(value);
}

function missionTitle(mission: MissionItem): string {
  const rawTitle = mission.title?.trim() ?? "";

  if (rawTitle.length > 0 && !rawTitle.includes("?")) {
    return rawTitle;
  }

  const target = formatTarget(mission);
  const typeLabel = missionTypeLabel(mission.type);

  if (target === "Без конкретной системы") {
    return typeLabel;
  }

  return `${typeLabel} ${target}`;
}

function missionTypeLabel(type: MissionType): string {
  if (type === "scout") {
    return "Разведка системы";
  }

  if (type === "harvest") {
    return "Сбор ресурсов";
  }

  if (type === "expedition") {
    return "Экспедиция";
  }

  if (type === "attack") {
    return "Атака";
  }

  if (type === "transport") {
    return "Транспорт";
  }

  return type;
}

function missionStatusLabel(status: MissionStatus): string {
  if (status === "active") {
    return "В полёте";
  }

  if (status === "completed") {
    return "Завершена";
  }

  return status;
}

function missionSourceLabel(source: string): string {
  if (source === "galaxy_scout") {
    return "Галактика / разведка";
  }

  if (source === "galaxy_resource") {
    return "Галактика / сбор ресурсов";
  }

  if (source === "expedition") {
    return "Экспедиции";
  }

  if (source === "transport") {
    return "Транспорт";
  }

  return source;
}

function formatTarget(mission: MissionItem): string {
  const details = mission.details ?? {};
  const galaxy = details.target_galaxy;
  const system = details.target_system;

  if (typeof galaxy === "number" && typeof system === "number") {
    return `${galaxy}:${system}`;
  }

  return "Без конкретной системы";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU");
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString("ru-RU");
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} сек.`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatShips(value: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [shipCode, quantity] of Object.entries(value)) {
    if (typeof quantity !== "number" || quantity <= 0) {
      continue;
    }

    parts.push(`${shipCode}: ${quantity}`);
  }

  if (parts.length === 0) {
    return "Нет кораблей";
  }

  return parts.join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function missionKey(mission: MissionItem, index: number): string {
  return [
    mission.source,
    mission.type,
    mission.status,
    mission.started_at ?? "no-start",
    index,
  ].join("-");
}

function clampFleetToAvailable(
  fleet: FleetForm,
  availableShips: FleetForm,
): FleetForm {
  return {
    scout: Math.min(fleet.scout, availableShips.scout),
    transport: Math.min(fleet.transport, availableShips.transport),
    fighter: Math.min(fleet.fighter, availableShips.fighter),
  };
}
