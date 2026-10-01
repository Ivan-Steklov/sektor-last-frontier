import type { ReactNode } from "react";

import type { AppTab, HomePlanet, Resources } from "../app/types";
import { HeaderBar } from "./HeaderBar";
import { ResourcePanel } from "./ResourcePanel";
import { TopNavigation } from "./TopNavigation";

type AppShellProps = {
  planet: HomePlanet | null;
  resources: Resources | null;
  error: string | null;
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  children: ReactNode;
};

export function AppShell({
  planet,
  resources,
  error,
  activeTab,
  onChangeTab,
  children,
}: AppShellProps) {
  return (
    <main className="app">
      <HeaderBar planet={planet} />

      {error && <div className="error-panel">{error}</div>}

      <ResourcePanel resources={resources} />

      <TopNavigation activeTab={activeTab} onChange={onChangeTab} />

      {children}
    </main>
  );
}