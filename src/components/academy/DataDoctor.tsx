"use client";

/* DataDoctor — the file-aware cleaning brain, surfaced as a Live Coach tab.
   It profiles the ACTUAL file loaded in the tool (every file is unique),
   lists THAT file's real problems with exact locations, explains why each
   one breaks real analysis, gives the exact fix for the tool you're in,
   re-scans on every edit, knows when an issue is fixed, alerts you when
   something is left, and celebrates when the whole file is clean. */

import * as React from "react";
import {
  ScanSearch, CircleAlert, CircleCheck, ChevronDown, Info, Sparkles, PartyPopper,
  ArrowRight, ClipboardCopy, Undo2, TriangleAlert, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Md } from "./shared";
import {
  profileSnapshot, applyFix, FIX_LABELS,
  type DoctorSnapshot, type DataIssue, type FixId, type DoctorReport,
} from "@/lib/academy/data-doctor";
import { coachSay, type CoachTool } from "@/lib/academy/coach-bus";

export interface DoctorApi {
  /** live snapshot of the data currently loaded in the tool (null = nothing loaded).
      Pass a NEW object whenever the underlying data changes — that triggers a re-scan. */
  snapshot: DoctorSnapshot | null;
  /** one-click fixes wired up? (Excel + Power BI yes; SQL shows copy-queries) */
  canFix?: boolean;
  /** apply a one-click fix (tool mutates its own state) */
  onFix?: (fix: FixId, col: string | null) => void;
  /** revert all one-click fixes (Power Query reset) */
  onReset?: () => void;
  /** name of the fixing surface for button labels */
  fixLabel?: string;
  /** hint shown when nothing is loaded */
  emptyHint?: string;
}

const SEV: Record<DataIssue["severity"], { border: string; bg: string; text: string; label: string; Icon: typeof CircleAlert }> = {
  high: { border: "#dc2626", bg: "rgba(220,38,38,0.06)", text: "text-red-600 dark:text-red-400", label: "Must fix", Icon: CircleAlert },
  medium: { border: "#d97706", bg: "rgba(217,119,6,0.06)", text: "text-amber-600 dark:text-amber-400", label: "Should fix", Icon: TriangleAlert },
  low: { border: "#0284c7", bg: "rgba(2,132,199,0.06)", text: "text-sky-600 dark:text-sky-400", label: "Worth a look", Icon: Info },
};

/** which one-click fix we offer per issue type (null = human decision needed) */
const AUTO_FIX: Partial<Record<DataIssue["type"], FixId>> = {
  blank_cells: "fill_down",
  whitespace: "trim",
  text_numbers: "numberize",
  mixed_dates: "iso_dates",
  case_inconsistent: "proper",
  duplicate_rows: "dedupe",
  empty_rows: "drop_empty",
};

function scoreColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 70) return "#d97706";
  return "#dc2626";
}

/* ---------------- issue card ---------------- */
function IssueCard({ issue, api, tool, fixed }: { issue: DataIssue; api: DoctorApi; tool: CoachTool; fixed: boolean }) {
  const [open, setOpen] = React.useState(false);
  const sev = SEV[issue.severity];
  const fixSteps = api.snapshot?.source === "excel" ? issue.fixExcel : api.snapshot?.source === "dashboard" ? issue.fixDashboard : issue.fixSql;
  const autoFix = !fixed ? AUTO_FIX[issue.type] : undefined;
  const needsCol = issue.type !== "duplicate_rows" && issue.type !== "empty_rows" && issue.type !== "header_names";

  return (
    <div
      className={cn("overflow-hidden rounded-lg border transition-colors", fixed ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-border/70")}
      style={!fixed ? { borderLeft: `3px solid ${sev.border}` } : undefined}
    >
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40">
        {fixed ? <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" /> : <sev.Icon className={cn("h-4 w-4 shrink-0", sev.text)} />}
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[12.5px] font-semibold", fixed ? "text-emerald-700 dark:text-emerald-400" : "text-foreground")}>
            {issue.title}
          </span>
          <span className="block text-[10.5px] text-muted-foreground">
            {fixed ? "Cleared — re-scanned clean" : `${issue.severity === "high" ? sev.label : issue.severity === "medium" ? "Should fix" : "Worth a look"} · ${issue.col ? `column “${issue.col}” · ` : ""}${issue.count.toLocaleString()} affected${issue.total ? ` of ${issue.total.toLocaleString()}` : ""}`}
          </span>
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border/50 px-3 py-2.5">
          {/* examples */}
          {!fixed && issue.examples.length > 0 && (
            <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
              <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Where it is in your file</p>
              <div className="space-y-0.5">
                {issue.examples.map((e, i) => (
                  <p key={i} className="font-mono text-[11px] leading-relaxed text-foreground/85">
                    {e.row > 0 ? <span className="mr-1.5 rounded bg-background px-1 text-[9.5px] font-sans font-bold text-muted-foreground">row {e.row}</span> : null}
                    {e.value}
                  </p>
                ))}
                {issue.count > issue.examples.length && (
                  <p className="text-[10.5px] text-muted-foreground">…and {(issue.count - issue.examples.length).toLocaleString()} more like these</p>
                )}
              </div>
            </div>
          )}

          {/* why */}
          <div className="rounded-md border border-sky-500/25 bg-sky-500/[0.05] px-2.5 py-1.5">
            <p className="mb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Why it breaks your analysis</p>
            <div className="text-[12px] leading-relaxed text-foreground/90"><Md text={issue.why} /></div>
          </div>

          {/* fix steps */}
          {!fixed && (
            <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.05] px-2.5 py-1.5">
              <p className="mb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                How to fix it {api.snapshot?.source === "excel" ? "in Excel" : api.snapshot?.source === "dashboard" ? "in Power Query" : "in SQL"}
              </p>
              <div className="text-[12px] leading-relaxed text-foreground/90"><Md text={fixSteps} /></div>
            </div>
          )}

          {/* actions */}
          {!fixed && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {autoFix && api.canFix && api.onFix && (
                <button
                  onClick={() => {
                    api.onFix?.(autoFix, needsCol ? issue.col ?? null : null);
                    coachSay(tool, "doctor.fix", `Applied “${FIX_LABELS[autoFix]}”${issue.col ? ` on ${issue.col}` : ""}`, `${issue.count.toLocaleString()} cells/rows targeted`);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-500"
                >
                  <Sparkles className="h-3 w-3" /> Fix now — {FIX_LABELS[autoFix]}
                </button>
              )}
              {issue.type === "variant_values" && issue.examples[0] && api.canFix && (
                <span className="rounded-md border border-border px-2 py-1 text-[10.5px] text-muted-foreground">Needs your call — pick the correct spelling, then Find &amp; Replace</span>
              )}
              {api.snapshot?.source === "sql" && (
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(fixSteps.replace(/`/g, "")).catch(() => {});
                    coachSay(tool, "doctor.fix", `Copied the cleaning SQL for ${issue.col ?? issue.title}`);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground/85 hover:bg-muted"
                >
                  <ClipboardCopy className="h-3 w-3" /> Copy fix query
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- the doctor tab ---------------- */
export function DataDoctor({ tool, api }: { tool: CoachTool; api: DoctorApi }) {
  const { snapshot } = api;
  const report: DoctorReport | null = React.useMemo(
    () => (snapshot ? profileSnapshot(snapshot) : null),
    [snapshot]
  );

  /* track fixed/remaining across re-scans and narrate the changes */
  const prevRef = React.useRef<{ v: DoctorSnapshot | null; counts: Map<string, number>; report: DoctorReport | null }>({ v: null, counts: new Map(), report: null });
  const [flash, setFlash] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!report) return;
    const prev = prevRef.current;
    const cur = new Map(report.issues.map((i) => [i.id, i.count]));
    if (prev.v !== null && prev.report && snapshot !== prev.v) {
      for (const [id, was] of prev.counts) {
        const now = cur.get(id) ?? 0;
        if (now < was) {
          const issue = report.issues.find((i) => i.id === id) ?? prev.report.issues.find((i) => i.id === id);
          const msg = now === 0 ? `Fixed: ${issue?.title ?? id}` : `${issue?.title ?? id}: ${was.toLocaleString()} → ${now.toLocaleString()} left`;
          coachSay(tool, now === 0 ? "doctor.fixed" : "doctor.progress", msg);
          setFlash(msg);
          window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 3500);
        }
      }
      for (const [id, now] of cur) {
        const was = prev.counts.get(id) ?? 0;
        if (now > was) {
          const issue = report.issues.find((i) => i.id === id);
          const msg = `New problem found: ${issue?.title ?? id} (${now.toLocaleString()})`;
          coachSay(tool, "doctor.alert", msg);
          setFlash(msg);
          window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 3500);
        }
      }
    }
    prevRef.current = { v: snapshot, counts: cur, report };
  }, [snapshot, report, tool]);

  if (!snapshot || !report) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border/70 bg-muted/40 px-3.5 py-4 text-center">
          <ScanSearch className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" />
          <p className="text-[12.5px] font-semibold text-foreground">No file loaded yet</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {api.emptyHint ?? "Load a file first — then I scan every cell in it and list its exact problems."}
          </p>
        </div>
      </div>
    );
  }

  const open = report.issues;
  const clean = open.length === 0;
  const score = report.score;

  return (
    <div className="space-y-3">
      {/* header: file + health */}
      <div className="rounded-lg border border-border/70 bg-muted/40 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-border" />
              <circle
                cx="18" cy="18" r="15.5" fill="none" stroke={scoreColor(score)} strokeWidth="3.5"
                strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[11px] font-black" style={{ color: scoreColor(score) }}>{score}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground"><Gauge className="h-3.5 w-3.5 text-muted-foreground" /> Data health: <span style={{ color: scoreColor(score) }}>{score}/100</span></p>
            <p className="truncate text-[11.5px] text-muted-foreground">{report.file} — {report.rows.toLocaleString()} rows × {report.cols} cols · scanned {report.scannedCells.toLocaleString()} cells just now</p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-muted-foreground">
              {clean ? "Every check passed" : `${open.filter((i) => i.severity === "high").length} must-fix · ${open.filter((i) => i.severity === "medium").length} should-fix · ${open.filter((i) => i.severity === "low").length} worth a look`}
            </p>
          </div>
        </div>
        <p className="mt-2 border-t border-border/50 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          This scan is <b>unique to this file</b> — load a different file and you get a different list. I re-scan after every edit, so fixes are detected automatically.
        </p>
      </div>

      {/* flash */}
      {flash && (
        <div className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ {flash}
        </div>
      )}

      {/* clean celebration */}
      {clean && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.07] px-3.5 py-4 text-center">
          <PartyPopper className="mx-auto mb-1.5 h-6 w-6 text-emerald-500" />
          <p className="text-[13px] font-black text-emerald-700 dark:text-emerald-400">This file is CLEAN — every check passed</p>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground/85">
            No blanks, no duplicates, no text-numbers, no date chaos in <b>{report.file}</b>. Totals from this file can be trusted — that&apos;s exactly what &quot;analysis-ready&quot; means. Save it to your portfolio and build the report on top.
          </p>
        </div>
      )}

      {/* issues */}
      {open.length > 0 && (
        <>
          <p className="px-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            <b>{open.length} issue{open.length === 1 ? "" : "s"} found in {report.file}</b> — sorted by damage: red first. Fix them top-down, I&apos;ll tick each one off automatically.
          </p>
          <div className="space-y-2">
            {open.map((i) => <IssueCard key={i.id} issue={i} api={api} tool={tool} fixed={false} />)}
          </div>
          {api.onReset && (
            <button
              onClick={() => { api.onReset?.(); coachSay(tool, "doctor.reset", "Reset — reverted all one-click fixes"); }}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-3 w-3" /> Undo all one-click fixes
            </button>
          )}
        </>
      )}

      {/* remaining alert strip */}
      {!clean && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[11.5px] leading-relaxed text-foreground/90">
            <b>Heads-up:</b> {open.length} issue{open.length === 1 ? " remains" : "s remain"} — I&apos;ll keep watching and alert you the moment each one is cleared. Anything I flag as <b>Must fix</b> genuinely breaks totals and charts; the rest is polish.
          </p>
        </div>
      )}

      {/* what the doctor checks */}
      <details className="rounded-lg border border-border/60 px-3 py-2">
        <summary className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-foreground/85">
          <Info className="h-3.5 w-3.5 text-muted-foreground" /> What I check in every file
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </summary>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          Blank cells · whole-row &amp; repeated-ID duplicates · extra spaces · numbers stored as text ($1,234) · mixed date formats · mixed capitalisation · look-alike spellings · impossible negatives · statistical outliers · empty rows · messy headers. Eleven checks, every file, every scan.
        </p>
      </details>
    </div>
  );
}

export { applyFix };
