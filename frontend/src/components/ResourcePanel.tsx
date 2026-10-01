import { formatAmount, formatSignedAmount } from "../app/formatters";
import type { Resources } from "../app/types";

type ResourcePanelProps = {
  resources: Resources | null;
};

export function ResourcePanel({ resources }: ResourcePanelProps) {
  return (
    <>
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
    </>
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