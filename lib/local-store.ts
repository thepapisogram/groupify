import type { DistributionMode, Group, GroupBy, Rule } from "@/lib/grouping";

const DRAFT_KEY = "groupify:draft:v1";
const RECENT_KEY = "groupify:recent:v1";

export const RECENT_LIMIT = 8;
const MAX_NAMES_CHARS = 200_000;
const MAX_RULES = 50;
const MAX_RULE_KEYS = 500;
const MAX_GROUPS = 200;
const MAX_MEMBERS = 5000;

export interface Draft {
  names: string;
  by: GroupBy;
  size: number;
  count: number;
  mode: DistributionMode;
  rules: Rule[];
  balanceBy: string | null;
}

export interface SavedGrouping {
  id: string;
  createdAt: number;
  names: string;
  groups: Group[];
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
  };
}

function parseGroup(value: unknown): Group | null {
  if (!isObject(value) || !Array.isArray(value.members)) return null;
  if (typeof value.id !== "number" || typeof value.label !== "string") return null;
  const members = value.members.filter((m): m is string => typeof m === "string").slice(0, MAX_MEMBERS);
  return {
    id: value.id,
    label: value.label.slice(0, 60),
    members,
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
export const saveDraft = (draft: Draft): void => write(DRAFT_KEY, JSON.stringify(draft));
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
