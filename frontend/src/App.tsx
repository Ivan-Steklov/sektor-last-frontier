import "./App.css";

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Сектор: Последний Рубеж</p>
          <h1>Новая Заря</h1>
        </div>

        <div className="status">
          <span className="status-dot" />
          Сектор доступен
        </div>
      </header>

      <section className="resource-panel" aria-label="Ресурсы планеты">
        <ResourceItem label="Металл" value="12 480" />
        <ResourceItem label="Кристалл" value="6 210" />
        <ResourceItem label="Энергия" value="840" />
        <ResourceItem label="Население" value="312" />
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
            Заброшенная станция восстановлена. Развивайте инфраструктуру,
            исследуйте сектор и подготовьте первый экспедиционный флот.
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
