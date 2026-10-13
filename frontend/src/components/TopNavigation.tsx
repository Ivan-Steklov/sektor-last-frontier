import type { AppTab } from "../app/types";

type TopNavigationProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { key: AppTab; label: string }[] = [
  { key: "planet", label: "\u041f\u043b\u0430\u043d\u0435\u0442\u0430" },
  { key: "buildings", label: "\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e" },
  { key: "fleet", label: "\u0424\u043b\u043e\u0442" },
  { key: "research", label: "\u0418\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u043d\u0438\u044f" },
  { key: "galaxy", label: "\u0413\u0430\u043b\u0430\u043a\u0442\u0438\u043a\u0430" },
  { key: "missions", label: "\u041c\u0438\u0441\u0441\u0438\u0438" },
  { key: "alliance", label: "\u0410\u043b\u044c\u044f\u043d\u0441" },
];

export function TopNavigation({
  activeTab,
  onChange,
}: TopNavigationProps) {
  return (
    <nav className="navigation" aria-label="\u0420\u0430\u0437\u0434\u0435\u043b\u044b \u0438\u0433\u0440\u044b">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={
            activeTab === tab.key
              ? "navigation-button active"
              : "navigation-button"
          }
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
