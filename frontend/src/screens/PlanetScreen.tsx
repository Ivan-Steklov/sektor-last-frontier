export function PlanetScreen() {
  return (
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
  );
}