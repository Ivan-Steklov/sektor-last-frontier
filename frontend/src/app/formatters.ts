import type { BuildingQueue } from "./types";

export function formatAmount(value: number | undefined): string {
  if (value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatSignedAmount(value: number): string {
  const formatted = new Intl.NumberFormat("ru-RU").format(value);

  if (value > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} сек.`;
  }

  return `${minutes} мин. ${seconds} сек.`;
}

export function getQueueProgressPercent(
  queue: BuildingQueue,
  remainingSeconds: number,
): number {
  const startedAtMs = new Date(queue.started_at).getTime();
  const finishesAtMs = new Date(queue.finishes_at).getTime();
  const totalMs = finishesAtMs - startedAtMs;

  if (totalMs <= 0) {
    return 100;
  }

  const remainingMs = remainingSeconds * 1000;
  const passedMs = totalMs - remainingMs;
  const percent = Math.round((passedMs / totalMs) * 100);

  return Math.min(100, Math.max(0, percent));
}
