import { useEffect, useState } from "react";

interface SizeControlProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function SizeControl({ value, min = 2, max = 99, onChange }: SizeControlProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    let num = parseInt(localValue, 10);
    if (isNaN(num)) num = min;
    num = Math.max(min, Math.min(max, num));
    setLocalValue(num.toString());
    onChange(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

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
        <input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-center font-syne text-2xl font-bold tabular-nums text-foreground outline-none animate-count-up"
          min={min}
          max={max}
        />
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
