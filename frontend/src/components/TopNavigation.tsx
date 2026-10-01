import type { AppTab } from "../app/types";

type TopNavigationProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { key: AppTab; label: string }[] = [
  { key: "planet", label: "Планета" },
  { key: "buildings", label: "Строительство" },
  { key: "fleet", label: "Флот" },
  { key: "research", label: "Исследования" },
  { key: "galaxy", label: "Галактика" },
  { key: "alliance", label: "Альянс" },
];

export function TopNavigation({
  activeTab,
  onChange,
}: TopNavigationProps) {
  return (
    <nav className="navigation" aria-label="Разделы игры">
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