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
import { Switch } from "@/components/ui/switch";
import {
  ACCEPTED_FILE_TYPES,
  rowLabel,
  type DuplicateReport,
  type FileSource,
  type SheetTable,
} from "@/lib/spreadsheet";

interface FileImportPanelProps {
  file: FileSource | null;
  /** Duplicate rows in `file` and the rows that will be grouped. */
  duplicates: DuplicateReport | null;
  /** Every usable sheet of the workbook just opened (empty after a reload: only the chosen one is saved). */
  sheets: SheetTable[];
  busy: boolean;
  onPick: (file: File) => void;
  onChange: (next: FileSource) => void;
  onSheetChange: (sheetName: string) => void;
  onRemove: () => void;
}

const PREVIEW_ROWS = 6;
const LISTED_DUPLICATES = 50;

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
export function FileImportPanel({
  file,
  duplicates,
  sheets,
  busy,
  onPick,
  onChange,
  onSheetChange,
  onRemove,
}: FileImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);
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
  const toggleMatch = (column: string) => {
    const has = file.duplicateColumns.includes(column);
    if (has && file.duplicateColumns.length === 1) return;
    const next = has
      ? file.duplicateColumns.filter((c) => c !== column)
      : file.columns.filter((c) => c === column || file.duplicateColumns.includes(c));
    onChange({ ...file, duplicateColumns: next });
  };
  const removed = duplicates?.removed ?? [];
  const keptRows = duplicates ? duplicates.keep.map((i) => file.rows[i]) : file.rows;
  const possible = duplicates?.possible ?? [];
  const leftOut = file.rows.length - keptRows.length;
  const removing = leftOut > 0;
  const nameOf = (index: number) => rowLabel(file.rows[index], file.nameColumns, index);

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
            {removing
              ? `${keptRows.length} people (${leftOut} duplicate${leftOut === 1 ? "" : "s"} removed)`
              : `${file.rows.length} rows`}{" "}
            · {file.columns.length} columns
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

      <section
        aria-labelledby={`${ids}-dups`}
        className={`space-y-3 rounded-2xl border p-4 ${
          removed.length + possible.length > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`${ids}-dups`} className="text-sm font-medium text-foreground">
              Duplicates
            </h3>
            <p
              className={`text-sm ${removed.length > 0 ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground"}`}
              aria-live="polite"
            >
              {removed.length === 0
                ? "No exact duplicate rows found."
                : `${removed.length} duplicate row${removed.length === 1 ? "" : "s"} found${
                    file.removeDuplicates ? " and left out" : ""
                  }.`}
            </p>
          </div>
          <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-sm text-foreground">
            <span>Remove</span>
            <Switch
              checked={file.removeDuplicates}
              onCheckedChange={(checked) => onChange({ ...file, removeDuplicates: checked })}
              aria-label="Remove duplicate rows"
            />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs text-muted-foreground">
            Rows count as duplicates when all of these match (ignoring case and spacing):
          </legend>
          <div className="flex flex-wrap gap-2 pt-1">
            {file.columns.map((column) => (
              <Chip key={column} active={file.duplicateColumns.includes(column)} onClick={() => toggleMatch(column)}>
                {column}
              </Chip>
            ))}
          </div>
        </fieldset>

        {removed.length > 0 && (
          <div>
            <button
              type="button"
              aria-expanded={showRemoved}
              onClick={() => setShowRemoved((v) => !v)}
              className="min-h-10 rounded-lg px-1 text-sm font-medium text-primary hover:underline"
            >
              {showRemoved ? "Hide" : "Show"} duplicate rows
            </button>
            {showRemoved && (
              <ul className="mt-1 max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card text-sm">
                {removed.slice(0, LISTED_DUPLICATES).map(({ index, duplicateOf }) => (
                  <li key={index} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 break-words font-medium text-foreground">
                      {nameOf(index)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      entry {index + 1} = entry {duplicateOf + 1}
                    </span>
                  </li>
                ))}
                {removed.length > LISTED_DUPLICATES && (
                  <li className="px-3 py-2 text-xs text-muted-foreground">
                    and {removed.length - LISTED_DUPLICATES} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {file.removeDuplicates && possible.length > 0 && (
          <div className="space-y-2 border-t border-amber-500/20 pt-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm text-foreground">
                <span className="font-medium">
                  {possible.length} possible duplicate{possible.length === 1 ? "" : "s"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Same phone number or email as an earlier row, but other details differ (e.g. a typo in the name).
                  Check them before removing: family members sometimes share a number.
                </span>
              </p>
              <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-sm text-foreground">
                <span>Remove</span>
                <Switch
                  checked={file.removePossibleDuplicates}
                  onCheckedChange={(checked) => onChange({ ...file, removePossibleDuplicates: checked })}
                  aria-label="Remove possible duplicates"
                />
              </label>
            </div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card text-sm">
              {possible.slice(0, LISTED_DUPLICATES).map(({ index, duplicateOf, column }) => (
                <li key={index} className="px-3 py-2">
                  <p className="break-words">
                    <span className="font-medium text-foreground">{nameOf(index)}</span>
                    <span className="text-muted-foreground"> and </span>
                    <span className="font-medium text-foreground">{nameOf(duplicateOf)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Same {column} · entries {duplicateOf + 1} and {index + 1}
                  </p>
                </li>
              ))}
              {possible.length > LISTED_DUPLICATES && (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  and {possible.length - LISTED_DUPLICATES} more
                </li>
              )}
            </ul>
          </div>
        )}
      </section>

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
              {keptRows.slice(0, PREVIEW_ROWS).map((row, r) => (
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
        {keptRows.length > PREVIEW_ROWS && (
          <p className="text-xs text-muted-foreground">and {keptRows.length - PREVIEW_ROWS} more rows</p>
        )}
      </div>
    </div>
  );
}
