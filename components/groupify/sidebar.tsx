import { SizeControl } from "@/components/groupify/size-control";
import { StatsBar } from "@/components/groupify/stats-bar";
import type { DistributionMode, ExportFormat } from "@/components/groupify/types";

interface SidebarProps {
  groupBy: "size" | "count";
  size: number;
  groupCount: number;
  mode: DistributionMode;
  isWorking: boolean;
  nameCount: number;
  hasResults: boolean;
  copiedText: boolean;
  estGroups: number;
  groupsCount: number;
  onGroupByChange: (groupBy: "size" | "count") => void;
  onSizeChange: (value: number) => void;
  onGroupCountChange: (value: number) => void;
  onModeChange: (mode: DistributionMode) => void;
  onGenerate: () => void;
  onExport: (format: ExportFormat) => void;
  onCopyText: () => void;
}

const DISTRIBUTION_OPTIONS = [
  {
    value: "best" as const,
    title: "Distribute evenly",
    description: "Spread extras into existing groups",
  },
  {
    value: "overflow" as const,
    title: "New smaller group",
    description: "Put extras in a separate group",
  },
];

const HOW_TO_USE_STEPS = [
  "Enter names in the box - one per line",
  "Set how many members per group",
  "Choose how to handle extras",
  "Hit Generate and download or copy",
];

export function Sidebar({
  groupBy,
  size,
  groupCount,
  mode,
  isWorking,
  nameCount,
  hasResults,
  copiedText,
  estGroups,
  groupsCount,
  onGroupByChange,
  onSizeChange,
  onGroupCountChange,
  onModeChange,
  onGenerate,
  onExport,
  onCopyText,
}: SidebarProps) {
  return (
    <div className="space-y-4">
      <StatsBar
        nameCount={nameCount}
        size={size}
        estGroups={estGroups}
        hasResults={hasResults}
        groupsCount={groupsCount}
      />

      <div className="space-y-6 rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-md animate-slide-up stagger-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Configuration
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {groupBy === "size" ? "Members per group" : "Number of groups"}
            </label>
            <button
              type="button"
              onClick={() => onGroupByChange(groupBy === "size" ? "count" : "size")}
              className="rounded-full bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={groupBy === "size" ? "Switch to number of groups" : "Switch to members per group"}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
          </div>
          {groupBy === "size" ? (
            <SizeControl value={size} min={2} max={99} onChange={onSizeChange} />
          ) : (
            <SizeControl value={groupCount} min={1} max={99} onChange={onGroupCountChange} />
          )}
          <p className="text-[11px] text-muted-foreground/60">
            Min {groupBy === "size" ? 2 : 1} - Max 99
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Extra members</label>
          <div className="space-y-2">
            {DISTRIBUTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value)}
                className={`w-full rounded-xl border p-3 text-left transition-all flex items-start gap-3 ${
                  mode === option.value
                    ? "border-primary/50 bg-primary/8"
                    : "border-border/40 bg-muted/20 hover:border-primary/30"
                }`}
              >
                <div
                  className={`mt-0.5 size-4 shrink-0 rounded-full border-2 transition-all ${
                    mode === option.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  }`}
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">{option.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-50 sm:static sm:bottom-auto sm:left-auto sm:right-auto sm:z-auto">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isWorking || nameCount === 0}
          className={`w-full rounded-2xl px-6 py-3.5 font-syne text-sm font-bold tracking-wide text-primary-foreground shadow-lg transition-all active:scale-98 disabled:cursor-not-allowed disabled:bg-primary/40 disabled:text-primary-foreground/60 disabled:border-primary/20 animate-slide-up stagger-2 border border-primary/30 backdrop-blur-md sm:border-transparent sm:backdrop-blur-none ${
            isWorking ? "btn-shimmer bg-primary/80 sm:bg-primary" : "bg-primary/80 hover:bg-primary/90 sm:bg-primary animate-pulse-ring"
          }`}
        >
          {isWorking ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="32"
                  strokeLinecap="round"
                />
              </svg>
              Grouping...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {hasResults ? "Regenerate" : "Generate Groups"}
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </button>
      </div>

      {hasResults ? (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-md animate-slide-up stagger-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Export
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onExport("excel")}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <svg className="size-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17.5l2.5-4 2.5 4h-5zm2.5-5.5L8 8h5l-2.5 4z" />
              </svg>
              Download Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => onExport("word")}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <svg className="size-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM7 13h2l1.5 4L12 13h2l-2.5 6H9.5L7 13z" />
              </svg>
              Download Word (.docx)
            </button>

            <button
              type="button"
              onClick={onCopyText}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {copiedText ? (
                <svg
                  className="size-4 text-emerald-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copiedText ? "Copied!" : "Copy as text"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl shadow-md border border-border/40 bg-card/40 p-4 backdrop-blur-sm animate-slide-up stagger-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            How to use
          </p>

          <ol className="space-y-2.5">
            {HOW_TO_USE_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-[10px] font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
