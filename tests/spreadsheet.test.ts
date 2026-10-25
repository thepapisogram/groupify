import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  MAX_ROWS,
  baseFileName,
  defaultDuplicateColumns,
  fileRows,
  fileSourceFromSheet,
  findDuplicates,
  guessNameColumns,
  identifierColumns,
  parseSpreadsheet,
  rowsToPeople,
  tableFromMatrix,
} from "@/lib/spreadsheet";

/** A Google Forms style export: trailing spaces in headers and names, phones stored as text. */
function formResponsesWorkbook(): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Timestamp", "Full name", "Telephone number", "WhatsApp number ", "Email address "],
    ["10/24/2026 6:11:56", "Ama Mensah ", "0542000001", "0502000001", "ama@example.com"],
    ["10/24/2026 6:12:12", "Kofi Boateng", "0554000002", "0554000002", "kofi@example.com"],
    [],
    ["10/24/2026 6:13:53", "Esi Owusu", "0242000003", "0242000003", "esi@example.com"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Form responses 1");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
  const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return out;
}

describe("tableFromMatrix", () => {
  it("uses the first non-empty row as the header and trims everything", () => {
    const table = tableFromMatrix("S", [[], ["  Name ", " Level"], [" Ama ", "A"], ["", ""], ["Kofi", " B "]]);
    expect(table.columns).toEqual(["Name", "Level"]);
    expect(table.rows).toEqual([
      { Name: "Ama", Level: "A" },
      { Name: "Kofi", Level: "B" },
    ]);
    expect(table.skipped).toBe(1);
  });

  it("names blank headers and de-duplicates repeated ones", () => {
    const table = tableFromMatrix("S", [["Name", "", "name", "Name"], ["a", "b", "c", "d"]]);
    expect(table.columns).toEqual(["Name", "Column 2", "name (2)", "Name (3)"]);
    expect(table.rows[0]).toEqual({ Name: "a", "Column 2": "b", "name (2)": "c", "Name (3)": "d" });
  });

  it("drops columns with no header and no values", () => {
    const table = tableFromMatrix("S", [["Name", "", "Level"], ["a", "", "x"]]);
    expect(table.columns).toEqual(["Name", "Level"]);
  });

  it("returns an empty table for an empty sheet", () => {
    expect(tableFromMatrix("S", [[], [""]]).columns).toEqual([]);
  });

  it("caps very large sheets and says so", () => {
    const matrix = [["Name"], ...Array.from({ length: MAX_ROWS + 5 }, (_, i) => [`P${i}`])];
    const table = tableFromMatrix("S", matrix);
    expect(table.rows).toHaveLength(MAX_ROWS);
    expect(table.truncated).toBe(true);
  });
});

describe("restoreLeadingZeros", () => {
  const table = (header: string, values: string[]) =>
    tableFromMatrix("S", [[header], ...values.map((v) => [v])]).rows.map((r) => r[header]);

  it("puts back a dropped leading zero in phone columns", () => {
    expect(table("WhatsApp number", ["0241234567", "0551234567", "599762657", "+233241234567"])).toEqual([
      "0241234567",
      "0551234567",
      "0599762657",
      "+233241234567",
    ]);
  });

  it("leaves other columns and lists without zeros alone", () => {
    expect(table("Student ID", ["0123", "0456", "789"])).toEqual(["0123", "0456", "789"]);
    expect(table("Phone", ["2025550123", "202555012"])).toEqual(["2025550123", "202555012"]);
  });
});

describe("parseSpreadsheet", () => {
  it("reads every column of a form export, keeping leading zeros", async () => {
    const { sheets } = await parseSpreadsheet(formResponsesWorkbook());
    expect(sheets).toHaveLength(1);
    const [sheet] = sheets;
    expect(sheet.name).toBe("Form responses 1");
    expect(sheet.columns).toEqual(["Timestamp", "Full name", "Telephone number", "WhatsApp number", "Email address"]);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[0]["Full name"]).toBe("Ama Mensah");
    expect(sheet.rows[0]["Telephone number"]).toBe("0542000001");
    expect(sheet.rows[2]["Email address"]).toBe("esi@example.com");
  });

  it("reads CSV", async () => {
    const csv = new TextEncoder().encode("Name,Phone\nAma,024\n\"Boateng, Kofi\",055\n");
    const { sheets } = await parseSpreadsheet(csv.buffer as ArrayBuffer);
    expect(sheets[0].rows).toEqual([
      { Name: "Ama", Phone: "024" },
      { Name: "Boateng, Kofi", Phone: "055" },
    ]);
  });
});

describe("guessNameColumns", () => {
  it("prefers a full name column over other name-like ones", () => {
    expect(guessNameColumns(["Timestamp", "Full name", "Email address"], [])).toEqual(["Full name"]);
  });

  it("joins first and last name columns", () => {
    expect(guessNameColumns(["ID", "First name", "Surname"], [])).toEqual(["First name", "Surname"]);
  });

  it("ignores user-name and number columns that mention 'name'", () => {
    expect(guessNameColumns(["Phone number", "Student"], [])).toEqual(["Student"]);
  });

  it("falls back to the first column of plain text", () => {
    const rows = [
      { When: "1/2/2026", Who: "Ama", Mail: "a@x.com" },
      { When: "1/3/2026", Who: "Kofi", Mail: "k@x.com" },
    ];
    expect(guessNameColumns(["When", "Mail", "Who"], rows)).toEqual(["Who"]);
  });
});

describe("rowsToPeople", () => {
  it("gives every row its own key, even with repeated names", () => {
    const people = rowsToPeople(
      [
        { First: "Ama", Last: "Mensah" },
        { First: "Ama", Last: "Mensah" },
        { First: "", Last: "" },
      ],
      ["First", "Last"],
    );
    expect(people.map((p) => p.key)).toEqual(["row-1", "row-2", "row-3"]);
    expect(people.map((p) => p.label)).toEqual(["Ama Mensah", "Ama Mensah", "Row 3"]);
    expect(people[0].data).toEqual({ First: "Ama", Last: "Mensah" });
  });
});

describe("baseFileName", () => {
  it("drops the extension", () => {
    expect(baseFileName("Class list.final.xlsx")).toBe("Class list.final");
    expect(baseFileName(".xlsx")).toBe("Groups");
  });
});

describe("duplicate rows", () => {
  const form = [
    { Timestamp: "10/24/2026 6:11:56", "Full name": "Ama Mensah", Phone: "0241234567", Email: "ama@x.com" },
    { Timestamp: "10/24/2026 6:12:12", "Full name": "Kofi Boateng", Phone: "0551234567", Email: "kofi@x.com" },
    // Ama again, a minute later, typed a little differently.
    { Timestamp: "10/24/2026 6:13:01", "Full name": "ama  MENSAH", Phone: "024 123 4567", Email: "Ama@x.com" },
    { Timestamp: "", "Full name": "", Phone: "", Email: "" },
    { Timestamp: "", "Full name": "", Phone: "", Email: "" },
  ];
  const columns = ["Timestamp", "Full name", "Phone", "Email"];

  it("leaves timestamp and date columns out of the comparison", () => {
    expect(defaultDuplicateColumns(columns, form)).toEqual(["Full name", "Phone", "Email"]);
    const dated = [{ When: "2026-10-24 06:11", Name: "A" }];
    expect(defaultDuplicateColumns(["When", "Name"], dated)).toEqual(["Name"]);
  });

  it("finds rows that differ only by timestamp, case, spacing or phone format, keeping the first", () => {
    const report = findDuplicates(form, ["Full name", "Phone", "Email"]);
    expect(report.removed).toEqual([{ index: 2, duplicateOf: 0 }]);
    expect(report.keep).toEqual([0, 1, 3, 4]);
  });

  it("treats rows as different when any chosen column differs", () => {
    expect(findDuplicates(form, columns).removed).toEqual([]);
    const rows = [
      { Name: "Ama", Phone: "1" },
      { Name: "Ama", Phone: "2" },
    ];
    expect(findDuplicates(rows, ["Name", "Phone"]).removed).toEqual([]);
    expect(findDuplicates(rows, ["Name"]).removed).toEqual([{ index: 1, duplicateOf: 0 }]);
  });

  it("never merges rows that are empty in every chosen column", () => {
    expect(findDuplicates(form, ["Full name"]).keep).toContain(4);
  });

  it("removes duplicates by default and can be turned off", () => {
    const source = fileSourceFromSheet("f.xlsx", { name: "S", columns, rows: form, skipped: 0, truncated: false });
    expect(source.removeDuplicates).toBe(true);
    expect(fileRows(source).keep).toEqual([0, 1, 3, 4]);
    const off = fileRows({ ...source, removeDuplicates: false });
    expect(off.keep).toEqual([0, 1, 2, 3, 4]);
    expect(off.removed).toHaveLength(1);
  });

  it("flags rows sharing a phone or email as possible duplicates, without removing them by default", () => {
    const rows = [
      { Name: "Adelaide Adu", Phone: "0530392844", Email: "t@x.com" },
      { Name: "Adelaide Au", Phone: "0530392844", Email: "t@x.com" },
      { Name: "Benard Asante", Phone: "0594080524", Email: "basante77" },
      { Name: "Asante Benard", Phone: "0594080524", Email: "kofi@x.com" },
      // Shares only the email of the row above: still the same cluster, pointing at its first row.
      { Name: "B. Asante", Phone: "0200000000", Email: "kofi@x.com" },
      { Name: "Esi", Phone: "", Email: "" },
    ];
    const cols = ["Name", "Phone", "Email"];
    expect(identifierColumns(cols, rows)).toEqual(["Phone", "Email"]);
    const source = fileSourceFromSheet("f.csv", { name: "S", columns: cols, rows, skipped: 0, truncated: false });
    const report = fileRows(source);
    expect(report.removed).toEqual([]);
    expect(report.possible).toEqual([
      { index: 1, duplicateOf: 0, column: "Phone" },
      { index: 3, duplicateOf: 2, column: "Phone" },
      { index: 4, duplicateOf: 2, column: "Email" },
    ]);
    expect(report.keep).toHaveLength(6);
    expect(fileRows({ ...source, removePossibleDuplicates: true }).keep).toEqual([0, 2, 5]);
  });

  it("finds email columns by their values", () => {
    expect(identifierColumns(["Contact"], [{ Contact: "a@b.co" }])).toEqual(["Contact"]);
    expect(identifierColumns(["Notes"], [{ Notes: "hello" }])).toEqual([]);
  });

  it("keeps person keys tied to the sheet row, so they don't shift when rows are left out", () => {
    const people = rowsToPeople(form, ["Full name"], [0, 1, 3]);
    expect(people.map((p) => p.key)).toEqual(["row-1", "row-2", "row-4"]);
    expect(people[2].label).toBe("Row 4");
  });
});
