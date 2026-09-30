"use client";

import { useMemo, useState } from "react";
import { GroupCard } from "@/components/groupify/group-card";
import type { Group } from "@/components/groupify/types";
import { HUES } from "@/lib/grouping";
import { RiSearchLine } from "@remixicon/react";

interface PublishedGroupsProps {
  groups: { label: string; members: string[] }[];
}

/** Read-only groups with a "find my name" filter, for respondents. */
export function PublishedGroups({ groups }: PublishedGroupsProps) {
  const [query, setQuery] = useState("");

  const all = useMemo<Group[]>(
    () =>
      groups.map((g, i) => ({
        id: i + 1,
        label: g.label,
        members: g.members,
        hue: HUES[i % HUES.length],
      })),
    [groups],
  );

  const q = query.trim().toLowerCase();
  const visible = q
    ? all.filter((g) => g.members.some((m) => m.toLowerCase().includes(q)))
    : all;

  return (
    <div className="space-y-5">
      <div className="relative mx-auto max-w-md">
        <RiSearchLine className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your name"
          aria-label="Find your name"
          className="w-full rounded-xl border border-border/50 bg-card/70 py-3 pl-10 pr-4 text-sm text-foreground shadow-sm backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground" aria-live="polite">
        {q
          ? visible.length > 0
            ? `Showing ${visible.length} of ${all.length} groups`
            : "No one with that name is in the groups."
          : `${all.length} groups`}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((group) => (
          <GroupCard key={group.id} group={group} index={group.id - 1} />
        ))}
      </div>
    </div>
  );
}
