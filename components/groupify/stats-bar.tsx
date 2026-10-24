interface StatsBarProps {
  nameCount: number;
  size: number;
  estGroups: number;
  hasResults: boolean;
  groupsCount: number;
}

/** Three fixed tiles so the layout never shifts; dashes while there's nothing to count. */
export function StatsBar({ nameCount, size, estGroups, hasResults, groupsCount }: StatsBarProps) {
  const empty = nameCount === 0;
  const tiles = [
    { label: "People", value: empty ? "—" : nameCount },
    { label: "Per group", value: empty ? "—" : size },
    { label: hasResults ? "Groups" : "Est. groups", value: hasResults ? groupsCount : empty ? "—" : estGroups || "—" },
  ];

  return (
    <div className={`grid grid-cols-3 gap-2 transition-opacity duration-300 ${empty ? "opacity-60" : ""}`}>
      {tiles.map((tile) => (
        <div key={tile.label} className="surface flex flex-col items-center px-2 py-3">
          <span className="font-syne text-2xl font-bold tabular-nums text-foreground">{tile.value}</span>
          <span className="text-xs font-medium text-muted-foreground">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
