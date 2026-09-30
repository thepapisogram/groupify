import { describe, expect, it } from "vitest";
import { RECENT_LIMIT, addRecent, parseDraft, parseRecent, type SavedGrouping } from "@/lib/local-store";

const group = (id: number, members: string[]) => ({ id, label: `Group ${id}`, members, hue: 185 });
const saved = (id: string, members: string[] = ["a", "b"]): SavedGrouping => ({
  id,
  createdAt: 1,
  names: members.join("\n"),
  groups: [group(1, members)],
});

describe("parseDraft", () => {
  it("returns null for missing, malformed or wrongly-shaped data", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("")).toBeNull();
    expect(parseDraft("{oops")).toBeNull();
    expect(parseDraft("[]")).toBeNull();
    expect(parseDraft('"text"')).toBeNull();
    expect(parseDraft(JSON.stringify({ size: 3 }))).toBeNull();
  });

  it("fills sensible defaults for missing fields", () => {
    expect(parseDraft(JSON.stringify({ names: "Ama" }))).toEqual({
      names: "Ama",
      by: "size",
      size: 4,
      count: 2,
      mode: "best",
      rules: [],
      balanceBy: null,
    });
  });

  it("clamps out-of-range numbers and rejects unknown enum values", () => {
    const d = parseDraft(
      JSON.stringify({ names: "x", size: 5000, count: -3, by: "weird", mode: "nope", balanceBy: 7 }),
    )!;
    expect(d).toMatchObject({ size: 99, count: 1, by: "size", mode: "best", balanceBy: null });
  });

  it("keeps valid rules and drops broken ones", () => {
    const d = parseDraft(
      JSON.stringify({
        names: "x",
        rules: [
          { id: "1", type: "together", keys: ["a", "b"] },
          { id: "2", type: "apart", keys: ["a"] }, // too few
          { id: "3", type: "sideways", keys: ["a", "b"] }, // bad type
          { id: 4, type: "apart", keys: ["a", "b"] }, // bad id
          "junk",
          { id: "5", type: "apart", keys: ["a", 7, "b"] }, // non-string filtered
        ],
      }),
    )!;
    expect(d.rules).toEqual([
      { id: "1", type: "together", keys: ["a", "b"] },
      { id: "5", type: "apart", keys: ["a", "b"] },
    ]);
  });

  it("round-trips its own output", () => {
    const draft = {
      names: "Ama\nKofi",
      by: "count" as const,
      size: 3,
      count: 5,
      mode: "overflow" as const,
      rules: [{ id: "r", type: "apart" as const, keys: ["ama", "kofi"] }],
      balanceBy: "tag",
    };
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });
});

describe("parseRecent", () => {
  it("returns an empty list for garbage", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("nope")).toEqual([]);
    expect(parseRecent("{}")).toEqual([]);
  });

  it("keeps well-formed entries and skips corrupt ones", () => {
    const good = saved("ok");
    const list = parseRecent(
      JSON.stringify([good, { id: "bad" }, { ...good, id: "nogroups", groups: [] }, { ...good, id: "x", groups: [{ nope: 1 }] }]),
    );
    expect(list.map((e) => e.id)).toEqual(["ok"]);
    expect(list[0].groups[0].members).toEqual(["a", "b"]);
  });

  it("never returns more than the limit", () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) => saved(`id${i}`, [`n${i}`]));
    expect(parseRecent(JSON.stringify(many))).toHaveLength(RECENT_LIMIT);
  });
});

describe("addRecent", () => {
  it("puts the newest first and caps the list", () => {
    let list: SavedGrouping[] = [];
    for (let i = 0; i < RECENT_LIMIT + 3; i++) list = addRecent(saved(`id${i}`, [`n${i}`]), list);
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0].id).toBe(`id${RECENT_LIMIT + 2}`);
  });

  it("replaces an identical grouping instead of duplicating it", () => {
    const first = saved("one", ["a", "b"]);
    const list = addRecent(saved("two", ["a", "b"]), [first]);
    expect(list.map((e) => e.id)).toEqual(["two"]);
  });
});
