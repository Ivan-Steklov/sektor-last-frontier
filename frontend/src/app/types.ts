export type HomePlanet = {
  id: number;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  telegram_id: number;
  username: string | null;
};

export type Resources = {
  metal: number;
  crystal: number;
  energy: number;
  population: number;
  metal_per_hour: number;
  crystal_per_hour: number;
  energy_produced: number;
  energy_consumed: number;
  energy_efficiency_percent: number;
  warehouse_capacity: number;
};

export type Building = {
  code: string;
  name: string;
  description: string;
  level: number;
  next_level: number;
  upgrade_metal_cost: number;
  upgrade_crystal_cost: number;
  upgrade_seconds: number;
  can_upgrade: boolean;
  is_in_queue: boolean;
};

export type BuildingQueue = {
  id: number;
  building_code: string;
  building_name: string;
  target_level: number;
  started_at: string;
  finishes_at: string;
  remaining_seconds: number;
};

export type BuildingsResponse = {
  buildings: Building[];
  queue: BuildingQueue | null;
};

export type AppTab =
  | "planet"
  | "buildings"
  | "fleet"
  | "research"
  | "galaxy"
  | "alliance";