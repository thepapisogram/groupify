import type { Group } from "@/components/groupify/types";
import { GroupCard } from "@/components/groupify/group-card";

interface ResultsPanelProps {
  groups: Group[];
  totalGrouped: number;
  onShuffle: () => void;
}

export function ResultsPanel({ groups, totalGrouped, onShuffle }: ResultsPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {groups.length} groups - {totalGrouped} members
        </p>

        <button
          type="button"
          onClick={onShuffle}
          className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary"
        >
          <svg
            className="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l5.1 5.1M4 4l5 5" />
          </svg>
          Reshuffle
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group, index) => (
          <GroupCard key={group.id} group={group} index={index} />
        ))}
      </div>
    </div>
  );
}
