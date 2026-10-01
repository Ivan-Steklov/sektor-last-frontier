import { API_URL, TELEGRAM_ID } from "./constants";
import type { BuildingsResponse, HomePlanet, Resources } from "./types";

function withTelegramId(path: string): string {
  return `${API_URL}${path}?telegram_id=${TELEGRAM_ID}`;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Сервер вернул ошибку");
  }

  return response.json();
}

export function getHomePlanet(): Promise<HomePlanet> {
  return getJson(withTelegramId("/api/planets/home"));
}

export function getBuildings(): Promise<BuildingsResponse> {
  return getJson(withTelegramId("/api/buildings/current"));
}

export function getResources(): Promise<Resources> {
  return getJson(withTelegramId("/api/resources/current"));
}

export async function startBuildingUpgrade(
  buildingCode: string,
): Promise<BuildingsResponse> {
  const response = await fetch(
    withTelegramId(`/api/buildings/${buildingCode}/upgrade`),
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(data?.detail ?? "Не удалось начать строительство.");
  }

  return response.json();
}