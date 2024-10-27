import { forwardRef, ForwardedRef, useState } from "react";
import clsx from 'clsx';

import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

const Modal = forwardRef(
  ({ batches }:{batches:Array<Array<string>>}, ref: ForwardedRef<HTMLDialogElement>) => {

    const [fileType, setFileType] = useState("excel");
    const [titleSize, setTitleSize] = useState(18);
    const [nameSize, setNameSize] = useState(14);

    const handleDownload = async () => {
      if(fileType === "excel") handleExcelDownload();
      else handleWordDownload();
    }


    // Microsoft Excel Download
    const handleExcelDownload = async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Groups");

      const groups = batches.map((batch:Array<string>, index:number) => ({
        title: `Group ${index + 1}`,
        members: batch,
      }));


      groups.forEach((group, index) => {
        // Add group title with bold font and font size 18
        const titleRow = worksheet.addRow([group.title]);
        titleRow.font = { bold: true, size: titleSize };

        // Add members below the title
        group.members.forEach((member) => {
          const memberRow = worksheet.addRow([member]);
          memberRow.font = { size: nameSize }; // Optional: Set a smaller font size for members
        });

        // Add a blank row between groups
        if (index < groups.length - 1) {
          worksheet.addRow([]);
        }
      });

      // Adjust column width for readability
      worksheet.columns.forEach((column) => {
        column.width = 20;
      });

      // Generate the Excel file as a Blob
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/octet-stream" });

      saveAs(blob, "Groupify_Groups.xlsx");
    };


    // Microsoft Word Download
    const handleWordDownload = () => {
      const groupedData = batches.map(
        (batch: Array<string>, index: number) => ({
          title: `Group ${index + 1}`,
          members: batch,
        })
      );

      // Initialize a new Document instance
      const doc = new Document({
        sections: [
          {
            children: groupedData.flatMap((group) => [
              // Group title as bold and larger font size
              new Paragraph({
                children: [
                  new TextRun({
                    text: group.title,
                    bold: true,
                    size: titleSize * 2,
                  }),
                ],
                spacing: { after: 200 }, // Space after title
              }),
              // Group members each in a new paragraph
              ...group.members.map(
                (member) =>
                  new Paragraph({
                    children: [new TextRun({ text: member, size: nameSize * 2 })],
                  })
              ),
              // Blank paragraph between groups
              new Paragraph(""),
            ]),
          },
        ],
      });

      // Generate the Word document as a Blob
      Packer.toBlob(doc).then((blob:any) => {
        saveAs(blob, "Groupify_Groups.docx");
      });
    };


    return (
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg">Groupify</h3>
          <div className="text-center mt-5">
            <p className="text-lg">Set Font Sizes</p>
            <div className="grid grid-cols-2 w-full mt-2 gap-x-2">
              <div className="grid grid-cols-2 bg-zinc-200 dark:bg-zinc-900 rounded-lg">
                <p className="my-auto">Title (px)</p>
                <input
                  type="number"
                  className="p-2 rounded-lg outline-none text-center bg-transparent"
                  placeholder="px"
                  value={titleSize}
                  onChange={(e) => setTitleSize(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 bg-zinc-200 dark:bg-zinc-900 rounded-lg">
                <p className="my-auto">Name (px)</p>
                <input
                  type="number"
                  className="p-2 rounded-lg outline-none text-center bg-transparent"
                  placeholder="px"
                  value={nameSize}
                  onChange={(e) => setNameSize(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <div className="text-center mt-5">
            <p className="text-lg">Choose File Type</p>
            <div className="flex items-center justify-center w-full">
              <button
                className={clsx(
                  "card grid flex-grow place-items-center border-2 dark:border-teal-900 rounded-lg h-10",
                  {
                    "text-slate-500 dark:text-teal-400 bg-zinc-300 dark:bg-zinc-900 border-slate-500 dark:border-zinc-900":
                      fileType === "excel",
                    "text-white dark:text-zinc-200 bg-slate-500 dark:bg-zinc-700 border-slate-600 hover:bg-slate-600 dark:hover:bg-zinc-900 transition-colors":
                      fileType !== "excel",
                  }
                )}
                onClick={() => setFileType("excel")}
              >
                <p>Excel</p>
              </button>
              <div className="divider divider-horizontal">OR</div>
              <button
                className={clsx(
                  "card grid flex-grow place-items-center border-2 dark:border-teal-900 rounded-lg h-10",
                  {
                    "text-slate-500 dark:text-teal-400 bg-zinc-300 dark:bg-zinc-900 border-slate-500 dark:border-zinc-900":
                      fileType === "word",
                    "text-white dark:text-zinc-200 bg-slate-500 dark:bg-zinc-700 border-slate-600 hover:bg-slate-600 dark:hover:bg-zinc-900 transition-colors":
                      fileType !== "word",
                  }
                )}
                onClick={() => setFileType("word")}
              >
                <p>Word</p>
              </button>
            </div>
          </div>
          <div className="modal-action">
            <button onClick={handleDownload} className="btn">
              Download {fileType} file
            </button>
          </div>
        </div>
      </dialog>
    );
  }
);

export default Modal;
