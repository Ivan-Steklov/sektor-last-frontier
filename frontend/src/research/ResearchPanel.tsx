import { useEffect, useMemo, useState } from "react";

import "./ResearchPanel.css";

type ResearchBranch = "economy" | "fleet" | "expedition" | "galaxy" | "defense";

type ResearchRequirement = {
  type: "building" | "research";
  code: string;
  level: number;
  label: string;
  met: boolean;
};

type ResearchItem = {
  code: string;
  name: string;
  description: string;
  effect: string;
  branch: ResearchBranch;
  max_level: number;
  requirements: ResearchRequirement[];
  blocked_reasons: string[];
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

const BRANCH_ORDER: ResearchBranch[] = [
  "economy",
  "fleet",
  "expedition",
  "galaxy",
  "defense",
];

const BRANCH_TITLES: Record<ResearchBranch, string> = {
  economy: "Экономика",
  fleet: "Флот",
  expedition: "Экспедиции",
  galaxy: "Галактика",
  defense: "Оборона",
};

const BRANCH_DESCRIPTIONS: Record<ResearchBranch, string> = {
  economy: "Развитие добычи, энергии и общей производственной базы колонии.",
  fleet:
    "Технологии наступательного флота, полётов и инженерных систем кораблей.",
  expedition: "Логистика дальних вылазок, транспорта и полевых операций.",
  galaxy: "Разведка, навигация и работа с удалёнными системами сектора.",
  defense: "Выживаемость, защита и устойчивость флота к угрозам.",
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

  const groupedResearch = useMemo(() => {
    const groups = new Map<ResearchBranch, ResearchItem[]>();

    for (const branch of BRANCH_ORDER) {
      groups.set(branch, []);
    }

    for (const item of items) {
      const group = groups.get(item.branch);

      if (group !== undefined) {
        group.push(item);
      }
    }

    return BRANCH_ORDER.map((branch) => ({
      branch,
      title: BRANCH_TITLES[branch],
      description: BRANCH_DESCRIPTIONS[branch],
      items: groups.get(branch) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [items]);

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
          <p className="research-subtitle">
            Технологии сгруппированы по веткам и используют реальные требования
            для открытия.
          </p>
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

      <div className="research-branches">
        {groupedResearch.map((group) => (
          <section className="research-branch" key={group.branch}>
            <div className="research-branch-header">
              <div>
                <p className="research-branch-label">Ветка</p>
                <h3>{group.title}</h3>
              </div>
              <p className="research-branch-description">{group.description}</p>
            </div>

            <div className="research-grid">
              {group.items.map((item) => {
                const isMaxLevel = item.level >= item.max_level;

                return (
                  <article className="research-item" key={item.code}>
                    <div className="research-item-header">
                      <div>
                        <h4>{item.name}</h4>
                        <p>{item.description}</p>
                      </div>
                      <div className="research-levels">
                        <strong>Ур. {item.level}</strong>
                        <span>Макс. {item.max_level}</span>
                      </div>
                    </div>

                    <p className="research-effect">{item.effect}</p>

                    {item.requirements.length > 0 && (
                      <div className="research-prerequisites">
                        <p className="research-prerequisites-title">
                          Требования для открытия
                        </p>

                        <ul className="research-prerequisites-list">
                          {item.requirements.map((requirement) => (
                            <li
                              className={
                                requirement.met
                                  ? "research-prerequisite research-prerequisite-met"
                                  : "research-prerequisite research-prerequisite-unmet"
                              }
                              key={`${item.code}-${requirement.type}-${requirement.code}-${requirement.level}`}
                            >
                              {requirement.met ? "✓" : "•"} {requirement.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {isMaxLevel ? (
                      <p className="research-max-level">
                        Максимальный уровень достигнут
                      </p>
                    ) : (
                      <p className="research-cost">
                        Следующий уровень: {item.upgrade_metal_cost} металла,{" "}
                        {item.upgrade_crystal_cost} кристалла,{" "}
                        {formatDuration(item.upgrade_seconds)}
                      </p>
                    )}

                    <button
                      className="research-button"
                      disabled={!item.can_research || isLoading}
                      onClick={() => startResearch(item.code)}
                    >
                      {item.is_in_queue
                        ? "Исследуется"
                        : isMaxLevel
                          ? "Максимум"
                          : "Исследовать"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
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
