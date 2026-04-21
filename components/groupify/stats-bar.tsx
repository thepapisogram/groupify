import { StatPill } from "@/components/groupify/stat-pill";

interface StatsBarProps {
  nameCount: number;
  size: number;
  estGroups: number;
  hasResults: boolean;
  groupsCount: number;
}

export function StatsBar({
  nameCount,
  size,
  estGroups,
  hasResults,
  groupsCount,
}: StatsBarProps) {
  if (nameCount === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <StatPill value={nameCount} label="Names" delay={0} />
      <StatPill value={size} label="Per group" delay={0.05} />
      <StatPill value={estGroups || "-"} label="Est. groups" delay={0.1} />
      {hasResults && <StatPill value={groupsCount} label="Created" delay={0.15} />}
    </div>
  );
}
