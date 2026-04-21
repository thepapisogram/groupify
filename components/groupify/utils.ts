import type { DistributionMode, ExportFormat, Group } from "@/components/groupify/types";

const HUES = [185, 200, 220, 260, 160, 340, 35, 280];

export function buildGroups(
  raw: string,
  size: number,
  mode: DistributionMode,
): Group[] {
  const names = raw
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0 || size < 2) return [];

  const pool = [...names];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const count = Math.floor(pool.length / size);
  const extra = pool.length % size;
  const buckets: string[][] = Array.from({ length: count }, (_, index) =>
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

  return buckets.map((members, index) => ({
    id: index + 1,
    label: `Group ${index + 1}`,
    members,
    hue: HUES[index % HUES.length],
  }));
}

export async function exportGroups(groups: Group[], format: ExportFormat) {
  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Groups");

    groups.forEach((group, groupIndex) => {
      const titleRow = sheet.addRow([group.label]);
      titleRow.font = { bold: true, size: 15 };

      group.members.forEach((member) => {
        const row = sheet.addRow([member]);
        row.font = { size: 12 };
      });

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
            (member) =>
              new Paragraph({
                children: [new TextRun({ text: member, size: 26 })],
              }),
          ),
          new Paragraph(""),
        ]),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, "Groupify.docx");
}
