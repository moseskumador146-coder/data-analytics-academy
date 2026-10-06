"use client";

/* Guide tab — "From clean data to calculations": the 8-step framework,
   per-dataset playbooks, and the which-function-do-I-need helper. */

import * as React from "react";
import { CheckCircle2, Circle, Copy, Lightbulb, Table2, Compass, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademy } from "@/lib/academy/store";
import { Md } from "../shared";
import { GUIDE_STEPS, PLAYBOOKS, DECISIONS } from "@/lib/academy/functions-db";

const TOOL_TABS = [
  { key: "excel", label: "Excel", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { key: "dax", label: "DAX", cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { key: "sql", label: "SQL", cls: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
] as const;

function CopyChip({ text }: { text: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      onClick={() => { try { navigator.clipboard?.writeText(text); } catch {} setDone(true); setTimeout(() => setDone(false), 1200); }}
      title="Copy formula"
      className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** one formula row with per-dialect chips */
function FormulaRow({ label, excel, dax, sql }: { label: string; excel?: string; dax?: string; sql?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      {label ? <p className="mb-2 text-[12px] font-bold text-foreground">{label}</p> : null}
      <div className="space-y-1.5">
        {excel && (
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Excel</span>
            <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] leading-relaxed text-foreground/80">{excel}</code>
            <CopyChip text={excel} />
          </div>
        )}
        {dax && (
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-amber-700 dark:text-amber-300">DAX</span>
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed text-foreground/80">{dax}</code>
            <CopyChip text={dax} />
          </div>
        )}
        {sql && (
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-sky-700 dark:text-sky-300">SQL</span>
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed text-foreground/80">{sql}</code>
            <CopyChip text={sql} />
          </div>
        )}
      </div>
    </div>
  );
}

export function GuideTab() {
  const { coachSteps, toggleCoachStep } = useAcademy();
  const done = coachSteps["func-guide"] ?? [];
  const [pb, setPb] = React.useState(PLAYBOOKS[0].datasetId);
  const playbook = PLAYBOOKS.find((p) => p.datasetId === pb) ?? PLAYBOOKS[0];
  const [dq, setDq] = React.useState("");
  const decisions = DECISIONS.filter((d) => !dq || d.q.toLowerCase().includes(dq.toLowerCase()) || d.note.toLowerCase().includes(dq.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* intro */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground"><Lightbulb className="h-4 w-4 text-amber-500" /> You cleaned the data — now what do you calculate?</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          Cleaning gives you trustworthy rows; calculations turn them into answers. This guide is the exact sequence working analysts follow after every cleaning job:
          confirm the grain, derive smart columns, define KPIs, add ratios and time comparisons, classify, then validate and document. Every formula below is shown in
          <b className="text-foreground"> Excel</b>, <b className="text-foreground">DAX (Power BI)</b> and <b className="text-foreground">SQL</b> side by side — the same thought in the three dialects you are learning.
        </p>
      </div>

      {/* framework steps */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground"><Workflow className="h-4.5 w-4.5 text-emerald-500" /> The 8-step framework</h2>
          <span className="text-[11.5px] font-medium text-muted-foreground">{done.length}/{GUIDE_STEPS.length} steps · +8 XP each</span>
        </div>
        <div className="space-y-3">
          {GUIDE_STEPS.map((s, i) => {
            const isDone = done.includes(s.id);
            return (
              <div key={s.id} className={cn("rounded-xl border bg-card transition-colors", isDone ? "border-emerald-500/30" : "border-border")}>
                <button
                  onClick={() => toggleCoachStep("func-guide", s.id)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                  aria-pressed={isDone}
                >
                  <span className="mt-0.5 shrink-0">{isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[14px] font-bold", isDone ? "text-muted-foreground" : "text-foreground")}>
                      {i + 1}. {s.title}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-bold text-muted-foreground">{isDone ? "done ✓" : "+8 XP"}</span>
                </button>
                <div className="px-4 pb-4 pl-12">
                  <Md text={s.body} className="[&_p]:!mt-0 [&_p]:text-[13px]" />
                  {s.formulas && (
                    <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
                      {s.formulas.map((f) => <FormulaRow key={f.label} {...f} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* playbooks */}
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground"><Table2 className="h-4.5 w-4.5 text-emerald-500" /> Dataset playbooks — what to add, per data type</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Pick the file family you just cleaned; get the derived columns and KPIs companies actually expect.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLAYBOOKS.map((p) => (
            <button
              key={p.datasetId}
              onClick={() => setPb(p.datasetId)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                p.datasetId === pb ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {p.title}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <p className="text-[12px] text-muted-foreground">Grain: <b className="text-foreground">{playbook.grain}</b> · slice by: <b className="text-foreground">{playbook.dims.join(", ")}</b> · add up: <b className="text-foreground">{playbook.facts.join(", ")}</b></p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Derived columns to add</p>
              <div className="space-y-2.5">
                {playbook.derived.map((d) => (
                  <div key={d.name} className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="font-mono text-[12px] font-bold text-emerald-700 dark:text-emerald-300">{d.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{d.why}</p>
                    <div className="mt-2"><FormulaRow label="" excel={d.excel} dax={d.dax} sql={d.sql} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">KPIs to compute</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-[12.5px]">
                  <tbody>
                    {playbook.kpis.map((k) => (
                      <tr key={k.name} className="border-b border-border/60 last:border-0">
                        <td className="w-1/3 px-3 py-2 align-top font-semibold text-foreground">{k.name}</td>
                        <td className="px-3 py-2 align-top">
                          <code className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">{k.formula}</code>
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{k.why}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* decision helper */}
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground"><Compass className="h-4.5 w-4.5 text-emerald-500" /> &ldquo;Which function do I need?&rdquo;</h2>
        <input
          value={dq}
          onChange={(e) => setDq(e.target.value)}
          placeholder="Search a task — e.g. unique, percent, running total, lookup…"
          className="mt-2 w-full max-w-md rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-emerald-500/50"
        />
        <div className="mt-3 grid gap-2.5">
          {decisions.map((d) => (
            <div key={d.q} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[13px] font-bold text-foreground">{d.q}</p>
              <div className="mt-2 grid gap-2 lg:grid-cols-3">
                <FormulaRow label="" excel={d.excel} />
                <FormulaRow label="" dax={d.dax} />
                <FormulaRow label="" sql={d.sql} />
              </div>
              <p className="mt-2 text-[12px] italic text-muted-foreground">{d.note}</p>
            </div>
          ))}
          {!decisions.length && <p className="text-[13px] text-muted-foreground">No match — try &ldquo;total&rdquo;, &ldquo;count&rdquo;, &ldquo;lookup&rdquo;, &ldquo;date&rdquo;, &ldquo;top&rdquo;…</p>}
        </div>
      </div>
    </div>
  );
}

export { TOOL_TABS };
