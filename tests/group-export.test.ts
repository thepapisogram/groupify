import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import * as docx from "docx";
import type { Group } from "@/lib/grouping";
import {
  NAME_COLUMN,
  buildGroupsCsv,
  buildGroupsDocx,
  buildGroupsWorkbook,
  cellText,
  sheetName,
  type ExportColumn,
} from "@/lib/group-export";

const row = (name: string, phone: string) => ({ "Full name": name, Phone: phone, Email: `${name}@x.com` });

const groups: Group[] = [
  {
    id: 1,
    label: "Group 1",
    members: ["Ama", "Kofi"],
    rawMembers: [row("Ama", "024"), row("Kofi", "055")],
    hue: 185,
  },
  {
    id: 2,
    label: "Team: A/B",
    members: ["Esi"],
    rawMembers: [row("Esi", "020")],
    hue: 340,
  },
];

const columns: ExportColumn[] = [
  { key: "Full name", label: "Full name" },
  { key: "Phone", label: "Phone" },
];

// Row values by row number; rows with nothing in them read as [].
const values = (sheet: ExcelJS.Worksheet) =>
  Array.from(sheet.getSheetValues(), (r) => (Array.isArray(r) ? r.slice(1).map((v) => v ?? null) : []));

describe("cellText", () => {
  it("reads names, columns and multi-value answers", () => {
    const g: Group = { id: 1, label: "G", members: ["Ama"], rawMembers: [{ Skills: ["a", "b"] }], hue: 1 };
    expect(cellText(g, 0, { key: NAME_COLUMN, label: "Name" })).toBe("Ama");
    expect(cellText(g, 0, { key: "Skills", label: "Skills" })).toBe("a, b");
    expect(cellText(g, 0, { key: "Missing", label: "Missing" })).toBe("");
  });
});

describe("sheetName", () => {
  it("removes forbidden characters, caps length and de-duplicates", () => {
    const used = new Set<string>();
    expect(sheetName("Team: A/B", used)).toBe("Team A B");
    expect(sheetName("team a b", used)).toBe("team a b (2)");
    expect(sheetName("x".repeat(40), used)).toHaveLength(31);
  });
});

describe("buildGroupsWorkbook", () => {
  it("writes the stacked, flat and per-group sheets with only the chosen columns", async () => {
    const workbook = buildGroupsWorkbook(ExcelJS, groups, columns, { title: "Class", date: new Date(2026, 9, 24) });
    // Round-trip through the file format to check what users will actually open.
    const reread = new ExcelJS.Workbook();
    await reread.xlsx.load(await workbook.xlsx.writeBuffer());

    expect(reread.worksheets.map((s) => s.name)).toEqual(["Groups", "All", "Group 1", "Team A B"]);

    const stacked = values(reread.getWorksheet("Groups")!);
    expect(stacked[1][0]).toBe("Class: groups");
    expect(stacked[2][0]).toBe("3 people · 2 groups · 24 Oct 2026");
    expect(stacked[4][0]).toBe("Group 1  ·  2 members");
    expect(stacked[5]).toEqual(["#", "Full name", "Phone"]);
    expect(stacked[6]).toEqual([1, "Ama", "024"]);
    expect(stacked[7]).toEqual([2, "Kofi", "055"]);
    // Two blank rows separate the groups.
    expect(stacked[8]).toEqual([]);
    expect(stacked[9]).toEqual([]);
    expect(stacked[10][0]).toBe("Team: A/B  ·  1 member");

    const all = values(reread.getWorksheet("All")!);
    expect(all.slice(1)).toEqual([
      ["Group", "Full name", "Phone"],
      ["Group 1", "Ama", "024"],
      ["Group 1", "Kofi", "055"],
      ["Team: A/B", "Esi", "020"],
    ]);

    const one = values(reread.getWorksheet("Team A B")!);
    expect(one[2]).toEqual(["#", "Full name", "Phone"]);
    expect(one[3]).toEqual([1, "Esi", "020"]);
  });
});

describe("buildGroupsDocx", () => {
  it("produces a Word file", async () => {
    const out = (await buildGroupsDocx(docx, groups, columns, { title: "Class" })) as Buffer;
    expect(out.subarray(0, 2).toString()).toBe("PK");
  });
});

describe("buildGroupsCsv", () => {
  it("writes a Group column and escapes awkward values", () => {
    const g: Group[] = [{ id: 1, label: "G, 1", members: ["Ama"], rawMembers: [{ Note: 'say "hi"' }], hue: 1 }];
    const csv = buildGroupsCsv(g, [
      { key: NAME_COLUMN, label: "Name" },
      { key: "Note", label: "Note" },
    ]);
    expect(csv).toBe('﻿Group,Name,Note\r\n"G, 1",Ama,"say ""hi"""\r\n');
  });
});
