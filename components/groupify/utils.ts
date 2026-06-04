import type { DistributionMode, ExportFormat, Group } from "@/components/groupify/types";
import type { FormField } from "@/components/groupify/form-builder";

const HUES = [185, 200, 220, 260, 160, 340, 35, 280];

export function buildGroups(
  rawOrItems: string | { label: string; data: Record<string, string> }[],
  groupBy: "size" | "count",
  value: number,
  mode: DistributionMode,
): Group[] {
  let pool: { label: string; data?: Record<string, string> }[] = [];

  if (typeof rawOrItems === "string") {
    const names = rawOrItems
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length === 0 || value < 1) return [];
    pool = names.map((n) => ({ label: n }));
  } else {
    if (rawOrItems.length === 0 || value < 1) return [];
    pool = [...rawOrItems];
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (groupBy === "count") {
    const count = Math.min(value, pool.length);
    if (count <= 0) return [];

    const baseSize = Math.floor(pool.length / count);
    const extra = pool.length % count;

    const buckets: { label: string; data?: Record<string, string> }[][] = Array.from({ length: count }, (_, index) =>
      pool.slice(index * baseSize, index * baseSize + baseSize),
    );

    if (extra > 0) {
      const tail = pool.slice(count * baseSize);
      tail.forEach((member, index) => buckets[index % buckets.length].push(member));
    }

    return buckets.map((bucket, index) => ({
      id: index + 1,
      label: `Group ${index + 1}`,
      members: bucket.map(m => m.label),
      rawMembers: bucket.map(m => m.data || {}),
      hue: HUES[index % HUES.length],
    }));
  }

  const size = value;
  const count = Math.floor(pool.length / size);
  const extra = pool.length % size;
  const buckets: { label: string; data?: Record<string, string> }[][] = Array.from({ length: count }, (_, index) =>
    pool.slice(index * size, index * size + size),
  );

  if (extra > 0) {
    const tail = pool.slice(count * size);
    if (mode === "best" && buckets.length > 0) {
      tail.forEach((member, index) => buckets[index % buckets.length].push(member));
    } else {
      buckets.push(tail);
    }
  }

  return buckets.map((bucket, index) => ({
    id: index + 1,
    label: `Group ${index + 1}`,
    members: bucket.map(m => m.label),
    rawMembers: bucket.map(m => m.data || {}),
    hue: HUES[index % HUES.length],
  }));
}

export async function exportGroups(groups: Group[], format: ExportFormat, fields?: FormField[]) {
  const hasFields = fields && fields.length > 0;
  
  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Groups");

    groups.forEach((group, groupIndex) => {
      const titleRow = sheet.addRow([group.label]);
      titleRow.font = { bold: true, size: 15 };

      if (hasFields) {
        const headerRow = sheet.addRow(fields.map(f => f.label));
        headerRow.font = { bold: true, size: 12 };
        
        group.rawMembers?.forEach((member) => {
          const row = sheet.addRow(fields.map(f => member[f.id] || ""));
          row.font = { size: 12 };
        });
      } else {
        group.members.forEach((member) => {
          const row = sheet.addRow([member]);
          row.font = { size: 12 };
        });
      }

      if (groupIndex < groups.length - 1) {
        sheet.addRow([]);
      }
    });

    sheet.columns.forEach((column) => {
      column.width = 26;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), "Groupify.xlsx");
    return;
  }

  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const { saveAs } = await import("file-saver");
  const document = new Document({
    sections: [
      {
        children: groups.flatMap((group) => [
          new Paragraph({
            children: [new TextRun({ text: group.label, bold: true, size: 36 })],
            spacing: { after: 160 },
          }),
          ...group.members.map(
            (member, memberIndex) => {
              if (hasFields && group.rawMembers) {
                const rawMember = group.rawMembers[memberIndex];
                const parts = fields.map(f => `${f.label}: ${rawMember[f.id] || ""}`).join(" | ");
                return new Paragraph({
                  children: [new TextRun({ text: parts, size: 26 })],
                });
              } else {
                return new Paragraph({
                  children: [new TextRun({ text: member, size: 26 })],
                });
              }
            }
          ),
          new Paragraph(""),
        ]),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, "Groupify.docx");
}
