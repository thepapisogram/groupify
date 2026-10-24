/**
 * Reading spreadsheets (Excel, CSV, ODS) into plain tables of text, and turning
 * their rows into people for the grouping engine. Everything after the initial
 * file read is pure, so the tests can drive it with a hand-made matrix.
 */

import type { Person } from "@/lib/grouping";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 50;

export const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.xlsm,.csv,.tsv,.ods,.txt";

export type Row = Record<string, string>;

export interface SheetTable {
  name: string;
  /** Header labels, trimmed and made unique. Also the keys of every row. */
  columns: string[];
  rows: Row[];
  /** Rows dropped because every cell was empty. */
  skipped: number;
  /** True when the sheet had more rows or columns than we keep. */
  truncated: boolean;
}

export interface ParsedWorkbook {
  sheets: SheetTable[];
}

const clean = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).replace(/\s+/g, " ").trim();

/** Header labels: trimmed, blanks named "Column N", repeats suffixed "(2)", "(3)"… */
function headerLabels(cells: string[]): string[] {
  const used = new Map<string, number>();
  return cells.map((cell, i) => {
    const base = cell || `Column ${i + 1}`;
    const seen = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), seen + 1);
    return seen === 0 ? base : `${base} (${seen + 1})`;
  });
}

/**
 * Build a table from a sheet's cells (already formatted as text). The first
 * non-empty row is the header. Columns with no header and no values are dropped.
 */
export function tableFromMatrix(name: string, matrix: unknown[][]): SheetTable {
  const grid = matrix.map((row) => (Array.isArray(row) ? row.map(clean) : []));
  const headerIndex = grid.findIndex((row) => row.some(Boolean));
  if (headerIndex < 0) return { name, columns: [], rows: [], skipped: 0, truncated: false };

  const body = grid.slice(headerIndex + 1);
  const width = Math.max(grid[headerIndex].length, ...body.map((row) => row.length));
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    if (grid[headerIndex][c] || body.some((row) => row[c])) keep.push(c);
  }
  const truncated = keep.length > MAX_COLUMNS || body.length > MAX_ROWS;
  const used = keep.slice(0, MAX_COLUMNS);
  const columns = headerLabels(used.map((c) => grid[headerIndex][c] ?? ""));

  const rows: Row[] = [];
  let skipped = 0;
  for (const cells of body) {
    if (!used.some((c) => cells[c])) {
      skipped++;
      continue;
    }
    if (rows.length >= MAX_ROWS) break;
    const row: Row = {};
    used.forEach((c, i) => (row[columns[i]] = cells[c] ?? ""));
    rows.push(row);
  }

  for (const column of columns) restoreLeadingZeros(rows, column);
  return { name, columns, rows, skipped, truncated };
}

const PHONE_HEADER = /phone|tel|mobile|cell|whats\s?app|contact/i;

/**
 * Spreadsheets often store phone numbers as numbers, which drops the leading 0
 * ("0241234567" becomes 241234567). In a phone column where most numbers do
 * start with 0, put it back on the ones that are exactly one digit short.
 */
export function restoreLeadingZeros(rows: Row[], column: string): void {
  if (!PHONE_HEADER.test(column)) return;
  const values = rows.map((r) => r[column]).filter((v) => /^\d+$/.test(v));
  const withZero = values.filter((v) => v.startsWith("0"));
  if (withZero.length === 0 || withZero.length < values.length * 0.6) return;
  const lengths = new Map<number, number>();
  for (const v of withZero) lengths.set(v.length, (lengths.get(v.length) ?? 0) + 1);
  const usual = Array.from(lengths.entries()).sort((a, b) => b[1] - a[1])[0][0];
  for (const row of rows) {
    const v = row[column];
    if (/^[1-9]\d*$/.test(v) && v.length === usual - 1) row[column] = `0${v}`;
  }
}

/** Read a spreadsheet file in the browser (or a test) into text tables, one per non-empty sheet. */
export async function parseSpreadsheet(data: ArrayBuffer): Promise<ParsedWorkbook> {
  const XLSX = await import("xlsx");
  // Without cellDates, dates come back as their formatted text (`w`), which is what
  // people expect to see; phone numbers stored as text keep their leading zeros.
  const workbook = XLSX.read(data, { type: "array", dense: true });
  const sheets: SheetTable[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const table = tableFromMatrix(sheetName, matrix);
    if (table.columns.length > 0 && table.rows.length > 0) sheets.push(table);
  }
  return { sheets };
}

// ── choosing the name column ───────────────────────────────────────────────

const NOT_A_NAME = /e-?mail|phone|mobile|tel|whats\s?app|number|\bno\.?\b|\bid\b|date|time|stamp|address/i;
const FIRST_NAME = /^(first|given|fore)\s*name|^first$/i;
const LAST_NAME = /^(last|family|sur)\s*name|^surname$/i;
const NAME_LIKE = /\bfull\s*name\b|\bname\b|student|participant|member|person|attendee|player/i;

const looksLikeText = (value: string) =>
  Boolean(value) && !/@/.test(value) && !/^[\d\s+()./:-]+$/.test(value);

/**
 * The column(s) that best name each row: First + Last when both exist, else a
 * "Full name"/"Name"-like header, else the first column that holds plain text.
 */
export function guessNameColumns(columns: string[], rows: Row[]): string[] {
  if (columns.length === 0) return [];
  const first = columns.find((c) => FIRST_NAME.test(c));
  const last = columns.find((c) => LAST_NAME.test(c));
  if (first && last) return [first, last];

  const candidates = columns.filter((c) => NAME_LIKE.test(c) && !NOT_A_NAME.test(c));
  const full = candidates.find((c) => /full\s*name/i.test(c));
  if (full) return [full];
  if (candidates.length > 0) return [candidates[0]];

  const sample = rows.slice(0, 50);
  const texty = columns.find(
    (c) => !NOT_A_NAME.test(c) && sample.filter((r) => looksLikeText(r[c])).length > sample.length / 2,
  );
  return [texty ?? columns[0]];
}

/** One person per row. Keys are row positions, so two people with the same name stay distinct. */
export function rowsToPeople(rows: Row[], nameColumns: string[]): Person[] {
  return rows.map((row, i) => {
    const label = nameColumns
      .map((c) => row[c] ?? "")
      .filter(Boolean)
      .join(" ");
    return { key: `row-${i + 1}`, label: label || `Row ${i + 1}`, data: row };
  });
}

/** "Class list.xlsx" -> "Class list". */
export function baseFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Groups";
}

/** The uploaded sheet plus the user's column choices: what the quick tool groups and saves. */
export interface FileSource {
  fileName: string;
  sheetName: string;
  columns: string[];
  rows: Row[];
  /** Joined to make each person's display name. */
  nameColumns: string[];
  /** Ticked columns: shown on the group cards and included in downloads. */
  outputColumns: string[];
}

/** A FileSource for one sheet, with the name guessed and every column ticked. */
export function fileSourceFromSheet(fileName: string, sheet: SheetTable): FileSource {
  return {
    fileName,
    sheetName: sheet.name,
    columns: sheet.columns,
    rows: sheet.rows,
    nameColumns: guessNameColumns(sheet.columns, sheet.rows),
    outputColumns: sheet.columns,
  };
}

/**
 * Columns worth balancing on: not part of the name, and repeating values (a
 * column where almost every row is different, like email, can't be spread).
 */
export function balanceColumns(source: FileSource): string[] {
  return source.columns.filter((column) => {
    if (source.nameColumns.includes(column)) return false;
    const values = source.rows.map((r) => r[column]).filter(Boolean);
    if (values.length === 0) return false;
    const distinct = new Set(values.map((v) => v.toLowerCase())).size;
    return distinct <= Math.max(2, Math.min(50, values.length / 2));
  });
}
