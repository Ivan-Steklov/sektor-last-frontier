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

function App() {
  const [planet, setPlanet] = useState<HomePlanet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlanet() {
      try {
        const response = await fetch(
          `${API_URL}/api/planets/home?telegram_id=1`,
        );

        if (!response.ok) {
          throw new Error("Сервер не вернул планету");
        }

        const data: HomePlanet = await response.json();
        setPlanet(data);
      } catch {
        setError(
          "Не удалось загрузить планету. Проверьте, запущен ли backend.",
        );
      }
    }

    void loadPlanet();
  }, []);

  const planetName = planet?.name ?? "Загрузка...";
  const coordinates = planet
    ? `${planet.galaxy}:${planet.system}:${planet.position}`
    : "...";

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Сектор: Последний Рубеж</p>
          <h1>{planetName}</h1>
        </div>

        <div className="status">
          <span className="status-dot" />
          Координаты {coordinates}
        </div>
      </header>

      {error && <p className="description">{error}</p>}

      <section className="resource-panel" aria-label="Ресурсы планеты">
        <ResourceItem label="Металл" value="—" />
        <ResourceItem label="Кристалл" value="—" />
        <ResourceItem label="Энергия" value="—" />
        <ResourceItem label="Население" value="—" />
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
          <h2>Колония готова к развитию</h2>
          <p className="description">
            Планета сохранена на сервере. Ресурсы и здания подключим следующим
            этапом.
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
};

function ResourceItem({ label, value }: ResourceItemProps) {
  return (
    <div className="resource-item">
      <span className="resource-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
