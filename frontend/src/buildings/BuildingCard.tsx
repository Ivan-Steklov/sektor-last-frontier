import { formatAmount, formatDuration } from "../app/formatters";
import type { Building, BuildingQueue, Resources } from "../app/types";

type BuildingCardProps = {
  building: Building;
  resources: Resources | null;
  queue: BuildingQueue | null;
  isLoadingAction: boolean;
  onUpgrade: (buildingCode: string) => Promise<void>;
};

export function BuildingCard({
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