"use client";

import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedGrouping } from "@/lib/local-store";
import { RiDeleteBinLine, RiHistoryLine } from "@remixicon/react";

interface RecentGroupingsProps {
  items: SavedGrouping[];
  onRestore: (item: SavedGrouping) => void;
  onClear: () => void;
}

const summary = (item: SavedGrouping) => {
  const people = item.groups.reduce((sum, g) => sum + g.members.length, 0);
  return `${people} names in ${item.groups.length} group${item.groups.length === 1 ? "" : "s"}`;
};

export function RecentGroupings({ items, onRestore, onClear }: RecentGroupingsProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RiHistoryLine className="size-3.5" />
          Recent ({items.length})
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Saved on this device</DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => onRestore(item)}
            className="cursor-pointer flex-col items-start gap-0.5"
          >
            <span className="text-sm font-medium">{summary(item)}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onClear}
          className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <RiDeleteBinLine className="size-4" />
          Clear history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
