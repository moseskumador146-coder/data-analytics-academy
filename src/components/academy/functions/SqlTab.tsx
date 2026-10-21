"use client";

/* SQL Functions tab — function library + live query runner over the same
   playground tables the SQL Playground uses (customers, products, orders,
   order_items, employees) via the platform's SQL engine. */

import * as React from "react";
import { Database, Play } from "lucide-react";
import { getSqlTables, type Row } from "@/lib/academy/datasets";
import { runSql, type SqlResult } from "@/lib/academy/sql-engine";
import { SQL_FUNCS } from "@/lib/academy/functions-db";
import { FunctionLibrary } from "./ExcelTab";

const SCHEMA = [
  { table: "customers", cols: "id, name, city, segment, signup_date", rows: 45 },
  { table: "products", cols: "id, name, category, price", rows: 21 },
  { table: "orders", cols: "id, customer_id, order_date, status, shipping", rows: 230 },
  { table: "order_items", cols: "id, order_id, product_id, quantity, unit_price", rows: 554 },
  { table: "employees", cols: "id, name, dept, salary, hire_date, manager_id", rows: 32 },
];

const EXAMPLES = [
  "SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY orders DESC",
  "SELECT COUNT(DISTINCT customer_id) AS buyers FROM orders",
  "SELECT dept, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY dept ORDER BY avg_salary DESC",
  "WITH rev AS (SELECT p.category, SUM(i.quantity * i.unit_price) AS r FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category) SELECT category, r FROM rev ORDER BY r DESC",
  "SELECT segment, COUNT(*) AS n, UPPER(TRIM(city)) AS sample_city FROM customers GROUP BY segment",
  "SELECT name, CASE WHEN salary >= 90000 THEN 'senior' WHEN salary >= 60000 THEN 'mid' ELSE 'early' END AS band FROM employees LIMIT 10",
  "SELECT SUBSTR(order_date, 1, 7) AS month, COUNT(*) AS orders FROM orders GROUP BY month ORDER BY month",
  "SELECT COALESCE(shipping, 'standard') AS ship, COUNT(*) AS n FROM orders GROUP BY ship",
];

function ResultsGrid({ res }: { res: SqlResult }) {
  if (!res.rows.length) return <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-[12.5px] text-muted-foreground">(no rows returned)</div>;
  const headers = res.columns;
  const shown = res.rows.slice(0, 20);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-[10.5px] text-muted-foreground">
        {res.rows.length} row{res.rows.length === 1 ? "" : "s"} {res.rows.length > 20 ? "· first 20 shown" : ""} · {res.ms}ms
      </div>
      <div className="max-h-72 overflow-auto scrollbar-thin">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-muted">
            <tr>{headers.map((h) => <th key={h} className="border-b border-border px-2.5 py-1.5 text-left font-mono font-semibold text-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0">
                {r.map((v, j) => <td key={j} className="max-w-[220px] truncate px-2.5 py-1 font-mono text-foreground/80">{v === null || v === undefined ? <span className="italic text-muted-foreground/60">NULL</span> : String(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SqlTab() {
  const [query, setQuery] = React.useState(EXAMPLES[0]);
  const [res, setRes] = React.useState<SqlResult | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const tablesRef = React.useRef(getSqlTables());

  const run = React.useCallback(() => {
    const sql = query.trim();
    if (!sql) return;
    try {
      setRes(runSql(sql, tablesRef.current));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
      setRes(null);
    }
  }, [query]);

  React.useEffect(() => { run(); }, []); // initial example result

  return (
    <div className="space-y-5">
      {/* runner */}
      <div className="rounded-xl border border-sky-500/25 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground"><Database className="h-4 w-4 text-sky-500" /> Live query runner — same engine as the SQL Playground</p>
          <p className="hidden text-[11px] text-muted-foreground sm:block">Ctrl+Enter to run</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="overflow-x-auto rounded-lg border border-border scrollbar-thin">
            <table className="w-full min-w-[560px] text-[11px]">
              <thead className="bg-muted/60">
                <tr><th className="px-2.5 py-1 text-left font-semibold text-muted-foreground">table</th><th className="px-2.5 py-1 text-left font-semibold text-muted-foreground">columns</th><th className="px-2.5 py-1 text-right font-semibold text-muted-foreground">rows</th></tr>
              </thead>
              <tbody>
                {SCHEMA.map((t) => (
                  <tr key={t.table} className="border-b border-border/40 last:border-0">
                    <td className="px-2.5 py-1 font-mono font-bold text-sky-700 dark:text-sky-300">{t.table}</td>
                    <td className="px-2.5 py-1 font-mono text-muted-foreground">{t.cols}</td>
                    <td className="px-2.5 py-1 text-right font-mono text-muted-foreground">{t.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); } }}
            rows={4}
            spellCheck={false}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:border-sky-500/50"
            aria-label="SQL query"
          />
          <div className="flex items-center gap-2">
            <button onClick={run} className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-sky-400">
              <Play className="h-3.5 w-3.5" /> Run query
            </button>
          </div>
          {res && <ResultsGrid res={res} />}
          {err && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12.5px] text-rose-600 dark:text-rose-400">✗ {err}</div>}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Load an example</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setQuery(ex)} className="truncate rounded border border-border px-2 py-1 text-left font-mono text-[10.5px] text-muted-foreground transition-colors hover:border-sky-500/40 hover:text-foreground" title={ex}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* library */}
      <FunctionLibrary funcs={SQL_FUNCS} accent="text-sky-600 dark:text-sky-400" />
    </div>
  );
}
