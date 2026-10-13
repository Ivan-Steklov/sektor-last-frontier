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
    attack?: number;
    defense?: number;
    cargo_capacity?: number;
  }[];
};

type ShipStats = {
  name: string;
  attack: number;
  defense: number;
  cargo_capacity: number;
};

interface SystemStorageItem {
  id: number;
  galaxy: number;
  system: number;
  metal: number;
  crystal: number;
  created_at: string;
  updated_at: string;
}

interface SystemStorageStateResponse {
  storages: SystemStorageItem[];
}
interface ResourceStateResponse {
  metal: number;
  crystal: number;
  energy: number;
  population: number;
  metal_per_hour: number;
  crystal_per_hour: number;
  energy_produced: number;
  energy_consumed: number;
  energy_efficiency_percent: number;
  warehouse_capacity: number;
  calculated_at: string;
}

interface GalaxySectorSystemItem {
  galaxy: number;
  system: number;
  name: string;
  distance: number;
  richness: string;
  danger: string;
  danger_level: number;
  has_home_planet: boolean;
  is_scouted: boolean;
}

interface GalaxySectorResponse {
  current_galaxy: number;
  current_system: number;
  current_position: number;
  systems: GalaxySectorSystemItem[];
}

type FleetForm = {
  transport: number;
  heavy_transport: number;
  fighter: number;
  corvette: number;
};

type TransportForm = {
  target_galaxy: number;
  target_system: number;
  metal: number;
  crystal: number;
};
type TransportFleetForm = {
  transport: number;
  heavy_transport: number;
};

const EMPTY_FLEET: FleetForm = {
  transport: 0,
  heavy_transport: 0,
  fighter: 0,
  corvette: 0,
};

const DEFAULT_TRANSPORT_FORM: TransportForm = {
  target_galaxy: 1,
  target_system: 2,
  metal: 0,
  crystal: 0,
};

const DEFAULT_TRANSPORT_FLEET: TransportFleetForm = {
  transport: 1,
  heavy_transport: 0,
};

export function MissionsPanel() {
  const apiUrl = useMemo(() => {
    return (
      (import.meta.env.VITE_API_URL as string | undefined) ??
      "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
  }, []);

  const [state, setState] = useState<MissionsStateResponse | null>(null);
  const [systemStorages, setSystemStorages] = useState<SystemStorageItem[]>([]);
  const [homeResources, setHomeResources] = useState<ResourceStateResponse | null>(
  null,
);
  const [knownSystems, setKnownSystems] = useState<GalaxySectorSystemItem[]>(
    [],
  );
  const [availableShips, setAvailableShips] = useState<FleetForm>(EMPTY_FLEET);
  const [availableHeavyTransports, setAvailableHeavyTransports] = useState(0);
  const [shipStats, setShipStats] = useState<Record<string, ShipStats>>({});
  const [transportCargoCapacity, setTransportCargoCapacity] = useState(0);
  const [heavyTransportCargoCapacity, setHeavyTransportCargoCapacity] =
    useState(0);
  const [fleet, setFleet] = useState<FleetForm>(EMPTY_FLEET);
  const [transportForm, setTransportForm] = useState<TransportForm>(
    DEFAULT_TRANSPORT_FORM,
  );
  const [transportFleet, setTransportFleet] = useState<TransportFleetForm>(
    DEFAULT_TRANSPORT_FLEET,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingExpedition, setIsStartingExpedition] = useState(false);
  const [isStartingTransport, setIsStartingTransport] = useState(false);
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
          transport: 0,
          heavy_transport: 0,
          fighter: 0,
          corvette: 0,
        };

        const loadedShipStats: Record<string, ShipStats> = {};

        let loadedTransportCargoCapacity = 0;
        let loadedHeavyTransportCargoCapacity = 0;

        for (const ship of data.ships) {
          loadedShipStats[ship.code] = {
            name: ship.name,
            attack: typeof ship.attack === "number" ? ship.attack : 0,
            defense: typeof ship.defense === "number" ? ship.defense : 0,
            cargo_capacity:
              typeof ship.cargo_capacity === "number"
                ? ship.cargo_capacity
                : 0,
          };

          if (isFleetShipCode(ship.code)) {
            mappedShips[ship.code] = ship.quantity;
          }

          if (ship.code === "transport") {
            loadedTransportCargoCapacity =
              typeof ship.cargo_capacity === "number"
                ? ship.cargo_capacity
                : 0;
          }

          if (ship.code === "heavy_transport") {
            loadedHeavyTransportCargoCapacity =
              typeof ship.cargo_capacity === "number"
                ? ship.cargo_capacity
                : 0;
          }
        }

        setAvailableShips(mappedShips);
        setAvailableHeavyTransports(mappedShips.heavy_transport);
        setShipStats(loadedShipStats);
        setTransportCargoCapacity(loadedTransportCargoCapacity);
        setHeavyTransportCargoCapacity(loadedHeavyTransportCargoCapacity);

        setFleet((current) => clampFleetToAvailable(current, mappedShips));

        setTransportFleet((current) => {
          const clamped: TransportFleetForm = {
            transport: Math.min(current.transport, mappedShips.transport),
            heavy_transport: Math.min(
              current.heavy_transport,
              mappedShips.heavy_transport,
            ),
          };

          if (clamped.transport + clamped.heavy_transport > 0) {
            return clamped;
          }

          if (mappedShips.transport > 0) {
            return {
              transport: 1,
              heavy_transport: 0,
            };
          }

          if (mappedShips.heavy_transport > 0) {
            return {
              transport: 0,
              heavy_transport: 1,
            };
          }

          return clamped;
        });
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
  const loadHomeResources = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `${apiUrl}/api/resources/current?telegram_id=${TELEGRAM_ID}`,
          {
            signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as ResourceStateResponse;

        setHomeResources(data);

        setTransportForm((current) => ({
          ...current,
          metal: Math.min(current.metal, data.metal),
          crystal: Math.min(current.crystal, data.crystal),
        }));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Неизвестная ошибка";
        setErrorText(`Не удалось загрузить ресурсы планеты: ${message}`);
      }
    },
    [apiUrl],
  );

  const loadSystemStorages = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `${apiUrl}/api/system-storage/current?telegram_id=${TELEGRAM_ID}`,
          {
            signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as SystemStorageStateResponse;

        setSystemStorages(Array.isArray(data.storages) ? data.storages : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Неизвестная ошибка";
        setErrorText(`Не удалось загрузить внешние склады: ${message}`);
      }
    },
    [apiUrl],
  );

  const loadKnownSystems = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `${apiUrl}/api/galaxy/sector?telegram_id=${TELEGRAM_ID}&radius=9`,
          {
            signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as GalaxySectorResponse;

        const scoutedSystems = Array.isArray(data.systems)
          ? data.systems
              .filter((system) => system.is_scouted)
              .sort((left, right) => {
                if (left.galaxy !== right.galaxy) {
                  return left.galaxy - right.galaxy;
                }

                return left.system - right.system;
              })
          : [];

        setKnownSystems(scoutedSystems);

        setTransportForm((current) => {
          const currentTargetExists = scoutedSystems.some(
            (system) =>
              system.galaxy === current.target_galaxy &&
              system.system === current.target_system,
          );

          if (currentTargetExists || scoutedSystems.length === 0) {
            return current;
          }

          return {
            ...current,
            target_galaxy: scoutedSystems[0].galaxy,
            target_system: scoutedSystems[0].system,
          };
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Неизвестная ошибка";
        setErrorText(`Не удалось загрузить разведанные системы: ${message}`);
      }
    },
    [apiUrl],
  );

  const refreshAll = useCallback(
    async (signal?: AbortSignal) => {
      await Promise.all([
        loadMissions(signal),
        loadShips(signal),
        loadHomeResources(signal),
        loadSystemStorages(signal),
        loadKnownSystems(signal),
      ]);
    },
    [
      loadMissions,
      loadShips,
      loadHomeResources,
      loadSystemStorages,
      loadKnownSystems,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();

    void refreshAll(controller.signal);

    return () => {
      controller.abort();
    };
  }, [refreshAll]);

  async function startExpedition() {
    if (selectedExpeditionShips <= 0) {
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

  async function startTransport() {
    if (transportDisabledReason) {
      setErrorText(transportDisabledReason);
      return;
    }

    if (!selectedTransportTarget) {
      setErrorText("Нужно выбрать разведанную систему для доставки.");
      return;
    }

    setIsStartingTransport(true);
    setErrorText(null);

    try {
      const response = await fetch(`${apiUrl}/api/missions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: TELEGRAM_ID,
          type: "transport",
          target_galaxy: selectedTransportTarget.galaxy,
          target_system: selectedTransportTarget.system,
          metal: transportForm.metal,
          crystal: transportForm.crystal,
          ships: {
            transport: transportFleet.transport,
            heavy_transport: transportFleet.heavy_transport,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? "Не удалось отправить транспорт");
      }

      setTransportForm((current) => ({
        ...current,
        metal: 0,
        crystal: 0,
      }));

      await refreshAll();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      setErrorText(message);
    } finally {
      setIsStartingTransport(false);
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
  function updateTransportFleet(
    shipCode: keyof TransportFleetForm,
    value: string,
  ) {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }

    const normalizedValue = Math.floor(parsed);
    const maxValue =
      shipCode === "transport"
        ? availableShips.transport
        : availableHeavyTransports;

    setTransportFleet((current) => ({
      ...current,
      [shipCode]: Math.min(normalizedValue, maxValue),
    }));
  }

  function updateTransportForm(field: keyof TransportForm, value: string) {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }

    const normalizedValue = Math.floor(parsed);

    setTransportForm((current) => {
      if (field === "metal") {
        return {
          ...current,
          metal: Math.min(normalizedValue, homeResources?.metal ?? normalizedValue),
        };
      }

      if (field === "crystal") {
        return {
          ...current,
          crystal: Math.min(
            normalizedValue,
            homeResources?.crystal ?? normalizedValue,
          ),
        };
      }

      return {
        ...current,
        [field]: normalizedValue,
      };
    });
  }

  function updateTransportTarget(value: string) {
    const [galaxyRaw, systemRaw] = value.split(":");
    const galaxy = Number(galaxyRaw);
    const system = Number(systemRaw);

    if (
      Number.isNaN(galaxy) ||
      Number.isNaN(system) ||
      galaxy <= 0 ||
      system <= 0
    ) {
      return;
    }

    setTransportForm((current) => ({
      ...current,
      target_galaxy: galaxy,
      target_system: system,
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
  const transportActive = activeMissions.some(
    (mission) => mission.type === "transport",
  );

  const selectedTransportTarget = knownSystems.find(
    (system) =>
      system.galaxy === transportForm.target_galaxy &&
      system.system === transportForm.target_system,
  );

  const selectedTransportCargo = transportForm.metal + transportForm.crystal;
  const selectedTransportCargoCapacity =
    transportFleet.transport * transportCargoCapacity +
    transportFleet.heavy_transport * heavyTransportCargoCapacity;

    const selectedExpeditionShips =
    fleet.transport +
    fleet.heavy_transport +
    fleet.fighter +
    fleet.corvette;

  const selectedExpeditionCargoCapacity = calculateFleetStat(
    fleet,
    shipStats,
    "cargo_capacity",
  );

  const selectedExpeditionAttackPower = calculateFleetStat(
    fleet,
    shipStats,
    "attack",
  );

  const selectedExpeditionDefensePower = calculateFleetStat(
    fleet,
    shipStats,
    "defense",
  );

  const selectedExpeditionFleetText = formatExpeditionFleet(fleet);

  const isTransportCargoOverCapacity =
    selectedTransportCargoCapacity > 0 &&
    selectedTransportCargo > selectedTransportCargoCapacity;

  const transportMetalAvailable = homeResources?.metal ?? 0;
  const transportCrystalAvailable = homeResources?.crystal ?? 0;

  const expeditionStartDisabled = expeditionActive || isStartingExpedition;

  const transportFieldsDisabled =
    transportActive || isStartingTransport || homeResources === null;

  const transportTargetDisabled =
    transportFieldsDisabled || knownSystems.length === 0;

  const transportDisabledReason = getTransportDisabledReason({
    transportActive,
    isStartingTransport,
    availableTransports: availableShips.transport,
    availableHeavyTransports,
    selectedTransportCount: transportFleet.transport,
    selectedHeavyTransportCount: transportFleet.heavy_transport,
    knownSystemsCount: knownSystems.length,
    selectedTarget: selectedTransportTarget,
    cargoAmount: selectedTransportCargo,
    cargoCapacity: selectedTransportCargoCapacity,
    metal: transportForm.metal,
    crystal: transportForm.crystal,
    homeResources,
  });
  const transportStartDisabled = transportDisabledReason !== null;

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
            disabled={isLoading || isStartingExpedition || isStartingTransport}
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
            label={`Транспортник (доступно: ${availableShips.transport})`}
            value={fleet.transport}
            disabled={expeditionStartDisabled}
            onChange={(value) => updateFleet("transport", value)}
            onDecrease={() =>
              updateFleet("transport", String(fleet.transport - 1))
            }
            onIncrease={() =>
              updateFleet("transport", String(fleet.transport + 1))
            }
          />

          <FleetInput
            label={`Тяжёлый транспорт (доступно: ${availableShips.heavy_transport})`}
            value={fleet.heavy_transport}
            disabled={expeditionStartDisabled}
            onChange={(value) => updateFleet("heavy_transport", value)}
            onDecrease={() =>
              updateFleet(
                "heavy_transport",
                String(fleet.heavy_transport - 1),
              )
            }
            onIncrease={() =>
              updateFleet(
                "heavy_transport",
                String(fleet.heavy_transport + 1),
              )
            }
          />

          <FleetInput
            label={`Истребитель (доступно: ${availableShips.fighter})`}
            value={fleet.fighter}
            disabled={expeditionStartDisabled}
            onChange={(value) => updateFleet("fighter", value)}
            onDecrease={() => updateFleet("fighter", String(fleet.fighter - 1))}
            onIncrease={() => updateFleet("fighter", String(fleet.fighter + 1))}
          />

          <FleetInput
            label={`Корвет (доступно: ${availableShips.corvette})`}
            value={fleet.corvette}
            disabled={expeditionStartDisabled}
            onChange={(value) => updateFleet("corvette", value)}
            onDecrease={() =>
              updateFleet("corvette", String(fleet.corvette - 1))
            }
            onIncrease={() =>
              updateFleet("corvette", String(fleet.corvette + 1))
            }
          />
        </div>

        <div className="expedition-fleet-summary">
          <div className="expedition-fleet-summary-header">
            <div>
              <h4>Состав экспедиции</h4>
              <p>
                Экспедиции теперь запускаются транспортными и боевыми кораблями.
                Разведчики остаются для разведки систем в галактике.
              </p>
            </div>
          </div>

          <div className="expedition-fleet-composition">
            <span>Корабли</span>
            <strong>{selectedExpeditionFleetText}</strong>
          </div>

          <div className="expedition-fleet-stats">
            <div className="expedition-fleet-stat">
              <span>Грузоподъёмность</span>
              <strong>{formatNumber(selectedExpeditionCargoCapacity)}</strong>
            </div>

            <div className="expedition-fleet-stat">
              <span>Атака</span>
              <strong>{formatNumber(selectedExpeditionAttackPower)}</strong>
            </div>

            <div className="expedition-fleet-stat">
              <span>Защита</span>
              <strong>{formatNumber(selectedExpeditionDefensePower)}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mission-start-button"
          disabled={expeditionStartDisabled}
          onClick={() => {
            void startExpedition();
          }}
        >
          {isStartingExpedition ? "Отправка..." : "Отправить экспедицию"}
        </button>
      </section>

      <section className="mission-start-card">
        <div className="mission-start-header">
          <div>
            <h3>Запуск транспорта</h3>
            <p>
              Доставь ресурсы с домашней планеты на внешний склад в разведанной
              системе.
            </p>
          </div>

          {transportActive && (
            <span className="mission-start-badge">Транспорт уже в пути</span>
          )}
        </div>

        <div className="transport-target-layout">
          <TransportTargetSelect
            systems={knownSystems}
            selectedSystem={selectedTransportTarget}
            value={`${transportForm.target_galaxy}:${transportForm.target_system}`}
            disabled={transportTargetDisabled}
            onChange={updateTransportTarget}
          />

          {selectedTransportTarget && (
            <div className="transport-target-preview">
              <div className="transport-target-preview-title">
                Система {selectedTransportTarget.galaxy}:
                {selectedTransportTarget.system}
              </div>

              <div className="transport-target-preview-grid">
                <div>
                  <span>Название</span>
                  <strong>{selectedTransportTarget.name}</strong>
                </div>

                <div>
                  <span>Дистанция</span>
                  <strong>{selectedTransportTarget.distance}</strong>
                </div>

                <div>
                  <span>Богатство</span>
                  <strong>
                    {richnessLabel(selectedTransportTarget.richness)}
                  </strong>
                </div>

                <div>
                  <span>Опасность</span>
                  <strong>
                    {dangerLabel(selectedTransportTarget.danger)} ·{" "}
                    {selectedTransportTarget.danger_level}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="transport-ships-block">
          <div className="transport-ships-header">
            <div>
              <h4>Корабли для доставки</h4>
              <p>
                Выбери, сколько обычных и тяжёлых транспортов отправить в
                рейс.
              </p>
            </div>

            <div className="transport-ships-total">
              Вместимость: {formatNumber(selectedTransportCargoCapacity)}
            </div>
          </div>

          <div className="transport-ships-grid">
            <div className="transport-ship-card">
              <FleetInput
                label={`Транспортник · доступно: ${availableShips.transport}`}
                value={transportFleet.transport}
                disabled={transportFieldsDisabled}
                onChange={(value) => updateTransportFleet("transport", value)}
                onDecrease={() =>
                  updateTransportFleet(
                    "transport",
                    String(transportFleet.transport - 1),
                  )
                }
                onIncrease={() =>
                  updateTransportFleet(
                    "transport",
                    String(transportFleet.transport + 1),
                  )
                }
              />

              <div className="transport-ship-meta">
                Груз за корабль: {formatNumber(transportCargoCapacity)}
              </div>
            </div>

            <div className="transport-ship-card">
              <FleetInput
                label={`Тяжёлый транспорт · доступно: ${availableHeavyTransports}`}
                value={transportFleet.heavy_transport}
                disabled={transportFieldsDisabled}
                onChange={(value) =>
                  updateTransportFleet("heavy_transport", value)
                }
                onDecrease={() =>
                  updateTransportFleet(
                    "heavy_transport",
                    String(transportFleet.heavy_transport - 1),
                  )
                }
                onIncrease={() =>
                  updateTransportFleet(
                    "heavy_transport",
                    String(transportFleet.heavy_transport + 1),
                  )
                }
              />

              <div className="transport-ship-meta">
                Груз за корабль: {formatNumber(heavyTransportCargoCapacity)}
              </div>
            </div>
          </div>
        </div>

        <div className="transport-cargo-block">
          <div className="transport-cargo-header">
            <div>
              <h4>Груз для доставки</h4>
              <p>Ресурсы будут списаны с домашней планеты при запуске.</p>
            </div>

            <div
              className={
                isTransportCargoOverCapacity
                  ? "transport-cargo-total transport-cargo-total-warning"
                  : "transport-cargo-total"
              }
            >
              Груз: {formatNumber(selectedTransportCargo)} /{" "}
              {formatNumber(selectedTransportCargoCapacity)}
            </div>
          </div>
          <div className="transport-cargo-capacity">
            <span>Грузоподъёмность выбранного транспорта</span>
            <strong>{formatNumber(selectedTransportCargoCapacity)}</strong>
          </div>

          <div className="transport-start-grid transport-resources-grid">
            <NumberInput
              label="Металл"
              value={transportForm.metal}
              disabled={transportFieldsDisabled}
              maxValue={transportMetalAvailable}
              hint={`Доступно: ${formatNumber(transportMetalAvailable)}`}
              onChange={(value) => updateTransportForm("metal", value)}
            />

            <NumberInput
              label="Кристалл"
              value={transportForm.crystal}
              disabled={transportFieldsDisabled}
              maxValue={transportCrystalAvailable}
              hint={`Доступно: ${formatNumber(transportCrystalAvailable)}`}
              onChange={(value) => updateTransportForm("crystal", value)}
            />
          </div>
        </div>

        {transportDisabledReason ? (
          <div className="transport-start-warning">
            {transportDisabledReason}
          </div>
        ) : (
          <div className="transport-start-ready">
            Транспорт готов к отправке: система{" "}
            {selectedTransportTarget?.galaxy}:{selectedTransportTarget?.system},
            груз: {formatNumber(selectedTransportCargo)} /{" "}
            {formatNumber(selectedTransportCargoCapacity)}.
          </div>
        )}

        <button
          type="button"
          className="mission-start-button"
          disabled={transportStartDisabled}
          onClick={() => {
            void startTransport();
          }}
        >
          {isStartingTransport ? "Отправка..." : "Отправить транспорт"}
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
            <h3>Внешние склады</h3>

            {systemStorages.length === 0 ? (
              <div className="missions-empty">
                Внешних складов пока нет. Отправь транспортировку ресурсов в
                разведанную систему.
              </div>
            ) : (
              <div className="system-storage-list">
                {systemStorages.map((storage) => (
                  <SystemStorageCard key={storage.id} storage={storage} />
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

function getTransportDisabledReason({
  transportActive,
  isStartingTransport,
  availableTransports,
  availableHeavyTransports,
  selectedTransportCount,
  selectedHeavyTransportCount,
  knownSystemsCount,
  selectedTarget,
  cargoAmount,
  cargoCapacity,
  metal,
  crystal,
  homeResources,
}: {
  transportActive: boolean;
  isStartingTransport: boolean;
  availableTransports: number;
  availableHeavyTransports: number;
  selectedTransportCount: number;
  selectedHeavyTransportCount: number;
  knownSystemsCount: number;
  selectedTarget?: GalaxySectorSystemItem;
  cargoAmount: number;
  cargoCapacity: number;
  metal: number;
  crystal: number;
  homeResources: ResourceStateResponse | null;
}): string | null {
  if (isStartingTransport) {
    return "Транспорт отправляется. Подожди завершения запроса.";
  }

  if (transportActive) {
    return "Транспорт уже в пути. Дождись завершения текущей доставки.";
  }

  if (knownSystemsCount <= 0) {
    return "Нет разведанных систем для доставки. Сначала разведай систему на вкладке «Галактика».";
  }

  if (!selectedTarget) {
    return "Нужно выбрать разведанную систему для доставки.";
  }

  if (availableTransports + availableHeavyTransports <= 0) {
    return "Нет свободных транспортных кораблей. Они могут быть заняты сбором ресурсов, экспедицией или другой миссией.";
  }

  if (selectedTransportCount + selectedHeavyTransportCount <= 0) {
    return "Выбери хотя бы один транспортный корабль для доставки.";
  }

  if (selectedTransportCount > availableTransports) {
    return "Выбрано больше обычных транспортников, чем доступно.";
  }

  if (selectedHeavyTransportCount > availableHeavyTransports) {
    return "Выбрано больше тяжёлых транспортов, чем доступно.";
  }

  if (homeResources === null) {
    return "Загружаем ресурсы домашней планеты.";
  }

  if (cargoAmount <= 0) {
    return "Укажи металл или кристалл для доставки.";
  }

  if (cargoCapacity <= 0) {
    return "Грузоподъёмность выбранного транспорта равна нулю.";
  }

  if (cargoAmount > cargoCapacity) {
    return `Превышена грузоподъёмность выбранного транспорта: максимум ${formatNumber(
      cargoCapacity,
    )}.`;
  }

  if (metal > homeResources.metal || crystal > homeResources.crystal) {
    return "Недостаточно ресурсов на домашней планете.";
  }

  return null;
}

function TransportTargetSelect({
  systems,
  selectedSystem,
  value,
  disabled,
  onChange,
}: {
  systems: GalaxySectorSystemItem[];
  selectedSystem?: GalaxySectorSystemItem;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="transport-target-select">
      <span>Цель доставки</span>

      <select
        value={selectedSystem ? value : ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {systems.length === 0 ? (
          <option value="">Нет разведанных систем</option>
        ) : (
          systems.map((system) => (
            <option
              key={`${system.galaxy}:${system.system}`}
              value={`${system.galaxy}:${system.system}`}
            >
              {transportTargetLabel(system)}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  disabled,
  maxValue,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  maxValue?: number;
  hint?: string;
  onChange: (value: string) => void;
}) {
  const isOverLimit = typeof maxValue === "number" && value > maxValue;

  return (
    <label className="transport-start-input">
      <span>{label}</span>

      <input
        type="number"
        min={0}
        max={maxValue}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />

      {hint && <small className="transport-input-hint">{hint}</small>}

      {isOverLimit && (
        <small className="transport-input-warning">
          Недостаточно ресурса.
        </small>
      )}
    </label>
  );
}

function MissionCard({ mission }: { mission: MissionItem }) {
  const isTransportMission = mission.type === "transport";
  const isExpeditionMission = mission.type === "expedition";
  const isActiveTransport =
    isTransportMission && mission.status === "active";
  const isCompletedTransport =
    isTransportMission && mission.status === "completed";
  const isActiveExpedition =
    isExpeditionMission && mission.status === "active";
  const isCompletedExpedition =
    isExpeditionMission && mission.status === "completed";

  const title = isCompletedTransport
    ? "Доставка завершена"
    : isCompletedExpedition
      ? "Экспедиция завершена"
      : missionTitle(mission);

  const cardClassName = [
    "mission-card",
    `mission-card-${mission.status}`,
    isActiveTransport ? "mission-card-transport-active" : "",
    isCompletedTransport ? "mission-card-transport-completed" : "",
    isActiveExpedition ? "mission-card-expedition-active" : "",
    isCompletedExpedition ? "mission-card-expedition-completed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClassName}>
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

      {isCompletedTransport ? (
        <CompletedTransportResult mission={mission} />
      ) : isCompletedExpedition ? (
        <CompletedExpeditionResult mission={mission} />
      ) : isTransportMission ? (
        <TransportMissionPayload details={mission.details} />
      ) : isActiveExpedition ? (
        <ExpeditionMissionPayload details={mission.details} />
      ) : (
        <MissionPayloadBlock details={mission.details} />
      )}
    </article>
  );
}
function TransportMissionPayload({
  details,
}: {
  details?: MissionDetails | null;
}) {
  if (!details) {
    return null;
  }

  const metal = getNumberDetail(details, "metal") ?? 0;
  const crystal = getNumberDetail(details, "crystal") ?? 0;
  const transportCount = getNumberDetail(details, "transport_count") ?? 0;
  const heavyTransportCount =
    getNumberDetail(details, "heavy_transport_count") ?? 0;
  const cargoAmount = getNumberDetail(details, "cargo_amount") ?? metal + crystal;
  const cargoCapacity = getNumberDetail(details, "cargo_capacity") ?? 0;

  return (
    <div className="transport-mission-payload">
      <div className="transport-mission-summary">
        <span>Корабли</span>
        <strong>
          {formatTransportFleet(transportCount, heavyTransportCount)}
        </strong>
      </div>

      <div className="transport-mission-grid">
        <div className="transport-mission-resource">
          <span>Груз</span>
          <strong>
            {formatNumber(cargoAmount)} / {formatNumber(cargoCapacity)}
          </strong>
        </div>

        <div className="transport-mission-resource">
          <span>Металл</span>
          <strong>{formatNumber(metal)}</strong>
        </div>

        <div className="transport-mission-resource">
          <span>Кристалл</span>
          <strong>{formatNumber(crystal)}</strong>
        </div>
      </div>
    </div>
  );
}
function ExpeditionMissionPayload({
  details,
}: {
  details?: MissionDetails | null;
}) {
  if (!details) {
    return null;
  }

  const sentShipsRaw = details.sent_ships;
  const sentShips = isRecord(sentShipsRaw) ? sentShipsRaw : {};
  const remainingSeconds = getNumberDetail(details, "remaining_seconds");
  const cargoCapacity = getNumberDetail(details, "cargo_capacity") ?? 0;
  const attackPower = getNumberDetail(details, "attack_power") ?? 0;
  const defensePower = getNumberDetail(details, "defense_power") ?? 0;

  return (
    <div className="expedition-mission-payload">
      <div className="expedition-mission-summary">
        <span>Флот</span>
        <strong>{formatShips(sentShips)}</strong>
      </div>

      <div className="expedition-mission-grid">
        {remainingSeconds !== null && (
          <div className="expedition-mission-stat">
            <span>Осталось</span>
            <strong>{formatDuration(remainingSeconds)}</strong>
          </div>
        )}

        <div className="expedition-mission-stat">
          <span>Грузоподъёмность</span>
          <strong>{formatNumber(cargoCapacity)}</strong>
        </div>

        <div className="expedition-mission-stat">
          <span>Атака</span>
          <strong>{formatNumber(attackPower)}</strong>
        </div>

        <div className="expedition-mission-stat">
          <span>Защита</span>
          <strong>{formatNumber(defensePower)}</strong>
        </div>
      </div>
    </div>
  );
}
function CompletedExpeditionResult({ mission }: { mission: MissionItem }) {
  const details = mission.details ?? {};

  const outcome =
    typeof details.outcome === "string" ? details.outcome : "";
  const description =
    typeof details.description === "string"
      ? details.description
      : "Экспедиция завершена.";

  const metalFound = getNumberDetail(details, "metal_found") ?? 0;
  const crystalFound = getNumberDetail(details, "crystal_found") ?? 0;
  const cargoCapacity = getNumberDetail(details, "cargo_capacity") ?? 0;
  const attackPower = getNumberDetail(details, "attack_power") ?? 0;
  const defensePower = getNumberDetail(details, "defense_power") ?? 0;

  const sentShipsRaw = details.sent_ships;
  const returnedShipsRaw = details.returned_ships;
  const lostShipsRaw = details.lost_ships;

  const sentShips = isRecord(sentShipsRaw) ? sentShipsRaw : {};
  const returnedShips = isRecord(returnedShipsRaw) ? returnedShipsRaw : {};
  const lostShips = isRecord(lostShipsRaw) ? lostShipsRaw : {};

  const lostShipsText = formatShips(lostShips);
  const hasLostShips = lostShipsText !== "Нет кораблей";

  return (
    <div className="expedition-result-card">
      <div className="expedition-result-top">
        <div>
          <div className="expedition-result-title">
            {expeditionOutcomeLabel(outcome)}
          </div>
          <div className="expedition-result-description">
            {description}
          </div>
        </div>

        <div className="expedition-result-badge">
          {outcome || "result"}
        </div>
      </div>

      <div className="expedition-result-resources">
        <div className="expedition-result-resource">
          <span>Найдено металла</span>
          <strong>{formatNumber(metalFound)}</strong>
        </div>

        <div className="expedition-result-resource">
          <span>Найдено кристаллов</span>
          <strong>{formatNumber(crystalFound)}</strong>
        </div>

        <div className="expedition-result-resource">
          <span>Грузоподъёмность</span>
          <strong>{formatNumber(cargoCapacity)}</strong>
        </div>
      </div>

      <div className="expedition-result-fleets">
        <div className="expedition-result-fleet-row">
          <span>Отправленный флот</span>
          <strong>{formatShips(sentShips)}</strong>
        </div>

        <div className="expedition-result-fleet-row">
          <span>Вернулось</span>
          <strong>{formatShips(returnedShips)}</strong>
        </div>

        <div
          className={
            hasLostShips
              ? "expedition-result-fleet-row expedition-result-losses"
              : "expedition-result-fleet-row"
          }
        >
          <span>Потери</span>
          <strong>{hasLostShips ? lostShipsText : "Потерь нет"}</strong>
        </div>
      </div>

      <div className="expedition-result-combat">
        <div className="expedition-result-combat-stat">
          <span>Атака</span>
          <strong>{formatNumber(attackPower)}</strong>
        </div>

        <div className="expedition-result-combat-stat">
          <span>Защита</span>
          <strong>{formatNumber(defensePower)}</strong>
        </div>
      </div>
    </div>
  );
}
function CompletedTransportResult({ mission }: { mission: MissionItem }) {
  const details = mission.details ?? {};

  const metal = getNumberDetail(details, "metal") ?? 0;
  const crystal = getNumberDetail(details, "crystal") ?? 0;
  const transportCount = getNumberDetail(details, "transport_count") ?? 0;
  const heavyTransportCount =
    getNumberDetail(details, "heavy_transport_count") ?? 0;
  const cargoAmount = getNumberDetail(details, "cargo_amount") ?? metal + crystal;
  const cargoCapacity = getNumberDetail(details, "cargo_capacity") ?? 0;
  const target = formatTarget(mission);

  return (
    <div className="transport-result-card">
      <div className="transport-result-text">
        Груз доставлен на внешний склад системы {target}.
      </div>

      <div className="transport-result-grid">
        <div className="transport-result-resource">
          <span>Металл</span>
          <strong>{formatNumber(metal)}</strong>
        </div>

        <div className="transport-result-resource">
          <span>Кристалл</span>
          <strong>{formatNumber(crystal)}</strong>
        </div>

        <div className="transport-result-resource">
          <span>Груз</span>
          <strong>
            {formatNumber(cargoAmount)} / {formatNumber(cargoCapacity)}
          </strong>
        </div>

        <div className="transport-result-resource">
          <span>Корабли</span>
          <strong>
            {formatTransportFleet(transportCount, heavyTransportCount)}
          </strong>
        </div>
      </div>
    </div>
  );
}

function SystemStorageCard({ storage }: { storage: SystemStorageItem }) {
  return (
    <article className="system-storage-card">
      <div className="system-storage-header">
        <div>
          <div className="system-storage-title">
            Система {storage.galaxy}:{storage.system}
          </div>
          <div className="system-storage-subtitle">Внешний склад игрока</div>
        </div>

        <div className="system-storage-badge">Склад</div>
      </div>

      <div className="system-storage-resources">
        <div className="system-storage-resource">
          <span>Металл</span>
          <strong>{storage.metal}</strong>
        </div>

        <div className="system-storage-resource">
          <span>Кристалл</span>
          <strong>{storage.crystal}</strong>
        </div>
      </div>

      <div className="system-storage-updated">
        Обновлено: {formatDateTime(storage.updated_at)}
      </div>
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
  addDetailRow(rows, details, "heavy_transport_count", "Тяжёлые транспорты");
  addDetailRow(rows, details, "cargo_amount", "Груз");
  addDetailRow(rows, details, "cargo_capacity", "Грузоподъёмность");
  addDetailRow(rows, details, "attack_power", "Атака");
  addDetailRow(rows, details, "defense_power", "Защита");
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
function getNumberDetail(details: MissionDetails, key: string): number | null {
  const value = details[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}
function formatTransportFleet(
  transportCount: number,
  heavyTransportCount: number,
): string {
  const parts: string[] = [];

  if (transportCount > 0) {
    parts.push(
      `${formatNumber(transportCount)} ${pluralRu(transportCount, [
        "транспортник",
        "транспортника",
        "транспортников",
      ])}`,
    );
  }

  if (heavyTransportCount > 0) {
    parts.push(
      `${formatNumber(heavyTransportCount)} ${pluralRu(heavyTransportCount, [
        "тяжёлый транспорт",
        "тяжёлых транспорта",
        "тяжёлых транспортов",
      ])}`,
    );
  }

  if (parts.length === 0) {
    return "нет транспортных кораблей";
  }

  return parts.join(" · ");
}

function pluralRu(
  value: number,
  forms: [string, string, string],
): string {
  const absoluteValue = Math.abs(Math.floor(value));
  const lastTwoDigits = absoluteValue % 100;
  const lastDigit = absoluteValue % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return forms[2];
  }

  if (lastDigit === 1) {
    return forms[0];
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return forms[1];
  }

  return forms[2];
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

function transportTargetLabel(system: GalaxySectorSystemItem): string {
  return [
    `Система ${system.galaxy}:${system.system}`,
    system.name,
    `дистанция ${system.distance}`,
    richnessLabel(system.richness),
    dangerLabel(system.danger),
  ].join(" · ");
}

function richnessLabel(value: string): string {
  if (value === "poor") {
    return "Бедная";
  }

  if (value === "normal") {
    return "Обычная";
  }

  if (value === "rich") {
    return "Богатая";
  }

  if (value === "very_rich") {
    return "Очень богатая";
  }

  return value;
}

function dangerLabel(value: string): string {
  if (value === "low") {
    return "Низкая";
  }

  if (value === "medium") {
    return "Средняя";
  }

  if (value === "high") {
    return "Высокая";
  }

  if (value === "critical") {
    return "Критическая";
  }

  return value;
}
function expeditionOutcomeLabel(outcome: string): string {
  if (outcome === "empty") {
    return "Пустой сектор";
  }

  if (outcome === "metal") {
    return "Обнаружен металл";
  }

  if (outcome === "crystal") {
    return "Обнаружены кристаллы";
  }

  if (outcome === "loss") {
    return "Экспедиция понесла потери";
  }

  if (outcome === "pirates") {
    return "Столкновение с пиратами";
  }

  if (outcome === "anomaly") {
    return "Космическая аномалия";
  }

  if (outcome.trim().length === 0) {
    return "Итог экспедиции";
  }

  return outcome;
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
function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
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

    parts.push(formatShipCount(shipCode, quantity));
  }

  if (parts.length === 0) {
    return "Нет кораблей";
  }

  return parts.join(" · ");
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
    transport: Math.min(fleet.transport, availableShips.transport),
    heavy_transport: Math.min(
      fleet.heavy_transport,
      availableShips.heavy_transport,
    ),
    fighter: Math.min(fleet.fighter, availableShips.fighter),
    corvette: Math.min(fleet.corvette, availableShips.corvette),
  };
}

function isFleetShipCode(code: string): code is keyof FleetForm {
  return (
    code === "transport" ||
    code === "heavy_transport" ||
    code === "fighter" ||
    code === "corvette"
  );
}

function calculateFleetStat(
  fleet: FleetForm,
  shipStats: Record<string, ShipStats>,
  stat: "attack" | "defense" | "cargo_capacity",
): number {
  let total = 0;

  for (const [shipCode, quantity] of Object.entries(fleet)) {
    const stats = shipStats[shipCode];

    if (!stats || quantity <= 0) {
      continue;
    }

    total += stats[stat] * quantity;
  }

  return total;
}

function formatExpeditionFleet(fleet: FleetForm): string {
  const parts: string[] = [];

  for (const [shipCode, quantity] of Object.entries(fleet)) {
    if (quantity <= 0) {
      continue;
    }

    parts.push(formatShipCount(shipCode, quantity));
  }

  if (parts.length === 0) {
    return "корабли не выбраны";
  }

  return parts.join(" · ");
}

function formatShipCount(shipCode: string, quantity: number): string {
  const label = shipLabel(shipCode, quantity);

  return `${formatNumber(quantity)} ${label}`;
}

function shipLabel(shipCode: string, quantity: number): string {
  if (shipCode === "scout") {
    return pluralRu(quantity, ["разведчик", "разведчика", "разведчиков"]);
  }

  if (shipCode === "transport") {
    return pluralRu(quantity, [
      "транспортник",
      "транспортника",
      "транспортников",
    ]);
  }

  if (shipCode === "heavy_transport") {
    return pluralRu(quantity, [
      "тяжёлый транспорт",
      "тяжёлых транспорта",
      "тяжёлых транспортов",
    ]);
  }

  if (shipCode === "fighter") {
    return pluralRu(quantity, ["истребитель", "истребителя", "истребителей"]);
  }

  if (shipCode === "corvette") {
    return pluralRu(quantity, ["корвет", "корвета", "корветов"]);
  }

  return shipCode;
}
