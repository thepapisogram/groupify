import { describe, expect, it } from "vitest";
import { TIME_KEY, displayValue, filterAndSort, nextSort, type ResponseRow } from "@/lib/responses";
import type { FormField } from "@/lib/models";

const fields: FormField[] = [
  { id: "name", label: "Name", type: "text", isPrimary: true },
  { id: "age", label: "Age", type: "number" },
  { id: "skills", label: "Skills", type: "checklist", options: ["JS", "Py"] },
];

const row = (id: string, at: string, data: ResponseRow["data"]): ResponseRow => ({ _id: id, submittedAt: at, data });

const rows: ResponseRow[] = [
  row("a", "2026-01-01T10:00:00Z", { name: "Ama", age: "9", skills: ["JS"] }),
  row("b", "2026-01-03T10:00:00Z", { name: "kofi", age: "10", skills: ["JS", "Py"] }),
  row("c", "2026-01-02T10:00:00Z", { name: "Esi", skills: ["Py"] }),
  row("d", "2026-01-04T10:00:00Z", { name: "Yaw", age: "2" }),
];

const ids = (list: ResponseRow[]) => list.map((r) => r._id);

describe("displayValue", () => {
  it("joins lists and tolerates missing values", () => {
    expect(displayValue(["a", "b"])).toBe("a, b");
    expect(displayValue("x")).toBe("x");
    expect(displayValue(undefined)).toBe("");
  });
});

describe("nextSort", () => {
  it("cycles ascending, descending, then back to default", () => {
    let s = nextSort(null, "name");
    expect(s).toEqual({ key: "name", direction: "asc" });
    s = nextSort(s, "name");
    expect(s).toEqual({ key: "name", direction: "desc" });
    expect(nextSort(s, "name")).toBeNull();
  });

  it("starts ascending when switching to another column", () => {
    expect(nextSort({ key: "name", direction: "desc" }, "age")).toEqual({ key: "age", direction: "asc" });
  });
});

describe("filterAndSort", () => {
  it("defaults to newest first", () => {
    expect(ids(filterAndSort(rows, fields, "", null))).toEqual(["d", "b", "c", "a"]);
  });

  it("searches every field, ignoring case, including checklist values", () => {
    expect(ids(filterAndSort(rows, fields, "KOFI", null))).toEqual(["b"]);
    expect(ids(filterAndSort(rows, fields, "py", null))).toEqual(["b", "c"]);
    expect(ids(filterAndSort(rows, fields, "  ", null))).toHaveLength(4);
    expect(filterAndSort(rows, fields, "nobody", null)).toEqual([]);
  });

  it("sorts text case-insensitively", () => {
    expect(ids(filterAndSort(rows, fields, "", { key: "name", direction: "asc" }))).toEqual(["a", "c", "b", "d"]);
    expect(ids(filterAndSort(rows, fields, "", { key: "name", direction: "desc" }))).toEqual(["d", "b", "c", "a"]);
  });

  it("sorts number fields numerically, not alphabetically", () => {
    // 2, 9, 10 (an alphabetical sort would put "10" before "2")
    expect(ids(filterAndSort(rows, fields, "", { key: "age", direction: "asc" })).slice(0, 3)).toEqual(["d", "a", "b"]);
  });

  it("keeps blanks last in both directions", () => {
    expect(ids(filterAndSort(rows, fields, "", { key: "age", direction: "asc" })).at(-1)).toBe("c");
    expect(ids(filterAndSort(rows, fields, "", { key: "age", direction: "desc" })).at(-1)).toBe("c");
  });

  it("sorts by submission time in either direction", () => {
    expect(ids(filterAndSort(rows, fields, "", { key: TIME_KEY, direction: "asc" }))).toEqual(["a", "c", "b", "d"]);
    expect(ids(filterAndSort(rows, fields, "", { key: TIME_KEY, direction: "desc" }))).toEqual(["d", "b", "c", "a"]);
  });

  it("filters and sorts together, without mutating the input", () => {
    const before = ids(rows);
    const result = filterAndSort(rows, fields, "js", { key: "name", direction: "desc" });
    expect(ids(result)).toEqual(["b", "a"]);
    expect(ids(rows)).toEqual(before);
  });
});
