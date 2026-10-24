"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiFileExcel2Line,
  RiLoader4Line,
  RiRefreshLine,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCEPTED_FILE_TYPES, type FileSource, type SheetTable } from "@/lib/spreadsheet";

interface FileImportPanelProps {
  file: FileSource | null;
  /** Every usable sheet of the workbook just opened (empty after a reload: only the chosen one is saved). */
  sheets: SheetTable[];
  busy: boolean;
  onPick: (file: File) => void;
  onChange: (next: FileSource) => void;
  onSheetChange: (sheetName: string) => void;
  onRemove: () => void;
}

const PREVIEW_ROWS = 6;

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all disabled:cursor-not-allowed ${
        active
          ? "border-primary/60 bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
          active ? "bg-primary text-primary-foreground" : "border border-muted-foreground/40"
        }`}
      >
        {active && <RiCheckLine className="size-3" />}
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}

/** Drop zone before a file is chosen; column choices and a preview after. */
export function FileImportPanel({ file, sheets, busy, onPick, onChange, onSheetChange, onRemove }: FileImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const ids = useId();

  const choose = () => inputRef.current?.click();

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onPick(dropped);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_FILE_TYPES}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        const picked = event.target.files?.[0];
        if (picked) onPick(picked);
        event.target.value = "";
      }}
    />
  );

  if (!file) {
    return (
      <div className="space-y-3">
        {input}
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
            dragging ? "border-primary bg-accent" : "border-border bg-muted/30 hover:border-primary/50 hover:bg-accent/60"
          }`}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {busy ? <RiLoader4Line className="size-7 animate-spin" /> : <RiUploadCloud2Line className="size-7" />}
          </span>
          <span className="text-base font-semibold text-foreground">
            {busy ? "Reading your file…" : "Choose a spreadsheet"}
          </span>
          <span className="max-w-xs text-sm text-muted-foreground">
            <span className="hidden sm:inline">or drag it here. </span>Excel, CSV or ODS, up to 10 MB. The first row
            should hold the column names.
          </span>
        </button>
        <p className="text-xs text-muted-foreground">
          Your file is read on this device and never uploaded to a server.
        </p>
      </div>
    );
  }

  const shown = file.columns.filter((c) => file.outputColumns.includes(c));
  const toggleName = (column: string) => {
    const has = file.nameColumns.includes(column);
    if (has && file.nameColumns.length === 1) return;
    const next = has ? file.nameColumns.filter((c) => c !== column) : file.columns.filter((c) => c === column || file.nameColumns.includes(c));
    onChange({ ...file, nameColumns: next });
  };
  const toggleOutput = (column: string) => {
    const has = file.outputColumns.includes(column);
    if (has && file.outputColumns.length === 1) return;
    const next = has
      ? file.outputColumns.filter((c) => c !== column)
      : file.columns.filter((c) => c === column || file.outputColumns.includes(c));
    onChange({ ...file, outputColumns: next });
  };
  const allOn = file.outputColumns.length === file.columns.length;

  return (
    <div
      className="space-y-5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {input}

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <RiFileExcel2Line className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{file.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {file.rows.length} rows · {file.columns.length} columns
            {file.sheetName && sheets.length <= 1 ? ` · ${file.sheetName}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          aria-label="Choose a different file"
          title="Choose a different file"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {busy ? <RiLoader4Line className="size-5 animate-spin" /> : <RiRefreshLine className="size-5" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove file"
          title="Remove file"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <RiCloseLine className="size-5" />
        </button>
      </div>

      {sheets.length > 1 && (
        <div className="space-y-2">
          <label htmlFor={`${ids}-sheet`} className="text-sm font-medium text-foreground">
            Sheet
          </label>
          <Select value={file.sheetName} onValueChange={onSheetChange}>
            <SelectTrigger id={`${ids}-sheet`} className="h-11 w-full rounded-xl border-input bg-card text-base sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sheets.map((sheet) => (
                <SelectItem key={sheet.name} value={sheet.name}>
                  {sheet.name} ({sheet.rows.length} rows)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Name shown on the groups</legend>
        <p className="text-xs text-muted-foreground">Pick more than one to join them, e.g. First name + Surname.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {file.columns.map((column) => (
            <Chip key={column} active={file.nameColumns.includes(column)} onClick={() => toggleName(column)}>
              {column}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-sm font-medium text-foreground">Columns to include</legend>
          <button
            type="button"
            onClick={() =>
              onChange({ ...file, outputColumns: allOn ? file.nameColumns.slice() : file.columns.slice() })
            }
            className="min-h-10 rounded-lg px-2 text-sm font-medium text-primary hover:bg-accent"
          >
            {allOn ? "Names only" : "Select all"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">These appear on each group and in the downloaded file.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {file.columns.map((column) => (
            <Chip key={column} active={file.outputColumns.includes(column)} onClick={() => toggleOutput(column)}>
              {column}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Preview</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                {shown.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    className={`whitespace-nowrap px-3 py-2 font-semibold ${i === 0 ? "sticky left-0 bg-muted" : ""}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {file.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
                <tr key={r} className="border-t border-border">
                  {shown.map((column, i) => (
                    <td
                      key={column}
                      className={`max-w-[16rem] truncate px-3 py-2 ${i === 0 ? "sticky left-0 bg-card font-medium" : "text-muted-foreground"}`}
                    >
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {file.rows.length > PREVIEW_ROWS && (
          <p className="text-xs text-muted-foreground">and {file.rows.length - PREVIEW_ROWS} more rows</p>
        )}
      </div>
    </div>
  );
}
