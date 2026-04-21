type ActivePanel = "input" | "results";

interface PanelSwitcherProps {
  hasResults: boolean;
  activePanel: ActivePanel;
  groupsCount: number;
  onChange: (tab: ActivePanel) => void;
}

export function PanelSwitcher({
  hasResults,
  activePanel,
  groupsCount,
  onChange,
}: PanelSwitcherProps) {
  if (!hasResults) return null;

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex w-fit gap-1 rounded-2xl border border-border/50 bg-card/60 p-1 backdrop-blur-sm">
        {(["input", "results"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`rounded-xl px-5 py-1.5 text-sm font-medium transition-all ${
              activePanel === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "input" ? "Names" : `Results  -  ${groupsCount}`}
          </button>
        ))}
      </div>
    </div>
  );
}
