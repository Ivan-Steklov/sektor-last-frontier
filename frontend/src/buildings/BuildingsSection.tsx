import {
  formatDuration,
  getQueueProgressPercent,
} from "../app/formatters";
import type { Building, BuildingQueue, Resources } from "../app/types";
import { BuildingCard } from "./BuildingCard";

type BuildingsSectionProps = {
  buildings: Building[];
  resources: Resources | null;
  queue: BuildingQueue | null;
  queueRemainingSeconds: number;
  isLoadingAction: boolean;
  onReload: () => Promise<void>;
  onUpgrade: (buildingCode: string) => Promise<void>;
  error: string | null;
};

export function BuildingsSection({
  buildings,
  resources,
  queue,
  queueRemainingSeconds,
  isLoadingAction,
  onReload,
  onUpgrade,
  error,
}: BuildingsSectionProps) {
  return (
    <section className="buildings-section">
      <div className="section-heading">
        <div>
          <p className="section-label">Инфраструктура</p>
          <h2>Здания планеты</h2>
        </div>

        <button
          className="small-button"
          onClick={() => {
            void onReload();
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
            onUpgrade={onUpgrade}
          />
        ))}
      </div>
    </section>
  );
}