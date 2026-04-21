"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import appMeta from "@/data/metadata";
import { NamesInputPanel } from "@/components/groupify/names-input-panel";
import { PageHeader } from "@/components/groupify/page-header";
import { PanelSwitcher } from "@/components/groupify/panel-switcher";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { Sidebar } from "@/components/groupify/sidebar";
import { StatsBar } from "@/components/groupify/stats-bar";
import type { DistributionMode, ExportFormat, Group } from "@/components/groupify/types";
import { buildGroups, exportGroups } from "@/components/groupify/utils";

type ActivePanel = "input" | "results";

export default function Page() {
  const [names, setNames] = useState("");
  const [size, setSize] = useState(4);
  const [mode, setMode] = useState<DistributionMode>("best");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("input");
  const [copiedText, setCopiedText] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const nameCount = names.split("\n").filter((name) => name.trim()).length;
  const estGroups = nameCount >= 2 && size >= 2 ? Math.ceil(nameCount / size) : 0;
  const totalGrouped = groups.reduce((sum, group) => sum + group.members.length, 0);
  const hasResults = groups.length > 0;

  const handleNamesChange = (value: string) => {
    setNames(value);

    if (value.split("\n").every((name) => name.trim() === "")) {
      setGroups([]);
      setActivePanel("input");
    }
  };

  const handleGenerate = useCallback(() => {
    if (nameCount === 0) {
      toast.error("Enter at least one name to start");
      textareaRef.current?.focus();
      return;
    }

    if (size < 2) {
      toast.error("Group size must be at least 2");
      return;
    }

    setIsWorking(true);
    setTimeout(() => {
      const result = buildGroups(names, size, mode);
      setGroups(result);
      setIsWorking(false);
      setActivePanel("results");
      toast.success(
        `${result.length} group${result.length !== 1 ? "s" : ""} created from ${nameCount} names`,
      );
    }, 380);
  }, [mode, nameCount, names, size]);

  const handleShuffle = useCallback(() => {
    if (nameCount === 0 || size < 2) return;

    const result = buildGroups(names, size, mode);
    setGroups(result);
    toast.success("Reshuffled!");
  }, [mode, nameCount, names, size]);

  const handleExport = async (format: ExportFormat) => {
    if (groups.length === 0) return;

    const id = toast.loading(`Preparing ${format === "excel" ? "Excel" : "Word"} file...`);

    try {
      await exportGroups(groups, format);
      toast.dismiss(id);
      toast.success("File downloaded!");
    } catch {
      toast.dismiss(id);
      toast.error("Export failed - please try again");
    }
  };

  const handleCopyText = async () => {
    if (groups.length === 0) return;

    const text = groups
      .map(
        (group) =>
          `${group.label}\n${group.members.map((member, index) => `${index + 1}. ${member}`).join("\n")}`,
      )
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  const handleClear = () => {
    setNames("");
    setGroups([]);
    setActivePanel("input");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader />

        <StatsBar
          nameCount={nameCount}
          size={size}
          estGroups={estGroups}
          hasResults={hasResults}
          groupsCount={groups.length}
        />

        <PanelSwitcher
          hasResults={hasResults}
          activePanel={activePanel}
          groupsCount={groups.length}
          onChange={setActivePanel}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {activePanel === "input" || !hasResults ? (
              <NamesInputPanel
                names={names}
                onNamesChange={handleNamesChange}
                onClear={handleClear}
                textareaRef={textareaRef}
              />
            ) : (
              <ResultsPanel
                groups={groups}
                totalGrouped={totalGrouped}
                onShuffle={handleShuffle}
              />
            )}
          </div>

          <Sidebar
            size={size}
            mode={mode}
            isWorking={isWorking}
            nameCount={nameCount}
            hasResults={hasResults}
            copiedText={copiedText}
            onSizeChange={setSize}
            onModeChange={setMode}
            onGenerate={handleGenerate}
            onExport={handleExport}
            onCopyText={handleCopyText}
          />
        </div>

        <footer className="mt-16 flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground/50">
            Developed by{" "}
            <Link
              href={appMeta.author.url}
              target="_blank"
              className="text-muted-foreground/70 transition-colors underline-offset-2 hover:text-primary hover:underline"
            >
              {appMeta.author.name}
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/30">
            Groupify v{appMeta.app.version} - {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
