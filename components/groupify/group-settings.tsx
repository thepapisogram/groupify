import { computeGroupSizes } from "@/lib/grouping";
import { SizeControl } from "@/components/groupify/size-control";
import type { DistributionMode, GroupBy } from "@/components/groupify/types";

interface GroupSettingsProps {
  groupBy: GroupBy;
  size: number;
  groupCount: number;
  mode: DistributionMode;
  nameCount: number;
  onGroupByChange: (groupBy: GroupBy) => void;
  onSizeChange: (value: number) => void;
  onGroupCountChange: (value: number) => void;
  onModeChange: (mode: DistributionMode) => void;
}

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "size", label: "People per group" },
  { value: "count", label: "Number of groups" },
];

const DISTRIBUTION_OPTIONS = [
  { value: "best" as const, title: "Spread them out", description: "Add one extra person to some groups" },
  { value: "overflow" as const, title: "Smaller last group", description: "Put the extras in a group of their own" },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const peopleCount = (n: number) => (n === 1 ? "1 person" : `${n} people`);

/** "27 groups of 5 and 2 groups of 6", largest first. */
export function describeSizes(sizes: number[]): string {
  const counts = new Map<number, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  const parts = Array.from(counts.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([size, count]) => `${plural(count, "group")} of ${size}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

/** Group size or count, plus what to do with leftovers. Shared by the quick tool and the form dashboard. */
export function GroupSettings({
  groupBy,
  size,
  groupCount,
  mode,
  nameCount,
  onGroupByChange,
  onSizeChange,
  onGroupCountChange,
  onModeChange,
}: GroupSettingsProps) {
  const value = groupBy === "size" ? size : groupCount;
  const sizes = computeGroupSizes(nameCount, groupBy, value, mode);
  const hasLeftovers = groupBy === "size" && nameCount > 0 && nameCount % size !== 0;

  return (
    <div className="space-y-5">
      <div
        role="radiogroup"
        aria-label="Make groups by"
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
      >
        {GROUP_BY_OPTIONS.map((option) => {
          const active = groupBy === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onGroupByChange(option.value)}
              className={`min-h-10 rounded-lg px-2 text-sm font-medium transition-all ${
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {groupBy === "size" ? (
          <SizeControl label="People per group" value={size} min={2} max={99} onChange={onSizeChange} />
        ) : (
          <SizeControl label="Number of groups" value={groupCount} min={1} max={99} onChange={onGroupCountChange} />
        )}
        <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">
          {nameCount === 0 ? (
            "Add people to see how they'll split"
          ) : (
            <>
              <span className="font-medium text-foreground">{peopleCount(nameCount)}</span>
              {" → "}
              {describeSizes(sizes)}
            </>
          )}
        </p>
      </div>

      {hasLeftovers && (
        <div className="space-y-2 animate-fade-in">
          <p id="extra-members-label" className="text-sm font-medium text-foreground">
            {peopleCount(nameCount % size)} left over
          </p>
          <div className="grid gap-2" role="radiogroup" aria-labelledby="extra-members-label">
            {DISTRIBUTION_OPTIONS.map((option) => {
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onModeChange(option.value)}
                  className={`flex min-h-11 items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                    active ? "border-primary/60 bg-accent" : "border-border hover:border-primary/30"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {active && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
