"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import appMeta from "@/data/metadata"

// ─── Types ────────────────────────────────────────────────────────────────────

type DistributionMode = "best" | "overflow"
type ExportFormat = "excel" | "word"

interface Group {
  id: number
  label: string
  members: string[]
  hue: number
}

// ─── Palette — HSL hues cycling through teal/cyan/indigo/violet/emerald/rose ──
const HUES = [185, 200, 220, 260, 160, 340, 35, 280]

// ─── Core grouping logic ──────────────────────────────────────────────────────

function buildGroups(
  raw: string,
  size: number,
  mode: DistributionMode
): Group[] {
  const names = raw
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean)

  if (names.length === 0 || size < 2) return []

  // Fisher-Yates shuffle
  const pool = [...names]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const count = Math.floor(pool.length / size)
  const extra = pool.length % size
  const buckets: string[][] = Array.from({ length: count }, (_, i) =>
    pool.slice(i * size, i * size + size)
  )

  if (extra > 0) {
    const tail = pool.slice(count * size)
    if (mode === "best" && buckets.length > 0) {
      tail.forEach((m, i) => buckets[i % buckets.length].push(m))
    } else {
      buckets.push(tail)
    }
  }

  return buckets.map((members, i) => ({
    id: i + 1,
    label: `Group ${i + 1}`,
    members,
    hue: HUES[i % HUES.length],
  }))
}

// ─── Export helpers ───────────────────────────────────────────────────────────

async function doExport(groups: Group[], format: ExportFormat) {
  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default
    const { saveAs } = await import("file-saver")
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Groups")
    groups.forEach((g, gi) => {
      const titleRow = ws.addRow([g.label])
      titleRow.font = { bold: true, size: 15 }
      g.members.forEach((m) => {
        const r = ws.addRow([m])
        r.font = { size: 12 }
      })
      if (gi < groups.length - 1) ws.addRow([])
    })
    ws.columns.forEach((c) => { c.width = 26 })
    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "Groupify.xlsx")
    return
  }

  // word
  const { Document, Packer, Paragraph, TextRun } = await import("docx")
  const { saveAs } = await import("file-saver")
  const doc = new Document({
    sections: [
      {
        children: groups.flatMap((g) => [
          new Paragraph({
            children: [new TextRun({ text: g.label, bold: true, size: 36 })],
            spacing: { after: 160 },
          }),
          ...g.members.map(
            (m) =>
              new Paragraph({
                children: [new TextRun({ text: m, size: 26 })],
              })
          ),
          new Paragraph(""),
        ]),
      },
    ],
  })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, "Groupify.docx")
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  delay = 0,
}: {
  value: string | number
  label: string
  delay?: number
}) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm px-5 py-3 animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="font-syne text-2xl font-bold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function GroupCard({ group, index }: { group: Group; index: number }) {
  const hsl = `hsl(${group.hue} 75% 48%)`
  const hslBg = `hsl(${group.hue} 75% 48% / 0.08)`
  const hslBorder = `hsl(${group.hue} 75% 48% / 0.25)`

  return (
    <div
      className="group-card animate-slide-up rounded-2xl border bg-card/70 backdrop-blur-sm p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        color: hsl,
        borderColor: hslBorder,
        backgroundColor: hslBg,
        animationDelay: `${index * 0.055}s`,
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between pl-4">
        <span
          className="font-syne text-sm font-bold tracking-wide"
          style={{ color: hsl }}
        >
          {group.label}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: hslBg, color: hsl, border: `1px solid ${hslBorder}` }}
        >
          {group.members.length}
        </span>
      </div>

      {/* Members */}
      <ul className="space-y-1.5 pl-4">
        {group.members.map((m, mi) => (
          <li
            key={`${m}-${mi}`}
            className="flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${index * 0.055 + mi * 0.04}s` }}
          >
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: hslBg,
                color: hsl,
                border: `1px solid ${hslBorder}`,
              }}
            >
              {mi + 1}
            </span>
            <span className="text-sm text-foreground/90">{m}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SizeControl({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(2, value - 1))}
        className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground transition-all hover:bg-muted hover:border-primary/50 font-bold text-base active:scale-95"
      >
        −
      </button>
      <div className="relative w-12 text-center">
        <span className="font-syne text-2xl font-bold tabular-nums text-foreground animate-count-up">
          {value}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground transition-all hover:bg-muted hover:border-primary/50 font-bold text-base active:scale-95"
      >
        +
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [names, setNames] = useState("")
  const [size, setSize] = useState(4)
  const [mode, setMode] = useState<DistributionMode>("best")
  const [groups, setGroups] = useState<Group[]>([])
  const [isWorking, setIsWorking] = useState(false)
  const [activePanel, setActivePanel] = useState<"input" | "results">("input")
  const [copiedText, setCopiedText] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const nameCount = names.split("\n").filter((n) => n.trim()).length
  const estGroups =
    nameCount >= 2 && size >= 2 ? Math.ceil(nameCount / size) : 0

  // Reset panel when names cleared
  useEffect(() => {
    if (nameCount === 0) {
      setGroups([])
      setActivePanel("input")
    }
  }, [nameCount])

  const handleGenerate = useCallback(() => {
    if (nameCount === 0) {
      toast.error("Enter at least one name to start")
      textareaRef.current?.focus()
      return
    }
    if (size < 2) {
      toast.error("Group size must be at least 2")
      return
    }

    setIsWorking(true)
    setTimeout(() => {
      const result = buildGroups(names, size, mode)
      setGroups(result)
      setIsWorking(false)
      setActivePanel("results")
      toast.success(
        `${result.length} group${result.length !== 1 ? "s" : ""} created from ${nameCount} names`
      )
    }, 380)
  }, [names, size, mode, nameCount])

  const handleShuffle = useCallback(() => {
    if (nameCount === 0 || size < 2) return
    const result = buildGroups(names, size, mode)
    setGroups(result)
    toast.success("Reshuffled!")
  }, [names, size, mode, nameCount])

  const handleExport = async (format: ExportFormat) => {
    if (groups.length === 0) return
    const id = toast.loading(`Preparing ${format === "excel" ? "Excel" : "Word"} file…`)
    try {
      await doExport(groups, format)
      toast.dismiss(id)
      toast.success("File downloaded!")
    } catch {
      toast.dismiss(id)
      toast.error("Export failed — please try again")
    }
  }

  const handleCopyText = async () => {
    if (groups.length === 0) return
    const text = groups
      .map((g) => `${g.label}\n${g.members.map((m, i) => `${i + 1}. ${m}`).join("\n")}`)
      .join("\n\n")
    await navigator.clipboard.writeText(text)
    setCopiedText(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleClear = () => {
    setNames("")
    setGroups([])
    setActivePanel("input")
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const totalGrouped = groups.reduce((s, g) => s + g.members.length, 0)
  const hasResults = groups.length > 0

  return (
    <div className="mesh-bg min-h-dvh relative">
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mb-10 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="relative rounded-2xl border border-border/50 bg-card/80 p-3 backdrop-blur-sm">
                  <Image
                    src="/favicon.ico"
                    width={36}
                    height={36}
                    alt="Groupify"
                    className="size-9"
                    priority
                  />
                </div>
              </div>
              <div>
                <h1 className="font-syne text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Groupify
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Sort names into balanced groups instantly
                </p>
              </div>
            </div>

            {/* Theme / author link */}
            <Link
              href={appMeta.author.url}
              target="_blank"
              className="hidden rounded-xl border border-border/50 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary sm:block"
            >
              by {appMeta.author.name}
            </Link>
          </div>
        </header>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        {nameCount > 0 && (
          <div className="mb-8 flex flex-wrap gap-3">
            <StatPill value={nameCount} label="Names" delay={0} />
            <StatPill value={size} label="Per group" delay={0.05} />
            <StatPill value={estGroups || "—"} label="Est. groups" delay={0.1} />
            {hasResults && (
              <StatPill value={groups.length} label="Created" delay={0.15} />
            )}
          </div>
        )}

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        {hasResults && (
          <div className="mb-6 animate-fade-in">
            <div className="flex w-fit rounded-2xl border border-border/50 bg-card/60 p-1 backdrop-blur-sm gap-1">
              {(["input", "results"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePanel(tab)}
                  className={`rounded-xl px-5 py-1.5 text-sm font-medium transition-all ${
                    activePanel === tab
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "input" ? "Names" : `Results  ·  ${groups.length}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Left: names input OR group results ────────────────────────── */}
          <div>
            {activePanel === "input" || !hasResults ? (
              <div className="animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Names — one per line
                  </label>
                  {names && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-[11px] text-muted-foreground/60 transition-colors hover:text-destructive"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder={"Alice\nBob\nCarol\nDave\nEve\nFrank\n…"}
                  rows={14}
                  className="w-full resize-none rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm px-5 py-4 font-dm text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Tip: paste a column from Excel — each cell becomes a name automatically.
                </p>
              </div>
            ) : (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {groups.length} groups · {totalGrouped} members
                  </p>
                  <button
                    type="button"
                    onClick={handleShuffle}
                    className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary"
                  >
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l5.1 5.1M4 4l5 5"/>
                    </svg>
                    Reshuffle
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {groups.map((g, i) => (
                    <GroupCard key={g.id} group={g} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: config + actions ────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Config card */}
            <div className="animate-slide-up rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-6 stagger-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Configuration
              </p>

              {/* Group size */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Members per group
                </label>
                <SizeControl value={size} onChange={setSize} />
                <p className="text-[11px] text-muted-foreground/60">
                  Min 2 · Max 99
                </p>
              </div>

              {/* Distribution */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Extra members
                </label>
                <div className="space-y-2">
                  {(
                    [
                      {
                        value: "best" as const,
                        title: "Distribute evenly",
                        desc: "Spread extras into existing groups",
                      },
                      {
                        value: "overflow" as const,
                        title: "New smaller group",
                        desc: "Put extras in a separate group",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        mode === opt.value
                          ? "border-primary/50 bg-primary/8"
                          : "border-border/40 bg-muted/20 hover:border-primary/30"
                      }`}
                    >
                      <div
                        className={`mt-0.5 size-4 shrink-0 rounded-full border-2 transition-all ${
                          mode === opt.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        }`}
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {opt.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isWorking || nameCount === 0}
              className={`animate-slide-up stagger-2 w-full rounded-2xl px-6 py-3.5 font-syne text-sm font-bold tracking-wide text-primary-foreground shadow-lg transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed ${
                isWorking ? "btn-shimmer" : "bg-primary hover:opacity-90 animate-pulse-ring"
              }`}
            >
              {isWorking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/>
                  </svg>
                  Grouping…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {hasResults ? "Regenerate" : "Generate Groups"}
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>

            {/* Export card */}
            {hasResults && (
              <div className="animate-slide-up stagger-3 rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Export
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleExport("excel")}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <svg className="size-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17.5l2.5-4 2.5 4h-5zm2.5-5.5L8 8h5l-2.5 4z"/>
                    </svg>
                    Download Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("word")}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <svg className="size-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM7 13h2l1.5 4L12 13h2l-2.5 6H9.5L7 13z"/>
                    </svg>
                    Download Word (.docx)
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    {copiedText ? (
                      <svg className="size-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    )}
                    {copiedText ? "Copied!" : "Copy as text"}
                  </button>
                </div>
              </div>
            )}

            {/* How to use */}
            {!hasResults && (
              <div className="animate-slide-up stagger-4 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  How to use
                </p>
                <ol className="space-y-2.5">
                  {[
                    "Enter names in the box — one per line",
                    "Set how many members per group",
                    "Choose how to handle extras",
                    "Hit Generate and download or copy",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="mt-16 flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground/50">
            Developed by{" "}
            <Link
              href={appMeta.author.url}
              target="_blank"
              className="text-muted-foreground/70 underline-offset-2 hover:underline hover:text-primary transition-colors"
            >
              {appMeta.author.name}
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/30">
            Groupify v{appMeta.app.version} · {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  )
}