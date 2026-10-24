import type { AttrValue, DistributionMode, Group, GroupBy, Rule } from "@/lib/grouping";
import type { ExportColumn } from "@/lib/group-export";
import { MAX_COLUMNS, MAX_ROWS, type FileSource, type Row } from "@/lib/spreadsheet";

const DRAFT_KEY = "groupify:draft:v1";
const RECENT_KEY = "groupify:recent:v1";

export const RECENT_LIMIT = 8;
const MAX_NAMES_CHARS = 200_000;
const MAX_RULES = 50;
const MAX_RULE_KEYS = 500;
const MAX_GROUPS = 200;
const MAX_MEMBERS = 5000;
const MAX_CELL_CHARS = 2000;
/** Above this the uploaded file is left out of the draft rather than risk filling storage. */
export const MAX_DRAFT_CHARS = 2_000_000;

export interface Draft {
  names: string;
  by: GroupBy;
  size: number;
  count: number;
  mode: DistributionMode;
  rules: Rule[];
  balanceBy: string | null;
  /** Which input the user was using. */
  source?: "paste" | "file";
  /** The uploaded spreadsheet, when it was small enough to keep. */
  file?: FileSource | null;
}

export interface SavedGrouping {
  id: string;
  createdAt: number;
  names: string;
  groups: Group[];
  /** Set for groupings made from a file: the columns to show and download, and the file's name. */
  columns?: ExportColumn[];
  /** Which of those columns make up the name, so the cards don't repeat it. */
  nameColumns?: string[];
  title?: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const clampInt = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseRules(value: unknown): Rule[] {
  if (!Array.isArray(value)) return [];
  const rules: Rule[] = [];
  for (const item of value.slice(0, MAX_RULES)) {
    if (!isObject(item)) continue;
    if (item.type !== "together" && item.type !== "apart") continue;
    if (typeof item.id !== "string" || !Array.isArray(item.keys)) continue;
    const keys = item.keys.filter((k): k is string => typeof k === "string").slice(0, MAX_RULE_KEYS);
    if (keys.length >= 2) rules.push({ id: item.id, type: item.type, keys });
  }
  return rules;
}

const strings = (value: unknown, max: number): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, max) : [];

const cell = (value: unknown): string => (typeof value === "string" ? value.slice(0, MAX_CELL_CHARS) : "");

export function parseFileSource(value: unknown): FileSource | null {
  if (!isObject(value) || typeof value.fileName !== "string" || !Array.isArray(value.rows)) return null;
  const columns = Array.from(new Set(strings(value.columns, MAX_COLUMNS)));
  if (columns.length === 0) return null;
  const known = new Set(columns);
  const rows: Row[] = [];
  for (const item of value.rows.slice(0, MAX_ROWS)) {
    if (!isObject(item)) continue;
    const row: Row = {};
    for (const column of columns) row[column] = cell(item[column]);
    rows.push(row);
  }
  if (rows.length === 0) return null;
  const nameColumns = strings(value.nameColumns, MAX_COLUMNS).filter((c) => known.has(c));
  const outputColumns = strings(value.outputColumns, MAX_COLUMNS).filter((c) => known.has(c));
  return {
    fileName: value.fileName.slice(0, 200),
    sheetName: typeof value.sheetName === "string" ? value.sheetName.slice(0, 100) : "",
    columns,
    rows,
    nameColumns: nameColumns.length > 0 ? nameColumns : [columns[0]],
    outputColumns: outputColumns.length > 0 ? outputColumns : columns,
  };
}

/** Turn whatever is in storage into a safe Draft, or null if it isn't usable. */
export function parseDraft(raw: string | null): Draft | null {
  const value = parseJson(raw);
  if (!isObject(value) || typeof value.names !== "string") return null;
  return {
    names: value.names.slice(0, MAX_NAMES_CHARS),
    by: value.by === "count" ? "count" : "size",
    size: clampInt(value.size, 2, 99, 4),
    count: clampInt(value.count, 1, 99, 2),
    mode: value.mode === "overflow" ? "overflow" : "best",
    rules: parseRules(value.rules),
    balanceBy: typeof value.balanceBy === "string" ? value.balanceBy : null,
    source: value.source === "file" ? "file" : "paste",
    file: parseFileSource(value.file),
  };
}

function parseRaw(value: unknown): Record<string, AttrValue> {
  const out: Record<string, AttrValue> = {};
  if (!isObject(value)) return out;
  for (const [key, v] of Object.entries(value).slice(0, MAX_COLUMNS)) {
    if (typeof v === "string") out[key] = v.slice(0, MAX_CELL_CHARS);
    else if (Array.isArray(v)) out[key] = strings(v, 50).map((x) => x.slice(0, MAX_CELL_CHARS));
  }
  return out;
}

function parseColumns(value: unknown): ExportColumn[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const columns = value
    .filter((c): c is ExportColumn => isObject(c) && typeof c.key === "string" && typeof c.label === "string")
    .slice(0, MAX_COLUMNS)
    .map((c) => ({ key: c.key, label: c.label.slice(0, 200) }));
  return columns.length > 0 ? columns : undefined;
}

function parseGroup(value: unknown): Group | null {
  if (!isObject(value) || !Array.isArray(value.members)) return null;
  if (typeof value.id !== "number" || typeof value.label !== "string") return null;
  const members = value.members.filter((m): m is string => typeof m === "string").slice(0, MAX_MEMBERS);
  // Row data is kept only when it lines up with the members, so columns never shift onto the wrong person.
  const raw =
    Array.isArray(value.rawMembers) && value.rawMembers.length === members.length
      ? value.rawMembers.map(parseRaw)
      : undefined;
  return {
    id: value.id,
    label: value.label.slice(0, 60),
    members,
    ...(raw ? { rawMembers: raw } : {}),
    hue: typeof value.hue === "number" ? value.hue : 185,
  };
}

export function parseRecent(raw: string | null): SavedGrouping[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  const out: SavedGrouping[] = [];
  for (const item of value.slice(0, RECENT_LIMIT)) {
    if (!isObject(item) || typeof item.id !== "string" || typeof item.createdAt !== "number") continue;
    if (typeof item.names !== "string" || !Array.isArray(item.groups)) continue;
    const groups = item.groups.slice(0, MAX_GROUPS).map(parseGroup);
    if (groups.some((g) => g === null) || groups.length === 0) continue;
    out.push({
      id: item.id,
      createdAt: item.createdAt,
      names: item.names.slice(0, MAX_NAMES_CHARS),
      groups: groups as Group[],
      ...(parseColumns(item.columns) ? { columns: parseColumns(item.columns) } : {}),
      ...(Array.isArray(item.nameColumns) ? { nameColumns: strings(item.nameColumns, MAX_COLUMNS) } : {}),
      ...(typeof item.title === "string" ? { title: item.title.slice(0, 200) } : {}),
    });
  }
  return out;
}

// Storage can be missing, full or blocked (private mode), so every access is guarded.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / privacy-mode failures: persistence is a convenience */
  }
}

export const loadDraft = (): Draft | null => parseDraft(read(DRAFT_KEY));
/** Saves the draft. Returns false when the uploaded file was too big to keep and was left out. */
export function saveDraft(draft: Draft): boolean {
  const full = JSON.stringify(draft);
  if (full.length <= MAX_DRAFT_CHARS || !draft.file) {
    write(DRAFT_KEY, full);
    return true;
  }
  write(DRAFT_KEY, JSON.stringify({ ...draft, file: null }));
  return false;
}
export const clearDraft = (): void => write(DRAFT_KEY, null);

export const loadRecent = (): SavedGrouping[] => parseRecent(read(RECENT_KEY));

/** Newest first, de-duplicated by identical names + groups, capped at RECENT_LIMIT. */
export function addRecent(entry: SavedGrouping, existing: SavedGrouping[]): SavedGrouping[] {
  const fingerprint = (e: SavedGrouping) => JSON.stringify(e.groups.map((g) => [g.label, g.members]));
  const next = [entry, ...existing.filter((e) => fingerprint(e) !== fingerprint(entry))].slice(0, RECENT_LIMIT);
  return next;
}

export const saveRecent = (list: SavedGrouping[]): void =>
  write(RECENT_KEY, list.length ? JSON.stringify(list) : null);
