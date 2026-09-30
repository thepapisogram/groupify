"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { RiAddCircleLine, RiSearchLine, RiSettings4Line, RiTeamLine } from "@remixicon/react";
import { FormCardActions } from "./form-card-actions";

interface FormItem {
  _id: string;
  title: string;
  userId?: string;
  createdAt?: string | Date;
  isClosed?: boolean;
  hasPublishedGroups?: boolean;
}

interface FormsListProps {
  initialForms: FormItem[];
  submissionCounts: Record<string, number>;
  userId: string;
}

type Filter = "all" | "owned" | "shared";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All Forms" },
  { value: "owned", label: "Owned by me" },
  { value: "shared", label: "Shared with me" },
];

export function FormsList({ initialForms, submissionCounts, userId }: FormsListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredForms = initialForms.filter((form) => {
    if (filter === "owned" && form.userId !== userId) return false;
    if (filter === "shared" && form.userId === userId) return false;
    return !q || form.title.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter forms" className="flex gap-2 overflow-x-auto">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                filter === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {initialForms.length > 3 && (
          <div className="relative sm:w-64">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search forms"
              aria-label="Search forms"
              className="w-full rounded-xl border border-border/50 bg-muted/20 py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        )}
      </div>

      {filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/40 p-12 text-center backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <RiSettings4Line className="size-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            No forms found
          </h3>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            {filter === "shared" 
              ? "You haven't been invited to collaborate on any forms yet."
              : "Create a custom form to start collecting responses and organizing groups effortlessly."}
          </p>
          {filter !== "shared" && (
            <Link
              href="/forms/new"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <RiAddCircleLine className="size-5" />
              Create your first form
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => {
            const formIdStr = String(form._id);
            const subCount = submissionCounts[formIdStr] || 0;
            const isShared = form.userId !== userId;

            return (
              <div
                key={formIdStr}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 min-h-[11rem]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3
                      className="font-semibold text-lg text-foreground line-clamp-2"
                      title={form.title}
                    >
                      {form.title}
                    </h3>
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      {isShared && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground">
                          <RiTeamLine className="size-3" />
                          Shared
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          form.isClosed
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {form.isClosed ? "Closed" : "Open"}
                      </span>
                      {form.hasPublishedGroups && (
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Groups published
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div
                      className="flex items-center gap-1.5"
                      title="Total submissions"
                    >
                      <RiTeamLine className="size-4" />
                      <span>
                        {subCount} response{subCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {form.createdAt && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span>
                          {format(new Date(form.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <FormCardActions formId={formIdStr} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
