import { useEffect, useState } from "react";
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

  async function loadGame() {
    try {
      const [planetResponse, resourcesResponse, buildingsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/planets/home?telegram_id=${TELEGRAM_ID}`),
          fetch(`${API_URL}/api/resources/current?telegram_id=${TELEGRAM_ID}`),
          fetch(`${API_URL}/api/buildings/current?telegram_id=${TELEGRAM_ID}`),
        ]);

      if (
        !planetResponse.ok ||
        !resourcesResponse.ok ||
        !buildingsResponse.ok
      ) {
        throw new Error("Сервер вернул ошибку");
      }

      const planetData: HomePlanet = await planetResponse.json();
      const resourcesData: Resources = await resourcesResponse.json();
      const buildingsData: BuildingsResponse = await buildingsResponse.json();

      setPlanet(planetData);
      setResources(resourcesData);
      setBuildings(buildingsData.buildings);
      setQueue(buildingsData.queue);
      setError(null);
    } catch {
      setError(
        "Не удалось загрузить данные. Проверьте, запущен ли backend.",
      );
    }
  }

  useEffect(() => {
    void loadGame();
  }, []);

  useEffect(() => {
    if (!queue) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadGame();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [queue?.id]);

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

      {error && <p className="description">{error}</p>}

      <section
        className="resource-panel"
        aria-label="Ресурсы планеты"
      >
        <ResourceItem
          label="Металл"
          value={formatAmount(resources?.metal)}
          hint={
            resources
              ? `+${resources.metal_per_hour}/ч`
              : undefined
          }
        />

        <ResourceItem
          label="Кристалл"
          value={formatAmount(resources?.crystal)}
          hint={
            resources
              ? `+${resources.crystal_per_hour}/ч`
              : undefined
          }
        />

        <ResourceItem
          label="Энергия"
          value={formatAmount(resources?.energy)}
          hint="баланс"
        />

        <ResourceItem
          label="Население"
          value={formatAmount(resources?.population)}
        />
      </section>

      <nav
        className="navigation"
        aria-label="Разделы игры"
      >
        <button className="navigation-button active">
          Планета
        </button>

        <button className="navigation-button">
          Строительство
        </button>

        <button className="navigation-button">
          Флот
        </button>

        <button className="navigation-button">
          Исследования
        </button>

        <button className="navigation-button">
          Галактика
        </button>

        <button className="navigation-button">
          Альянс
        </button>
      </nav>

      <section className="planet-section">
        <div>
          <p className="section-label">Домашняя планета</p>

          <h2>Колония производит ресурсы</h2>

          <p className="description">
            Металл и кристалл рассчитывает сервер. Уровни шахт
            влияют на скорость производства.
          </p>
        </div>

        <div
          className="planet-visual"
          aria-label="Вид планеты"
        >
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
        </div>

        {queue && (
          <div className="queue-panel">
            <p className="section-label">Строительство</p>

            <strong>
              {queue.building_name} → уровень {queue.target_level}
            </strong>

            <span>
              Осталось: {formatDuration(queue.remaining_seconds)}
            </span>
          </div>
        )}

        {buildings.length === 0 && !error && (
          <p className="description">
            Загрузка зданий...
          </p>
        )}

        <div className="buildings-grid">
          {buildings.map((building) => (
            <article
              className={
                building.is_in_queue
                  ? "building-item building-item-active"
                  : "building-item"
              }
              key={building.code}
            >
              <div className="building-item-header">
                <div>
                  <p className="building-code">
                    {building.code}
                  </p>

                  <h3>{building.name}</h3>
                </div>

                <strong className="building-level">
                  Ур. {building.level}
                </strong>
              </div>

              <p>{building.description}</p>

              <div className="building-cost">
                <span>
                  Металл: {formatAmount(building.upgrade_metal_cost)}
                </span>

                <span>
                  Кристалл: {formatAmount(building.upgrade_crystal_cost)}
                </span>

                <span>
                  Время: {formatDuration(building.upgrade_seconds)}
                </span>
              </div>

              <button
                className="building-button"
                disabled={
                  !building.can_upgrade ||
                  isLoadingAction
                }
                onClick={() => {
                  void handleUpgrade(building.code);
                }}
              >
                {building.is_in_queue
                  ? "Строится..."
                  : `Улучшить до ур. ${building.next_level}`}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}


type ResourceItemProps = {
  label: string;
  value: string;
  hint?: string;
};


function ResourceItem({
  label,
  value,
  hint,
}: ResourceItemProps) {
  return (
    <div className="resource-item">
      <span className="resource-label">
        {label}
      </span>

      <strong>{value}</strong>

      {hint && (
        <span className="resource-hint">
          {hint}
        </span>
      )}
    </div>
  );
}


function formatAmount(
  value: number | undefined,
): string {
  if (value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU").format(value);
}


function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} сек.`;
  }

  return `${minutes} мин. ${seconds} сек.`;
}


export default App;