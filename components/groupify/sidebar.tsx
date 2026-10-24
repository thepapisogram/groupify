import type { ReactNode } from "react";
import { RiCheckLine, RiFileCopyLine, RiFileExcel2Line, RiFileWord2Line } from "@remixicon/react";
import { GenerateButton } from "@/components/groupify/generate-button";
import { GroupSettings } from "@/components/groupify/group-settings";
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
  /** Rendered between the configuration card and the Generate button (e.g. the rules panel). */
  rules?: ReactNode;
  /** Rendered after the export card (e.g. print or publish actions). */
  extraActions?: ReactNode;
}

const exportButton =
  "flex min-h-11 w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-accent";

/** Settings column of the form dashboard. */
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
  rules,
  extraActions,
}: SidebarProps) {
  return (
    <div className="space-y-4 print:hidden">
      <StatsBar
        nameCount={nameCount}
        size={size}
        estGroups={estGroups}
        hasResults={hasResults}
        groupsCount={groupsCount}
      />

      <section className="surface space-y-4 p-5 animate-slide-up stagger-1">
        <p className="eyebrow">Group settings</p>
        <GroupSettings
          groupBy={groupBy}
          size={size}
          groupCount={groupCount}
          mode={mode}
          nameCount={nameCount}
          onGroupByChange={onGroupByChange}
          onSizeChange={onSizeChange}
          onGroupCountChange={onGroupCountChange}
          onModeChange={onModeChange}
        />
      </section>

      {rules}

      <div className="action-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 px-4 pt-3 backdrop-blur-lg sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <GenerateButton isWorking={isWorking} disabled={nameCount === 0} hasResults={hasResults} onClick={onGenerate} />
      </div>

      {hasResults && (
        <section className="surface space-y-3 p-5 animate-slide-up stagger-3">
          <p className="eyebrow">Download</p>
          <div className="space-y-2">
            <button type="button" onClick={() => onExport("excel")} className={exportButton}>
              <RiFileExcel2Line className="size-5 text-emerald-600 dark:text-emerald-400" />
              Excel (.xlsx)
            </button>
            <button type="button" onClick={() => onExport("word")} className={exportButton}>
              <RiFileWord2Line className="size-5 text-blue-600 dark:text-blue-400" />
              Word (.docx)
            </button>
            <button type="button" onClick={onCopyText} className={exportButton}>
              {copiedText ? (
                <RiCheckLine className="size-5 text-emerald-500" />
              ) : (
                <RiFileCopyLine className="size-5 text-muted-foreground" />
              )}
              {copiedText ? "Copied!" : "Copy as text"}
            </button>
          </div>
        </section>
      )}

      {hasResults && extraActions}
    </div>
  );
}
