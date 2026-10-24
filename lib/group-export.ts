/**
 * Builds the downloadable group files: a formatted Excel workbook, a Word
 * document and a CSV. The heavy libraries are passed in rather than imported,
 * so the browser can lazy-load them and the tests can use them directly.
 */

import type { Group } from "@/lib/grouping";

type ExcelJSModule = typeof import("exceljs");
type DocxModule = typeof import("docx");

export interface ExportColumn {
  /** `NAME_COLUMN` for the member's display name, otherwise a key in `Group.rawMembers`. */
  key: string;
  label: string;
}

export interface ExportOptions {
  /** Shown at the top of the file, e.g. the uploaded file's name. */
  title?: string;
  /** Defaults to now. Passed in by the tests so output is stable. */
  date?: Date;
}

export const NAME_COLUMN = "__name";

/** The text in one cell: the member's name, or their value for that column. */
export function cellText(group: Group, memberIndex: number, column: ExportColumn): string {
  if (column.key === NAME_COLUMN) return group.members[memberIndex] ?? "";
  const value = group.rawMembers?.[memberIndex]?.[column.key];
  if (value === undefined || value === null) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function summaryLine(groups: Group[], date: Date): string {
  const people = groups.reduce((sum, g) => sum + g.members.length, 0);
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${plural(people, "person").replace("persons", "people")} · ${plural(groups.length, "group")} · ${day}`;
}

// ── colours ───────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)]
    .map((x) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}

/** A strong colour for the group's title band and a pale tint for its header row. */
export function groupColours(hue: number): { strong: string; tint: string } {
  return { strong: hslToHex(hue, 65, 36), tint: hslToHex(hue, 60, 93) };
}

const BORDER = "D5DBE1";
const ZEBRA = "F6F8FA";
const MUTED = "5B6670";

// ── Excel ─────────────────────────────────────────────────────────────────

/** Excel sheet names: at most 31 characters, none of []:*?/\ and unique (case-insensitively). */
export function sheetName(label: string, used: Set<string>): string {
  const base = label.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Group";
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) {
    const suffix = ` (${i})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

function columnWidths(groups: Group[], columns: ExportColumn[]): number[] {
  return columns.map((column) => {
    let longest = column.label.length;
    for (const group of groups) {
      for (let i = 0; i < group.members.length; i++) {
        longest = Math.max(longest, cellText(group, i, column).length);
      }
    }
    return Math.min(50, Math.max(10, longest + 3));
  });
}

type Worksheet = import("exceljs").Worksheet;
type Row = import("exceljs").Row;

const thin = { style: "thin" as const, color: { argb: `FF${BORDER}` } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (hex: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: `FF${hex}` } });

function styleCells(row: Row, count: number, apply: (cell: import("exceljs").Cell) => void) {
  for (let c = 1; c <= count; c++) apply(row.getCell(c));
}

/** Title band + header + members for one group, starting at the sheet's next row. */
function writeGroupBlock(sheet: Worksheet, group: Group, columns: ExportColumn[]) {
  const width = columns.length + 1;
  const { strong, tint } = groupColours(group.hue);

  const title = sheet.addRow([`${group.label}  ·  ${plural(group.members.length, "member")}`]);
  sheet.mergeCells(title.number, 1, title.number, width);
  title.height = 24;
  const titleCell = title.getCell(1);
  titleCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  titleCell.fill = fill(strong);
  titleCell.alignment = { vertical: "middle", indent: 1 };

  const header = sheet.addRow(["#", ...columns.map((c) => c.label)]);
  header.height = 20;
  styleCells(header, width, (cell) => {
    cell.font = { bold: true, color: { argb: `FF${MUTED}` } };
    cell.fill = fill(tint);
    cell.border = allBorders;
    cell.alignment = { vertical: "middle" };
  });

  group.members.forEach((_, i) => {
    const row = sheet.addRow([i + 1, ...columns.map((column) => cellText(group, i, column))]);
    row.height = 18;
    styleCells(row, width, (cell) => {
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", wrapText: true };
      if (i % 2 === 1) cell.fill = fill(ZEBRA);
    });
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    row.getCell(1).font = { color: { argb: `FF${MUTED}` } };
  });
}

function setupPage(sheet: Worksheet, columnCount: number) {
  sheet.pageSetup = {
    orientation: columnCount > 4 ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };
  sheet.views = [{ showGridLines: false }];
}

function writeHeading(sheet: Worksheet, title: string, subtitle: string, width: number) {
  const heading = sheet.addRow([title]);
  heading.getCell(1).font = { bold: true, size: 18 };
  heading.height = 28;
  sheet.mergeCells(heading.number, 1, heading.number, width);
  const sub = sheet.addRow([subtitle]);
  sub.getCell(1).font = { size: 11, color: { argb: `FF${MUTED}` } };
  sheet.mergeCells(sub.number, 1, sub.number, width);
  sheet.addRow([]);
}

/**
 * Three kinds of sheet:
 *  - "Groups": every group as its own titled, bordered table, with blank rows between groups.
 *  - "All": one flat, filterable table with a Group column, for sorting or mail merge.
 *  - one sheet per group.
 */
export function buildGroupsWorkbook(
  ExcelJS: ExcelJSModule,
  groups: Group[],
  columns: ExportColumn[],
  options: ExportOptions = {},
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Groupify";
  workbook.created = options.date ?? new Date();
  const title = options.title ? `${options.title}: groups` : "Groups";
  const subtitle = summaryLine(groups, options.date ?? new Date());
  const widths = columnWidths(groups, columns);
  const used = new Set<string>(["groups", "all"]);

  // Groups, stacked with breathing room.
  const stacked = workbook.addWorksheet("Groups");
  stacked.columns = [{ width: 6 }, ...widths.map((width) => ({ width }))];
  writeHeading(stacked, title, subtitle, columns.length + 1);
  groups.forEach((group, i) => {
    writeGroupBlock(stacked, group, columns);
    if (i < groups.length - 1) {
      stacked.addRow([]);
      stacked.addRow([]);
    }
  });
  setupPage(stacked, columns.length);

  // All, flat.
  const all = workbook.addWorksheet("All");
  const groupWidth = Math.min(30, Math.max(10, ...groups.map((g) => g.label.length + 3)));
  all.columns = [{ width: groupWidth }, ...widths.map((width) => ({ width }))];
  const header = all.addRow(["Group", ...columns.map((c) => c.label)]);
  styleCells(header, columns.length + 1, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = fill("1F2933");
    cell.border = allBorders;
  });
  header.height = 20;
  groups.forEach((group, g) => {
    const { strong } = groupColours(group.hue);
    group.members.forEach((_, i) => {
      const row = all.addRow([group.label, ...columns.map((column) => cellText(group, i, column))]);
      styleCells(row, columns.length + 1, (cell) => {
        cell.border = allBorders;
        if (g % 2 === 1) cell.fill = fill(ZEBRA);
      });
      row.getCell(1).font = { bold: true, color: { argb: `FF${strong}` } };
    });
  });
  all.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length + 1 } };
  all.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  all.pageSetup = { orientation: columns.length > 3 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // One sheet per group.
  for (const group of groups) {
    const sheet = workbook.addWorksheet(sheetName(group.label, used));
    sheet.columns = [{ width: 6 }, ...widths.map((width) => ({ width }))];
    writeGroupBlock(sheet, group, columns);
    setupPage(sheet, columns.length);
  }

  return workbook;
}

// ── Word ──────────────────────────────────────────────────────────────────

export async function buildGroupsDocx(
  docx: DocxModule,
  groups: Group[],
  columns: ExportColumn[],
  options: ExportOptions = {},
): Promise<Blob | Buffer> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = docx;

  const title = options.title ? `${options.title}: groups` : "Groups";
  // Widths in twips: A4 minus the margins below, landscape once the columns get crowded.
  const landscape = columns.length >= 4;
  const usable = (landscape ? 16838 : 11906) - 1800;
  const numberWidth = 560;
  const columnWidth = Math.floor((usable - numberWidth) / Math.max(1, columns.length));
  const widths = [numberWidth, ...columns.map(() => columnWidth)];
  const border = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const margins = { top: 80, bottom: 80, left: 120, right: 120 };

  const cell = (
    text: string,
    column: number,
    opts: { bold?: boolean; fillHex?: string; color?: string; center?: boolean } = {},
  ) =>
    new TableCell({
      width: { size: widths[column], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins,
      shading: opts.fillHex ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fillHex } : undefined,
      children: [
        new Paragraph({
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: 20 })],
        }),
      ],
    });

  const blocks = groups.flatMap((group, g) => {
    const { strong, tint } = groupColours(group.hue);
    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          cell("#", 0, { bold: true, fillHex: tint, color: MUTED, center: true }),
          ...columns.map((c, ci) => cell(c.label, ci + 1, { bold: true, fillHex: tint, color: MUTED })),
        ],
      }),
      ...group.members.map(
        (_, i) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell(String(i + 1), 0, { color: MUTED, center: true, fillHex: i % 2 ? ZEBRA : undefined }),
              ...columns.map((column, ci) =>
                cell(cellText(group, i, column), ci + 1, { fillHex: i % 2 ? ZEBRA : undefined }),
              ),
            ],
          }),
      ),
    ];
    return [
      new Paragraph({
        keepNext: true,
        spacing: { before: g === 0 ? 120 : 480, after: 120 },
        children: [
          new TextRun({ text: group.label, bold: true, size: 30, color: strong }),
          new TextRun({ text: `   ${plural(group.members.length, "member")}`, size: 20, color: MUTED }),
        ],
      }),
      new Table({
        width: { size: usable, type: WidthType.DXA },
        columnWidths: widths,
        layout: TableLayoutType.FIXED,
        borders,
        rows,
      }),
    ];
  });

  const document = new Document({
    creator: "Groupify",
    title,
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: 900, bottom: 900, left: 900, right: 900 },
          },
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 40 })] }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: summaryLine(groups, options.date ?? new Date()), size: 22, color: MUTED })],
          }),
          ...blocks,
        ],
      },
    ],
  });

  return typeof window === "undefined" ? Packer.toBuffer(document) : Packer.toBlob(document);
}

// ── CSV ───────────────────────────────────────────────────────────────────

const csvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** Flat `Group` + columns. Starts with a BOM so Excel reads it as UTF-8. */
export function buildGroupsCsv(groups: Group[], columns: ExportColumn[]): string {
  const lines = [["Group", ...columns.map((c) => c.label)]];
  for (const group of groups) {
    group.members.forEach((_, i) => lines.push([group.label, ...columns.map((column) => cellText(group, i, column))]));
  }
  return "﻿" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
