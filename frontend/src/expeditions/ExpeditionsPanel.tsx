import { useEffect, useState } from "react";

import "./ExpeditionsPanel.css";

type ExpeditionResponse = {
  active_expedition: {
    id: number;
    started_at: string;
    finishes_at: string;
    remaining_seconds: number;
    sent_ships: Record<string, number>;
  } | null;
  last_result: {
    outcome: string;
    metal_found: number;
    crystal_found: number;
    lost_ships: Record<string, number>;
    returned_ships: Record<string, number>;
    description: string;
  } | null;
};

type ResearchItem = {
  code: string;
  name: string;
  level: number;
  effect: string;
};

type ResearchCurrentResponse = {
  research: ResearchItem[];
  queue: unknown | null;
};

type ResearchLevels = {
  engines: number;
  recon: number;
  cargo: number;
};

type OutcomeChances = {
  empty: number;
  metal: number;
  crystal: number;
  loss: number;
};

type ExpeditionsPanelProps = {
  apiUrl: string;
};

const TELEGRAM_ID = 1;

const DEFAULT_RESEARCH_LEVELS: ResearchLevels = {
  engines: 0,
  recon: 0,
  cargo: 0,
};

export function ExpeditionsPanel({ apiUrl }: ExpeditionsPanelProps) {
  const [state, setState] = useState<ExpeditionResponse | null>(null);
  const [researchLevels, setResearchLevels] = useState<ResearchLevels>(
    DEFAULT_RESEARCH_LEVELS,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");

  async function loadData() {
    const [expeditionResponse, researchResponse] = await Promise.all([
      fetch(`${apiUrl}/api/expeditions/current?telegram_id=${TELEGRAM_ID}`),
      fetch(`${apiUrl}/api/research/current?telegram_id=${TELEGRAM_ID}`),
    ]);

    if (!expeditionResponse.ok || !researchResponse.ok) {
      throw new Error("Не удалось загрузить экспедиции");
    }

    const expeditionData: ExpeditionResponse = await expeditionResponse.json();
    const researchData: ResearchCurrentResponse = await researchResponse.json();

    setState(expeditionData);
    setResearchLevels(readExpeditionResearchLevels(researchData));
    setRemainingSeconds(expeditionRemainingSeconds(expeditionData));
  }

  useEffect(() => {
    void loadData().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить экспедиции",
      );
    });
  }, [apiUrl]);

  useEffect(() => {
    if (
      state?.active_expedition === null ||
      state?.active_expedition === undefined
    ) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          void loadData().catch(() => {
            setError("Не удалось обновить экспедицию");
          });
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [state?.active_expedition?.id]);

  const durationSeconds = expeditionDurationSeconds(researchLevels.engines);
  const baseDurationSeconds = expeditionDurationSeconds(0);
  const outcomeChances = expeditionOutcomeChances(researchLevels.recon);
  const cargoBonus = cargoMultiplier(researchLevels.cargo);

  return (
    <section className="expeditions-section">
      <div className="expeditions-heading">
        <div>
          <p className="expeditions-label">Флот</p>
          <h2>Экспедиции</h2>
        </div>
      </div>

      <div className="expeditions-mission-note">
        <strong>Запуск экспедиций перенесён во вкладку «Миссии».</strong>
        <p>
          Флот теперь показывает состояние экспедиции и бонусы кораблей/исследований,
          а отправка выполняется через единый центр миссий.
        </p>
      </div>

      <div className="expeditions-bonuses">
        <strong>Модификаторы экспедиции</strong>

        <div className="expeditions-bonus-grid">
          <div className="expeditions-bonus-card">
            <span className="expeditions-bonus-card__label">
              Двигатели ур. {researchLevels.engines}
            </span>
            <strong>{formatDuration(durationSeconds)}</strong>
            <p>
              Длительность экспедиции. Базовое время:{" "}
              {formatDuration(baseDurationSeconds)}.
            </p>
          </div>

          <div className="expeditions-bonus-card">
            <span className="expeditions-bonus-card__label">
              Разведка ур. {researchLevels.recon}
            </span>
            <strong>Риск потерь: {outcomeChances.loss}%</strong>
            <p>
              Шансы: пусто {outcomeChances.empty}%, металл{" "}
              {outcomeChances.metal}%, кристалл {outcomeChances.crystal}%,
              потери {outcomeChances.loss}%.
            </p>
          </div>

          <div className="expeditions-bonus-card">
            <span className="expeditions-bonus-card__label">
              Грузовые отсеки ур. {researchLevels.cargo}
            </span>
            <strong>x{cargoBonus.toFixed(2)}</strong>
            <p>Множитель найденного металла и кристалла.</p>
          </div>
        </div>

        <p className="expeditions-bonuses-note">
          Эти значения повторяют текущие backend-правила для подсказки игроку.
          Итог миссии всё равно рассчитывает сервер.
        </p>
      </div>

      {state?.active_expedition && (
        <div className="expeditions-active">
          <strong>Экспедиция в пути</strong>
          <span>Осталось: {formatDuration(remainingSeconds)}</span>
          <p>Отправлено: {formatShips(state.active_expedition.sent_ships)}</p>
        </div>
      )}

      {state?.last_result && (
        <div className="expeditions-result">
          <strong>Последний результат</strong>
          <p>{state.last_result.description}</p>
          <p>Возврат: {formatShips(state.last_result.returned_ships)}</p>
          <p>Потери: {formatShips(state.last_result.lost_ships)}</p>
          <p>
            Металл: {state.last_result.metal_found} / Кристалл:{" "}
            {state.last_result.crystal_found}
          </p>
        </div>
      )}

      {state && !state.active_expedition && !state.last_result && (
        <div className="expeditions-empty">
          Экспедиций в пути нет. Новую экспедицию можно отправить во вкладке
          «Миссии».
        </div>
      )}

      {error !== "" && <p className="expeditions-error">{error}</p>}
    </section>
  );
}

function readExpeditionResearchLevels(
  researchData: ResearchCurrentResponse,
): ResearchLevels {
  return {
    engines: readResearchLevel(researchData, "engines"),
    recon: readResearchLevel(researchData, "recon"),
    cargo: readResearchLevel(researchData, "cargo"),
  };
}

function readResearchLevel(
  researchData: ResearchCurrentResponse,
  code: string,
): number {
  return (
    researchData.research.find((researchItem) => researchItem.code === code)
      ?.level ?? 0
  );
}

function expeditionRemainingSeconds(data: ExpeditionResponse): number {
  return data.active_expedition?.remaining_seconds ?? 0;
}

function expeditionDurationSeconds(enginesLevel: number): number {
  const baseSeconds = 60;
  const reductionPercent = enginesLevel * 5;
  const adjustedSeconds = Math.trunc(
    baseSeconds * (1 - reductionPercent / 100),
  );

  return Math.max(30, adjustedSeconds);
}

function expeditionOutcomeChances(reconLevel: number): OutcomeChances {
  const emptyChance = 30;
  let metalChance = 25;
  let crystalChance = 25;
  let lossChance = 20;

  const reduction = Math.min(lossChance - 5, reconLevel * 3);

  lossChance -= reduction;
  metalChance += Math.floor(reduction / 2);
  crystalChance += reduction - Math.floor(reduction / 2);

  return {
    empty: emptyChance,
    metal: metalChance,
    crystal: crystalChance,
    loss: lossChance,
  };
}

function cargoMultiplier(cargoLevel: number): number {
  return 1 + cargoLevel * 0.1;
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatShips(ships: Record<string, number>): string {
  const entries = Object.entries(ships).filter(([, value]) => value > 0);

  if (entries.length === 0) {
    return "нет";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
}