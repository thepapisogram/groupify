import { useEffect, useState } from "react";
import { RiAddLine, RiSubtractLine } from "@remixicon/react";

interface SizeControlProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  /** Accessible name for the number and its +/- buttons. */
  label?: string;
}

const stepButton =
  "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground transition-all hover:border-primary/50 hover:bg-accent active:scale-95 disabled:pointer-events-none disabled:opacity-40";

export function SizeControl({ value, min = 2, max = 99, onChange, label = "value" }: SizeControlProps) {
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className={stepButton}
      >
        <RiSubtractLine className="size-5" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-11 w-full min-w-0 flex-1 rounded-xl border border-transparent bg-transparent text-center font-syne text-3xl font-bold tabular-nums text-foreground outline-none transition-colors focus:border-primary/40 focus:bg-muted/40"
        min={min}
        max={max}
      />

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className={stepButton}
      >
        <RiAddLine className="size-5" />
      </button>
    </div>
  );
}
