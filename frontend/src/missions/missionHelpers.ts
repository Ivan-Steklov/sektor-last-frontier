import type { FleetForm, ShipStats } from "./types";

export function getNumberDetail(
  details: Record<string, unknown>,
  key: string,
): number | null {
  const value = details[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function formatTransportFleet(
  transportCount: number,
  heavyTransportCount: number,
): string {
  const parts: string[] = [];

  if (transportCount > 0) {
    parts.push(
      `${formatNumber(transportCount)} ${pluralRu(transportCount, [
        "транспортник",
        "транспортника",
        "транспортников",
      ])}`,
    );
  }

  if (heavyTransportCount > 0) {
    parts.push(
      `${formatNumber(heavyTransportCount)} ${pluralRu(heavyTransportCount, [
        "тяжёлый транспорт",
        "тяжёлых транспорта",
        "тяжёлых транспортов",
      ])}`,
    );
  }

  if (parts.length === 0) {
    return "нет транспортных кораблей";
  }

  return parts.join(" · ");
}

export function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} сек.`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatShips(value: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [shipCode, quantity] of Object.entries(value)) {
    if (typeof quantity !== "number" || quantity <= 0) {
      continue;
    }

    parts.push(formatShipCount(shipCode, quantity));
  }

  if (parts.length === 0) {
    return "Нет кораблей";
  }

  return parts.join(" · ");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampFleetToAvailable(
  fleet: FleetForm,
  availableShips: FleetForm,
): FleetForm {
  return {
    transport: Math.min(fleet.transport, availableShips.transport),
    heavy_transport: Math.min(
      fleet.heavy_transport,
      availableShips.heavy_transport,
    ),
    fighter: Math.min(fleet.fighter, availableShips.fighter),
    corvette: Math.min(fleet.corvette, availableShips.corvette),
  };
}

export function isFleetShipCode(code: string): code is keyof FleetForm {
  return (
    code === "transport" ||
    code === "heavy_transport" ||
    code === "fighter" ||
    code === "corvette"
  );
}

export function calculateFleetStat(
  fleet: FleetForm,
  shipStats: Record<string, ShipStats>,
  stat: "attack" | "defense" | "cargo_capacity",
): number {
  let total = 0;

  for (const [shipCode, quantity] of Object.entries(fleet)) {
    const stats = shipStats[shipCode];

    if (!stats || quantity <= 0) {
      continue;
    }

    total += stats[stat] * quantity;
  }

  return total;
}

export function formatExpeditionFleet(fleet: FleetForm): string {
  const parts: string[] = [];

  for (const [shipCode, quantity] of Object.entries(fleet)) {
    if (quantity <= 0) {
      continue;
    }

    parts.push(formatShipCount(shipCode, quantity));
  }

  if (parts.length === 0) {
    return "корабли не выбраны";
  }

  return parts.join(" · ");
}

function formatShipCount(shipCode: string, quantity: number): string {
  const label = shipLabel(shipCode, quantity);

  return `${formatNumber(quantity)} ${label}`;
}

function shipLabel(shipCode: string, quantity: number): string {
  if (shipCode === "scout") {
    return pluralRu(quantity, ["разведчик", "разведчика", "разведчиков"]);
  }

  if (shipCode === "transport") {
    return pluralRu(quantity, [
      "транспортник",
      "транспортника",
      "транспортников",
    ]);
  }

  if (shipCode === "heavy_transport") {
    return pluralRu(quantity, [
      "тяжёлый транспорт",
      "тяжёлых транспорта",
      "тяжёлых транспортов",
    ]);
  }

  if (shipCode === "fighter") {
    return pluralRu(quantity, ["истребитель", "истребителя", "истребителей"]);
  }

  if (shipCode === "corvette") {
    return pluralRu(quantity, ["корвет", "корвета", "корветов"]);
  }

  return shipCode;
}

function pluralRu(
  value: number,
  forms: [string, string, string],
): string {
  const absoluteValue = Math.abs(Math.floor(value));
  const lastTwoDigits = absoluteValue % 100;
  const lastDigit = absoluteValue % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return forms[2];
  }

  if (lastDigit === 1) {
    return forms[0];
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return forms[1];
  }

  return forms[2];
}