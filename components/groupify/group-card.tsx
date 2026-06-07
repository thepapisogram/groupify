import type { Group } from "@/components/groupify/types";
import { RiTeamLine } from "@remixicon/react";

interface GroupCardProps {
  group: Group;
  index: number;
}

/**
 * Color palette — 8 slots mapped 1-to-1 to the HUES array in utils.ts.
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

export function GroupCard({ group, index }: GroupCardProps) {
  const palette = CARD_PALETTE[index % CARD_PALETTE.length];

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border ${palette.border} ${palette.cardBg} backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 animate-slide-up`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={`flex items-center justify-between border-b ${palette.border} ${palette.headerBg} px-4 py-2.5 transition-colors`}>
        <div className="flex items-center gap-2">
          <div className={`flex size-6 items-center justify-center rounded-full shadow-sm ${palette.itemBg}`}>
            <RiTeamLine className="size-4 text-emerald-500" />
          </div>
          <span className="font-syne text-sm font-bold tracking-wide text-foreground">
            {group.label}
          </span>
        </div>
        <span
          className={`flex h-5 items-center rounded-full px-2 text-xs font-bold tracking-widest shadow-sm ${palette.badgeBg} text-white`}
        >
          {group.members.length}
        </span>
      </div>

      <div className="p-2">
        <ul className="space-y-0.5">
          {group.members.map((member, memberIndex) => (
            <li
              key={`${member}-${memberIndex}`}
              className="group/item flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-muted/40 animate-slide-up"
              style={{ animationDelay: `${index * 0.05 + memberIndex * 0.03}s` }}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors group-hover/item:text-foreground ${palette.itemBg} ${palette.numberColor}`}
              >
                {memberIndex + 1}
              </span>
              <span className="text-sm font-medium text-foreground/80 transition-colors group-hover/item:text-foreground">
                {member}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
