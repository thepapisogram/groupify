import type { ReactNode } from "react";
import type { Group } from "@/components/groupify/types";
import { GroupCard } from "@/components/groupify/group-card";
import { RiAlertLine, RiArrowGoBackLine } from "@remixicon/react";

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
  /** Extra buttons in the header, e.g. "Publish". */
  actions?: ReactNode;
}

const headerButton =
  "flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40";

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
}: ResultsPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {groups.length} groups - {totalGrouped} members
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {onUndo && (
            <button type="button" onClick={onUndo} disabled={!canUndo} className={headerButton}>
              <RiArrowGoBackLine className="size-3" />
              Undo
            </button>
          )}
          {actions}
          <button type="button" onClick={onShuffle} className={headerButton}>
            <svg
              className="size-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l5.1 5.1M4 4l5 5" />
            </svg>
            Reshuffle
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
        >
          <RiAlertLine className="mt-0.5 size-4 shrink-0" />
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            index={index}
            allGroups={groups}
            onRename={onRename}
            onMoveMember={onMoveMember}
          />
        ))}
      </div>

      {(onRename || onMoveMember) && (
        <p className="text-xs text-muted-foreground/60">
          Tip: click a group name to rename it, or use the arrows beside a name to move someone.
        </p>
      )}
    </div>
  );
}
