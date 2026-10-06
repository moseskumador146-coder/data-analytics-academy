"use client";

/* SQL Playground — real in-browser SQL engine (SELECT/JOIN/GROUP BY/HAVING/ORDER BY),
   schema browser, results grid, and 10 auto-checked exercises. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolHeader, PANEL, PANEL_HEAD } from "./shared";
import { getSqlTables } from "@/lib/academy/datasets";
import { runSql } from "@/lib/academy/sql-engine";
import { useAcademy } from "@/lib/academy/store";
import {
  BookOpenCheck, CheckCircle2, ChevronRight, Database, Eye, Play, Table2, Terminal, XCircle,
} from "lucide-react";

interface Exercise {
  id: number;
  title: string;
  prompt: string;
  hint: string;
  solution: string;
}

const EXERCISES: Exercise[] = [
  {
    id: 1, title: "First look", prompt: "Show the name and city of every customer. Limit to 10 rows.",
    hint: "SELECT picks columns, FROM picks the table, LIMIT caps rows.",
    solution: "SELECT name, city FROM customers LIMIT 10;",
  },
  {
    id: 2, title: "Filter rows", prompt: "Show all completed orders from June 2025 onwards (order_date >= '2025-06-01'), newest first, limit 15.",
    hint: "WHERE filters rows before anything else. ORDER BY col DESC sorts newest first.",
    solution: "SELECT * FROM orders WHERE status = 'completed' AND order_date >= '2025-06-01' ORDER BY order_date DESC LIMIT 15;",
  },
  {
    id: 3, title: "Pattern match", prompt: "Find customers whose name starts with 'A' or live in London.",
    hint: "LIKE 'A%' matches names starting with A. OR combines conditions.",
    solution: "SELECT * FROM customers WHERE name LIKE 'A%' OR city = 'London';",
  },
  {
    id: 4, title: "First aggregate", prompt: "Count orders per status, sorted by count descending.",
    hint: "GROUP BY collapses rows; COUNT(*) counts each group; HAVING filters groups (not needed here).",
    solution: "SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY orders DESC;",
  },
  {
    id: 5, title: "Revenue by month", prompt: "Compute monthly revenue: JOIN order_items to orders, take completed orders, group by month (order_date sliced to 7 chars).",
    hint: "Line revenue = quantity * unit_price. substr(order_date, 1, 7) gives 'YYYY-MM'. Use UPPER/substr as needed.",
    solution: "SELECT substr(o.order_date, 1, 7) AS month, SUM(i.quantity * i.unit_price) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'completed' GROUP BY substr(o.order_date, 1, 7) ORDER BY month;",
  },
  {
    id: 6, title: "HAVING", prompt: "Which customers placed 5 or more orders? Show customer_id and order count.",
    hint: "WHERE filters rows; HAVING filters groups after aggregation.",
    solution: "SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id HAVING COUNT(*) >= 5 ORDER BY n DESC;",
  },
  {
    id: 7, title: "Your first JOIN", prompt: "Show order id, order date and customer name for completed orders. Limit 20.",
    hint: "JOIN customers c ON o.customer_id = c.id — then both tables' columns are available.",
    solution: "SELECT o.id AS order_id, o.order_date, c.name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = 'completed' LIMIT 20;",
  },
  {
    id: 8, title: "Revenue per product", prompt: "Top 10 products by completed revenue: product name + revenue. Two JOINs needed.",
    hint: "orders → order_items (i.order_id = o.id) → products (p.id = i.product_id). SUM(quantity * unit_price), GROUP BY product name.",
    solution: "SELECT p.name, SUM(i.quantity * i.unit_price) AS revenue FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.status = 'completed' GROUP BY p.name ORDER BY revenue DESC LIMIT 10;",
  },
  {
    id: 9, title: "LEFT JOIN", prompt: "Which customers never placed an order? Show their name and city.",
    hint: "LEFT JOIN keeps customers without matches; the orders columns come back empty — test with IS NULL.",
    solution: "SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;",
  },
  {
    id: 10, title: "CTE capstone", prompt: "Top 3 cities by completed revenue using a WITH clause (order the steps: line revenue → join customers → group by city).",
    hint: "WITH revenue AS (...), city AS (...) SELECT ... — build it step by step and test each CTE alone.",
    solution: "WITH rev AS (SELECT o.id AS order_id, o.customer_id, i.quantity * i.unit_price AS line_rev FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'completed'), city_rev AS (SELECT c.city, SUM(r.line_rev) AS revenue FROM rev r JOIN customers c ON c.id = r.customer_id GROUP BY c.city) SELECT * FROM city_rev ORDER BY revenue DESC LIMIT 3;",
  },
];

export function SqlTool() {
  const tables = getSqlTables();
  const { addXp } = useAcademy();
  const [sql, setSql] = React.useState("SELECT name, city, segment\nFROM customers\nLIMIT 10;");
  const [result, setResult] = React.useState<{ columns: string[]; rows: (string | number | null)[][]; ms: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openTable, setOpenTable] = React.useState<string | null>("customers");
  const [exOpen, setExOpen] = React.useState(false);
  const [checked, setChecked] = React.useState<Record<number, "pass" | "fail" | null>>({});
  const [showHint, setShowHint] = React.useState<Record<number, boolean>>({});
  const [showSolution, setShowSolution] = React.useState<Record<number, boolean>>({});
  const [completedCount, setCompletedCount] = React.useState(0);

  const run = (query?: string) => {
    const q = (query ?? sql).trim();
    if (!q) return;
    try {
      const res = runSql(q, tables);
      setResult(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  };

  const check = (ex: Exercise) => {
    try {
      const user = runSql(sql, tables);
      const sol = runSql(ex.solution, tables);
      const norm = (r: typeof user) =>
        JSON.stringify([r.columns.map((c) => c.toLowerCase()), r.rows.map((row) => row.map((v) => (v === null ? "" : typeof v === "number" ? +Number(v).toFixed(4) : String(v))))]);
      const ok = norm(user) === norm(sol);
      setChecked((c) => ({ ...c, [ex.id]: ok ? "pass" : "fail" }));
      if (ok && !checked[ex.id]) { addXp(15); setCompletedCount((n) => n + 1); }
    } catch (e) {
      setChecked((c) => ({ ...c, [ex.id]: "fail" }));
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadExercise = (ex: Exercise) => {
    setSql(`-- Exercise ${ex.id}: ${ex.title}\n-- ${ex.prompt}\n\n`);
    setExOpen(false);
  };

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<Database className="h-5 w-5 text-emerald-400" />}
        title="SQL Playground"
        subtitle="Real in-browser SQL engine — JOINs, GROUP BY, HAVING, CTEs. Zero setup, instant results."
        accent="sky"
        actions={
          <Button variant="outline" size="sm" className="border-white/15 bg-transparent hover:bg-white/10" onClick={() => setExOpen(!exOpen)}>
            <BookOpenCheck className="h-4 w-4" /> Exercises {Object.values(checked).filter(Boolean).length}/10
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* schema browser */}
        <div className={`${PANEL} max-h-[70vh] overflow-auto scrollbar-thin`}>
          <div className={PANEL_HEAD}><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"><Database className="h-3.5 w-3.5 text-emerald-400" /> Schema · store_db</span></div>
          <div className="p-2">
            {Object.values(tables).map((t) => (
              <div key={t.name} className="mb-1 overflow-hidden rounded-lg border border-white/5">
                <button
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors ${openTable === t.name ? "bg-emerald-500/10 text-emerald-300" : "text-zinc-300 hover:bg-white/5"}`}
                  onClick={() => setOpenTable(openTable === t.name ? null : t.name)}
                >
                  <span className="flex items-center gap-2 font-mono"><Table2 className="h-3.5 w-3.5" />{t.name}</span>
                  <span className="flex items-center gap-1 text-[11px] text-zinc-500">{t.rows.length} rows<ChevronRight className={`h-3 w-3 transition-transform ${openTable === t.name ? "rotate-90" : ""}`} /></span>
                </button>
                {openTable === t.name && (
                  <div className="border-t border-white/5 bg-black/20 px-3 py-2">
                    <p className="mb-2 text-[11px] leading-snug text-zinc-500">{t.description}</p>
                    <div className="space-y-0.5 font-mono text-[11px]">
                      {t.columns.map((c) => (
                        <div key={c.name} className="flex justify-between">
                          <span className="text-zinc-300">{c.name}</span>
                          <span className="text-amber-400/70">{c.type}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-2 w-full rounded-md border border-white/10 py-1 text-[11px] text-zinc-400 hover:bg-white/5"
                      onClick={() => { setSql(`SELECT * FROM ${t.name} LIMIT 10;`); run(`SELECT * FROM ${t.name} LIMIT 10;`); }}
                    >
                      Preview 10 rows
                    </button>
                  </div>
                )}
              </div>
            ))}
            <p className="px-2 pt-2 text-[11px] leading-relaxed text-zinc-600">
              Relationships: orders.customer_id → customers.id · order_items.order_id → orders.id · order_items.product_id → products.id · employees.manager_id → employees.id
            </p>
          </div>
        </div>

        {/* editor + results */}
        <div className="space-y-3">
          <div className={PANEL}>
            <div className={PANEL_HEAD}>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"><Terminal className="h-3.5 w-3.5 text-emerald-400" /> Query editor</span>
              <Button size="sm" className="h-7 bg-emerald-500 px-3 text-xs font-semibold text-black hover:bg-emerald-400" onClick={() => run()}>
                <Play className="h-3 w-3" /> Run <span className="ml-1 hidden opacity-60 sm:inline">Ctrl+↵</span>
              </Button>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); } }}
              spellCheck={false}
              className="h-44 w-full resize-y bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-emerald-100/90 outline-none scrollbar-thin"
              placeholder="SELECT * FROM customers LIMIT 10;"
            />
            {error && (
              <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-300">⚠ {error}</div>
            )}
          </div>

          {/* exercises */}
          {exOpen && (
            <div className={`${PANEL} max-h-72 overflow-auto scrollbar-thin`}>
              <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Practice set — from SELECT to CTEs</span></div>
              <div className="divide-y divide-white/5">
                {EXERCISES.map((ex) => (
                  <div key={ex.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-zinc-200">
                          <span className="mr-2 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">{ex.id}</span>
                          {ex.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{ex.prompt}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {checked[ex.id] === "pass" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        {checked[ex.id] === "fail" && <XCircle className="h-4 w-4 text-red-400" />}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => loadExercise(ex)}>Load</Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button className="text-[11px] text-amber-400/80 hover:text-amber-300" onClick={() => setShowHint((h) => ({ ...h, [ex.id]: !h[ex.id] }))}>{showHint[ex.id] ? "Hide hint" : "Hint"}</button>
                      <button className="text-[11px] text-sky-400/80 hover:text-sky-300" onClick={() => setShowSolution((s) => ({ ...s, [ex.id]: !s[ex.id] }))}>{showSolution[ex.id] ? "Hide solution" : "Solution"}</button>
                      <Button size="sm" variant="outline" className="h-6 border-white/15 px-2 text-[11px]" onClick={() => check(ex)}>Check answer</Button>
                    </div>
                    {showHint[ex.id] && <p className="mt-1.5 rounded-md bg-amber-500/5 px-2 py-1 text-[11px] text-amber-200/80">💡 {ex.hint}</p>}
                    {showSolution[ex.id] && (
                      <pre className="mt-1.5 overflow-x-auto rounded-md bg-black/50 p-2 font-mono text-[11px] text-sky-200/80">{ex.solution}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* results */}
          {result && (
            <div className={PANEL}>
              <div className={PANEL_HEAD}>
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Results</span>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300">{result.rows.length} rows</Badge>
                  <span>{result.ms} ms</span>
                </div>
              </div>
              <div className="max-h-[46vh] overflow-auto scrollbar-thin">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr>{result.columns.map((c, i) => <th key={i} className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-mono text-[11px] font-semibold text-emerald-300">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 500).map((row, ri) => (
                      <tr key={ri} className="border-b border-white/5 hover:bg-white/[0.03]">
                        {row.map((v, ci) => (
                          <td key={ci} className={`whitespace-nowrap px-3 py-1.5 font-mono text-xs ${typeof v === "number" ? "text-right text-zinc-200" : "text-zinc-400"}`}>
                            {v === null || v === "" ? <span className="italic text-zinc-600">NULL</span> : typeof v === "number" ? v.toLocaleString("en-US") : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 500 && <p className="px-3 py-2 text-[11px] text-zinc-500">Showing first 500 rows.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
