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

type ShipsResponse = {
  ships: {
    code: string;
    name: string;
    quantity: number;
  }[];
};

type FleetForm = {
  scout: number;
  transport: number;
  fighter: number;
};

type ExpeditionsPanelProps = {
  apiUrl: string;
};

export function ExpeditionsPanel({ apiUrl }: ExpeditionsPanelProps) {
  const [state, setState] = useState<ExpeditionResponse | null>(null);
  const [availableShips, setAvailableShips] = useState<Record<string, number>>({
    scout: 0,
    transport: 0,
    fighter: 0,
  });
  const [fleet, setFleet] = useState<FleetForm>({
    scout: 0,
    transport: 0,
    fighter: 0,
  });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    const [expeditionResponse, shipsResponse] = await Promise.all([
      fetch(`${apiUrl}/api/expeditions/current?telegram_id=1`),
      fetch(`${apiUrl}/api/ships/current?telegram_id=1`),
    ]);

    if (!expeditionResponse.ok || !shipsResponse.ok) {
      throw new Error("Не удалось загрузить экспедиции");
    }

    const expeditionData: ExpeditionResponse = await expeditionResponse.json();
    const shipsData: ShipsResponse = await shipsResponse.json();

    const mappedShips: Record<string, number> = {
      scout: 0,
      transport: 0,
      fighter: 0,
    };

    for (const ship of shipsData.ships) {
      mappedShips[ship.code] = ship.quantity;
    }

    setState(expeditionData);
    setAvailableShips(mappedShips);
    setRemainingSeconds(expeditionData.active_expedition?.remaining_seconds ?? 0);
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
    if (state?.active_expedition === null || state?.active_expedition === undefined) {
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

  function updateFleet(shipCode: keyof FleetForm, value: string) {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }

    const maxValue = availableShips[shipCode] ?? 0;

    setFleet((current) => ({
      ...current,
      [shipCode]: Math.min(parsed, maxValue),
    }));
  }

  async function startExpedition() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/api/expeditions/start?telegram_id=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ships: fleet,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? "Не удалось отправить экспедицию");
      }

      const data: ExpeditionResponse = await response.json();

      setState(data);
      setRemainingSeconds(data.active_expedition?.remaining_seconds ?? 0);
      setFleet({
        scout: 0,
        transport: 0,
        fighter: 0,
      });

      await loadData();
    } catch (startError: unknown) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Не удалось отправить экспедицию",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const expeditionActive =
    state?.active_expedition !== null && state?.active_expedition !== undefined;

  return (
    <section className="expeditions-section">
      <div className="expeditions-heading">
        <div>
          <p className="expeditions-label">Флот</p>
          <h2>Экспедиции</h2>
        </div>
      </div>

      <div className="expeditions-bonuses">
        <strong>Исследования влияют на экспедиции</strong>
        <ul>
          <li>Двигатели уменьшают время полёта.</li>
          <li>Грузовые системы увеличивают найденную добычу.</li>
          <li>Разведка снижает риск потерь.</li>
        </ul>
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

      {error !== "" && <p className="expeditions-error">{error}</p>}

      <div className="expeditions-form">
        <h3>Отправить флот</h3>

        <FleetInput
          label={`Разведчик (доступно: ${availableShips.scout})`}
          value={fleet.scout}
          disabled={expeditionActive || isLoading}
          onChange={(value) => updateFleet("scout", value)}
        />

        <FleetInput
          label={`Транспортник (доступно: ${availableShips.transport})`}
          value={fleet.transport}
          disabled={expeditionActive || isLoading}
          onChange={(value) => updateFleet("transport", value)}
        />

        <FleetInput
          label={`Истребитель (доступно: ${availableShips.fighter})`}
          value={fleet.fighter}
          disabled={expeditionActive || isLoading}
          onChange={(value) => updateFleet("fighter", value)}
        />

        <button
          className="expeditions-button"
          disabled={expeditionActive || isLoading}
          onClick={() => {
            void startExpedition();
          }}
        >
          Отправить экспедицию
        </button>
      </div>
    </section>
  );
}

type FleetInputProps = {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
};

function FleetInput({ label, value, disabled, onChange }: FleetInputProps) {
  return (
    <label className="expeditions-input">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatShips(ships: Record<string, number>): string {
  const entries = Object.entries(ships).filter(([, value]) => value > 0);

  if (entries.length === 0) {
    return "нет";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
}