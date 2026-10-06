"use client";

/* Excel Formulas tab — searchable function library + a live sandbox that
   evaluates learner formulas with the exact same engine as Excel Studio. */

import * as React from "react";
import { Play, RotateCcw, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Md, levelBadgeCls } from "../shared";
import { EXCEL_FUNCS, type FuncEntry } from "@/lib/academy/functions-db";
import { evalSheetFormula, FormulaError } from "@/lib/academy/formula-engine";
import { getCleanSales, type Row } from "@/lib/academy/datasets";

/* ---------- shared library list/detail layout (reused by DAX & SQL tabs) ---------- */
export function FunctionLibrary({ funcs, accent }: { funcs: FuncEntry[]; accent: string }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string>("All");
  const [selId, setSelId] = React.useState<string>(funcs[0]?.id ?? "");
  const cats = ["All", ...Array.from(new Set(funcs.map((f) => f.category)))];
  const filtered = funcs.filter((f) =>
    (cat === "All" || f.category === cat) &&
    (!q || `${f.name} ${f.summary} ${f.detail}`.toLowerCase().includes(q.toLowerCase()))
  );
  const sel = funcs.find((f) => f.id === selId) ?? filtered[0] ?? funcs[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
      {/* list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${funcs.length} functions…`}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-[12.5px] outline-none placeholder:text-muted-foreground/60 focus:border-emerald-500/50"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                  c === cat ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto p-1.5 scrollbar-thin">
          {filtered.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelId(f.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                f.id === sel?.id ? "bg-emerald-500/10" : "hover:bg-muted/60"
              )}
            >
              <span className="min-w-0">
                <span className={cn("block truncate font-mono text-[12.5px] font-bold", f.id === sel?.id ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>{f.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{f.summary}</span>
              </span>
            </button>
          ))}
          {!filtered.length && <p className="px-3 py-4 text-[12px] text-muted-foreground">Nothing matches &ldquo;{q}&rdquo;.</p>}
        </div>
      </div>

      {/* detail */}
      {sel && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-mono text-lg font-extrabold", accent)}>{sel.name}</h3>
            <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", levelBadgeCls(sel.level))}>{sel.level}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{sel.category}</span>
          </div>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">{sel.summary}</p>
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Syntax</p>
            <code className="mt-0.5 block break-all font-mono text-[12.5px] text-foreground">{sel.syntax}</code>
          </div>
          {sel.args && (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-[12.5px]">
                <tbody>
                  {sel.args.map((a) => (
                    <tr key={a.name} className="border-b border-border/60 last:border-0">
                      <td className="w-32 px-3 py-1.5 align-top font-mono text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300">{a.name}</td>
                      <td className="px-3 py-1.5 text-foreground/80">{a.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Example — real result on this platform&apos;s data</p>
            <code className="mt-1 block break-all font-mono text-[12.5px] text-foreground">{sel.example}</code>
            <p className="mt-1 text-[12px] text-muted-foreground">→ {sel.exampleResult}</p>
          </div>
          <Md text={sel.detail} className="mt-3 [&_p]:text-[13.5px]" />
          {sel.tip && (
            <p className="mt-3 rounded-lg border-l-4 border-amber-400 bg-muted/40 px-3 py-2 text-[12.5px] text-foreground/85"><b className="text-amber-600 dark:text-amber-400">Tip ·</b> {sel.tip}</p>
          )}
          {sel.gotcha && (
            <p className="mt-2 rounded-lg border-l-4 border-rose-400 bg-muted/40 px-3 py-2 text-[12.5px] text-foreground/85"><b className="text-rose-600 dark:text-rose-400">Gotcha ·</b> {sel.gotcha}</p>
          )}
          {sel.related && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Related:</span>
              {sel.related.map((rid) => {
                const r = funcs.find((x) => x.id === rid);
                return r ? (
                  <button key={rid} onClick={() => setSelId(rid)} className="rounded border border-border px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground">
                    {r.name}
                  </button>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- the Excel sandbox ---------- */
const COL_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
const COL_KEYS = ["order_id", "order_date", "customer", "region", "category", "product", "units", "unit_price", "revenue", "channel", "payment_method"];

function buildSandboxCells(): Record<string, string> {
  const ds = getCleanSales();
  const cells: Record<string, string> = {};
  COL_KEYS.forEach((c, i) => { cells[`${COL_LETTERS[i]}1`] = c; });
  ds.rows.slice(0, 198).forEach((row: Row, r) => {
    COL_KEYS.forEach((c, ci) => {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "") cells[`${COL_LETTERS[ci]}${r + 2}`] = String(v);
    });
  });
  return cells;
}

const SANDBOX_EXAMPLES = [
  "=SUM(I:I)",
  '=SUMIF(D:D,"West",I:I)',
  '=COUNTIF(E:E,"Electronics")',
  "=AVERAGE(H2:H199)",
  '=SUMIFS(I:I,D:D,"West",E:E,"Sports")',
  "=SUMPRODUCT(G2:G199,H2:H199)",
  '=IF(AVERAGE(H2:H199)>50,"premium mix","value mix")',
  '=TEXT(B2,"yyyy-mm")&" · "&C2',
  '=IFERROR(I2/0,"n/a")',
  "=LARGE(I2:I199,3)",
  '=COUNTIF(C2:C199,"Yara*")',
  "=ROUND(AVERAGE(H2:H199),0)",
];

export function ExcelTab() {
  const cellsRef = React.useRef<Record<string, string>>(buildSandboxCells());
  const [formula, setFormula] = React.useState("=SUM(I:I)");
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null);
  const ds = getCleanSales();

  const run = React.useCallback(() => {
    const src = formula.trim().replace(/^=/, "");
    if (!src) { setResult({ ok: false, text: "Type a formula first, e.g. =SUM(I:I)" }); return; }
    try {
      const v = evalSheetFormula(src, cellsRef.current, new Set());
      setResult({
        ok: true,
        text: typeof v === "number"
          ? (Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 4 }))
          : String(v),
      });
    } catch (e) {
      setResult({ ok: false, text: e instanceof FormulaError ? e.message : "#ERROR!" });
    }
  }, [formula]);

  React.useEffect(() => { run(); }, []); // initial example result

  return (
    <div className="space-y-5">
      {/* sandbox */}
      <div className="rounded-xl border border-emerald-500/25 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground"><Sparkles className="h-4 w-4 text-emerald-500" /> Live formula sandbox</p>
            <p className="text-[11.5px] text-muted-foreground">clean_sales loaded as a sheet · {Math.min(ds.rows.length, 198)} data rows in A2:K199 · headers in row 1</p>
          </div>
          <button onClick={() => setFormula("")} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"><RotateCcw className="h-3 w-3" /> Clear</button>
        </div>
        <div className="p-4">
          {/* column map */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {COL_KEYS.map((k, i) => (
              <span key={k} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                <b className="text-foreground">{COL_LETTERS[i]}</b> {k}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="=SUM(I:I)"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-emerald-500/50"
              aria-label="Excel formula"
            />
            <button onClick={run} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[12.5px] font-bold text-black hover:bg-emerald-400">
              <Play className="h-3.5 w-3.5" /> Run
            </button>
          </div>
          {result && (
            <div className={cn(
              "mt-3 rounded-lg border px-3.5 py-2.5 font-mono text-[14px] font-bold",
              result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {result.ok ? "= " : "✗ "}{result.text}
            </div>
          )}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Try one</p>
            <div className="flex flex-wrap gap-1.5">
              {SANDBOX_EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setFormula(ex)} className="rounded border border-border px-2 py-1 font-mono text-[10.5px] text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground">
                  {ex.length > 42 ? `${ex.slice(0, 42)}…` : ex}
                </button>
              ))}
            </div>
          </div>
          {/* data preview */}
          <div className="mt-4 overflow-x-auto rounded-lg border border-border scrollbar-thin">
            <table className="w-full min-w-[760px] text-[11px]">
              <thead className="bg-muted/60">
                <tr>{COL_LETTERS.map((l, i) => <th key={l} className="border-b border-r border-border px-2 py-1 text-left font-mono text-muted-foreground">{l} · {COL_KEYS[i]}</th>)}</tr>
              </thead>
              <tbody>
                {ds.rows.slice(0, 5).map((r, ri) => (
                  <tr key={ri} className="border-b border-border/40 last:border-0">
                    {COL_KEYS.map((k) => (
                      <td key={k} className="max-w-[130px] truncate border-r border-border/40 px-2 py-1 font-mono text-foreground/75 last:border-0">{String(r[k] ?? "")}</td>
                    ))}
                  </tr>
                ))}
                <tr><td colSpan={11} className="px-2 py-1 text-center text-[10px] text-muted-foreground">… rows 7–199 in the real sheet (full-column refs like I:I cover them)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* library */}
      <FunctionLibrary funcs={EXCEL_FUNCS} accent="text-emerald-600 dark:text-emerald-400" />
    </div>
  );
}
