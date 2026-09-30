"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NamesInputPanel } from "@/components/groupify/names-input-panel";
import { PanelSwitcher } from "@/components/groupify/panel-switcher";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { RecentGroupings } from "@/components/groupify/recent-groupings";
import { RulesPanel } from "@/components/groupify/rules-panel";
import { WhatsNewBanner } from "@/components/groupify/whats-new-banner";
import { Sidebar } from "@/components/groupify/sidebar";
import type { ExportFormat, Group } from "@/components/groupify/types";
import { useGrouping } from "@/components/groupify/use-grouping";
import { exportGroups } from "@/components/groupify/utils";
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

type ActivePanel = "input" | "results";

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
  const [activePanel, setActivePanel] = useState<ActivePanel>("input");
  const [copiedText, setCopiedText] = useState(false);
  const [recent, setRecent] = useState<SavedGrouping[]>(() => loadRecent());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clear the fragment once consumed so a refresh doesn't re-import over the user's edits.
  useEffect(() => {
    if (!handoff) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    toast.success(`Imported ${handoff.names.length} names from Jotter`);
  }, [handoff]);

  const people = useMemo(() => parseNames(names), [names]);
  const grouping = useGrouping(people, draft ?? undefined);
  const { groups, hasResults, settings, restore, clearResults } = grouping;

  const nameCount = people.length;
  const tags = useMemo(() => collectTags(people), [people]);
  const totalGrouped = groups.reduce((sum: number, group: Group) => sum + group.members.length, 0);

  // A balance choice only makes sense while some names carry a tag.
  const balanceBy = tags.length > 0 ? grouping.balanceBy : null;

  // Save the draft shortly after the user stops changing things.
  useEffect(() => {
    const id = setTimeout(() => saveDraft({ names, ...settings }), 500);
    return () => clearTimeout(id);
  }, [names, settings]);

  const handleNamesChange = (value: string) => {
    setNames(value);
    if (!value.trim()) {
      clearResults();
      setActivePanel("input");
    }
  };

  const handleGenerate = useCallback(async () => {
    const result = await grouping.generate();
    if (!result) {
      if (nameCount === 0) textareaRef.current?.focus();
      return;
    }
    setActivePanel("results");

    const entry: SavedGrouping = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      names,
      groups: result,
    };
    setRecent((prev) => {
      const next = addRecent(entry, prev);
      saveRecent(next);
      return next;
    });
  }, [grouping, names, nameCount]);

  const handleRestore = (item: SavedGrouping) => {
    setNames(item.names);
    restore(item.groups);
    setActivePanel("results");
    toast.success("Restored");
  };

  const handleClearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  const handleExport = async (format: ExportFormat) => {
    if (groups.length === 0) return;

    const id = toast.loading(
      `Preparing ${format === "excel" ? "Excel" : "Word"} file...`,
    );

    try {
      await exportGroups(groups, format);
      toast.dismiss(id);
      toast.success("File downloaded!");
    } catch {
      toast.dismiss(id);
      toast.error("Export failed - please try again");
    }
  };

  const groupsAsText = () =>
    groups
      .map(
        (group: Group) =>
          `${group.label}\n${group.members.map((member: string, index: number) => `${index + 1}. ${member}`).join("\n")}`,
      )
      .join("\n\n");

  const handleCopyText = async () => {
    if (groups.length === 0) return;

    const text = groupsAsText();

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  const handleExample = () => {
    setNames(EXAMPLE_NAMES);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleClear = () => {
    setNames("");
    clearResults();
    clearDraft();
    setActivePanel("input");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <>
      <WhatsNewBanner />
      <PanelSwitcher
        hasResults={hasResults}
        activePanel={activePanel}
        groupsCount={groups.length}
        onChange={setActivePanel}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid">
          <div
            className={`col-start-1 row-start-1 transition-all duration-300 ${
              activePanel === "input" || !hasResults
                ? "opacity-100 z-10 translate-x-0"
                : "opacity-0 -z-10 -translate-x-4 pointer-events-none invisible"
            }`}
          >
            <NamesInputPanel
              names={names}
              onNamesChange={handleNamesChange}
              onClear={handleClear}
              textareaRef={textareaRef}
              onExample={handleExample}
              headerExtra={
                <RecentGroupings items={recent} onRestore={handleRestore} onClear={handleClearRecent} />
              }
            />
          </div>
          <div
            className={`col-start-1 row-start-1 transition-all duration-300 ${
              activePanel === "results" && hasResults
                ? "opacity-100 z-10 translate-x-0"
                : "opacity-0 -z-10 translate-x-4 pointer-events-none invisible"
            }`}
          >
            {handoff?.returnTo && hasResults && (
              <a
                href={buildJotterDraftUrl(handoff.returnTo, handoff.title ? `${handoff.title}: groups` : "Groups", groupsAsText())}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent"
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
            />
          </div>
        </div>

        <Sidebar
          groupBy={grouping.by}
          size={grouping.size}
          groupCount={grouping.groupCount}
          mode={grouping.mode}
          isWorking={grouping.isWorking}
          nameCount={nameCount}
          hasResults={hasResults}
          copiedText={copiedText}
          estGroups={nameCount >= 2 ? grouping.groupCount : 0}
          groupsCount={groups.length}
          onGroupByChange={grouping.onGroupByChange}
          onSizeChange={grouping.onSizeChange}
          onGroupCountChange={grouping.onGroupCountChange}
          onModeChange={grouping.onModeChange}
          onGenerate={handleGenerate}
          onExport={handleExport}
          onCopyText={handleCopyText}
          rules={
            <RulesPanel
              people={people}
              rules={grouping.rules}
              onAdd={grouping.addRule}
              onRemove={grouping.removeRule}
              balanceOptions={tags.length > 0 ? [{ key: TAG_KEY, label: "Tag (text after | in a name)" }] : []}
              balanceBy={balanceBy}
              onBalanceChange={grouping.setBalanceBy}
            />
          }
        />
      </div>
    </>
  );
}
