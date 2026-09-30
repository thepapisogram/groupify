"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Person } from "@/lib/grouping";
import type { Rule, RuleType } from "@/components/groupify/use-grouping";
import {
  RiAddLine,
  RiCloseLine,
  RiLinkM,
  RiScales3Line,
  RiSearchLine,
  RiUserForbidLine,
} from "@remixicon/react";

export interface BalanceOption {
  key: string;
  label: string;
}

interface RulesPanelProps {
  people: Person[];
  rules: Rule[];
  onAdd: (type: RuleType, keys: string[]) => void;
  onRemove: (id: string) => void;
  balanceOptions?: BalanceOption[];
  balanceBy: string | null;
  onBalanceChange: (key: string | null) => void;
}

const RULE_COPY: Record<RuleType, { title: string; verb: string; help: string }> = {
  together: {
    title: "Keep together",
    verb: "together",
    help: "Everyone you pick will end up in the same group.",
  },
  apart: {
    title: "Keep apart",
    verb: "apart",
    help: "Everyone you pick will be placed in different groups.",
  },
};

const MAX_LISTED = 300;
const NONE = "__none__";

function uniquePeople(people: Person[]): Person[] {
  const seen = new Set<string>();
  return people.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)));
}

function RuleForm({
  people,
  onSubmit,
  onCancel,
}: {
  people: Person[];
  onSubmit: (keys: string[]) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => !q || p.label.toLowerCase().includes(q));
  }, [people, query]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <>
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names"
          aria-label="Search names"
          className="w-full rounded-xl border border-border/50 bg-muted/20 py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <ul className="max-h-64 space-y-0.5 overflow-y-auto rounded-xl border border-border/40 p-1" aria-label="People">
        {filtered.slice(0, MAX_LISTED).map((p) => {
          const checked = selected.has(p.key);
          return (
            <li key={p.key}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  checked ? "bg-primary/10 text-foreground" : "text-foreground/80 hover:bg-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.key)}
                  className="size-4 rounded border-border/50 text-primary focus:ring-primary/50"
                />
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">No names match.</li>
        )}
        {filtered.length > MAX_LISTED && (
          <li className="px-3 py-2 text-center text-xs text-muted-foreground">
            Showing the first {MAX_LISTED}. Search to narrow the list.
          </li>
        )}
      </ul>

      <DialogFooter className="gap-2 sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {selected.size} selected{selected.size < 2 ? " (pick at least 2)" : ""}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={selected.size < 2} onClick={() => onSubmit(Array.from(selected))}>
            Add rule
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function RulesPanel({
  people,
  rules,
  onAdd,
  onRemove,
  balanceOptions = [],
  balanceBy,
  onBalanceChange,
}: RulesPanelProps) {
  const [dialogType, setDialogType] = useState<RuleType | null>(null);

  const unique = useMemo(() => uniquePeople(people), [people]);
  const labelOf = useMemo(() => new Map(unique.map((p) => [p.key, p.label])), [unique]);
  const canAdd = unique.length >= 2;

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-md animate-slide-up stagger-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rules</p>

      {balanceOptions.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="balance-by" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <RiScales3Line className="size-4 text-primary" />
            Spread evenly by
          </label>
          <Select
            value={balanceBy ?? NONE}
            onValueChange={(value) => onBalanceChange(value === NONE ? null : value)}
          >
            <SelectTrigger id="balance-by" className="h-10 w-full rounded-xl border border-border/50 bg-muted/20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nothing (fully random)</SelectItem>
              {balanceOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-snug text-muted-foreground/70">
            Mixes each group so it has a fair share of every value.
          </p>
        </div>
      )}

      {rules.length > 0 && (
        <ul className="space-y-2">
          {rules.map((rule) => {
            const names = rule.keys.map((k) => labelOf.get(k)).filter((n): n is string => Boolean(n));
            const inactive = names.length < 2;
            const Icon = rule.type === "together" ? RiLinkM : RiUserForbidLine;
            return (
              <li
                key={rule.id}
                className={`flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 ${inactive ? "opacity-50" : ""}`}
              >
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${rule.type === "together" ? "text-emerald-500" : "text-rose-500"}`}
                />
                <div className="min-w-0 flex-1 text-xs leading-snug">
                  <p className="font-semibold text-foreground">{RULE_COPY[rule.type].title}</p>
                  <p className="break-words text-muted-foreground">
                    {names.length > 0 ? names.join(", ") : "Names no longer in the list"}
                    {inactive && names.length > 0 ? " (needs 2+ names in the list)" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(rule.id)}
                  aria-label={`Remove rule: ${RULE_COPY[rule.type].title} ${names.join(", ")}`}
                  className="shrink-0 rounded-md p-1 text-muted-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RiCloseLine className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["together", "apart"] as const).map((type) => (
          <button
            key={type}
            type="button"
            disabled={!canAdd}
            onClick={() => setDialogType(type)}
            className="flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-dashed border-border/60 px-2 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
          >
            <RiAddLine className="size-3.5" />
            {RULE_COPY[type].title}
          </button>
        ))}
      </div>

      {!canAdd && (
        <p className="text-xs text-muted-foreground/70">Add at least two names to create rules.</p>
      )}

      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border/50 bg-card/95 backdrop-blur-md sm:max-w-md">
          {dialogType && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{RULE_COPY[dialogType].title}</DialogTitle>
                <DialogDescription>{RULE_COPY[dialogType].help}</DialogDescription>
              </DialogHeader>
              <RuleForm
                people={unique}
                onCancel={() => setDialogType(null)}
                onSubmit={(keys) => {
                  onAdd(dialogType, keys);
                  setDialogType(null);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
