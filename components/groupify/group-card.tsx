"use client";

import { useEffect, useRef, useState } from "react";
import type { Group } from "@/components/groupify/types";
import { cellText, type ExportColumn } from "@/lib/group-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiArrowLeftRightLine, RiPencilLine, RiTeamLine } from "@remixicon/react";

interface GroupCardProps {
  group: Group;
  index: number;
  /** Every group, so members can be moved between them. */
  allGroups?: Group[];
  onRename?: (groupId: number, label: string) => void;
  onMoveMember?: (fromGroupId: number, memberIndex: number, toGroupId: number) => void;
  /** Extra columns shown under each name (spreadsheet groupings). */
  detailColumns?: ExportColumn[];
}

/** Group name that turns into an input on click. Enter or blur saves, Escape cancels. */
function EditableLabel({ label, onSave }: { label: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== label) onSave(draft);
    else setDraft(label);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        maxLength={60}
        aria-label="Group name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(label);
            setEditing(false);
          }
        }}
        className="w-full min-w-0 rounded-md border border-primary/40 bg-card px-2 py-1 font-syne text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(label);
        setEditing(true);
      }}
      title="Rename group"
      aria-label={`Rename ${label}`}
      className="group/name flex min-w-0 items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="truncate font-syne text-base font-bold text-foreground">{label}</span>
      <RiPencilLine className="size-3.5 shrink-0 print:hidden text-muted-foreground/60 transition-opacity group-hover/name:text-foreground" />
    </button>
  );
}

/**
 * Color palette — 8 slots mapped 1-to-1 to the HUES array in lib/grouping.ts.
 * HUES = [185, 200, 220, 260, 160, 340, 35, 280]
 * Using Tailwind static classes keeps the stylesheet statically analyzable.
 */
const CARD_PALETTE = [
  // hue 185 — teal
  {
    border:      "border-teal-500/20",
    headerBg:    "bg-teal-500/10",
    cardBg:      "bg-teal-500/[0.04]",
    badgeBg:     "bg-teal-500 dark:bg-teal-600",
    itemBg:      "bg-teal-500/10 dark:bg-teal-400/20",
    numberColor: "text-teal-600 dark:text-teal-400",
  },
  // hue 200 — sky
  {
    border:      "border-sky-500/20",
    headerBg:    "bg-sky-500/10",
    cardBg:      "bg-sky-500/[0.04]",
    badgeBg:     "bg-sky-500 dark:bg-sky-600",
    itemBg:      "bg-sky-500/10 dark:bg-sky-400/20",
    numberColor: "text-sky-600 dark:text-sky-400",
  },
  // hue 220 — blue
  {
    border:      "border-blue-500/20",
    headerBg:    "bg-blue-500/10",
    cardBg:      "bg-blue-500/[0.04]",
    badgeBg:     "bg-blue-500 dark:bg-blue-600",
    itemBg:      "bg-blue-500/10 dark:bg-blue-400/20",
    numberColor: "text-blue-600 dark:text-blue-400",
  },
  // hue 260 — violet
  {
    border:      "border-violet-500/20",
    headerBg:    "bg-violet-500/10",
    cardBg:      "bg-violet-500/[0.04]",
    badgeBg:     "bg-violet-500 dark:bg-violet-600",
    itemBg:      "bg-violet-500/10 dark:bg-violet-400/20",
    numberColor: "text-violet-600 dark:text-violet-400",
  },
  // hue 160 — emerald
  {
    border:      "border-emerald-500/20",
    headerBg:    "bg-emerald-500/10",
    cardBg:      "bg-emerald-500/[0.04]",
    badgeBg:     "bg-emerald-500 dark:bg-emerald-600",
    itemBg:      "bg-emerald-500/10 dark:bg-emerald-400/20",
    numberColor: "text-emerald-600 dark:text-emerald-400",
  },
  // hue 340 — rose
  {
    border:      "border-rose-500/20",
    headerBg:    "bg-rose-500/10",
    cardBg:      "bg-rose-500/[0.04]",
    badgeBg:     "bg-rose-500 dark:bg-rose-600",
    itemBg:      "bg-rose-500/10 dark:bg-rose-400/20",
    numberColor: "text-rose-600 dark:text-rose-400",
  },
  // hue 35 — amber
  {
    border:      "border-amber-500/20",
    headerBg:    "bg-amber-500/10",
    cardBg:      "bg-amber-500/[0.04]",
    badgeBg:     "bg-amber-500 dark:bg-amber-600",
    itemBg:      "bg-amber-500/10 dark:bg-amber-400/20",
    numberColor: "text-amber-600 dark:text-amber-400",
  },
  // hue 280 — purple
  {
    border:      "border-purple-500/20",
    headerBg:    "bg-purple-500/10",
    cardBg:      "bg-purple-500/[0.04]",
    badgeBg:     "bg-purple-500 dark:bg-purple-600",
    itemBg:      "bg-purple-500/10 dark:bg-purple-400/20",
    numberColor: "text-purple-600 dark:text-purple-400",
  },
] as const;

export function GroupCard({ group, index, allGroups, onRename, onMoveMember, detailColumns = [] }: GroupCardProps) {
  const palette = CARD_PALETTE[index % CARD_PALETTE.length];
  const targets = (allGroups ?? []).filter((g) => g.id !== group.id);
  const canMove = Boolean(onMoveMember) && targets.length > 0;

  return (
    <article
      className="surface group flex flex-col overflow-hidden print:break-inside-avoid animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 0.04}s` }}
    >
      <div className={`h-1 ${palette.badgeBg}`} aria-hidden="true" />
      <header className={`flex items-center justify-between gap-2 border-b ${palette.border} ${palette.headerBg} px-4 py-3`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${palette.badgeBg}`}
            aria-hidden="true"
          >
            {index + 1}
          </span>
          {onRename ? (
            <EditableLabel label={group.label} onSave={(value) => onRename(group.id, value)} />
          ) : (
            <span className="truncate font-syne text-base font-bold text-foreground">{group.label}</span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <RiTeamLine className="size-3.5" aria-hidden="true" />
          {group.members.length}
          <span className="sr-only"> member{group.members.length === 1 ? "" : "s"}</span>
        </span>
      </header>

      <ol className="divide-y divide-border/60 px-2 py-1">
        {group.members.map((member, memberIndex) => {
          const details = detailColumns
            .map((column) => cellText(group, memberIndex, column))
            .filter(Boolean);
          return (
            <li key={`${member}-${memberIndex}`} className="flex items-center gap-3 px-2 py-2">
              <span className={`w-5 shrink-0 text-right text-xs font-semibold tabular-nums ${palette.numberColor}`}>
                {memberIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-foreground">{member}</p>
                {details.length > 0 && (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{details.join("  ·  ")}</p>
                )}
              </div>
              {canMove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Move ${member} to another group`}
                      title="Move to another group"
                      className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-muted print:hidden"
                    >
                      <RiArrowLeftRightLine className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Move {member} to…
                    </DropdownMenuLabel>
                    {targets.map((target) => (
                      <DropdownMenuItem
                        key={target.id}
                        onSelect={() => onMoveMember?.(group.id, memberIndex, target.id)}
                        className="cursor-pointer justify-between gap-2"
                      >
                        <span className="truncate">{target.label}</span>
                        <span className="text-xs text-muted-foreground">{target.members.length}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
