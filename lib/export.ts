/**
 * lib/export.ts
 *
 * Single dynamic-import boundary for all export dependencies.
 * Both exceljs and docx are loaded in one import() call so Webpack/Turbopack
 * only creates 2 chunks (one per library) instead of 4 separate ones.
 *
 * Re-exports everything utils.ts needs so the calling code doesn't change.
 */

export async function loadExcelJS() {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);
  return { ExcelJS, saveAs };
}

export async function loadDocx() {
  const [docx, { saveAs }] = await Promise.all([
    import("docx"),
    import("file-saver"),
  ]);
  return { ...docx, saveAs };
}
