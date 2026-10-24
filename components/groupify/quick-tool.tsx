"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiFileExcel2Line,
  RiPencilLine,
} from "@remixicon/react";
import { DownloadMenu } from "@/components/groupify/download-menu";
import { FileImportPanel } from "@/components/groupify/file-import-panel";
import { GenerateButton } from "@/components/groupify/generate-button";
import { GroupSettings, peopleCount } from "@/components/groupify/group-settings";
import { NamesInputPanel } from "@/components/groupify/names-input-panel";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { RecentGroupings } from "@/components/groupify/recent-groupings";
import { RulesPanel, type BalanceOption } from "@/components/groupify/rules-panel";
import { Stepper, type Step } from "@/components/groupify/stepper";
import { WhatsNewBanner } from "@/components/groupify/whats-new-banner";
import type { ExportFormat, Group } from "@/components/groupify/types";
import { useGrouping } from "@/components/groupify/use-grouping";
import { defaultColumns, exportGroupTable } from "@/components/groupify/utils";
import { Button } from "@/components/ui/button";
import { cellText, type ExportColumn } from "@/lib/group-export";
import { collectTags, parseNames, TAG_KEY } from "@/lib/grouping";
import { buildJotterDraftUrl, parseJotterHandoff } from "@/lib/jotter-handoff";
import {
  addRecent,
  clearDraft,
  loadDraft,
  loadRecent,
  saveDraft,
  saveRecent,
  type SavedGrouping,
} from "@/lib/local-store";
import {
  MAX_FILE_BYTES,
  balanceColumns,
  baseFileName,
  fileSourceFromSheet,
  parseSpreadsheet,
  rowsToPeople,
  type FileSource,
  type SheetTable,
} from "@/lib/spreadsheet";

type Source = "paste" | "file";

/** Columns for groupings restored from history, which may not match what's loaded now. */
interface RestoredMeta {
  columns: ExportColumn[];
  nameColumns: string[];
  title?: string;
}

const EXAMPLE_NAMES = [
  "Ama Mensah",
  "Kofi Boateng",
  "Esi Owusu",
  "Yaw Asante",
  "Akua Darko",
  "Kwame Adjei",
  "Abena Ofori",
  "Kojo Quaye",
  "Efua Tetteh",
  "Nana Yeboah",
  "Adwoa Sarpong",
  "Kwesi Appiah",
].join("\n");

const SOURCES: { id: Source; label: string; Icon: typeof RiEditLine }[] = [
  { id: "paste", label: "Paste a list", Icon: RiEditLine },
  { id: "file", label: "Upload a file", Icon: RiFileExcel2Line },
];

const toColumns = (keys: string[]): ExportColumn[] => keys.map((key) => ({ key, label: key }));

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-syne text-lg font-bold text-foreground">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm text-primary">{n}</span>
      {children}
    </h2>
  );
}

/**
 * The quick grouping tool. Rendered only in the browser (see QuickToolLoader), so
 * it can read the saved draft synchronously when its state is first created.
 */
export function QuickTool() {
  const [draft] = useState(() => loadDraft());
  // A list sent from Jotter (`#jotter=…`) takes priority over the saved draft.
  const [handoff] = useState(() =>
    typeof window === "undefined"
      ? null
      : parseJotterHandoff(window.location.hash, process.env.NEXT_PUBLIC_JOTTER_URL),
  );
  const [names, setNames] = useState(() => (handoff ? handoff.names.join("\n") : (draft?.names ?? "")));
  const [source, setSource] = useState<Source>(() => (!handoff && draft?.source === "file" && draft.file ? "file" : "paste"));
  const [file, setFile] = useState<FileSource | null>(() => draft?.file ?? null);
  const [sheets, setSheets] = useState<SheetTable[]>([]);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileSaved, setFileSaved] = useState(true);
  const [step, setStep] = useState<Step>("people");
  const [restored, setRestored] = useState<RestoredMeta | null>(null);
  const [recent, setRecent] = useState<SavedGrouping[]>(() => loadRecent());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Clear the fragment once consumed so a refresh doesn't re-import over the user's edits.
  useEffect(() => {
    if (!handoff) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    toast.success(`Imported ${handoff.names.length} names from Jotter`);
  }, [handoff]);

  const usingFile = source === "file" && file !== null;
  const people = useMemo(
    () => (usingFile ? rowsToPeople(file.rows, file.nameColumns) : parseNames(names)),
    [usingFile, file, names],
  );
  const grouping = useGrouping(people, draft ?? undefined);
  const { groups, hasResults, settings, restore, clearResults, setBalanceBy } = grouping;

  const nameCount = people.length;
  const duplicates = usingFile ? 0 : nameCount - new Set(people.map((p) => p.key)).size;
  const tags = useMemo(() => (usingFile ? [] : collectTags(people)), [usingFile, people]);
  const totalGrouped = groups.reduce((sum: number, group: Group) => sum + group.members.length, 0);

  const balanceOptions = useMemo<BalanceOption[]>(
    () =>
      usingFile
        ? balanceColumns(file).map((c) => ({ key: c, label: c }))
        : tags.length > 0
          ? [{ key: TAG_KEY, label: "Tag (text after | in a name)" }]
          : [],
    [usingFile, file, tags.length],
  );

  // Drop a balance choice that no longer exists (e.g. a column of another file).
  useEffect(() => {
    if (grouping.balanceBy && !balanceOptions.some((o) => o.key === grouping.balanceBy)) setBalanceBy(null);
  }, [balanceOptions, grouping.balanceBy, setBalanceBy]);

  // What the group cards show under each name, and what downloads contain.
  const { exportColumns, detailColumns, title } = useMemo(() => {
    if (restored) {
      return {
        exportColumns: restored.columns,
        detailColumns: restored.columns.filter((c) => !restored.nameColumns.includes(c.key)),
        title: restored.title,
      };
    }
    if (usingFile) {
      return {
        exportColumns: toColumns(file.outputColumns),
        detailColumns: toColumns(file.outputColumns.filter((c) => !file.nameColumns.includes(c))),
        title: baseFileName(file.fileName),
      };
    }
    const columns = defaultColumns(groups);
    return { exportColumns: columns, detailColumns: columns.filter((c) => c.key === TAG_KEY), title: undefined };
  }, [restored, usingFile, file, groups]);

  // Save the draft shortly after the user stops changing things.
  useEffect(() => {
    const id = setTimeout(() => setFileSaved(saveDraft({ names, ...settings, source, file })), 500);
    return () => clearTimeout(id);
  }, [names, settings, source, file]);

  const goTo = useCallback((next: Step) => {
    setStep(next);
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: window.scrollY + top.getBoundingClientRect().top - 12, behavior: "smooth" });
    }
  }, []);

  const resetResults = useCallback(() => {
    clearResults();
    setRestored(null);
  }, [clearResults]);

  const handleNamesChange = (value: string) => {
    setNames(value);
    if (!value.trim() && hasResults) resetResults();
  };

  const handleGenerate = useCallback(async () => {
    const result = await grouping.generate();
    if (!result) {
      if (nameCount === 0) goTo("people");
      return;
    }
    setRestored(null);
    goTo("results");

    const entry: SavedGrouping = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      names: usingFile ? "" : names,
      groups: result,
      ...(usingFile
        ? { columns: toColumns(file.outputColumns), nameColumns: file.nameColumns, title: baseFileName(file.fileName) }
        : {}),
    };
    setRecent((prev) => {
      const next = addRecent(entry, prev);
      saveRecent(next);
      return next;
    });
  }, [grouping, names, nameCount, usingFile, file, goTo]);

  // Ctrl/Cmd + Enter generates from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !grouping.isWorking) {
        event.preventDefault();
        void handleGenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleGenerate, grouping.isWorking]);

  const handleRestore = (item: SavedGrouping) => {
    if (item.columns) {
      setRestored({ columns: item.columns, nameColumns: item.nameColumns ?? [], title: item.title });
    } else {
      setRestored(null);
      setNames(item.names);
      setSource("paste");
    }
    restore(item.groups);
    goTo("results");
    toast.success("Restored");
  };

  const handleClearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  const handlePickFile = async (picked: File) => {
    if (picked.size > MAX_FILE_BYTES) {
      toast.error("That file is over 10 MB. Try saving just the sheet you need.");
      return;
    }
    setFileBusy(true);
    try {
      const { sheets: found } = await parseSpreadsheet(await picked.arrayBuffer());
      if (found.length === 0) {
        toast.error("No rows found. Check the file has a header row and some data.");
        return;
      }
      const next = fileSourceFromSheet(picked.name, found[0]);
      setSheets(found);
      setFile(next);
      setSource("file");
      resetResults();
      if (found[0].truncated) toast.warning("Big file: only the first 5,000 rows and 50 columns were kept.");
      else toast.success(`${next.rows.length} rows and ${next.columns.length} columns found`);
    } catch {
      toast.error("Couldn't read that file. Try saving it as .xlsx or .csv.");
    } finally {
      setFileBusy(false);
    }
  };

  const handleSheetChange = (name: string) => {
    const sheet = sheets.find((s) => s.name === name);
    if (!sheet || !file) return;
    setFile(fileSourceFromSheet(file.fileName, sheet));
    resetResults();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setSheets([]);
    resetResults();
    setStep("people");
  };

  const handleSourceChange = (next: Source) => {
    if (next === source) return;
    setSource(next);
    resetResults();
    if (next === "paste") setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleDrop = (event: DragEvent) => {
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    event.preventDefault();
    void handlePickFile(dropped);
  };

  const handleExport = async (format: ExportFormat) => {
    if (groups.length === 0) return;
    const label = format === "excel" ? "Excel" : format === "word" ? "Word" : "CSV";
    const id = toast.loading(`Preparing ${label} file…`);
    try {
      await exportGroupTable(groups, exportColumns, format, title);
      toast.success("File downloaded", { id });
    } catch {
      toast.error("Export failed. Please try again.", { id });
    }
  };

  const groupsAsText = () =>
    groups
      .map((group: Group) => {
        const lines = group.members.map((member: string, i: number) => {
          const details = detailColumns.map((c) => cellText(group, i, c)).filter(Boolean);
          return `${i + 1}. ${member}${details.length ? ` (${details.join(", ")})` : ""}`;
        });
        return `${group.label}\n${lines.join("\n")}`;
      })
      .join("\n\n");

  const handleCopyText = async () => {
    if (groups.length === 0) return;
    try {
      await navigator.clipboard.writeText(groupsAsText());
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  const handleExample = () => {
    setNames(EXAMPLE_NAMES);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleClear = () => {
    if (usingFile) {
      handleRemoveFile();
    } else {
      setNames("");
      resetResults();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
    setStep("people");
    if (!usingFile) clearDraft();
  };

  const showResults = step === "results" && hasResults;
  const hasInput = usingFile || names.trim().length > 0;
  const downloadNote = `${exportColumns.length} column${exportColumns.length === 1 ? "" : "s"}: ${exportColumns
    .map((c) => c.label)
    .join(", ")}`;

  const peopleSection = (
    <section className="surface space-y-4 p-4 sm:p-6" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle n={1}>Add people</SectionTitle>
        <div className="flex items-center gap-1">
          <RecentGroupings items={recent} onRestore={handleRestore} onClear={handleClearRecent} />
          {hasInput && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <RiDeleteBin6Line className="size-4" />
              <span className="hidden sm:inline">Clear</span>
              <span className="sr-only sm:hidden">Clear</span>
            </button>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="How to add people" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {SOURCES.map(({ id, label, Icon }) => {
          const active = source === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSourceChange(id)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-all ${
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>

      {source === "paste" ? (
        <NamesInputPanel
          names={names}
          onNamesChange={handleNamesChange}
          textareaRef={textareaRef}
          count={nameCount}
          duplicates={duplicates}
          onExample={handleExample}
        />
      ) : (
        <>
          <FileImportPanel
            file={file}
            sheets={sheets}
            busy={fileBusy}
            onPick={handlePickFile}
            onChange={setFile}
            onSheetChange={handleSheetChange}
            onRemove={handleRemoveFile}
          />
          {file && !fileSaved && (
            <p className="text-xs text-muted-foreground">
              This file is too large to remember on this device, so you&apos;ll need to choose it again next visit.
            </p>
          )}
        </>
      )}
    </section>
  );

  const resultsSection = (
    <section className="space-y-4">
      {handoff?.returnTo && (
        <a
          href={buildJotterDraftUrl(handoff.returnTo, handoff.title ? `${handoff.title}: groups` : "Groups", groupsAsText())}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
        >
          Save to Jotter
          <span className="text-xs text-muted-foreground">({new URL(handoff.returnTo).host})</span>
        </a>
      )}
      <ResultsPanel
        groups={groups}
        totalGrouped={totalGrouped}
        warnings={grouping.warnings}
        onShuffle={grouping.reshuffle}
        onRename={grouping.rename}
        onMoveMember={grouping.move}
        onUndo={grouping.undo}
        canUndo={grouping.canUndo}
        detailColumns={detailColumns}
        heading={
          <div className="min-w-0">
            <SectionTitle n={3}>Your groups</SectionTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {groups.length} groups · {peopleCount(totalGrouped)}
              {title ? ` · ${title}` : ""}
            </p>
          </div>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => goTo("people")}
              className="hidden min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground lg:inline-flex"
            >
              <RiPencilLine className="size-4" />
              Edit people
            </button>
            <DownloadMenu
              onExport={handleExport}
              onCopyText={handleCopyText}
              note={downloadNote}
              className="hidden lg:inline-flex"
            />
          </>
        }
      />
    </section>
  );

  return (
    <div ref={topRef}>
      <WhatsNewBanner />

      <Stepper
        className="sticky top-2 z-30 mb-4 lg:hidden print:hidden"
        current={showResults ? "results" : step === "results" ? "people" : step}
        enabled={{ people: true, setup: true, results: hasResults }}
        done={{ people: nameCount > 0, setup: hasResults, results: false }}
        onChange={goTo}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className={`min-w-0 ${step === "setup" ? "hidden lg:block" : ""}`}>
          {showResults ? resultsSection : peopleSection}
        </div>

        <aside className={`space-y-4 print:hidden ${step === "setup" ? "" : "hidden lg:block"}`}>
          <section className="surface space-y-5 p-4 sm:p-6">
            <SectionTitle n={2}>Set up groups</SectionTitle>
            <GroupSettings
              groupBy={grouping.by}
              size={grouping.size}
              groupCount={grouping.groupCount}
              mode={grouping.mode}
              nameCount={nameCount}
              onGroupByChange={grouping.onGroupByChange}
              onSizeChange={grouping.onSizeChange}
              onGroupCountChange={grouping.onGroupCountChange}
              onModeChange={grouping.onModeChange}
            />
            <div className="hidden space-y-2 lg:block">
              <GenerateButton
                isWorking={grouping.isWorking}
                disabled={nameCount === 0}
                hasResults={hasResults}
                onClick={handleGenerate}
              />
              <p className="text-center text-xs text-muted-foreground">
                or press <kbd className="rounded border border-border bg-muted px-1 font-sans">Ctrl</kbd> +{" "}
                <kbd className="rounded border border-border bg-muted px-1 font-sans">Enter</kbd>
              </p>
            </div>
          </section>

          <RulesPanel
            people={people}
            rules={grouping.rules}
            onAdd={grouping.addRule}
            onRemove={grouping.removeRule}
            balanceOptions={balanceOptions}
            balanceBy={balanceOptions.length > 0 ? grouping.balanceBy : null}
            onBalanceChange={grouping.setBalanceBy}
          />
        </aside>
      </div>

      {/* Mobile: the next action always sits under the thumb. */}
      <div className="action-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 px-4 pt-3 backdrop-blur-lg lg:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          {showResults ? (
            <>
              <Button type="button" variant="outline" size="lg" className="px-4" onClick={() => goTo("setup")}>
                <RiArrowLeftLine />
                Settings
              </Button>
              <DownloadMenu
                onExport={handleExport}
                onCopyText={handleCopyText}
                note={downloadNote}
                side="top"
                className="h-11 flex-1 text-base"
              />
            </>
          ) : step === "setup" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-12 shrink-0 rounded-2xl"
                aria-label="Back to people"
                onClick={() => goTo("people")}
              >
                <RiArrowLeftLine />
              </Button>
              <GenerateButton
                isWorking={grouping.isWorking}
                disabled={nameCount === 0}
                hasResults={hasResults}
                onClick={handleGenerate}
              />
            </>
          ) : (
            <Button
              type="button"
              size="xl"
              className="w-full font-syne tracking-wide"
              disabled={nameCount === 0}
              onClick={() => goTo("setup")}
            >
              {nameCount === 0 ? "Add people to continue" : `Next: set up ${peopleCount(nameCount)}`}
              <RiArrowRightLine />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
