import {
  formatNumber,
  formatShips,
  formatTransportFleet,
  getNumberDetail,
  isRecord,
} from "./missionHelpers";
import type { MissionDetails, MissionItem } from "./types";

export function CompletedExpeditionResult({
  mission,
}: {
  mission: MissionItem;
}) {
  const details = mission.details ?? {};

  const outcome = typeof details.outcome === "string" ? details.outcome : "";
  const eventCode =
    typeof details.event_code === "string" && details.event_code.trim().length > 0
      ? details.event_code
      : outcome;
  const eventTitle =
    typeof details.event_title === "string" &&
    details.event_title.trim().length > 0
      ? details.event_title
      : expeditionOutcomeLabel(outcome);
  const severity =
    typeof details.severity === "string" ? details.severity : "";

  const description =
    typeof details.description === "string"
      ? details.description
      : "Экспедиция завершена.";

  const metalFound = getNumberDetail(details, "metal_found") ?? 0;
  const crystalFound = getNumberDetail(details, "crystal_found") ?? 0;
  const cargoCapacity = getNumberDetail(details, "cargo_capacity") ?? 0;
  const attackPower = getNumberDetail(details, "attack_power") ?? 0;
  const defensePower = getNumberDetail(details, "defense_power") ?? 0;

  const sentShipsRaw = details.sent_ships;
  const returnedShipsRaw = details.returned_ships;
  const lostShipsRaw = details.lost_ships;

  const sentShips = isRecord(sentShipsRaw) ? sentShipsRaw : {};
  const returnedShips = isRecord(returnedShipsRaw) ? returnedShipsRaw : {};
  const lostShips = isRecord(lostShipsRaw) ? lostShipsRaw : {};

  const lostShipsText = formatShips(lostShips);
  const hasLostShips = lostShipsText !== "Нет кораблей";
  const outcomeClass = expeditionOutcomeClass(eventCode);
  const severityLabel = expeditionSeverityLabel(severity);
  const severityClass = expeditionSeverityClass(severity);

  return (
    <div
      className={`expedition-result-card expedition-result-card-${outcomeClass}`}
    >
      <div className="expedition-result-top">
        <div>
          <div className="expedition-result-title">{eventTitle}</div>
          <div className="expedition-result-description">{description}</div>
        </div>

        <div
          className={`expedition-result-badge expedition-result-badge-${outcomeClass} expedition-result-severity-badge expedition-result-severity-${severityClass}`}
        >
          {severityLabel ?? eventTitle}
        </div>
      </div>

      <div className="expedition-result-resources">
        <div className="expedition-result-resource">
          <span>Найдено металла</span>
          <strong>{formatNumber(metalFound)}</strong>
        </div>

        <div className="expedition-result-resource">
          <span>Найдено кристаллов</span>
          <strong>{formatNumber(crystalFound)}</strong>
        </div>

        <div className="expedition-result-resource">
          <span>Грузоподъёмность</span>
          <strong>{formatNumber(cargoCapacity)}</strong>
        </div>
      </div>

      <div className="expedition-result-fleets">
        <div className="expedition-result-fleet-row">
          <span>Отправленный флот</span>
          <strong>{formatShips(sentShips)}</strong>
        </div>

        <div className="expedition-result-fleet-row">
          <span>Вернулось</span>
          <strong>{formatShips(returnedShips)}</strong>
        </div>

        <div
          className={
            hasLostShips
              ? "expedition-result-fleet-row expedition-result-losses"
              : "expedition-result-fleet-row"
          }
        >
          <span>Потери</span>
          <strong>{hasLostShips ? lostShipsText : "Потерь нет"}</strong>
        </div>
      </div>

      <div className="expedition-result-combat">
        <div className="expedition-result-combat-stat">
          <span>Атака</span>
          <strong>{formatNumber(attackPower)}</strong>
        </div>

        <div className="expedition-result-combat-stat">
          <span>Защита</span>
          <strong>{formatNumber(defensePower)}</strong>
        </div>
      </div>
    </div>
  );
}

export function CompletedTransportResult({
  mission,
}: {
  mission: MissionItem;
}) {
  const details = mission.details ?? {};

  const metal = getNumberDetail(details, "metal") ?? 0;
  const crystal = getNumberDetail(details, "crystal") ?? 0;
  const transportCount = getNumberDetail(details, "transport_count") ?? 0;
  const heavyTransportCount =
    getNumberDetail(details, "heavy_transport_count") ?? 0;
  const cargoAmount =
    getNumberDetail(details, "cargo_amount") ?? metal + crystal;
  const cargoCapacity = getNumberDetail(details, "cargo_capacity") ?? 0;
  const target = formatResultTarget(details);

  return (
    <div className="transport-result-card">
      <div className="transport-result-text">
        Груз доставлен на внешний склад системы {target}.
      </div>

      <div className="transport-result-grid">
        <div className="transport-result-resource">
          <span>Металл</span>
          <strong>{formatNumber(metal)}</strong>
        </div>

        <div className="transport-result-resource">
          <span>Кристалл</span>
          <strong>{formatNumber(crystal)}</strong>
        </div>

        <div className="transport-result-resource">
          <span>Груз</span>
          <strong>
            {formatNumber(cargoAmount)} / {formatNumber(cargoCapacity)}
          </strong>
        </div>

        <div className="transport-result-resource">
          <span>Корабли</span>
          <strong>
            {formatTransportFleet(transportCount, heavyTransportCount)}
          </strong>
        </div>
      </div>
    </div>
  );
}

function formatResultTarget(details: MissionDetails): string {
  const galaxy = details.target_galaxy;
  const system = details.target_system;

  if (typeof galaxy === "number" && typeof system === "number") {
    return `${galaxy}:${system}`;
  }

  return "Без конкретной системы";
}

function expeditionOutcomeLabel(outcome: string): string {
  if (outcome === "empty") {
    return "Пустой сектор";
  }

  if (outcome === "metal") {
    return "Обнаружен металл";
  }

  if (outcome === "crystal") {
    return "Обнаружены кристаллы";
  }

  if (outcome === "rare_find") {
    return "Редкая находка";
  }

  if (outcome === "pirates") {
    return "Столкновение с пиратами";
  }

  if (outcome === "anomaly") {
    return "Космическая аномалия";
  }

  if (outcome === "ship_damage") {
    return "Повреждение кораблей";
  }

  if (outcome === "loss") {
    return "Экспедиция понесла потери";
  }

  if (outcome.trim().length === 0) {
    return "Итог экспедиции";
  }

  return outcome;
}

function expeditionOutcomeClass(outcome: string): string {
  if (outcome === "empty") {
    return "empty";
  }

  if (outcome === "metal") {
    return "metal";
  }

  if (outcome === "crystal") {
    return "crystal";
  }

  if (outcome === "rare_find") {
    return "rare_find";
  }

  if (outcome === "pirates") {
    return "pirates";
  }

  if (outcome === "anomaly") {
    return "anomaly";
  }

  if (outcome === "ship_damage") {
    return "ship_damage";
  }

  if (outcome === "loss") {
    return "loss";
  }

  return "unknown";
}
function expeditionSeverityLabel(severity: string): string | null {
  if (severity === "bonus") {
    return "Бонус";
  }

  if (severity === "low") {
    return "Низкая";
  }

  if (severity === "medium") {
    return "Средняя";
  }

  if (severity === "high") {
    return "Высокая";
  }

  if (severity === "critical") {
    return "Критическая";
  }

  if (severity === "unknown") {
    return "Неизвестно";
  }

  return null;
}

function expeditionSeverityClass(severity: string): string {
  if (severity === "bonus") {
    return "bonus";
  }

  if (severity === "low") {
    return "low";
  }

  if (severity === "medium") {
    return "medium";
  }

  if (severity === "high") {
    return "high";
  }

  if (severity === "critical") {
    return "critical";
  }

  return "unknown";
}