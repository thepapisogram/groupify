import type { RefObject } from "react";

interface NamesInputPanelProps {
  names: string;
  onNamesChange: (value: string) => void;
  onClear: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function NamesInputPanel({
  names,
  onNamesChange,
  onClear,
  textareaRef,
}: NamesInputPanelProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Names - one per line
        </label>
        {names && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground/60 transition-colors hover:text-destructive"
          >
            Clear all
          </button>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={names}
        onChange={(event) => onNamesChange(event.target.value)}
        placeholder={"Alice\nBob\nCarol\nDave\nEve\nFrank\n..."}
        rows={14}
        className="w-full resize-none rounded-2xl border border-border/60 bg-card/60 px-5 py-4 font-dm text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 backdrop-blur-sm shadow-md"
      />

      <p className="text-[11px] text-muted-foreground/50">
        Tip: paste a column from Excel - each cell becomes a name automatically.
      </p>
    </div>
  );
}
