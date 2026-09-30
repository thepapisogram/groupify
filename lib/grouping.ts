/**
 * Grouping engine: pure, seedable and free of browser APIs, so the same code
 * runs on the main thread, in the Web Worker and in tests.
 */

export type DistributionMode = "best" | "overflow";
export type GroupBy = "size" | "count";
export type AttrValue = string | string[];

export interface Group {
  id: number;
  label: string;
  members: string[];
  rawMembers?: Record<string, AttrValue>[];
  /** Person keys, aligned with `members` (submission ids for forms). */
  originalIds?: (string | undefined)[];
  hue: number;
}

export interface Person {
  /** Identity used by rules and to map results back (submission id, or the normalised name). */
  key: string;
  label: string;
  /** Extra data: form answers, or `{ tag }` for the quick tool. `balanceBy` reads from here. */
  data?: Record<string, AttrValue>;
}

export type RuleType = "together" | "apart";

export interface Rule {
  id: string;
  type: RuleType;
  /** Person keys. */
  keys: string[];
}

export interface GroupingOptions {
  by: GroupBy;
  value: number;
  mode: DistributionMode;
  /** Same seed and input give the same groups. Omit for a fresh random result. */
  seed?: number | string;
  /** Each set lists person keys that must end up in the same group. */
  together?: string[][];
  /** Each set lists person keys that must all be in different groups. */
  apart?: string[][];
  /** A key in `Person.data`: spread its values as evenly as possible across groups. */
  balanceBy?: string;
}

export interface GroupingResult {
  groups: Group[];
  warnings: string[];
  seed: number;
}

export const HUES = [185, 200, 220, 260, 160, 340, 35, 280];

// ── randomness ────────────────────────────────────────────────────────────

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small, fast PRNG (mulberry32). Good enough for shuffling; not for security. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── sizes ─────────────────────────────────────────────────────────────────

/**
 * How many people go in each group. Larger groups come first.
 *
 *  - by "count": that many groups (never more than people), as even as possible.
 *  - by "size":  groups of that size; leftovers are spread over the existing
 *                groups ("best") or form one smaller group ("overflow").
 */
export function computeGroupSizes(
  n: number,
  by: GroupBy,
  value: number,
  mode: DistributionMode,
): number[] {
  if (n <= 0 || !(value >= 1)) return [];

  if (by === "count") {
    const count = Math.min(Math.floor(value), n);
    const base = Math.floor(n / count);
    const extra = n % count;
    return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
  }

  const size = Math.floor(value);
  const count = Math.floor(n / size);
  const extra = n % size;
  const sizes = Array.from({ length: count }, () => size);

  if (extra === 0) return sizes;
  if (mode === "best" && count > 0) {
    for (let j = 0; j < extra; j++) sizes[j % count] += 1;
    return sizes;
  }
  sizes.push(extra);
  return sizes;
}

// ── parsing ───────────────────────────────────────────────────────────────

export function personKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export const TAG_KEY = "tag";

/**
 * One person per non-empty line. Text after the last "|" is an optional tag
 * used for balancing, e.g. "Ama Mensah | Advanced".
 */
export function parseNames(raw: string): Person[] {
  const people: Person[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bar = trimmed.lastIndexOf("|");
    const label = (bar >= 0 ? trimmed.slice(0, bar) : trimmed).trim();
    const tag = bar >= 0 ? trimmed.slice(bar + 1).trim() : "";
    if (!label) continue;

    people.push({
      key: personKey(label),
      label,
      ...(tag ? { data: { [TAG_KEY]: tag } } : {}),
    });
  }
  return people;
}

/** Distinct tags present in the list, in order of first appearance. */
export function collectTags(people: Person[], attr: string = TAG_KEY): string[] {
  const seen = new Set<string>();
  for (const p of people) for (const v of attrValues(p, attr)) seen.add(v);
  return Array.from(seen);
}

function attrValues(person: Person, attr: string): string[] {
  const raw = person.data?.[attr];
  if (raw === undefined || raw === null) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((v) => String(v).trim()).filter(Boolean);
}

// ── constraint solving ────────────────────────────────────────────────────

const APART_WEIGHT = 1000;
const BALANCE_WEIGHT = 10;

interface SolveInput {
  n: number;
  sizes: number[];
  together: number[][];
  apart: number[][];
  values: string[][];
  rand: () => number;
}

interface Solution {
  groups: number[][];
  cost: number;
  contradictions: [number, number][];
}

function solveOnce({ n, sizes, together, apart, values, rand }: SolveInput): Solution {
  const groupCount = sizes.length;

  // Union-find merges keep-together sets into indivisible units.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const set of together) {
    for (let i = 1; i < set.length; i++) {
      const a = find(set[0]);
      const b = find(set[i]);
      if (a !== b) parent[b] = a;
    }
  }
  const unitMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = unitMap.get(root);
    if (list) list.push(i);
    else unitMap.set(root, [i]);
  }
  const units = Array.from(unitMap.values());

  // Apart pairs; a pair inside one unit can never be satisfied.
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const contradictions: [number, number][] = [];
  for (const set of apart) {
    for (let i = 0; i < set.length; i++) {
      for (let j = i + 1; j < set.length; j++) {
        const a = set[i];
        const b = set[j];
        if (a === b) continue;
        if (find(a) === find(b)) contradictions.push([a, b]);
        else {
          adj[a].add(b);
          adj[b].add(a);
        }
      }
    }
  }

  // Ideal count of each balance value per group, proportional to group size.
  const totals = new Map<string, number>();
  values.forEach((vs) => vs.forEach((v) => totals.set(v, (totals.get(v) ?? 0) + 1)));
  const expected = (g: number, v: string) => ((totals.get(v) ?? 0) * sizes[g]) / n;
  const balancing = totals.size > 0;

  const groupCost = (g: number, members: number[]): number => {
    let cost = 0;
    const inGroup = new Set(members);
    let violations = 0;
    for (const x of members) for (const y of adj[x]) if (inGroup.has(y)) violations++;
    cost += (violations / 2) * APART_WEIGHT;

    if (balancing) {
      const counts = new Map<string, number>();
      for (const x of members) for (const v of values[x]) counts.set(v, (counts.get(v) ?? 0) + 1);
      for (const v of totals.keys()) {
        const diff = (counts.get(v) ?? 0) - expected(g, v);
        cost += diff * diff * BALANCE_WEIGHT;
      }
    }
    return cost;
  };

  // Greedy placement: biggest units first, into the cheapest group with room.
  const assigned: number[][] = Array.from({ length: groupCount }, () => []);
  const groupUnits: number[][][] = Array.from({ length: groupCount }, () => []);
  const order = shuffle(units, rand).sort((a, b) => b.length - a.length);

  for (const unit of order) {
    let candidates: number[] = [];
    for (let g = 0; g < groupCount; g++) {
      if (sizes[g] - assigned[g].length >= unit.length) candidates.push(g);
    }
    if (candidates.length === 0) {
      // No group has room for this whole unit: use the emptiest one(s).
      let bestRoom = -Infinity;
      for (let g = 0; g < groupCount; g++) {
        const room = sizes[g] - assigned[g].length;
        if (room > bestRoom) {
          bestRoom = room;
          candidates = [g];
        } else if (room === bestRoom) candidates.push(g);
      }
    }

    let bestGroup = candidates[0];
    let bestDelta = Infinity;
    for (const g of candidates) {
      const delta = groupCost(g, [...assigned[g], ...unit]) - groupCost(g, assigned[g]) + rand() * 0.01;
      if (delta < bestDelta) {
        bestDelta = delta;
        bestGroup = g;
      }
    }
    assigned[bestGroup].push(...unit);
    groupUnits[bestGroup].push(unit);
  }

  // Local search: swap equally-sized units between groups while it lowers the cost.
  const costs = assigned.map((members, g) => groupCost(g, members));
  const iterations = groupCount > 1 ? Math.min(6000, 60 * n) : 0;
  for (let it = 0; it < iterations; it++) {
    const a = Math.floor(rand() * groupCount);
    let b = Math.floor(rand() * (groupCount - 1));
    if (b >= a) b++;
    if (groupUnits[a].length === 0 || groupUnits[b].length === 0) continue;

    const ia = Math.floor(rand() * groupUnits[a].length);
    const ib = Math.floor(rand() * groupUnits[b].length);
    const ua = groupUnits[a][ia];
    const ub = groupUnits[b][ib];
    if (ua.length !== ub.length) continue;

    const inA = new Set(ua);
    const inB = new Set(ub);
    const nextA = assigned[a].filter((x) => !inA.has(x)).concat(ub);
    const nextB = assigned[b].filter((x) => !inB.has(x)).concat(ua);
    const costA = groupCost(a, nextA);
    const costB = groupCost(b, nextB);

    if (costA + costB < costs[a] + costs[b] - 1e-9) {
      assigned[a] = nextA;
      assigned[b] = nextB;
      groupUnits[a][ia] = ub;
      groupUnits[b][ib] = ua;
      costs[a] = costA;
      costs[b] = costB;
    }
  }

  return {
    groups: assigned,
    cost: costs.reduce((sum, c) => sum + c, 0),
    contradictions,
  };
}

// ── public API ────────────────────────────────────────────────────────────

const MAX_LISTED = 3;

function listPairs(pairs: [number, number][], people: Person[]): string {
  const shown = pairs
    .slice(0, MAX_LISTED)
    .map(([a, b]) => `${people[a].label} and ${people[b].label}`)
    .join("; ");
  const more = pairs.length - MAX_LISTED;
  return more > 0 ? `${shown}; and ${more} more` : shown;
}

export function groupPeople(people: Person[], options: GroupingOptions): GroupingResult {
  const n = people.length;
  const seed =
    options.seed === undefined
      ? Math.floor(Math.random() * 4294967296) >>> 0
      : typeof options.seed === "number"
        ? options.seed >>> 0
        : hashSeed(options.seed);
  const rand = mulberry32(seed);

  const sizes = computeGroupSizes(n, options.by, options.value, options.mode);
  if (sizes.length === 0) return { groups: [], warnings: [], seed };

  const keyToIndexes = new Map<string, number[]>();
  people.forEach((p, i) => {
    const list = keyToIndexes.get(p.key);
    if (list) list.push(i);
    else keyToIndexes.set(p.key, [i]);
  });
  const resolve = (sets: string[][] | undefined): number[][] =>
    (sets ?? [])
      .map((set) => Array.from(new Set(set.flatMap((key) => keyToIndexes.get(key) ?? []))))
      .filter((set) => set.length >= 2);

  const together = resolve(options.together);
  const apart = resolve(options.apart);
  const values = people.map((p) => (options.balanceBy ? attrValues(p, options.balanceBy) : []));
  const needsSolver = together.length > 0 || apart.length > 0 || values.some((v) => v.length > 0);

  const warnings: string[] = [];
  let assignment: number[][];

  if (!needsSolver) {
    const order = shuffle(
      people.map((_, i) => i),
      rand,
    );
    let cursor = 0;
    assignment = sizes.map((size) => {
      const slice = order.slice(cursor, cursor + size);
      cursor += size;
      return slice;
    });
  } else {
    const restarts = n <= 400 ? 5 : 1;
    let best: Solution | null = null;
    for (let r = 0; r < restarts; r++) {
      const solution = solveOnce({ n, sizes, together, apart, values, rand });
      if (!best || solution.cost < best.cost) best = solution;
      if (best.cost === 0) break;
    }
    assignment = best!.groups.map((members) => shuffle(members, rand));

    if (best!.contradictions.length > 0) {
      warnings.push(
        `Can't both keep together and apart: ${listPairs(best!.contradictions, people)}.`,
      );
    }

    const violated: [number, number][] = [];
    const groupOf = new Map<number, number>();
    assignment.forEach((members, g) => members.forEach((m) => groupOf.set(m, g)));
    const seen = new Set<string>();
    for (const set of apart) {
      for (let i = 0; i < set.length; i++) {
        for (let j = i + 1; j < set.length; j++) {
          const id = `${Math.min(set[i], set[j])}-${Math.max(set[i], set[j])}`;
          if (seen.has(id)) continue;
          seen.add(id);
          if (groupOf.get(set[i]) === groupOf.get(set[j])) violated.push([set[i], set[j]]);
        }
      }
    }
    // Contradictory pairs already have their own warning.
    const contradictionIds = new Set(
      best!.contradictions.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`),
    );
    const unmet = violated.filter(([a, b]) => !contradictionIds.has(`${Math.min(a, b)}-${Math.max(a, b)}`));
    if (unmet.length > 0) {
      warnings.push(`Couldn't keep apart: ${listPairs(unmet, people)}. Try fewer rules or more groups.`);
    }

    const actual = assignment.map((g) => g.length).sort((a, b) => b - a);
    const target = [...sizes].sort((a, b) => b - a);
    if (actual.some((size, i) => size !== target[i])) {
      warnings.push("Some keep-together rules don't fit the group size, so group sizes vary.");
    }
  }

  const groups: Group[] = assignment.map((members, index) => ({
    id: index + 1,
    label: `Group ${index + 1}`,
    members: members.map((i) => people[i].label),
    rawMembers: members.map((i) => people[i].data ?? {}),
    originalIds: members.map((i) => people[i].key),
    hue: HUES[index % HUES.length],
  }));

  return { groups, warnings, seed };
}

// ── editing helpers (pure, so the UI and tests share them) ─────────────────

export function renameGroup(groups: Group[], groupId: number, label: string): Group[] {
  const clean = label.trim();
  if (!clean) return groups;
  return groups.map((g) => (g.id === groupId ? { ...g, label: clean.slice(0, 60) } : g));
}

/** Move one member (with its aligned raw data and key) to another group. */
export function moveMember(
  groups: Group[],
  fromGroupId: number,
  memberIndex: number,
  toGroupId: number,
): Group[] {
  if (fromGroupId === toGroupId) return groups;
  const from = groups.find((g) => g.id === fromGroupId);
  const to = groups.find((g) => g.id === toGroupId);
  if (!from || !to || memberIndex < 0 || memberIndex >= from.members.length) return groups;

  const pick = <T,>(list: T[] | undefined): T | undefined => list?.[memberIndex];
  const without = <T,>(list: T[] | undefined): T[] | undefined =>
    list?.filter((_, i) => i !== memberIndex);
  const withItem = <T,>(list: T[] | undefined, item: T | undefined): T[] | undefined =>
    list && item !== undefined ? [...list, item] : list;

  const label = from.members[memberIndex];
  const raw = pick(from.rawMembers);
  const key = from.originalIds ? from.originalIds[memberIndex] : undefined;

  return groups.map((g) => {
    if (g.id === fromGroupId) {
      return {
        ...g,
        members: g.members.filter((_, i) => i !== memberIndex),
        rawMembers: without(g.rawMembers),
        originalIds: without(g.originalIds),
      };
    }
    if (g.id === toGroupId) {
      return {
        ...g,
        members: [...g.members, label],
        rawMembers: withItem(g.rawMembers, raw),
        originalIds: g.originalIds ? [...g.originalIds, key] : g.originalIds,
      };
    }
    return g;
  });
}
