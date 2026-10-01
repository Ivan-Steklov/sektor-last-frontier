import { useState } from "react";

import "./App.css";
import type { AppTab } from "./app/types";
import { AppShell } from "./components/AppShell";
import { useGameData } from "./hooks/useGameData";
import { GameContent } from "./screens/GameContent";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("planet");
  const {
    planet,
    resources,
    buildings,
    queue,
    queueRemainingSeconds,
    error,
    isLoadingAction,
    loadGame,
    handleUpgrade,
  } = useGameData();

  return (
    <AppShell
      planet={planet}
      resources={resources}
      error={error}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
    >
      <GameContent
        activeTab={activeTab}
        buildings={buildings}
        resources={resources}
        queue={queue}
        queueRemainingSeconds={queueRemainingSeconds}
        isLoadingAction={isLoadingAction}
        error={error}
        onReload={loadGame}
        onUpgrade={handleUpgrade}
      />
    </AppShell>
  );
}

export default App;
