import type { Group } from "@/components/groupify/types";
import { RiTeamLine } from "@remixicon/react";

interface GroupCardProps {
  group: Group;
  index: number;
}

export function GroupCard({ group, index }: GroupCardProps) {
  const hsl = `hsl(${group.hue} 85% 60%)`;
  const hslDark = `hsl(${group.hue} 80% 35%)`; // Darker variant for dark mode
  const hslBg = `hsl(${group.hue} 75% 48% / 0.04)`;
  const hslHeaderBg = `hsl(${group.hue} 75% 48% / 0.1)`;
  const hslBorder = `hsl(${group.hue} 75% 48% / 0.15)`;
  const hslHoverBorder = `hsl(${group.hue} 75% 48% / 0.3)`;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 animate-slide-up"
      style={{
        borderColor: hslBorder,
        backgroundColor: hslBg,
        animationDelay: `${index * 0.05}s`,
        // @ts-expect-error Types mismatch from API response
        "--hover-border": hslHoverBorder,
        "--badge-bg-light": hsl,
        "--badge-bg-dark": hslDark,
        "--item-bg-light": `hsl(${group.hue} 20% 50% / 0.1)`,
        "--item-bg-dark": `hsl(${group.hue} 20% 30% / 0.25)`,
      }}
    >
      <div 
        className="flex items-center justify-between border-b px-4 py-2.5 transition-colors"
        style={{ backgroundColor: hslHeaderBg, borderColor: hslBorder }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="flex size-6 items-center justify-center rounded-full shadow-sm bg-[var(--item-bg-light)] dark:bg-[var(--item-bg-dark)]"
            style={{ color: hsl }}
          >
            <RiTeamLine className="size-4 text-emerald-500" />
          </div>
          <span className="font-syne text-[13px] font-bold tracking-wide text-foreground">
            {group.label}
          </span>
        </div>
        <span
          className="flex h-5 items-center rounded-full px-2 text-[10px] font-bold tracking-widest shadow-sm bg-[var(--badge-bg-light)] dark:bg-[var(--badge-bg-dark)] text-white dark:text-white/90"
        >
          {group.members.length}
        </span>
      </div>

      <div className="p-2">
        <ul className="space-y-0.5">
          {group.members.map((member, memberIndex) => (
            <li
              key={`${member}-${memberIndex}`}
              className="group/item flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/40 animate-slide-up"
              style={{ animationDelay: `${index * 0.05 + memberIndex * 0.03}s` }}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-muted-foreground transition-colors group-hover/item:text-foreground bg-[var(--item-bg-light)] dark:bg-[var(--item-bg-dark)]"
              >
                {memberIndex + 1}
              </span>
              <span className="text-[13px] font-medium text-foreground/80 transition-colors group-hover/item:text-foreground">
                {member}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
