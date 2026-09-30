import type { ExportFormat, Group } from "@/components/groupify/types";
import type { FormField } from "@/components/groupify/form-builder";
import { loadXLSX, loadDocx } from "@/lib/export";

export async function exportGroups(groups: Group[], format: ExportFormat, fields?: FormField[]) {
  const hasFields = fields && fields.length > 0;

  if (format === "excel") {
    const { XLSX, saveAs } = await loadXLSX();
    
    // Create rows for XLSX
    const rows: string[][] = [];
    
    groups.forEach((group, groupIndex) => {
      rows.push([group.label]);
      
      if (hasFields && fields) {
        rows.push(fields.map(f => f.label));
        group.rawMembers?.forEach((member) => {
          rows.push(fields.map(f => {
            const val = member[f.id];
            if (!val) return "";
            return Array.isArray(val) ? val.join(", ") : String(val);
          }));
        });
      } else {
        group.members.forEach((member) => {
          rows.push([member]);
        });
      }

      if (groupIndex < groups.length - 1) {
        rows.push([]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Groups");
    
    // Set column width
    worksheet["!cols"] = [{ wch: 26 }];
    
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), "Groupify.xlsx");
    return;
  }

  const { Document, Packer, Paragraph, TextRun, saveAs } = await loadDocx();
  const document = new Document({
    sections: [
      {
        children: groups.flatMap((group) => [
          new Paragraph({
            children: [new TextRun({ text: group.label, bold: true, size: 36 })],
            spacing: { after: 160 },
          }),
          ...group.members.map((member, memberIndex) => {
            if (hasFields && group.rawMembers) {
              const rawMember = group.rawMembers[memberIndex];
              const parts = fields.map(f => {
                const val = rawMember[f.id];
                const strVal = val ? (Array.isArray(val) ? val.join(", ") : val) : "";
                return `${f.label}: ${strVal}`;
              }).join(" | ");
              return new Paragraph({
                children: [new TextRun({ text: parts, size: 26 })],
              });
            } else {
              return new Paragraph({
                children: [new TextRun({ text: member, size: 26 })],
              });
            }
          }),
          new Paragraph(""),
        ]),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, "Groupify.docx");
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
