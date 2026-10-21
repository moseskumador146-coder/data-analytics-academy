"use client";

/* DAX & Measures tab — function library + a live Measure Studio that evaluates
   real DAX syntax against the Sales model (CALCULATE, FILTER, ALL, SUMX,
   DIVIDE, IF/SWITCH, time intelligence) with persisted user measures. */

import * as React from "react";
import { Play, Save, Trash2, Columns3, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademy } from "@/lib/academy/store";
import { getCleanSales, type Row } from "@/lib/academy/datasets";
import { createDaxEngine, type DaxEngine } from "@/lib/academy/dax-engine";
import { DAX_FUNCS } from "@/lib/academy/functions-db";
import { FunctionLibrary } from "./ExcelTab";

const BUILTINS = [
  { name: "Total Sales", formula: "SUM('Sales'[revenue])" },
  { name: "Total Units", formula: "SUM('Sales'[units])" },
  { name: "Orders", formula: "COUNTROWS('Sales')" },
  { name: "Avg Order Value", formula: "DIVIDE([Total Sales], [Orders])" },
  { name: "Unique Customers", formula: "DISTINCTCOUNT('Sales'[customer])" },
];

const EXAMPLE_MEASURES: { name: string; formula: string; note: string }[] = [
  { name: "West Sales", formula: 'CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "West")', note: "CALCULATE with a simple filter — overrides the visual's region filter" },
  { name: "Sales YTD", formula: "TOTALYTD(SUM('Sales'[revenue]), 'Sales'[order_date])", note: "year-to-date revenue — the boardroom number" },
  { name: "Sales % of Total", formula: "DIVIDE([Total Sales], CALCULATE([Total Sales], ALL('Sales')))", note: "ALL removes the filters in the denominator — the % of total pattern" },
  { name: "Big-line Share", formula: "DIVIDE( CALCULATE(SUM('Sales'[revenue]), 'Sales'[units] >= 10), CALCULATE(SUM('Sales'[revenue]), ALL('Sales')) )", note: "share of revenue from lines with 10+ units" },
  { name: "Sales Last Year", formula: "CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Sales'[order_date]))", note: "returns (BLANK) here — no 2024 rows exist. That's the lesson." },
  { name: "Revenue per Region", formula: "AVERAGEX(VALUES('Sales'[region]), CALCULATE(SUM('Sales'[revenue])))", note: "iterator + context transition — average of the 4 region totals" },
  { name: "High-Value Lines", formula: "COUNTROWS(FILTER('Sales', 'Sales'[revenue] >= 1000))", note: "FILTER walks the table row by row" },
  { name: "Avg Units per Line", formula: "AVERAGEX('Sales', 'Sales'[units])", note: "simple iterator — mean of a row expression" },
];

export function DaxTab() {
  const dax = React.useMemo(() => {
    const rows: Row[] = getCleanSales().rows;
    return createDaxEngine("Sales", rows, BUILTINS);
  }, []);
  const { daxMeasures, saveDaxMeasure, deleteDaxMeasure } = useAcademy();

  const [formula, setFormula] = React.useState('[Avg Order Value]');
  const [name, setName] = React.useState("");
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [flash, setFlash] = React.useState("");

  const run = React.useCallback(() => {
    try {
      const r = dax.evaluate(formula);
      setResult({ ok: true, text: r.display });
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
    }
  }, [formula, dax]);

  React.useEffect(() => { run(); }, []); // initial example result

  const userVals = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of daxMeasures) {
      try { map.set(m.name, dax.evaluate(m.formula).display); } catch (e) { map.set(m.name, `✗ ${(e as Error).message}`); }
    }
    return map;
  }, [daxMeasures, dax]);

  const builtinVals = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of BUILTINS) {
      try { map.set(m.name, dax.evaluate(m.formula).display); } catch { map.set(m.name, "—"); }
    }
    return map;
  }, [dax]);

  const save = () => {
    const n = name.trim();
    if (!n) { setFlash("Give the measure a name first — e.g. West Sales."); return; }
    try {
      dax.evaluate(formula); // validate before saving
      dax.register(n, formula);
      saveDaxMeasure(n, formula);
      setName("");
      setFlash(`Saved measure [${n}] — it now works inside other measures too.`);
      setTimeout(() => setFlash(""), 3500);
    } catch (e) {
      setFlash(`Can't save: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* concept strip */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground"><Columns3 className="h-4 w-4 text-amber-500" /> Calculated column — one value per ROW</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">Computed once per row at refresh and stored: <code className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">revenue = units × price</code>, month keys, price bands. Use it when the result belongs to the row and you slice or filter <b className="text-foreground">by</b> it.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground"><Gauge className="h-4 w-4 text-amber-500" /> Measure — one value per VISUAL CELL</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">Computed at query time inside the filter context the visual supplies: Total Sales, AOV, % of total, YoY. If it&apos;s a KPI that must react to slicers, it&apos;s a measure. That&apos;s what this studio evaluates.</p>
        </div>
      </div>

      {/* measure studio */}
      <div className="rounded-xl border border-amber-500/25 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-[13px] font-bold text-foreground">Measure Studio — live DAX evaluation</p>
            <p className="text-[11.5px] text-muted-foreground">Model: one <b>&apos;Sales&apos;</b> table · 340 rows · FY2025 · columns: order_id, order_date, customer, region, category, product, units, unit_price, revenue, channel, payment_method</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <input
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder={'CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "West")'}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-amber-500/50"
              aria-label="DAX measure"
            />
            <button onClick={run} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-[12.5px] font-bold text-black hover:bg-amber-400">
              <Play className="h-3.5 w-3.5" /> Evaluate
            </button>
          </div>
          {result && (
            <div className={cn(
              "rounded-lg border px-3.5 py-2.5",
              result.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"
            )}>
              {result.ok ? (
                <p className="font-mono text-[15px] font-extrabold text-emerald-700 dark:text-emerald-300">{result.text}</p>
              ) : (
                <p className="text-[12.5px] leading-relaxed text-rose-600 dark:text-rose-400">{result.text}</p>
              )}
            </div>
          )}

          {/* save a measure */}
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Measure name (e.g. West Sales)"
              className="w-56 rounded-lg border border-border bg-background px-3 py-1.5 text-[12.5px] outline-none focus:border-amber-500/50"
            />
            <button onClick={save} className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[12px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">
              <Save className="h-3.5 w-3.5" /> Save measure
            </button>
          </div>
          {flash && <p className="text-[12px] text-muted-foreground">{flash}</p>}

          {/* example measures */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">One-click pattern library — click to load into the editor</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXAMPLE_MEASURES.map((m) => (
                <button key={m.name} onClick={() => { setFormula(m.formula); setName(m.name); run(); }} className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-amber-500/40 hover:bg-muted/50">
                  <p className="font-mono text-[11.5px] font-bold text-foreground">{m.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{m.note}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* measure cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-4 py-2.5 text-[12px] font-bold text-foreground">Built-in measures — always available</p>
          <div className="divide-y divide-border/60">
            {BUILTINS.map((m) => (
              <div key={m.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-foreground">[{m.name}]</p>
                  <code className="block truncate font-mono text-[10.5px] text-muted-foreground">{m.formula}</code>
                </div>
                <p className="shrink-0 font-mono text-[13px] font-extrabold text-emerald-700 dark:text-emerald-300">{builtinVals.get(m.name)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card">
          <p className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[12px] font-bold text-foreground">
            <span>Your saved measures ({daxMeasures.length})</span>
            <span className="text-[10px] font-medium text-muted-foreground">persist in your browser</span>
          </p>
          {daxMeasures.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">Save your first measure above — try one of the patterns. Saved measures can reference each other, just like in Power BI.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {daxMeasures.map((m) => (
                <div key={m.name} className="group flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-foreground">[{m.name}]</p>
                    <code className="block break-all font-mono text-[10.5px] text-muted-foreground">{m.formula}</code>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className={cn("font-mono text-[13px] font-extrabold", String(userVals.get(m.name) ?? "").startsWith("✗") ? "text-rose-500" : "text-emerald-700 dark:text-emerald-300")}>{userVals.get(m.name)}</p>
                    <button onClick={() => { deleteDaxMeasure(m.name); dax.remove(m.name); }} aria-label={`Delete ${m.name}`} className="rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* library */}
      <FunctionLibrary funcs={DAX_FUNCS} accent="text-amber-600 dark:text-amber-400" />
    </div>
  );
}
