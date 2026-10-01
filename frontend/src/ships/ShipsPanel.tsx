import { useEffect, useState } from "react";

import "./ShipsPanel.css";

type ShipItem = {
  code: string;
  name: string;
  description: string;
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
    const response = await fetch(
      `${apiUrl}/api/ships/current?telegram_id=1`,
    );

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
        throw new Error(data?.detail ?? "Не удалось начать строительство корабля");
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
        </div>
      </div>

      {queue !== null && (
        <div className="ships-queue">
          <strong>
            {queue.ship_name} × {queue.quantity}
          </strong>
          <span>{formatDuration(remainingSeconds)}</span>
        </div>
      )}

      {error !== "" && <p className="ships-error">{error}</p>}

      <div className="ships-grid">
        {items.map((item) => (
          <article className="ships-item" key={item.code}>
            <div className="ships-item-header">
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <strong>{item.quantity} шт.</strong>
            </div>

            <p className="ships-cost">
              Стоимость: {item.build_metal_cost} металла,{" "}
              {item.build_crystal_cost} кристалла,{" "}
              {formatDuration(item.build_seconds)}
            </p>

            <p className="ships-requirement">
              Требуется верфь ур. {item.required_shipyard_level}
            </p>

            {!item.requirements_met && (
              <p className="ships-requirement ships-requirement-warning">
                Требования не выполнены
              </p>
            )}

            <button
              className="ships-button"
              disabled={!item.can_build || isLoading}
              onClick={() => buildShip(item.code)}
            >
              {item.is_in_queue ? "Строится" : "Построить 1"}
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