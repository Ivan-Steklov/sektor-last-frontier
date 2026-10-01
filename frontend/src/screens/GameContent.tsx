import type { AppTab, Building, BuildingQueue, Resources } from "../app/types";
import { AllianceScreen } from "./AllianceScreen";
import { BuildingsScreen } from "./BuildingsScreen";
import { FleetScreen } from "./FleetScreen";
import { GalaxyScreen } from "./GalaxyScreen";
import { PlanetScreen } from "./PlanetScreen";
import { ResearchScreen } from "./ResearchScreen";

type GameContentProps = {
  activeTab: AppTab;
  buildings: Building[];
  resources: Resources | null;
  queue: BuildingQueue | null;
  queueRemainingSeconds: number;
  isLoadingAction: boolean;
  error: string | null;
  onReload: () => Promise<void>;
  onUpgrade: (buildingCode: string) => Promise<void>;
};

export function GameContent({
  activeTab,
  buildings,
  resources,
  queue,
  queueRemainingSeconds,
  isLoadingAction,
  error,
  onReload,
  onUpgrade,
}: GameContentProps) {
  if (activeTab === "planet") {
    return <PlanetScreen />;
  }

  if (activeTab === "buildings") {
    return (
      <BuildingsScreen
        buildings={buildings}
        resources={resources}
        queue={queue}
        queueRemainingSeconds={queueRemainingSeconds}
        isLoadingAction={isLoadingAction}
        onReload={onReload}
        onUpgrade={onUpgrade}
        error={error}
      />
    );
  }

  if (activeTab === "research") {
    return <ResearchScreen />;
  }

  if (activeTab === "fleet") {
    return <FleetScreen />;
  }

  if (activeTab === "galaxy") {
    return <GalaxyScreen />;
  }

  return <AllianceScreen />;
}