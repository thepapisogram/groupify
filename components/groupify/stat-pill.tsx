interface StatPillProps {
  value: string | number;
  label: string;
  delay?: number;
}

export function StatPill({ value, label, delay = 0 }: StatPillProps) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-border/60 bg-card/60 px-5 py-3 backdrop-blur-sm animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="font-syne text-2xl font-bold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
