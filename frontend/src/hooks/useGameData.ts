import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getBuildings,
  getHomePlanet,
  getResources,
  startBuildingUpgrade,
} from "../app/api";
import type { Building, BuildingQueue, HomePlanet, Resources } from "../app/types";

export function useGameData() {
  const [planet, setPlanet] = useState<HomePlanet | null>(null);
  const [resources, setResources] = useState<Resources | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [queue, setQueue] = useState<BuildingQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const queueRemainingSeconds = useMemo(() => {
    if (!queue) {
      return 0;
    }

    const finishesAtMs = new Date(queue.finishes_at).getTime();
    const remainingMs = finishesAtMs - nowMs;

    return Math.max(0, Math.ceil(remainingMs / 1000));
  }, [queue, nowMs]);

  const loadGame = useCallback(async () => {
    try {
      const [planetData, buildingsData] = await Promise.all([
        getHomePlanet(),
        getBuildings(),
      ]);
      const resourcesData = await getResources();

      setPlanet(planetData);
      setResources(resourcesData);
      setBuildings(buildingsData.buildings);
      setQueue(buildingsData.queue);
      setError(null);
    } catch {
      setError("Не удалось загрузить данные. Проверьте, запущен ли backend.");
    }
  }, []);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadGame();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadGame]);

  useEffect(() => {
    if (!queue) {
      return;
    }

    const finishesAtMs = new Date(queue.finishes_at).getTime();
    const delayMs = Math.max(0, finishesAtMs - Date.now()) + 500;

    const timeoutId = window.setTimeout(() => {
      void loadGame();
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadGame, queue?.id, queue?.finishes_at]);

  const handleUpgrade = useCallback(
    async (buildingCode: string) => {
      setIsLoadingAction(true);
      setError(null);

      try {
        const buildingsData = await startBuildingUpgrade(buildingCode);

        setBuildings(buildingsData.buildings);
        setQueue(buildingsData.queue);

        await loadGame();
      } catch (caughtError) {
        if (caughtError instanceof Error) {
          setError(caughtError.message);
        } else {
          setError("Не удалось начать строительство.");
        }
      } finally {
        setIsLoadingAction(false);
      }
    },
    [loadGame],
  );

  return {
    planet,
    resources,
    buildings,
    queue,
    queueRemainingSeconds,
    error,
    isLoadingAction,
    loadGame,
    handleUpgrade,
  };
}