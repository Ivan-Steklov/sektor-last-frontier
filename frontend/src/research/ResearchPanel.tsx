import { useEffect, useState } from "react";

import "./ResearchPanel.css";

type ResearchItem = {
  code: string;
  name: string;
  description: string;
  effect: string;
  level: number;
  next_level: number;
  upgrade_metal_cost: number;
  upgrade_crystal_cost: number;
  upgrade_seconds: number;
  required_research_center_level: number;
  requirements_met: boolean;
  can_research: boolean;
  is_in_queue: boolean;
};

type ResearchQueue = {
  id: number;
  research_code: string;
  research_name: string;
  target_level: number;
  remaining_seconds: number;
};

type ResearchResponse = {
  research: ResearchItem[];
  queue: ResearchQueue | null;
};

type ResearchPanelProps = {
  apiUrl: string;
};

export function ResearchPanel({ apiUrl }: ResearchPanelProps) {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [queue, setQueue] = useState<ResearchQueue | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadResearch() {
    const response = await fetch(
      `${apiUrl}/api/research/current?telegram_id=1`,
    );

    if (!response.ok) {
      throw new Error("Не удалось загрузить исследования");
    }

    const data: ResearchResponse = await response.json();

    setItems(data.research);
    setQueue(data.queue);
    setRemainingSeconds(data.queue?.remaining_seconds ?? 0);
  }

  useEffect(() => {
    void loadResearch().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить исследования",
      );
    });
  }, [apiUrl]);

  useEffect(() => {
    if (queue === null) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          void loadResearch().catch(() => {
            setError("Не удалось обновить исследование");
          });
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [queue?.id]);

  async function startResearch(researchCode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/api/research/${researchCode}/upgrade?telegram_id=1`,
        { method: "POST" },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? "Не удалось начать исследование");
      }

      const data: ResearchResponse = await response.json();

      setItems(data.research);
      setQueue(data.queue);
      setRemainingSeconds(data.queue?.remaining_seconds ?? 0);
    } catch (startError: unknown) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Не удалось начать исследование",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="research-section">
      <div className="research-heading">
        <div>
          <p className="research-label">Лаборатория</p>
          <h2>Исследования</h2>
        </div>
      </div>

      {queue !== null && (
        <div className="research-queue">
          <strong>
            {queue.research_name}: уровень {queue.target_level}
          </strong>
          <span>{formatDuration(remainingSeconds)}</span>
        </div>
      )}

      {error !== "" && <p className="research-error">{error}</p>}

      <div className="research-grid">
        {items.map((item) => (
          <article className="research-item" key={item.code}>
            <div className="research-item-header">
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <strong>Ур. {item.level}</strong>
            </div>

            <p className="research-effect">{item.effect}</p>

            <p className="research-cost">
              Следующий уровень: {item.upgrade_metal_cost} металла,{" "}
              {item.upgrade_crystal_cost} кристалла,{" "}
              {formatDuration(item.upgrade_seconds)}
            </p>

            <p className="research-requirement">
              Требуется исследовательский центр ур.{" "}
              {item.required_research_center_level}
            </p>

            {!item.requirements_met && (
              <p className="research-requirement research-requirement-warning">
                Требования не выполнены
              </p>
            )}

            <button
              className="research-button"
              disabled={!item.can_research || isLoading}
              onClick={() => startResearch(item.code)}
            >
              {item.is_in_queue ? "Исследуется" : "Исследовать"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}