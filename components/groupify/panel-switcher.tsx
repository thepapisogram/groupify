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
  return (
    <div className="mb-6 animate-fade-in print:hidden">
      <div
        role="group"
        aria-label="View"
        className="flex w-fit gap-1 rounded-2xl border border-border/50 bg-card/60 p-1 backdrop-blur-sm"
      >
        {(["input", "results"] as const).map((tab) => {
          const isDisabled = tab === "results" && !hasResults;
          return (
            <button
              key={tab}
              type="button"
              disabled={isDisabled}
              aria-pressed={activePanel === tab}
              onClick={() => onChange(tab)}
              title={isDisabled ? "Generate groups to see results" : undefined}
              className={`rounded-xl px-5 py-1.5 text-sm font-medium transition-all ${
                activePanel === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isDisabled
                  ? "text-muted-foreground/70 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "input" ? "Names" : `Results ${hasResults ? ` -  ${groupsCount}` : ""}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
