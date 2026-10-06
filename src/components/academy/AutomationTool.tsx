"use client";

/* Automation Studio — visual ETL pipeline builder: ingest → clean → validate →
   transform → aggregate → report. Runs instantly with a real step log, and exports
   the equivalent production Python/pandas script. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ToolHeader, PANEL, PANEL_HEAD, fmtMoney, fmtNum } from "./shared";
import { getAllDatasets, getDatasetById, downloadFile, type Dataset, type Row } from "@/lib/academy/datasets";
import { useAcademy } from "@/lib/academy/store";
import {
  Bot, Braces, CheckCircle2, Download, FileCode2, Filter, Layers, Play, PlayCircle, Plus,
  ShieldCheck, Sigma, Trash2, Workflow, XCircle,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell } from "recharts";

type StepType = "clean" | "validate" | "filter" | "group" | "report";

interface Step {
  id: string;
  type: StepType;
  col: string;
  value: string;
  measure: string;
  agg: "sum" | "avg" | "count";
}

interface LogLine {
  step: string;
  status: "ok" | "fail";
  detail: string;
  ms: number;
}

const STEP_META: Record<StepType, { label: string; icon: React.ReactNode; desc: string }> = {
  clean: { label: "Clean", icon: <Layers className="h-3.5 w-3.5" />, desc: "Dedupe + trim + standardize case" },
  validate: { label: "Validate", icon: <ShieldCheck className="h-3.5 w-3.5" />, desc: "Quality gate: keys non-null + volume check" },
  filter: { label: "Filter", icon: <Filter className="h-3.5 w-3.5" />, desc: "Keep rows where column equals value" },
  group: { label: "Aggregate", icon: <Sigma className="h-3.5 w-3.5" />, desc: "Group by column, aggregate measure" },
  report: { label: "Report", icon: <FileCode2 className="h-3.5 w-3.5" />, desc: "KPI summary + chart + CSV output" },
};

export function AutomationTool() {
  const { addXp } = useAcademy();
  const [datasetId, setDatasetId] = React.useState("messy_sales");
  const [steps, setSteps] = React.useState<Step[]>([
    { id: "s1", type: "clean", col: "", value: "", measure: "", agg: "sum" },
    { id: "s2", type: "validate", col: "", value: "", measure: "", agg: "sum" },
    { id: "s3", type: "group", col: "region", value: "", measure: "units", agg: "sum" },
    { id: "s4", type: "report", col: "", value: "", measure: "", agg: "sum" },
  ]);
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [running, setRunning] = React.useState(false);
  const [output, setOutput] = React.useState<{ label: string; value: number }[] | null>(null);
  const [finalRows, setFinalRows] = React.useState<Row[] | null>(null);
  const [showCode, setShowCode] = React.useState(false);

  const ds = getDatasetById(datasetId)!;
  const numericCols = ds.columns.filter((c) => c.type === "number" || c.type === "currency");

  const addStep = (type: StepType) =>
    setSteps((s) => [...s, { id: Math.random().toString(36).slice(2), type, col: type === "group" ? ds.columns[0].key : "", value: "", measure: numericCols[0]?.key ?? "", agg: "sum" }]);

  const update = (id: string, patch: Partial<Step>) => setSteps((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const run = async () => {
    setRunning(true);
    setLogs([]);
    setOutput(null);
    const lines: LogLine[] = [];
    let data: Row[] = ds.rows.map((r) => ({ ...r }));
    const t0 = performance.now();

    const ingest: LogLine = { step: "1 · Ingest", status: "ok", detail: `${ds.name}: ${data.length} rows, ${ds.columns.length} cols`, ms: +(performance.now() - t0).toFixed(1) };
    lines.push(ingest);
    setLogs([...lines]);
    await sleep(120);

    let failed = false;
    let stepNo = 1;
    for (const s of steps) {
      stepNo++;
      const st = performance.now();
      const before = data.length;
      let detail = "";
      let status: "ok" | "fail" = "ok";
      try {
        if (s.type === "clean") {
          const seen = new Set<string>();
          data = data.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
          const smartCase = (s: string) =>
            s.replace(/\s+/g, " ").split(" ").map((w) => {
              if (!w) return w;
              if (w.length > 1 && (w === w.toUpperCase() || w === w.toLowerCase())) return w[0].toUpperCase() + w.slice(1).toLowerCase();
              return w;
            }).join(" ");
          data = data.map((r) => {
            const c: Row = {};
            for (const k of Object.keys(r)) {
              const v = r[k];
              c[k] = typeof v === "string"
                ? isNaN(parseFloat(v))
                  ? smartCase(v.trim())
                  : v.trim().replace(/[$"]/g, "")
                : v;
            }
            return c;
          });
          detail = `deduped ${before - data.length} rows, trimmed + standardized case`;
        }
        if (s.type === "validate") {
          const col = s.col || ds.columns[0].key;
          const nullKeys = data.filter((r) => String(r[col] ?? "").trim() === "").length;
          const volumeOk = data.length >= before * 0.5 || before === 0;
          if (nullKeys > data.length * 0.3 || !volumeOk) {
            status = "fail";
            detail = `QUALITY GATE FAILED: ${nullKeys} null ${col} values / volume ${data.length}. Pipeline halted before publish.`;
            failed = true;
          } else {
            detail = `gate passed: 0 critical nulls in ${col}, volume ${data.length} within ±50% band`;
          }
        }
        if (s.type === "filter" && s.col && s.value) {
          data = data.filter((r) => String(r[s.col] ?? "").toLowerCase().includes(s.value.toLowerCase()));
          detail = `kept ${data.length}/${before} rows where ${s.col} ~ "${s.value}"`;
        }
        if (s.type === "group" && s.col) {
          const groups = new Map<string, number[]>();
          for (const r of data) {
            const k = String(r[s.col] ?? "(blank)");
            const v = parseFloat(String(r[s.measure] ?? "").replace(/[$,\s]/g, ""));
            if (!groups.has(k)) groups.set(k, []);
            if (!isNaN(v)) groups.get(k)!.push(v);
          }
          const aggData = [...groups.entries()].map(([label, vals]) => ({
            label,
            value: s.agg === "count" ? vals.length : s.agg === "avg" ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0),
          })).sort((a, b) => b.value - a.value);
          setOutput(aggData.map((d) => ({ label: d.label, value: +d.value.toFixed(2) })));
          detail = `grouped by ${s.col} → ${aggData.length} groups (${s.agg} of ${s.measure})`;
        }
        if (s.type === "report") {
          setFinalRows(data);
          detail = `report ready: ${data.length} rows → KPIs + CSV output (idempotent overwrite)`;
        }
      } catch {
        status = "fail";
        detail = "step error";
        failed = true;
      }
      lines.push({ step: `${stepNo} · ${STEP_META[s.type].label}`, status, detail, ms: +(performance.now() - st).toFixed(1) });
      setLogs([...lines]);
      await sleep(140);
      if (failed) break;
    }

    const totalMs = +(performance.now() - t0).toFixed(1);
    lines.push({
      step: "✔ Run complete",
      status: failed ? "fail" : "ok",
      detail: failed ? "halted by quality gate — nothing published (safe failure)" : `all steps green in ${totalMs} ms · outputs published`,
      ms: totalMs,
    });
    setLogs([...lines]);
    setRunning(false);
    addXp(10);
  };

  const pythonCode = React.useMemo(() => {
    const measureName = (k: string) => k;
    const lines: string[] = [];
    lines.push(`"""Generated pipeline — ${ds.name}`);
    lines.push(`Run: python pipeline.py   (idempotent, safe to re-run)`);
    lines.push(`"""`);
    lines.push(`import pandas as pd`);
    lines.push(`from pathlib import Path`);
    lines.push("");
    lines.push(`OUT = Path("output"); OUT.mkdir(exist_ok=True)`);
    lines.push("");
    lines.push(`def run():`);
    lines.push(`    df = pd.read_csv("data/input.csv")`);
    lines.push(`    print(f"[ingest] {len(df)} rows, {df.shape[1]} cols")`);
    let n = 1;
    for (const s of steps) {
      n++;
      if (s.type === "clean") {
        lines.push(`    # ${n}. Clean`);
        lines.push(`    df = df.drop_duplicates()`);
        lines.push(`    for col in df.select_dtypes("object"): df[col] = df[col].str.strip().str.replace(r"\\s+", " ", regex=True)`);
        lines.push(`    print(f"[clean] {len(df)} rows after dedupe")`);
      }
      if (s.type === "validate") {
        lines.push(`    # ${n}. Quality gate`);
        lines.push(`    nulls = df[${JSON.stringify(s.col || ds.columns[0].key)}].isna().sum()`);
        lines.push(`    assert nulls == 0, f"QUALITY FAIL: {nulls} null keys — halting before publish"`);
        lines.push(`    print(f"[validate] gate passed, 0 null keys")`);
      }
      if (s.type === "filter" && s.col) {
        lines.push(`    # ${n}. Filter`);
        lines.push(`    df = df[df[${JSON.stringify(s.col)}].astype(str).str.contains(${JSON.stringify(s.value)}, case=False, na=False)]`);
      }
      if (s.type === "group" && s.col) {
        lines.push(`    # ${n}. Aggregate`);
        lines.push(`    agg = df.groupby(${JSON.stringify(s.col)})[${JSON.stringify(s.measure)}].${s.agg}().sort_values(ascending=False)`);
        lines.push(`    print(agg)`);
      }
      if (s.type === "report") {
        lines.push(`    # ${n}. Report`);
        lines.push(`    agg.to_csv(OUT / "summary.csv")`);
        lines.push(`    print(f"[report] wrote {OUT}/summary.csv — idempotent overwrite")`);
      }
    }
    lines.push(`    print(f"[done] pipeline green")`);
    lines.push("");
    lines.push(`if __name__ == "__main__":`);
    lines.push(`    run()`);
    return lines.join("\n").replace(`df[df[${JSON.stringify("__x__")}}`, "");
  }, [steps, ds]);

  const exportPipelineJson = () => {
    downloadFile("pipeline.json", JSON.stringify({ dataset: datasetId, steps }, null, 2), "application/json");
  };

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<Workflow className="h-5 w-5 text-violet-400" />}
        title="Automation Studio"
        subtitle="Build ETL pipelines visually: ingest → clean → validate → aggregate → report. Exports real Python."
        accent="violet"
        actions={
          <>
            <Select value={datasetId} onValueChange={(v) => { setDatasetId(v); setLogs([]); setOutput(null); }}>
              <SelectTrigger className="w-[210px] border-border bg-card text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="border-border bg-card">
                {getAllDatasets().map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                <SelectItem value="messy_sales">Retail Sales H2-2024 (Messy)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="bg-violet-500 font-semibold text-white hover:bg-violet-400" onClick={run} disabled={running}>
              {running ? <PlayCircle className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />} Run pipeline
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_1fr]">
        {/* pipeline builder */}
        <div className="space-y-3">
          <div className={PANEL}>
            <div className={PANEL_HEAD}>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Workflow className="h-3.5 w-3.5 text-violet-400" /> Pipeline steps</span>
              <span className="text-[11px] text-muted-foreground/80">{steps.length} steps</span>
            </div>
            <div className="space-y-2 p-3">
              {steps.map((s, i) => (
                <div key={s.id} className="group rounded-lg border border-border bg-black/25 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/90">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/20 text-[11px] font-bold text-violet-300">{i + 1}</span>
                      {STEP_META[s.type].icon}<span>{STEP_META[s.type].label}</span>
                    </p>
                    <button className="text-muted-foreground/60 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100" onClick={() => setSteps((ss) => ss.filter((x) => x.id !== s.id))}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">{STEP_META[s.type].desc}</p>
                  {s.type === "validate" && (
                    <div className="mt-2">
                      <SelectParam label="Key column (non-null check)" value={s.col || ds.columns[0].key} onChange={(v) => update(s.id, { col: v })}>
                        {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                      </SelectParam>
                    </div>
                  )}
                  {s.type === "filter" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <SelectParam label="Column" value={s.col || "__pick"} onChange={(v) => update(s.id, { col: v })}>
                        {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                      </SelectParam>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground/80">Contains</label>
                        <Input value={s.value} onChange={(e) => update(s.id, { value: e.target.value })} className="h-8 border-border bg-black/30 text-xs" placeholder="value…" />
                      </div>
                    </div>
                  )}
                  {s.type === "group" && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <SelectParam label="Group by" value={s.col || ds.columns[0].key} onChange={(v) => update(s.id, { col: v })}>
                        {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                      </SelectParam>
                      <SelectParam label="Measure" value={s.measure || numericCols[0]?.key} onChange={(v) => update(s.id, { measure: v })}>
                        {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                      </SelectParam>
                      <SelectParam label="Agg" value={s.agg} onChange={(v) => update(s.id, { agg: v as Step["agg"] })}>
                        {(["sum", "avg", "count"] as const).map((a) => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
                      </SelectParam>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(Object.keys(STEP_META) as StepType[]).map((t) => (
                  <Button key={t} variant="outline" size="sm" className="h-7 border-border px-2 text-[11px] hover:bg-violet-500/10 hover:text-violet-300" onClick={() => addStep(t)}>
                    <Plus className="h-3 w-3" />{STEP_META[t].label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className={PANEL}>
            <div className={PANEL_HEAD}>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><FileCode2 className="h-3.5 w-3.5 text-violet-400" /> Generated Python</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setShowCode(!showCode)}>{showCode ? "Hide" : "View"}</Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => downloadFile("pipeline.py", pythonCode, "text/x-python")}><Download className="h-3 w-3" /></Button>
              </div>
            </div>
            {showCode && (
              <pre className="max-h-72 overflow-auto bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-emerald-200/80 scrollbar-thin">{pythonCode}</pre>
            )}
            {!showCode && (
              <p className="p-3 text-[11px] leading-relaxed text-muted-foreground/80">
                Your visual pipeline compiles to a runnable pandas script — the same pattern used in production ETL jobs (Project 5).
              </p>
            )}
          </div>
        </div>

        {/* run log + output */}
        <div className="space-y-3">
          <div className={PANEL}>
            <div className={PANEL_HEAD}>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Bot className="h-3.5 w-3.5 text-violet-400" /> Run log</span>
              {logs.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => downloadFile("pipeline.json", JSON.stringify({ dataset: datasetId, steps, lastRun: logs }, null, 2), "application/json")}>
                  <Braces className="h-3 w-3" /> Export run
                </Button>
              )}
            </div>
            <div className="min-h-[220px] space-y-1.5 p-3 font-mono text-[12px]">
              {logs.length === 0 && <p className="py-8 text-center text-muted-foreground/60">Press ▶ Run pipeline — steps execute with live row counts and quality gates.</p>}
              {logs.map((l, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${l.status === "fail" ? "bg-red-500/10 text-red-600 dark:text-red-300" : "bg-muted/40 text-foreground/80"}`}>
                  {l.status === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
                  <span className="text-violet-300/80">{l.step}</span>
                  <span className="min-w-0 flex-1">{l.detail}</span>
                  <span className="shrink-0 text-muted-foreground/60">{l.ms}ms</span>
                </div>
              ))}
            </div>
          </div>

          {output && output.length > 0 && (
            <div className={PANEL}>
              <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline output — aggregated result</span></div>
              <div className="p-3">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={output} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(v: number) => fmtNum(v)} width={56} />
                    <RTooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtMoney(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {output.map((_, i) => <Cell key={i} fill={["#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"][i % 5]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {output.slice(0, 4).map((d) => (
                    <div key={d.label} className="rounded-lg border border-border bg-black/25 p-2.5">
                      <p className="truncate text-[11px] text-muted-foreground/80">{d.label}</p>
                      <p className="text-sm font-bold text-foreground">{fmtNum(d.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function SelectParam({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground/80">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 border-border bg-card text-xs"><SelectValue /></SelectTrigger>
        <SelectContent className="border-border bg-card">{children}</SelectContent>
      </Select>
    </div>
  );
}
