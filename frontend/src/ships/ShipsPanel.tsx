import { useEffect, useState } from "react";

import "./ShipsPanel.css";

type ShipItem = {
  code: string;
  name: string;
  description: string;
  role: string;
  attack: number;
  defense: number;
  speed: number;
  cargo_capacity: number;
  fuel_usage: number;
  quantity: number;
  build_metal_cost: number;
  build_crystal_cost: number;
  build_seconds: number;
  required_shipyard_level: number;
  requirements_met: boolean;
  can_build: boolean;
  is_in_queue: boolean;
};

type ShipQueue = {
  id: number;
  ship_code: string;
  ship_name: string;
  quantity: number;
  remaining_seconds: number;
};

type ShipResponse = {
  ships: ShipItem[];
  queue: ShipQueue | null;
};

type ShipsPanelProps = {
  apiUrl: string;
};

export function ShipsPanel({ apiUrl }: ShipsPanelProps) {
  const [items, setItems] = useState<ShipItem[]>([]);
  const [queue, setQueue] = useState<ShipQueue | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadShips() {
    const response = await fetch(`${apiUrl}/api/ships/current?telegram_id=1`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Не удалось загрузить корабли");
    }

    const data: ShipResponse = await response.json();

    setItems(data.ships);
    setQueue(data.queue);
    setRemainingSeconds(data.queue?.remaining_seconds ?? 0);
  }

  useEffect(() => {
    void loadShips().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить корабли",
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
          void loadShips().catch(() => {
            setError("Не удалось обновить верфь");
          });
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [queue?.id]);

  async function buildShip(shipCode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/api/ships/${shipCode}/build?telegram_id=1&quantity=1`,
        { method: "POST" },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.detail ?? "Не удалось начать строительство корабля",
        );
      }

      const data: ShipResponse = await response.json();

      setItems(data.ships);
      setQueue(data.queue);
      setRemainingSeconds(data.queue?.remaining_seconds ?? 0);
    } catch (buildError: unknown) {
      setError(
        buildError instanceof Error
          ? buildError.message
          : "Не удалось начать строительство корабля",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="ships-section">
      <div className="ships-heading">
        <div>
          <p className="ships-label">Верфь</p>
          <h2>Корабли</h2>
          <p className="ships-heading-text">
            Флот теперь имеет роли и базовые характеристики. Позже эти значения
            будут влиять на длительность миссий, грузоподъёмность и боевые
            расчёты.
          </p>
        </div>
      </div>

      {queue !== null && (
        <div className="ships-queue">
          <div>
            <span>Строится</span>
            <strong>
              {queue.ship_name} × {queue.quantity}
            </strong>
          </div>

          <div className="ships-queue-time">
            {formatDuration(remainingSeconds)}
          </div>
        </div>
      )}

      {error !== "" && <p className="ships-error">{error}</p>}

      <div className="ships-grid">
        {items.map((item) => (
          <article className="ships-item" key={item.code}>
            <div className="ships-item-header">
              <div>
                <div className="ships-role">{item.role}</div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>

              <div className="ships-count">
                <strong>{item.quantity}</strong>
                <span>шт.</span>
              </div>
            </div>

            <div className="ships-stats-grid">
              <ShipStat label="Атака" value={item.attack} />
              <ShipStat label="Защита" value={item.defense} />
              <ShipStat label="Скорость" value={item.speed} />
              <ShipStat label="Груз" value={formatNumber(item.cargo_capacity)} />
              <ShipStat label="Расход" value={item.fuel_usage} />
              <ShipStat
                label="Верфь"
                value={`ур. ${item.required_shipyard_level}`}
              />
            </div>

            <div className="ships-build-info">
              <div>
                <span>Металл</span>
                <strong>{formatNumber(item.build_metal_cost)}</strong>
              </div>

              <div>
                <span>Кристалл</span>
                <strong>{formatNumber(item.build_crystal_cost)}</strong>
              </div>

              <div>
                <span>Время</span>
                <strong>{formatDuration(item.build_seconds)}</strong>
              </div>
            </div>

            {!item.requirements_met && (
              <p className="ships-requirement ships-requirement-warning">
                Требуется верфь ур. {item.required_shipyard_level}
              </p>
            )}

            <button
              className="ships-button"
              disabled={!item.can_build || isLoading}
              onClick={() => {
                void buildShip(item.code);
              }}
            >
              {item.is_in_queue ? "Строится" : "Построить 1"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShipStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="ships-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}