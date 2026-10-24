"use client";

import {
  RiDownload2Line,
  RiFileCopyLine,
  RiFileExcel2Line,
  RiFileTextLine,
  RiFileWord2Line,
  RiPrinterLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportFormat } from "@/components/groupify/types";

interface DownloadMenuProps {
  onExport: (format: ExportFormat) => void;
  onCopyText: () => void;
  /** Shown under the label, e.g. "4 columns". */
  note?: string;
  className?: string;
  align?: "start" | "end";
  side?: "top" | "bottom";
}

const ITEMS: { format: ExportFormat; label: string; hint: string; Icon: typeof RiFileExcel2Line; tone: string }[] = [
  { format: "excel", label: "Excel", hint: "Formatted, a sheet per group", Icon: RiFileExcel2Line, tone: "text-emerald-600 dark:text-emerald-400" },
  { format: "word", label: "Word", hint: "A table per group, ready to print", Icon: RiFileWord2Line, tone: "text-blue-600 dark:text-blue-400" },
  { format: "csv", label: "CSV", hint: "Plain rows with a Group column", Icon: RiFileTextLine, tone: "text-muted-foreground" },
];

export function DownloadMenu({ onExport, onCopyText, note, className = "", align = "end", side = "bottom" }: DownloadMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98] ${className}`}
        >
          <RiDownload2Line className="size-4" />
          Download
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-72">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-semibold">Download groups</span>
          {note && <span className="block text-xs text-muted-foreground">{note}</span>}
        </DropdownMenuLabel>
        {ITEMS.map(({ format, label, hint, Icon, tone }) => (
          <DropdownMenuItem key={format} onSelect={() => onExport(format)} className="cursor-pointer gap-3">
            <Icon className={`!size-5 ${tone}`} />
            <span className="flex flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCopyText} className="cursor-pointer gap-3">
          <RiFileCopyLine className="!size-5 text-muted-foreground" />
          Copy as text
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()} className="cursor-pointer gap-3">
          <RiPrinterLine className="!size-5 text-muted-foreground" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
