import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

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

function App() {
  const [planet, setPlanet] = useState<HomePlanet | null>(null);
  const [resources, setResources] = useState<Resources | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGame() {
      try {
        const planetResponse = await fetch(
          `${API_URL}/api/planets/home?telegram_id=1`,
        );
        const resourcesResponse = await fetch(
          `${API_URL}/api/resources/current?telegram_id=1`,
        );

        if (!planetResponse.ok || !resourcesResponse.ok) {
          throw new Error("Сервер вернул ошибку");
        }

        setPlanet(await planetResponse.json());
        setResources(await resourcesResponse.json());
      } catch {
        setError("Не удалось загрузить данные. Проверьте, запущен ли backend.");
      }
    }

    void loadGame();
  }, []);

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
          hint="баланс"
        />
        <ResourceItem
          label="Население"
          value={formatAmount(resources?.population)}
        />
      </section>

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
            Металл и кристалл рассчитывает сервер. Обновите страницу через
            минуту: значения должны увеличиться.
          </p>
        </div>

        <div className="planet-visual" aria-label="Вид планеты">
          <div className="planet" />
          <div className="planet-orbit" />
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

export default App;
