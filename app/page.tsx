"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import appMeta from "@/data/metadata";
import { Heart } from "lucide-react";
import { NamesInputPanel } from "@/components/groupify/names-input-panel";
import { PageHeader } from "@/components/groupify/page-header";
import { PanelSwitcher } from "@/components/groupify/panel-switcher";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { Sidebar } from "@/components/groupify/sidebar";
import { DonatePopup } from "@/components/groupify/donate-popup";
import type {
  DistributionMode,
  ExportFormat,
  Group,
} from "@/components/groupify/types";
import { buildGroups, exportGroups } from "@/components/groupify/utils";

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
  const [showDonate, setShowDonate] = useState(false);
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
      const result = buildGroups(
        names,
        lastChanged,
        lastChanged === "size" ? size : groupCount,
        mode,
      );
      setGroups(result);
      setIsWorking(false);
      setActivePanel("results");
      toast.success(
        `${result.length} group${result.length !== 1 ? "s" : ""} created from ${nameCount} names`,
      );
    }, 380);
  }, [mode, nameCount, names, size, groupCount, lastChanged]);

  const handleShuffle = useCallback(() => {
    if (nameCount === 0 || size < 2) return;

    const result = buildGroups(
      names,
      lastChanged,
      lastChanged === "size" ? size : groupCount,
      mode,
    );
    setGroups(result);
    toast.success("Reshuffled!");
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

        <footer className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowDonate(true)}
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
            >
              <Heart className="size-4" />
              Donate
            </button>
            <Link
              href="/documentation"
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2v6h6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 13H8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 17H8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 9H8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              View Documentation
            </Link>
            <Link
              href="/forms/new"
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Create a custom form
            </Link>
          </div>

          <div className="space-y-1">
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
          </div>
        </footer>
      </div>
      {showDonate && <DonatePopup onFinished={() => setShowDonate(false)} />}
    </div>
  );
}
