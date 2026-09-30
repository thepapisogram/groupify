"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RiArrowDownSLine, RiArrowUpSLine, RiDeleteBinLine, RiSearchLine } from "@remixicon/react";
import type { FormField } from "@/lib/models";
import {
  TIME_KEY,
  displayValue,
  filterAndSort,
  nextSort,
  type ResponseRow,
  type SortState,
} from "@/lib/responses";

interface ResponsesTableProps {
  fields: FormField[];
  submissions: ResponseRow[];
  onDelete: (submissionId: string) => void;
}

const SEARCH_THRESHOLD = 5;

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  right,
  badge,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  right?: boolean;
  badge?: string;
}) {
  const direction = sort && sort.key === sortKey ? sort.direction : null;
  return (
    <th
      scope="col"
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}
      className={`px-4 py-3 font-medium whitespace-nowrap ${right ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded uppercase transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          direction ? "text-foreground" : ""
        }`}
      >
        {label}
        {badge && <span className="ml-1 text-xs normal-case text-primary">({badge})</span>}
        {direction === "asc" && <RiArrowUpSLine className="size-4 text-primary" aria-hidden="true" />}
        {direction === "desc" && <RiArrowDownSLine className="size-4 text-primary" aria-hidden="true" />}
        <span className="sr-only">
          {direction ? `, sorted ${direction === "asc" ? "ascending" : "descending"}. Activate to change` : ", activate to sort"}
        </span>
      </button>
    </th>
  );
}

export function ResponsesTable({ fields, submissions, onDelete }: ResponsesTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);

  const primary = fields.find((f) => f.isPrimary) ?? fields[0];
  const rows = useMemo(() => filterAndSort(submissions, fields, query, sort), [submissions, fields, query, sort]);
  const searching = query.trim() !== "";

  return (
    <div className="space-y-3">
      {submissions.length > SEARCH_THRESHOLD && (
        <div className="relative max-w-sm">
          <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search responses"
            aria-label="Search responses"
            className="w-full rounded-xl border border-border/50 bg-muted/20 py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {searching ? `Showing ${rows.length} of ${submissions.length} responses` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No responses match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        // `relative` matters: the screen-reader-only spans inside are absolutely positioned and
        // would otherwise escape this scroller and widen the whole page on narrow screens.
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">
              Responses{searching ? ` matching ${query.trim()}` : ""}. {rows.length} of {submissions.length} shown.
            </caption>
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
              <tr>
                {fields.map((f) => (
                  <SortHeader
                    key={f.id}
                    label={f.label}
                    sortKey={f.id}
                    sort={sort}
                    onSort={(key) => setSort((s) => nextSort(s, key))}
                    badge={f.isPrimary ? "Primary" : undefined}
                  />
                ))}
                <SortHeader
                  label="Time"
                  sortKey={TIME_KEY}
                  sort={sort}
                  onSort={(key) => setSort((s) => nextSort(s, key))}
                  right
                />
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sub) => {
                const who = primary ? displayValue(sub.data[primary.id]) : "";
                return (
                  <tr
                    key={sub._id}
                    className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors"
                  >
                    {fields.map((f) => (
                      <td key={f.id} className="px-4 py-3 text-foreground whitespace-nowrap">
                        {displayValue(sub.data[f.id]) || "-"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-muted-foreground text-right whitespace-nowrap">
                      <time
                        dateTime={new Date(sub.submittedAt).toISOString()}
                        title={new Date(sub.submittedAt).toLocaleString()}
                      >
                        {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(sub._id)}
                        aria-label={`Delete response from ${who || "this respondent"}`}
                        title="Delete response"
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <RiDeleteBinLine className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
