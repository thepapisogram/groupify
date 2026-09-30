import type { FormField, SubmissionData } from "@/lib/models";

export interface ResponseRow {
  _id: string;
  submittedAt: string;
  data: SubmissionData;
}

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection } | null;

/** Sort key for the submission time column. */
export const TIME_KEY = "__time";

export function displayValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

/** Clicking a header cycles ascending, descending, then back to the default (newest first). */
export function nextSort(current: SortState, key: string): SortState {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareValues(field: FormField | undefined, a: string, b: string): number {
  if (field?.type === "number") {
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  }
  return collator.compare(a, b);
}

/**
 * Filter responses by a search term (matched against every field) and sort them.
 * Blank values always sort last, in either direction. Never mutates its input.
 */
export function filterAndSort(
  rows: ResponseRow[],
  fields: FormField[],
  query: string,
  sort: SortState,
): ResponseRow[] {
  const q = query.trim().toLowerCase();
  const matching = q
    ? rows.filter((row) => fields.some((f) => displayValue(row.data[f.id]).toLowerCase().includes(q)))
    : [...rows];

  if (!sort) {
    return matching.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  }

  const dir = sort.direction === "desc" ? -1 : 1;

  if (sort.key === TIME_KEY) {
    return matching.sort((a, b) => (Date.parse(a.submittedAt) - Date.parse(b.submittedAt)) * dir);
  }

  const field = fields.find((f) => f.id === sort.key);
  return matching.sort((a, b) => {
    const av = displayValue(a.data[sort.key]);
    const bv = displayValue(b.data[sort.key]);
    if (av === "" && bv === "") return 0;
    if (av === "") return 1;
    if (bv === "") return -1;
    return compareValues(field, av, bv) * dir;
  });
}
