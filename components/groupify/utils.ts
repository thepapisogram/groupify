import type { ExportFormat, Group } from "@/components/groupify/types";
import type { FormField } from "@/components/groupify/form-builder";
import { loadDocx, loadExcelJS, loadXLSX } from "@/lib/export";
import {
  buildGroupsCsv,
  buildGroupsDocx,
  buildGroupsWorkbook,
  NAME_COLUMN,
  type ExportColumn,
} from "@/lib/group-export";
import { TAG_KEY } from "@/lib/grouping";

/** Strip characters that aren't allowed in file names. */
const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Groupify";

/**
 * Download groups as a formatted Excel workbook, a Word document or a CSV,
 * with one column per entry in `columns`.
 */
export async function exportGroupTable(
  groups: Group[],
  columns: ExportColumn[],
  format: ExportFormat,
  title?: string,
) {
  const fileName = safeFileName(title ? `${title} - groups` : "Groupify");

  if (format === "excel") {
    const { ExcelJS, saveAs } = await loadExcelJS();
    const workbook = buildGroupsWorkbook(ExcelJS, groups, columns, { title });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `${fileName}.xlsx`,
    );
    return;
  }

  if (format === "csv") {
    const { saveAs } = await import("file-saver");
    saveAs(new Blob([buildGroupsCsv(groups, columns)], { type: "text/csv;charset=utf-8" }), `${fileName}.csv`);
    return;
  }

  const docx = await loadDocx();
  const blob = await buildGroupsDocx(docx, groups, columns, { title });
  docx.saveAs(blob as Blob, `${fileName}.docx`);
}

/** Columns for groups made from a pasted list (name, plus tag when any name has one) or a form. */
export function defaultColumns(groups: Group[], fields?: FormField[]): ExportColumn[] {
  if (fields && fields.length > 0) return fields.map((f) => ({ key: f.id, label: f.label }));
  const hasTags = groups.some((g) => g.rawMembers?.some((m) => m?.[TAG_KEY]));
  return [{ key: NAME_COLUMN, label: "Name" }, ...(hasTags ? [{ key: TAG_KEY, label: "Tag" }] : [])];
}

export async function exportGroups(groups: Group[], format: ExportFormat, fields?: FormField[]) {
  await exportGroupTable(groups, defaultColumns(groups, fields), format);
}

export async function exportResponses(
  submissions: { _id: string; submittedAt: string; data: Record<string, string | string[]> }[],
  format: ExportFormat,
  fields: FormField[],
  fileName: string = "Responses"
) {
  if (format === "excel") {
    const { XLSX, saveAs } = await loadXLSX();
    
    const rows: string[][] = [
      fields.map(f => f.label)
    ];

    submissions.forEach((sub) => {
      rows.push(
        fields.map((f) => {
          if (f.id === "_time") {
            return new Date(sub.submittedAt).toLocaleString();
          }
          const val = sub.data[f.id];
          if (!val) return "";
          return Array.isArray(val) ? val.join(", ") : String(val);
        })
      );
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    
    // Set column width
    worksheet["!cols"] = Array(fields.length).fill({ wch: 26 });
    
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `${fileName}.xlsx`);
    return;
  }

  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, saveAs } = await loadDocx();

  const tableRows = [
    new TableRow({
      children: fields.map(f => f.label).map(
        text => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })
      )
    }),
    ...submissions.map(sub => new TableRow({
      children: fields.map(f => {
        if (f.id === "_time") {
          return new TableCell({ children: [new Paragraph(new Date(sub.submittedAt).toLocaleString())] });
        }
        const val = sub.data[f.id];
        const strVal = val ? (Array.isArray(val) ? val.join(", ") : val) : "";
        return new TableCell({ children: [new Paragraph(strVal)] });
      })
    }))
  ];

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Responses", bold: true, size: 36 })],
            spacing: { after: 160 },
          }),
          new Table({ rows: tableRows })
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, `${fileName}.docx`);
}
