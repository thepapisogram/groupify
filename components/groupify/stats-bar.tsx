import { StatPill } from "@/components/groupify/stat-pill";

interface StatsBarProps {
  nameCount: number;
  size: number;
  estGroups: number;
  hasResults: boolean;
  groupsCount: number;
}

/**
 * Always renders the same 3 pills so the layout never shifts.
 * When nameCount === 0 the pills show "—" placeholders and are muted.
 * Real values animate in via the StatPill's animate-count-up class.
 */
export function StatsBar({
  nameCount,
  size,
  estGroups,
  hasResults,
  groupsCount,
}: StatsBarProps) {
  const empty = nameCount === 0;

  return (
    <div className={`mb-8 flex flex-wrap gap-3 transition-opacity duration-300 ${empty ? "opacity-40" : "opacity-100"}`}>
      <StatPill value={empty ? "—" : nameCount} label="Names" delay={0} />
      <StatPill value={empty ? "—" : size} label="Per group" delay={0.05} />
      <StatPill value={empty ? "—" : (estGroups || "—")} label="Est. groups" delay={0.1} />
      {hasResults && <StatPill value={groupsCount} label="Created" delay={0.15} />}
    </div>
  );
}
