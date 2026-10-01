import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";
const TELEGRAM_ID = 1;

type HomePlanet = {
  id: number;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  telegram_id: number;
  username: string | null;
};

type Resources = {
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
};

type Building = {
  code: string;
  name: string;
  description: string;
  level: number;
  next_level: number;
  upgrade_metal_cost: number;
  upgrade_crystal_cost: number;
  upgrade_seconds: number;
  can_upgrade: boolean;
  is_in_queue: boolean;
};

type BuildingQueue = {
  id: number;
  building_code: string;
  building_name: string;
  target_level: number;
  started_at: string;
  finishes_at: string;
  remaining_seconds: number;
};

type BuildingsResponse = {
  buildings: Building[];
  queue: BuildingQueue | null;
};

function App() {
  const [planet, setPlanet] = useState<HomePlanet | null>(null);
  const [resources, setResources] = useState<Resources | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [queue, setQueue] = useState<BuildingQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const queueRemainingSeconds = useMemo(() => {
    if (!queue) {
      return 0;
    }

    const finishesAtMs = new Date(queue.finishes_at).getTime();
    const remainingMs = finishesAtMs - nowMs;

    return Math.max(0, Math.ceil(remainingMs / 1000));
  }, [queue, nowMs]);

  async function loadGame() {
    try {
      const [planetResponse, buildingsResponse] = await Promise.all([
        fetch(`${API_URL}/api/planets/home?telegram_id=${TELEGRAM_ID}`),
        fetch(`${API_URL}/api/buildings/current?telegram_id=${TELEGRAM_ID}`),
      ]);

      if (!planetResponse.ok || !buildingsResponse.ok) {
        throw new Error("Сервер вернул ошибку");
      }

      const planetData: HomePlanet = await planetResponse.json();
      const buildingsData: BuildingsResponse = await buildingsResponse.json();

      const resourcesResponse = await fetch(
        `${API_URL}/api/resources/current?telegram_id=${TELEGRAM_ID}`,
      );

      if (!resourcesResponse.ok) {
        throw new Error("Сервер вернул ошибку");
      }

      const resourcesData: Resources = await resourcesResponse.json();

      setPlanet(planetData);
      setResources(resourcesData);
      setBuildings(buildingsData.buildings);
      setQueue(buildingsData.queue);
      setError(null);
    } catch {
      setError("Не удалось загрузить данные. Проверьте, запущен ли backend.");
    }
  }

  useEffect(() => {
    void loadGame();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadGame();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!queue) {
      return;
    }

    const finishesAtMs = new Date(queue.finishes_at).getTime();
    const delayMs = Math.max(0, finishesAtMs - Date.now()) + 500;

    const timeoutId = window.setTimeout(() => {
      void loadGame();
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [queue?.id, queue?.finishes_at]);

  async function handleUpgrade(buildingCode: string) {
    setIsLoadingAction(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/buildings/${buildingCode}/upgrade?telegram_id=${TELEGRAM_ID}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.detail ?? "Не удалось начать строительство.");
      }

      const buildingsData: BuildingsResponse = await response.json();

      setBuildings(buildingsData.buildings);
      setQueue(buildingsData.queue);

      await loadGame();
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Не удалось начать строительство.");
      }
    } finally {
      setIsLoadingAction(false);
    }
  }

  const coordinates = planet
    ? `${planet.galaxy}:${planet.system}:${planet.position}`
    : "...";

  return (
    <main className="app">
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

      {error && <div className="error-panel">{error}</div>}

      <section className="resource-panel" aria-label="Ресурсы планеты">
        <ResourceItem
          label="Металл"
          value={formatAmount(resources?.metal)}
          hint={resources ? `+${resources.metal_per_hour}/ч` : undefined}
        />

        <ResourceItem
          label="Кристалл"
          value={formatAmount(resources?.crystal)}
          hint={resources ? `+${resources.crystal_per_hour}/ч` : undefined}
        />

        <ResourceItem
          label="Энергия"
          value={formatAmount(resources?.energy)}
          hint={
            resources
              ? `${resources.energy_produced} / ${resources.energy_consumed}`
              : "баланс"
          }
        />

        <ResourceItem
          label="Население"
          value={formatAmount(resources?.population)}
        />
      </section>

      {resources && (
        <section className="energy-panel">
          <div>
            <p className="section-label">Энергосистема</p>

            <strong>
              Эффективность производства: {resources.energy_efficiency_percent}%
            </strong>
          </div>

          <div className="energy-stats">
            <span>Производство: {formatAmount(resources.energy_produced)}</span>

            <span>Потребление: {formatAmount(resources.energy_consumed)}</span>

            <span>Баланс: {formatSignedAmount(resources.energy)}</span>
          </div>
        </section>
      )}

      <nav className="navigation" aria-label="Разделы игры">
        <button className="navigation-button active">Планета</button>

        <button className="navigation-button">Строительство</button>

        <button className="navigation-button">Флот</button>

        <button className="navigation-button">Исследования</button>

        <button className="navigation-button">Галактика</button>

        <button className="navigation-button">Альянс</button>
      </nav>

      <section className="planet-section">
        <div>
          <p className="section-label">Домашняя планета</p>

          <h2>Колония производит ресурсы</h2>

          <p className="description">
            Металл и кристалл рассчитывает сервер. Если энергии не хватает,
            производство шахт снижается.
          </p>
        </div>

        <div className="planet-visual" aria-label="Вид планеты">
          <div className="planet" />
          <div className="planet-orbit" />
        </div>
      </section>

      <section className="buildings-section">
        <div className="section-heading">
          <div>
            <p className="section-label">Инфраструктура</p>
            <h2>Здания планеты</h2>
          </div>

          <button
            className="small-button"
            onClick={() => {
              void loadGame();
            }}
          >
            Обновить
          </button>
        </div>

        {queue && (
          <div className="queue-panel">
            <p className="section-label">Строительство</p>

            <strong>
              {queue.building_name} → уровень {queue.target_level}
            </strong>

            <span>Осталось: {formatDuration(queueRemainingSeconds)}</span>

            <div className="queue-progress">
              <div
                className="queue-progress-fill"
                style={{
                  width: `${getQueueProgressPercent(
                    queue,
                    queueRemainingSeconds,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {buildings.length === 0 && !error && (
          <p className="description">Загрузка зданий...</p>
        )}

        <div className="buildings-grid">
          {buildings.map((building) => (
            <BuildingCard
              key={building.code}
              building={building}
              resources={resources}
              queue={queue}
              isLoadingAction={isLoadingAction}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

type BuildingCardProps = {
  building: Building;
  resources: Resources | null;
  queue: BuildingQueue | null;
  isLoadingAction: boolean;
  onUpgrade: (buildingCode: string) => Promise<void>;
};

function BuildingCard({
  building,
  resources,
  queue,
  isLoadingAction,
  onUpgrade,
}: BuildingCardProps) {
  const metalEnough = resources
    ? resources.metal >= building.upgrade_metal_cost
    : false;

  const crystalEnough = resources
    ? resources.crystal >= building.upgrade_crystal_cost
    : false;

  const canAfford = metalEnough && crystalEnough;

  const blockReason = getUpgradeBlockReason({
    building,
    resources,
    queue,
    isLoadingAction,
    canAfford,
  });

  const isDisabled = blockReason !== null;

  return (
    <article
      className={
        building.is_in_queue
          ? "building-item building-item-active"
          : "building-item"
      }
    >
      <div className="building-item-header">
        <div>
          <p className="building-code">{building.code}</p>

          <h3>{building.name}</h3>
        </div>

        <strong className="building-level">Ур. {building.level}</strong>
      </div>

      <p>{building.description}</p>

      <div className="building-cost">
        <span
          style={{
            width: "fit-content",
            padding: "4px 8px",
            borderRadius: "999px",
            color: metalEnough ? "#7ee787" : "#ff6b7a",
            background: metalEnough ? "#102018" : "#2a1118",
            border: metalEnough ? "1px solid #2d6f44" : "1px solid #8f3440",
            fontWeight: metalEnough ? 500 : 700,
          }}
        >
          Металл: {formatAmount(building.upgrade_metal_cost)}
        </span>

        <span
          style={{
            width: "fit-content",
            padding: "4px 8px",
            borderRadius: "999px",
            color: crystalEnough ? "#7ee787" : "#ff6b7a",
            background: crystalEnough ? "#102018" : "#2a1118",
            border: crystalEnough ? "1px solid #2d6f44" : "1px solid #8f3440",
            fontWeight: crystalEnough ? 500 : 700,
          }}
        >
          Кристалл: {formatAmount(building.upgrade_crystal_cost)}
        </span>

        <span
          style={{
            width: "fit-content",
            padding: "4px 8px",
            borderRadius: "999px",
            color: "#aab7c9",
            background: "#101722",
            border: "1px solid #344256",
          }}
        >
          Время: {formatDuration(building.upgrade_seconds)}
        </span>
      </div>

      {blockReason && <div className="building-reason">{blockReason}</div>}

      <button
        className="building-button"
        disabled={isDisabled}
        onClick={() => {
          void onUpgrade(building.code);
        }}
      >
        {building.is_in_queue
          ? "Строится..."
          : `Улучшить до ур. ${building.next_level}`}
      </button>
    </article>
  );
}

type UpgradeBlockReasonParams = {
  building: Building;
  resources: Resources | null;
  queue: BuildingQueue | null;
  isLoadingAction: boolean;
  canAfford: boolean;
};

function getUpgradeBlockReason({
  building,
  resources,
  queue,
  isLoadingAction,
  canAfford,
}: UpgradeBlockReasonParams): string | null {
  if (isLoadingAction) {
    return "Выполняется действие...";
  }

  if (building.is_in_queue) {
    return "Это здание уже строится.";
  }

  if (queue) {
    return "Очередь строительства занята.";
  }

  if (!resources) {
    return "Ресурсы ещё загружаются.";
  }

  if (!canAfford) {
    return "Недостаточно ресурсов.";
  }

  if (!building.can_upgrade) {
    return "Улучшение сейчас недоступно.";
  }

  return null;
}

type ResourceItemProps = {
  label: string;
  value: string;
  hint?: string;
};

function ResourceItem({ label, value, hint }: ResourceItemProps) {
  return (
    <div className="resource-item">
      <span className="resource-label">{label}</span>

      <strong>{value}</strong>

      {hint && <span className="resource-hint">{hint}</span>}
    </div>
  );
}

function formatAmount(value: number | undefined): string {
  if (value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatSignedAmount(value: number): string {
  const formatted = new Intl.NumberFormat("ru-RU").format(value);

  if (value > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} сек.`;
  }

  return `${minutes} мин. ${seconds} сек.`;
}

function getQueueProgressPercent(
  queue: BuildingQueue,
  remainingSeconds: number,
): number {
  const startedAtMs = new Date(queue.started_at).getTime();
  const finishesAtMs = new Date(queue.finishes_at).getTime();
  const totalMs = finishesAtMs - startedAtMs;

  if (totalMs <= 0) {
    return 100;
  }

  const remainingMs = remainingSeconds * 1000;
  const passedMs = totalMs - remainingMs;
  const percent = Math.round((passedMs / totalMs) * 100);

  return Math.min(100, Math.max(0, percent));
}

export default App;
