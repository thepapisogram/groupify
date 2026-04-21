import type { Group } from "@/components/groupify/types";

interface GroupCardProps {
  group: Group;
  index: number;
}

export function GroupCard({ group, index }: GroupCardProps) {
  const hsl = `hsl(${group.hue} 75% 48%)`;
  const hslBg = `hsl(${group.hue} 75% 48% / 0.08)`;
  const hslBorder = `hsl(${group.hue} 75% 48% / 0.25)`;

  return (
    <div
      className="group-card rounded-2xl border bg-card/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg animate-slide-up"
      style={{
        color: hsl,
        borderColor: hslBorder,
        backgroundColor: hslBg,
        animationDelay: `${index * 0.055}s`,
      }}
    >
      <div className="mb-4 flex items-center justify-between pl-4">
        <span className="font-syne text-sm font-bold tracking-wide" style={{ color: hsl }}>
          {group.label}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{
            background: hslBg,
            color: hsl,
            border: `1px solid ${hslBorder}`,
          }}
        >
          {group.members.length}
        </span>
      </div>

      <ul className="space-y-1.5 pl-4">
        {group.members.map((member, memberIndex) => (
          <li
            key={`${member}-${memberIndex}`}
            className="flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${index * 0.055 + memberIndex * 0.04}s` }}
          >
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: hslBg,
                color: hsl,
                border: `1px solid ${hslBorder}`,
              }}
            >
              {memberIndex + 1}
            </span>
            <span className="text-sm text-foreground/90">{member}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
