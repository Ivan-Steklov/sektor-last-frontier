type PlaceholderSectionProps = {
  label: string;
  title: string;
  description: string;
};

export function PlaceholderSection({
  label,
  title,
  description,
}: PlaceholderSectionProps) {
  return (
    <section className="planet-section">
      <div>
        <p className="section-label">{label}</p>
        <h2>{title}</h2>
        <p className="description">{description}</p>
      </div>

      <div className="planet-visual" aria-hidden="true">
        <div className="planet" />
        <div className="planet-orbit" />
      </div>
    </section>
  );
}