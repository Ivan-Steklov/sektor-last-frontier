export type MissionStatus = "active" | "completed" | string;

export type MissionType =
  | "scout"
  | "harvest"
  | "expedition"
  | "attack"
  | "transport"
  | string;

export type MissionDetails = Record<string, unknown>;

export interface MissionItem {
  source: string;
  type: MissionType;
  status: MissionStatus;
  title: string;
  started_at?: string | null;
  finishes_at?: string | null;
  completed_at?: string | null;
  details?: MissionDetails | null;
}

export interface MissionsStateResponse {
  items: MissionItem[];
}

export type ShipsResponse = {
  ships: {
    code: string;
    name: string;
    quantity: number;
    attack?: number;
    defense?: number;
    cargo_capacity?: number;
  }[];
};

export type ShipStats = {
  name: string;
  attack: number;
  defense: number;
  cargo_capacity: number;
};

export interface SystemStorageItem {
  id: number;
  galaxy: number;
  system: number;
  metal: number;
  crystal: number;
  created_at: string;
  updated_at: string;
}

export interface SystemStorageStateResponse {
  storages: SystemStorageItem[];
}

export interface ResourceStateResponse {
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
  calculated_at: string;
}

export interface GalaxySectorSystemItem {
  galaxy: number;
  system: number;
  name: string;
  distance: number;
  richness: string;
  danger: string;
  danger_level: number;
  has_home_planet: boolean;
  is_scouted: boolean;
}

export interface GalaxySectorResponse {
  current_galaxy: number;
  current_system: number;
  current_position: number;
  systems: GalaxySectorSystemItem[];
}

export type FleetForm = {
  transport: number;
  heavy_transport: number;
  fighter: number;
  corvette: number;
};

export type TransportForm = {
  target_galaxy: number;
  target_system: number;
  metal: number;
  crystal: number;
};

export type TransportFleetForm = {
  transport: number;
  heavy_transport: number;
};