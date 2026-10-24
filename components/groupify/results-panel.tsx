import type { ReactNode } from "react";
import type { Group } from "@/components/groupify/types";
import type { ExportColumn } from "@/lib/group-export";
import { GroupCard } from "@/components/groupify/group-card";
import { RiAlertLine, RiArrowGoBackLine, RiPrinterLine, RiShuffleLine } from "@remixicon/react";

interface ResultsPanelProps {
  groups: Group[];
  totalGrouped: number;
  onShuffle: () => void;
  onRename?: (groupId: number, label: string) => void;
  onMoveMember?: (fromGroupId: number, memberIndex: number, toGroupId: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  /** Notes from the grouping engine, e.g. a rule it couldn't satisfy. */
  warnings?: string[];
  /** Extra buttons in the header, e.g. "Publish" or a download menu. */
  actions?: ReactNode;
  /** Replaces the default "N groups" heading. */
  heading?: ReactNode;
  /** Extra columns shown under each name. */
  detailColumns?: ExportColumn[];
}

export const toolbarButton =
  "inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0";

export function ResultsPanel({
  groups,
  totalGrouped,
  onShuffle,
  onRename,
  onMoveMember,
  onUndo,
  canUndo = false,
  warnings = [],
  actions,
  heading,
  detailColumns,
}: ResultsPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {heading ?? (
          <div>
            <p className="eyebrow">Groups</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {groups.length} groups · {totalGrouped} people
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {onUndo && (
            <button type="button" onClick={onUndo} disabled={!canUndo} className={toolbarButton}>
              <RiArrowGoBackLine />
              Undo
            </button>
          )}
          <button type="button" onClick={onShuffle} className={toolbarButton}>
            <RiShuffleLine />
            Reshuffle
          </button>
          <button type="button" onClick={() => window.print()} className={`${toolbarButton} hidden sm:inline-flex`}>
            <RiPrinterLine />
            Print
          </button>
          {actions}
        </div>
      </div>

      {warnings.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          <RiAlertLine className="mt-0.5 size-4 shrink-0" />
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:gap-4">
        {groups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            index={index}
            allGroups={groups}
            onRename={onRename}
            onMoveMember={onMoveMember}
            detailColumns={detailColumns}
          />
        ))}
      </div>

      {(onRename || onMoveMember) && (
        <p className="text-xs text-muted-foreground print:hidden">
          Tap a group name to rename it, or the arrows beside a person to move them.
        </p>
      )}
    </div>
  );
}
