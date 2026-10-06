"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { getSampleCatalog, getDatasetById, rowsToCSV, downloadFile, type Dataset } from "@/lib/academy/datasets";
import {
  Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* ---------- markdown-lite renderer ----------
   Supports: **bold**, ~inline code~, "- " bullets, "~~~" code fences, "> " callouts,
   "1. " numbered lists, blank-line separated paragraphs, | tables |
----------------------------------------------- */
export function Md({ text, className }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let key = 0;

  const renderInline = (s: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|~[^~]+~)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) out.push(<b key={`${key}-${m.index}`} className="font-semibold text-foreground">{tok.slice(2, -2)}</b>);
      else out.push(
        <code key={`${key}-${m.index}`} className="mx-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-700 dark:text-emerald-300">
          {tok.slice(1, -1)}
        </code>
      );
      last = m.index + tok.length;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("~~~")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("~~~")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++} className="code-surface my-3 overflow-x-auto rounded-lg border border-border p-4 font-mono text-[13px] leading-relaxed text-emerald-800 dark:text-emerald-200/90 scrollbar-thin">
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c.replace(/ /g, "")) && c.length > 0)) rows.push(cells);
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>{rows[0]?.map((c, ci) => <th key={ci} className="border-b border-border px-3 py-2 text-left font-semibold text-emerald-700 dark:text-emerald-300">{renderInline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, ri) => (
                <tr key={ri} className="border-b border-border/60 last:border-0">
                  {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-foreground/80">{renderInline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      blocks.push(
        <ul key={key++} className="my-3 space-y-2">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2.5 text-[15px] leading-relaxed text-foreground/85">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^#{1,4}\s/.test(line)) {
      const level = (line.match(/^#+/) ?? ["#"])[0].length;
      const text = line.replace(/^#+\s*/, "");
      const cls = level === 1
        ? "mt-5 mb-2 text-xl font-extrabold tracking-tight text-foreground"
        : level === 2
          ? "mt-6 mb-2 border-b border-border pb-1.5 text-lg font-bold text-emerald-800 dark:text-emerald-200"
          : "mt-4 mb-1.5 text-[15px] font-bold text-emerald-700 dark:text-emerald-300";
      blocks.push(<p key={key++} className={cls}>{renderInline(text)}</p>);
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s/, ""));
      blocks.push(
        <ol key={key++} className="my-3 space-y-2">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2.5 text-[15px] leading-relaxed text-foreground/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{ii + 1}</span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) quote.push(lines[i++].slice(2));
      const joined = quote.join(" ");
      const isTip = /^TIP:/i.test(joined);
      const isReal = /^REAL WORLD:/i.test(joined);
      blocks.push(
        <div key={key++} className={cn(
          "my-4 rounded-lg border-l-4 bg-muted/40 px-4 py-3 text-[14px] leading-relaxed",
          isTip ? "border-amber-400 text-amber-900 dark:text-amber-100/90" : isReal ? "border-sky-400 text-sky-900 dark:text-sky-100/90" : "border-emerald-400 text-foreground/85"
        )}>
          <span className={cn("mr-2 font-bold uppercase tracking-wide text-[11px]", isTip ? "text-amber-600 dark:text-amber-400" : isReal ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400")}>
            {isTip ? "💡 Tip" : isReal ? "🏢 Real world" : "Note"}
          </span>
          {renderInline(joined.replace(/^(TIP:|REAL WORLD:)\s*/i, ""))}
        </div>
      );
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^[-~>|#]|\d+\.\s/.test(lines[i])) para.push(lines[i++]);
    if (para.length)
      blocks.push(
        <p key={key++} className="my-3 text-[15px] leading-relaxed text-foreground/85">
          {renderInline(para.join(" "))}
        </p>
      );
    else i++;
  }

  return <div className={className}>{blocks}</div>;
}

/* ---------- level / difficulty badge colors ---------- */
export function levelBadgeCls(level: string): string {
  switch (level) {
    case "Beginner": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "Intermediate": return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "Advanced": return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "Master": return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    default: return "bg-muted text-foreground/70 border-border";
  }
}

/* ---------- section header ---------- */
export function ToolHeader({ icon, title, subtitle, accent = "emerald", actions }: {
  icon: React.ReactNode; title: string; subtitle: string; accent?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border text-xl",
          accent === "emerald" && "border-emerald-500/30 bg-emerald-500/10",
          accent === "amber" && "border-amber-500/30 bg-amber-500/10",
          accent === "sky" && "border-sky-500/30 bg-sky-500/10",
          accent === "violet" && "border-violet-500/30 bg-violet-500/10",
          accent === "rose" && "border-rose-500/30 bg-rose-500/10")}>
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h1>
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function fmtNum(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtMoney(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

export const PANEL = "rounded-xl border border-border bg-card";
export const PANEL_HEAD = "flex items-center justify-between gap-2 border-b border-border px-4 py-3";

/* ---------- sample data picker (grouped by size, with CSV download) ---------- */
const SIZE_BADGE: Record<string, string> = {
  Small: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Medium: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Large: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  Huge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function DatasetPicker({ value, onPick, onDownload, className }: {
  value?: string;
  onPick: (id: string) => void;
  onDownload?: (id: string) => void;
  className?: string;
}) {
  const catalog = getSampleCatalog();
  const groups: Record<string, typeof catalog> = {};
  for (const f of catalog) (groups[f.size] ??= []).push(f);

  return (
    <Select value={value} onValueChange={(id) => { if (id !== "__dl__") onPick(id); }}>
      <SelectTrigger className={cn("border-border bg-card text-sm", className)}>
        <SelectValue placeholder="Load sample data…" />
      </SelectTrigger>
      <SelectContent className="max-h-[420px] border-border bg-popover">
        {(["Small", "Medium", "Large", "Huge"] as const).map((size) =>
          groups[size]?.length ? (
            <React.Fragment key={size}>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{size} files</span>
                <span className="text-[9.5px] text-muted-foreground/60">{groups[size].length} datasets</span>
              </div>
              {groups[size].map((f) => (
                <SelectItem key={f.id} value={f.id} className="py-1.5">
                  <span className="flex w-full min-w-0 flex-col gap-0.5 py-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium">{f.name}</span>
                      {f.messy && (
                        <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
                          messy
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                      <span className="font-mono">{f.rows.toLocaleString()} rows × {f.cols} cols</span>
                      <span className="max-w-[260px] truncate">{f.description}</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
              {size !== "Huge" && <SelectSeparator className="bg-border" />}
            </React.Fragment>
          ) : null
        )}
      </SelectContent>
    </Select>
  );
}

/** Quick "download this dataset as CSV" helper used by tool headers */
export function downloadDatasetCSV(id: string) {
  const ds: Dataset | undefined = getDatasetById(id);
  if (!ds) return;
  downloadFile(`${ds.id}_${ds.rows.length}rows.csv`, rowsToCSV(ds.rows, ds.columns), "text/csv");
}
