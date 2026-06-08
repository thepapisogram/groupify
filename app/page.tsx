"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NamesInputPanel } from "@/components/groupify/names-input-panel";
import { PageHeader } from "@/components/groupify/page-header";
import { PanelSwitcher } from "@/components/groupify/panel-switcher";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { Sidebar } from "@/components/groupify/sidebar";
import { Footer } from "@/components/groupify/footer";
import type {
  DistributionMode,
  ExportFormat,
  Group,
} from "@/components/groupify/types";
import { buildGroupsAsync, exportGroups } from "@/components/groupify/utils";

type ActivePanel = "input" | "results";

export default function Page() {
  const [names, setNames] = useState("");
  const [size, setSize] = useState(4);
  const [groupCount, setGroupCount] = useState(2);
  const [lastChanged, setLastChanged] = useState<"size" | "count">("size");
  const [mode, setMode] = useState<DistributionMode>("best");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("input");
  const [copiedText, setCopiedText] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);



  const nameCount = names
    .split("\n")
    .filter((name: string) => name.trim()).length;
  const estGroups = nameCount >= 2 ? groupCount : 0;
  const totalGrouped = groups.reduce(
    (sum: number, group: Group) => sum + group.members.length,
    0,
  );
  const hasResults = groups.length > 0;

  const handleNamesChange = (value: string) => {
    setNames(value);
    const newNameCount = value
      .split("\n")
      .filter((name: string) => name.trim()).length;

    if (newNameCount === 0) {
      setGroups([]);
      setActivePanel("input");
    } else {
      if (lastChanged === "size") {
        setGroupCount(
          mode === "best"
            ? Math.max(1, Math.floor(newNameCount / size))
            : Math.ceil(newNameCount / size),
        );
      } else {
        setSize(Math.max(2, Math.ceil(newNameCount / groupCount)));
      }
    }
  };

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setLastChanged("size");
    if (nameCount > 0) {
      setGroupCount(
        mode === "best"
          ? Math.max(1, Math.floor(nameCount / newSize))
          : Math.ceil(nameCount / newSize),
      );
    }
  };

  const handleGroupCountChange = (newCount: number) => {
    setGroupCount(newCount);
    setLastChanged("count");
    if (nameCount > 0) {
      setSize(Math.max(2, Math.ceil(nameCount / newCount)));
    }
  };

  const handleModeChange = (newMode: DistributionMode) => {
    setMode(newMode);
    if (lastChanged === "size" && nameCount > 0) {
      setGroupCount(
        newMode === "best"
          ? Math.max(1, Math.floor(nameCount / size))
          : Math.ceil(nameCount / size),
      );
    }
  };

  const handleGenerate = useCallback(async () => {
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
    try {
      const result = await buildGroupsAsync(
        names,
        lastChanged,
        lastChanged === "size" ? size : groupCount,
        mode,
      );
      setGroups(result);
      setActivePanel("results");
      toast.success(
        `${result.length} group${result.length !== 1 ? "s" : ""} created from ${nameCount} names`,
      );
    } catch {
      toast.error("Failed to generate groups");
    } finally {
      setIsWorking(false);
    }
  }, [mode, nameCount, names, size, groupCount, lastChanged]);

  const handleShuffle = useCallback(async () => {
    if (nameCount === 0 || size < 2) return;

    try {
      const result = await buildGroupsAsync(
        names,
        lastChanged,
        lastChanged === "size" ? size : groupCount,
        mode,
      );
      setGroups(result);
      toast.success("Reshuffled!");
    } catch {
      toast.error("Shuffle failed");
    }
  }, [mode, nameCount, names, size, groupCount, lastChanged]);

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

  const handleCopyText = async () => {
    if (groups.length === 0) return;

    const text = groups
      .map(
        (group: Group) =>
          `${group.label}\n${group.members.map((member: string, index: number) => `${index + 1}. ${member}`).join("\n")}`,
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
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-8">
        <PageHeader />

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
              />
            </div>
            <div
              className={`col-start-1 row-start-1 transition-all duration-300 ${
                activePanel === "results" && hasResults
                  ? "opacity-100 z-10 translate-x-0"
                  : "opacity-0 -z-10 translate-x-4 pointer-events-none invisible"
              }`}
            >
              <ResultsPanel
                groups={groups}
                totalGrouped={totalGrouped}
                onShuffle={handleShuffle}
              />
            </div>
          </div>

          <Sidebar
            groupBy={lastChanged}
            size={size}
            groupCount={groupCount}
            mode={mode}
            isWorking={isWorking}
            nameCount={nameCount}
            hasResults={hasResults}
            copiedText={copiedText}
            estGroups={estGroups}
            groupsCount={groups.length}
            onGroupByChange={setLastChanged}
            onSizeChange={handleSizeChange}
            onGroupCountChange={handleGroupCountChange}
            onModeChange={handleModeChange}
            onGenerate={handleGenerate}
            onExport={handleExport}
            onCopyText={handleCopyText}
          />
        </div>

        <Footer />
      </div>
    </div>
  );
}
