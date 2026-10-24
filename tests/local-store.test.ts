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
      source: "paste",
      file: null,
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
      source: "paste" as const,
      file: null,
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

describe("file drafts", () => {
  const file = {
    fileName: "Class.xlsx",
    sheetName: "Sheet1",
    columns: ["Full name", "Phone"],
    rows: [
      { "Full name": "Ama", Phone: "024" },
      { "Full name": "Kofi", Phone: "055" },
    ],
    nameColumns: ["Full name"],
    outputColumns: ["Full name", "Phone"],
  };

  it("round-trips an uploaded file", () => {
    const d = parseDraft(JSON.stringify({ names: "", source: "file", file }))!;
    expect(d.source).toBe("file");
    expect(d.file).toEqual(file);
  });

  it("repairs column choices that point at missing columns", () => {
    const d = parseDraft(
      JSON.stringify({ names: "", file: { ...file, nameColumns: ["Gone"], outputColumns: ["Gone"], rows: [{ Phone: 5 }] } }),
    )!;
    expect(d.file).toMatchObject({
      nameColumns: ["Full name"],
      outputColumns: ["Full name", "Phone"],
      rows: [{ "Full name": "", Phone: "" }],
    });
  });

  it("drops a file with no columns or rows", () => {
    expect(parseDraft(JSON.stringify({ names: "", file: { ...file, rows: [] } }))!.file).toBeNull();
    expect(parseDraft(JSON.stringify({ names: "", file: { ...file, columns: [] } }))!.file).toBeNull();
  });
});

describe("recent groupings from a file", () => {
  it("keeps row data and columns when they line up with the members", () => {
    const item = {
      ...saved("f", ["Ama", "Kofi"]),
      groups: [{ ...group(1, ["Ama", "Kofi"]), rawMembers: [{ Phone: "024" }, { Phone: "055" }] }],
      columns: [{ key: "Phone", label: "Phone" }],
      title: "Class",
    };
    const [parsed] = parseRecent(JSON.stringify([item]));
    expect(parsed.groups[0].rawMembers).toEqual([{ Phone: "024" }, { Phone: "055" }]);
    expect(parsed.columns).toEqual([{ key: "Phone", label: "Phone" }]);
    expect(parsed.title).toBe("Class");
  });

  it("drops row data that doesn't line up", () => {
    const item = { ...saved("f", ["Ama", "Kofi"]), groups: [{ ...group(1, ["Ama", "Kofi"]), rawMembers: [{}] }] };
    expect(parseRecent(JSON.stringify([item]))[0].groups[0].rawMembers).toBeUndefined();
  });
});
