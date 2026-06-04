interface SizeControlProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function SizeControl({ value, min = 2, max = 99, onChange }: SizeControlProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-muted/50 font-bold text-base text-foreground transition-all hover:border-primary/50 hover:bg-muted active:scale-95"
      >
        -
      </button>

      <div className="relative w-12 text-center">
        <span className="font-syne text-2xl font-bold tabular-nums text-foreground animate-count-up">
          {value}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-muted/50 font-bold text-base text-foreground transition-all hover:border-primary/50 hover:bg-muted active:scale-95"
      >
        +
      </button>
    </div>
  );
}
