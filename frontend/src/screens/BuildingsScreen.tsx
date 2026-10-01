import type { Building, BuildingQueue, Resources } from "../app/types";
import { BuildingsSection } from "../buildings/BuildingsSection";

type BuildingsScreenProps = {
  buildings: Building[];
  resources: Resources | null;
  queue: BuildingQueue | null;
  queueRemainingSeconds: number;
  isLoadingAction: boolean;
  onReload: () => Promise<void>;
  onUpgrade: (buildingCode: string) => Promise<void>;
  error: string | null;
};

export function BuildingsScreen(props: BuildingsScreenProps) {
  return <BuildingsSection {...props} />;
}