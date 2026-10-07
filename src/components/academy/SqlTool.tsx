"use client";

/* SQL Playground — real in-browser SQL engine (SELECT/JOIN/GROUP BY/HAVING/ORDER BY/CTE),
   schema browser, results grid with CSV export, query history, quick templates,
   16 auto-checked exercises and a live hand-in-hand Coach. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolHeader, PANEL, PANEL_HEAD, DatasetPicker, downloadDatasetCSV } from "./shared";
import { getSqlTables, getDatasetById, rowsToCSV, downloadFile, type Dataset, type SqlTable, type Row } from "@/lib/academy/datasets";
import { runSql } from "@/lib/academy/sql-engine";
import { type DoctorSnapshot } from "@/lib/academy/data-doctor";
import { useAcademy } from "@/lib/academy/store";
import { coachSay } from "@/lib/academy/coach-bus";
import { LiveCoach } from "./LiveCoach";
import {
  BookOpenCheck, CheckCircle2, ChevronRight, Clock, Database, Download, Eye, Play, Plus, Sparkles, Table2, Terminal, Trash2, XCircle,
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
  {
    id: 11, title: "CASE WHEN", prompt: "Bucket completed orders by value: '<100' small, '100-1000' medium, '>1000' large (line revenue = quantity × unit_price). Show bucket and order count.",
    hint: "CASE WHEN x THEN y ELSE z END creates buckets. SUM the line revenue per order first, or bucket each line and count orders via COUNT(DISTINCT o.id).",
    solution: "SELECT CASE WHEN i.quantity * i.unit_price < 100 THEN '<100' WHEN i.quantity * i.unit_price <= 1000 THEN '100-1000' ELSE '>1000' END AS bucket, COUNT(DISTINCT o.id) AS orders FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.status = 'completed' GROUP BY bucket ORDER BY orders DESC;",
  },
  {
    id: 12, title: "IN + DISTINCT", prompt: "Which distinct cities do Enterprise-segment customers come from? Sort alphabetically.",
    hint: "DISTINCT removes duplicates. WHERE segment = 'Enterprise' filters first.",
    solution: "SELECT DISTINCT city FROM customers WHERE segment = 'Enterprise' ORDER BY city;",
  },
  {
    id: 13, title: "Self JOIN — managers", prompt: "List each employee with their manager's name: e.name AS employee, m.name AS manager. Employees with manager_id NULL get manager NULL.",
    hint: "JOIN employees m ON e.manager_id = m.id — the same table twice with different aliases.",
    solution: "SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id ORDER BY employee LIMIT 32;",
  },
  {
    id: 14, title: "Avg order value by segment", prompt: "Completed revenue per customer segment: join orders → customers → order_items, group by segment, show revenue and orders, revenue descending.",
    hint: "Three tables: orders o, customers c, order_items i. Revenue = SUM(quantity × unit_price), orders = COUNT(DISTINCT o.id).",
    solution: "SELECT c.segment, SUM(i.quantity * i.unit_price) AS revenue, COUNT(DISTINCT o.id) AS orders FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items i ON i.order_id = o.id WHERE o.status = 'completed' GROUP BY c.segment ORDER BY revenue DESC;",
  },
  {
    id: 15, title: "Rank within a group (window)", prompt: "Number customers by name within each city: name, city, and ROW_NUMBER() OVER (PARTITION BY city ORDER BY name) AS rn — limit 15.",
    hint: "PARTITION BY defines the groups, ORDER BY inside OVER defines the sequence. The query keeps every row — that's the point.",
    solution: "SELECT name, city, ROW_NUMBER() OVER (PARTITION BY city ORDER BY name) AS rn FROM customers ORDER BY city, rn LIMIT 15;",
  },
  {
    id: 16, title: "Stack two result sets (UNION)", prompt: "Combine 3 customer names with 3 product names in one column called item_name (UNION ALL), limit 6.",
    hint: "Both SELECTs must return the same number of columns — column names come from the first SELECT.",
    solution: "SELECT name AS item_name FROM customers LIMIT 3 UNION ALL SELECT name FROM products LIMIT 3;",
  },
];

const TEMPLATES: { name: string; sql: string }[] = [
  { name: "Monthly revenue trend", sql: "SELECT substr(o.order_date, 1, 7) AS month,\n       SUM(i.quantity * i.unit_price) AS revenue\nFROM orders o\nJOIN order_items i ON i.order_id = o.id\nWHERE o.status = 'completed'\nGROUP BY month\nORDER BY month;" },
  { name: "Top customers by spend", sql: "SELECT c.name, c.segment,\n       SUM(i.quantity * i.unit_price) AS total_spent,\n       COUNT(DISTINCT o.id) AS orders\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nJOIN order_items i ON i.order_id = o.id\nWHERE o.status = 'completed'\nGROUP BY c.id, c.name, c.segment\nORDER BY total_spent DESC\nLIMIT 10;" },
  { name: "Products never sold", sql: "SELECT p.name, p.category, p.price\nFROM products p\nLEFT JOIN order_items i ON i.product_id = p.id\nWHERE i.id IS NULL;" },
  { name: "Avg salary by department", sql: "SELECT dept,\n       COUNT(*) AS headcount,\n       ROUND(AVG(salary), 0) AS avg_salary\nFROM employees\nGROUP BY dept\nORDER BY avg_salary DESC;" },
  { name: "Order status funnel", sql: "SELECT status,\n       COUNT(*) AS orders,\n       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders), 1) AS pct\nFROM orders\nGROUP BY status\nORDER BY orders DESC;" },
  { name: "Rank per group (window fn)", sql: "SELECT name, city,\n       ROW_NUMBER() OVER (PARTITION BY city ORDER BY name) AS rn\nFROM customers\nORDER BY city, rn\nLIMIT 20;" },
  { name: "Previous month with LAG", sql: "WITH months AS (\n  SELECT substr(order_date, 1, 7) AS month,\n         SUM(total_amount) AS revenue\n  FROM orders\n  GROUP BY month\n)\nSELECT month, revenue,\n       LAG(revenue, 1) OVER (ORDER BY month) AS prev_month\nFROM months\nORDER BY month;" },
  { name: "Repeat vs one-time buyers", sql: "WITH per_customer AS (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  WHERE status = 'completed'\n  GROUP BY customer_id\n)\nSELECT CASE WHEN n = 1 THEN 'one-time'\n            WHEN n <= 3 THEN '2-3 orders'\n            ELSE '4+ orders' END AS buyer_type,\n       COUNT(*) AS customers\nFROM per_customer\nGROUP BY buyer_type\nORDER BY customers DESC;" },
];


type RunResult = { columns: string[]; rows: (string | number | null)[][]; ms: number };

/** Which teaching pattern does this query use? Drives the live coach narration. */
function detectSqlKind(q: string): string {
  const u = q.toUpperCase();
  if (/\bROW_NUMBER\s*\(|\bRANK\s*\(|\bDENSE_RANK\s*\(|\bLAG\s*\(|\bLEAD\s*\(|\bOVER\s*\(/.test(u)) return "sql.run.window";
  if (/\bUNION\b/.test(u)) return "sql.run.union";
  if (/\bWITH\b/.test(u)) return "sql.run.cte";
  if (/\bJOIN\b/.test(u)) return "sql.run.join";
  if (/\bGROUP\s+BY\b/.test(u)) return "sql.run.group";
  if (/\bWHERE\b/.test(u)) return "sql.run.where";
  if (/\bORDER\s+BY\b/.test(u)) return "sql.run.order";
  return "sql.run.select";
}

/** Convert any sample dataset into a queryable SQL table (types inferred, blanks → NULL) */
function datasetToSqlTable(ds: Dataset): SqlTable {
  const columns = ds.columns.map((c) => {
    let type = "TEXT";
    if (c.type === "date") type = "DATE";
    else if (c.type === "number" || c.type === "currency") {
      const allNum = ds.rows.every((r) => {
        const v = r[c.key];
        if (v === null || v === "" || v === undefined) return true;
        return typeof v === "number" || !isNaN(parseFloat(String(v).replace(/[$,\s]/g, "")));
      });
      type = allNum ? "REAL" : "TEXT";
    }
    return { name: c.key, type };
  });
  const rows: Row[] = ds.rows.slice(0, 4000).map((r) => {
    const out: Row = {};
    for (const c of ds.columns) {
      const v = r[c.key];
      if (v === "" || v === undefined || v === null) out[c.key] = null;
      else if (typeof v === "string") {
        const n = parseFloat(v.replace(/[$,\s]/g, ""));
        out[c.key] = !isNaN(n) && /^[\d.,$\s+-]+$/.test(v) ? n : v;
      } else out[c.key] = v;
    }
    return out;
  });
  return {
    name: ds.id,
    description: `${ds.name} — imported sample file (first ${rows.length.toLocaleString()} rows; blanks became NULL, $-text became numbers).`,
    columns,
    rows,
  };
}

export function SqlTool() {
  const baseTables = getSqlTables();
  const { addXp } = useAcademy();
  const [extraTables, setExtraTables] = React.useState<Record<string, SqlTable>>({});
  const tables = React.useMemo(() => ({ ...baseTables, ...extraTables }), [extraTables]);
  const [sql, setSql] = React.useState("SELECT name, city, segment\nFROM customers\nLIMIT 10;");
  const [result, setResult] = React.useState<RunResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openTable, setOpenTable] = React.useState<string | null>("customers");
  const [exOpen, setExOpen] = React.useState(false);
  const [tplOpen, setTplOpen] = React.useState(false);
  const [histOpen, setHistOpen] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("aaa-sql-history") ?? "[]"); } catch { return []; }
  });
  const [checked, setChecked] = React.useState<Record<number, "pass" | "fail" | null>>({});
  const [showHint, setShowHint] = React.useState<Record<number, boolean>>({});
  const [showSolution, setShowSolution] = React.useState<Record<number, boolean>>({});

  const run = (query?: string) => {
    const q = (query ?? sql).trim();
    if (!q) return;
    const t0 = performance.now();
    try {
      const res = runSql(q, tables);
      setResult({ ...res, ms: Math.max(1, Math.round(performance.now() - t0)) });
      setError(null);
      const kind = detectSqlKind(q);
      coachSay("sql", kind, kind === "sql.run.window" ? "Ran a window function query" : kind === "sql.run.union" ? "Combined two results with UNION" : kind === "sql.run.cte" ? "Chained steps with a CTE" : kind === "sql.run.join" ? "Joined two tables" : kind === "sql.run.group" ? "Aggregated with GROUP BY" : kind === "sql.run.where" ? "Filtered rows with WHERE" : kind === "sql.run.order" ? "Sorted results with ORDER BY" : "Ran a SELECT query", q.replace(/\s+/g, " ").slice(0, 120));
      setHistory((h) => {
        const next = [q, ...h.filter((x) => x !== q)].slice(0, 25);
        try { localStorage.setItem("aaa-sql-history", JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
      coachSay("sql", "sql.run.error", "Query failed with an error", (e instanceof Error ? e.message : String(e)).slice(0, 120));
    }
  };

  const check = (ex: Exercise) => {
    try {
      const user = runSql(sql, tables);
      const sol = runSql(ex.solution, tables);
      const norm = (r: RunResult) =>
        JSON.stringify([r.columns.map((c) => c.toLowerCase()), r.rows.map((row) => row.map((v) => (v === null ? "" : typeof v === "number" ? +Number(v).toFixed(4) : String(v))))]);
      const ok = norm(user) === norm(sol);
      setChecked((c) => ({ ...c, [ex.id]: ok ? "pass" : "fail" }));
      coachSay("sql", "sql.exercise", ok ? `Exercise ${ex.id} passed — ${ex.title}` : `Exercise ${ex.id} didn't match yet`, ex.title);
      if (ok && !checked[ex.id]) addXp(15);
    } catch (e) {
      setChecked((c) => ({ ...c, [ex.id]: "fail" }));
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadExercise = (ex: Exercise) => {
    setSql(`-- Exercise ${ex.id}: ${ex.title}\n-- ${ex.prompt}\n\n`);
    setExOpen(false);
  };

  const exportResults = () => {
    if (!result) return;
    coachSay("sql", "sql.export", `Exported ${result.rows.length.toLocaleString()} result rows as CSV`);
    const csv = [
      result.columns.map((c) => (/[,"]/.test(c) ? `"${c}"` : c)).join(","),
      ...result.rows.map((r) => r.map((v) => {
        const s = v === null ? "" : String(v);
        return /[",]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
      }).join(",")),
    ].join("\n");
    downloadFile("query_results.csv", csv, "text/csv");
  };

  const passedCount = Object.values(checked).filter((v) => v === "pass").length;

  const importTable = (id: string) => {
    const ds = getDatasetById(id);
    if (!ds) return;
    const t = datasetToSqlTable(ds);
    setExtraTables((prev) => ({ ...prev, [t.name]: t }));
    coachSay("sql", "sql.import", `Imported ${ds.name} as the ${t.name} table`, `${t.rows.length.toLocaleString()} rows loaded`);
    setSql(`-- New table: ${t.name} (${t.rows.length.toLocaleString()} rows)
SELECT * FROM ${t.name} LIMIT 10;`);
    run(`SELECT * FROM ${t.name} LIMIT 10;`);
    setOpenTable(t.name);
  };

  /* Data Doctor — profile the table open in the schema browser */
  const doctorTable = openTable ? tables[openTable] : null;
  const doctorSnapshot = React.useMemo<DoctorSnapshot | null>(() => {
    if (!doctorTable || !doctorTable.columns.length) return null;
    const headers = doctorTable.columns.map((c) => c.name);
    const rows = doctorTable.rows.map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h) => { o[h] = String(r[h] ?? ""); });
      return o;
    });
    return { source: "sql", file: doctorTable.name, headers, rows };
  }, [doctorTable]);

  /* dynamic tips */
  const tips: string[] = React.useMemo(() => {
    const t: string[] = [];
    if (!result && !error) t.push("Hit **Run** (or Ctrl+↵) to execute the query. Start small: one table, a few columns, LIMIT 10.");
    if (result) {
      t.push(result.rows.length >= 500
        ? "500+ rows returned — add a LIMIT or aggregate with GROUP BY so the answer is readable."
        : `${result.rows.length} rows in ${result.ms} ms. Click **Export CSV** to reuse the result in Excel or a dashboard.`);
    }
    if (error) t.push("Read the error closely — SQL fails loudly, not silently. Check spelling, commas and the FROM table first.");
    if (!Object.values(checked).some(Boolean)) t.push("The fastest way to learn: open **Exercises** and do #1, then #4. Check answer gives instant feedback.");
    return t.slice(0, 3);
  }, [result, error, checked]);

  return (
    <div className="flex items-stretch">
      <div className="min-w-0 flex-1 space-y-4">
      <ToolHeader
        icon={<Database className="h-5 w-5 text-sky-500 dark:text-sky-400" />}
        title="SQL Playground"
        subtitle="Real in-browser SQL engine — JOINs, GROUP BY, HAVING, CASE, CTEs. Zero setup, instant results."
        accent="sky"
        actions={
          <>
            <Button variant="outline" size="sm" className="border-border" onClick={() => setTplOpen(!tplOpen)}>
              <Sparkles className="h-4 w-4" /> Templates
            </Button>
            <Button variant="outline" size="sm" className="border-border" onClick={() => setExOpen(!exOpen)}>
              <BookOpenCheck className="h-4 w-4" /> Exercises {passedCount}/{EXERCISES.length}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* schema browser */}
        <div className={`${PANEL} max-h-[70vh] overflow-auto scrollbar-thin`}>
          <div className={PANEL_HEAD}><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Database className="h-3.5 w-3.5 text-sky-500" /> Schema · store_db{Object.keys(extraTables).length > 0 ? ` + ${Object.keys(extraTables).length} imported` : ""}</span></div>
          <div className="p-2">
            {Object.values(tables).map((t) => (
              <div key={t.name} className="mb-1 overflow-hidden rounded-lg border border-border/60">
                <button
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors ${openTable === t.name ? "bg-sky-500/10 text-sky-700 dark:text-sky-300" : "text-foreground/85 hover:bg-muted"}`}
                  onClick={() => setOpenTable(openTable === t.name ? null : t.name)}
                >
                  <span className="flex min-w-0 items-center gap-2 font-mono"><Table2 className={`h-3.5 w-3.5 shrink-0 ${extraTables[t.name] ? "text-violet-500" : "text-sky-500"}`} />{t.name}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    {t.rows.length.toLocaleString()} rows
                    {extraTables[t.name] && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="rounded p-0.5 opacity-60 hover:bg-muted hover:text-red-500 hover:opacity-100"
                        aria-label={`Remove table ${t.name}`}
                        onClick={(e) => { e.stopPropagation(); setExtraTables((prev) => { const n = { ...prev }; delete n[t.name]; return n; }); }}
                      ><Trash2 className="h-3 w-3" /></span>
                    )}
                    <ChevronRight className={`h-3 w-3 transition-transform ${openTable === t.name ? "rotate-90" : ""}`} />
                  </span>
                </button>
                {openTable === t.name && (
                  <div className="border-t border-border/60 bg-muted/30 px-3 py-2">
                    <p className="mb-2 text-[11px] leading-snug text-muted-foreground">{t.description}</p>
                    <div className="space-y-0.5 font-mono text-[11px]">
                      {t.columns.map((c) => (
                        <div key={c.name} className="flex justify-between">
                          <span className="text-foreground/85">{c.name}</span>
                          <span className="text-amber-600 dark:text-amber-400/80">{c.type}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-2 w-full rounded-md border border-border py-1 text-[11px] text-muted-foreground hover:bg-muted"
                      onClick={() => { coachSay("sql", "sql.preview", `Previewed the ${t.name} table`); setSql(`SELECT * FROM ${t.name} LIMIT 10;`); run(`SELECT * FROM ${t.name} LIMIT 10;`); }}
                    >
                      Preview 10 rows
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="mt-2 rounded-lg border border-dashed border-border p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground"><Plus className="h-3 w-3 text-violet-500" /> Import a data file as a table</p>
              <DatasetPicker onPick={importTable} className="h-7 w-full text-[11px]" />
              <p className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground">
                Any sample file becomes queryable SQL — messy ones included. Blanks turn into NULL, $-text into numbers. Try <code className="rounded bg-muted px-1 font-mono">GROUP BY</code> on a messy column to see why cleaning matters.
              </p>
            </div>
            <p className="px-2 pt-2 text-[11px] leading-relaxed text-muted-foreground/80">
              Relationships: orders.customer_id → customers.id · order_items.order_id → orders.id · order_items.product_id → products.id · employees.manager_id → employees.id
            </p>
          </div>
        </div>

        {/* editor + results */}
        <div className="space-y-3">
          <div className={PANEL}>
            <div className={PANEL_HEAD}>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Terminal className="h-3.5 w-3.5 text-sky-500" /> Query editor</span>
              <div className="flex items-center gap-1.5">
                {history.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setHistOpen(!histOpen)}>
                    <Clock className="h-3 w-3" /> History ({history.length})
                  </Button>
                )}
                <Button size="sm" className="h-7 bg-emerald-500 px-3 text-xs font-semibold text-black hover:bg-emerald-400" onClick={() => run()}>
                  <Play className="h-3 w-3" /> Run <span className="ml-1 hidden opacity-60 sm:inline">Ctrl+↵</span>
                </Button>
              </div>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); } }}
              spellCheck={false}
              className="code-surface h-44 w-full resize-y p-4 font-mono text-[13px] leading-relaxed text-emerald-900 outline-none scrollbar-thin dark:text-emerald-100/90"
              placeholder="SELECT * FROM customers LIMIT 10;"
            />
            {error && (
              <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-700 dark:text-red-300">⚠ {error}</div>
            )}
          </div>

          {/* templates */}
          {tplOpen && (
            <div className={`${PANEL} max-h-72 overflow-auto scrollbar-thin`}>
              <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Real-world query templates — load, run, then tweak</span></div>
              <div className="divide-y divide-border/60">
                {TEMPLATES.map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[13px] font-medium text-foreground/90">{t.name}</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { coachSay("sql", "sql.template", `Loaded the "${t.name}" template`); setSql(t.sql); }}>Load</Button>
                      <Button size="sm" variant="outline" className="h-7 border-border px-2 text-xs" onClick={() => run(t.sql)}>Run</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* history */}
          {histOpen && history.length > 0 && (
            <div className={`${PANEL} max-h-60 overflow-auto scrollbar-thin`}>
              <div className={PANEL_HEAD}>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Query history</span>
                <button className="text-[11px] text-muted-foreground hover:text-red-500" onClick={() => { setHistory([]); try { localStorage.removeItem("aaa-sql-history"); } catch {} }}>Clear</button>
              </div>
              <div className="divide-y divide-border/60">
                {history.map((q, i) => (
                  <button key={i} className="block w-full truncate px-4 py-2 text-left font-mono text-[11.5px] text-muted-foreground hover:bg-muted" onClick={() => { setSql(q); setHistOpen(false); }} title={q}>
                    {q.replaceAll("\n", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* exercises */}
          {exOpen && (
            <div className={`${PANEL} max-h-96 overflow-auto scrollbar-thin`}>
              <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practice set — from SELECT to CTEs</span></div>
              <div className="divide-y divide-border/60">
                {EXERCISES.map((ex) => (
                  <div key={ex.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">
                          <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-sky-700 dark:text-emerald-300">{ex.id}</span>
                          {ex.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ex.prompt}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {checked[ex.id] === "pass" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {checked[ex.id] === "fail" && <XCircle className="h-4 w-4 text-red-500" />}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => loadExercise(ex)}>Load</Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button className="text-[11px] text-amber-600 hover:text-amber-500 dark:text-amber-400/80" onClick={() => setShowHint((h) => ({ ...h, [ex.id]: !h[ex.id] }))}>{showHint[ex.id] ? "Hide hint" : "Hint"}</button>
                      <button className="text-[11px] text-sky-600 hover:text-sky-500 dark:text-sky-400/80" onClick={() => setShowSolution((s) => ({ ...s, [ex.id]: !s[ex.id] }))}>{showSolution[ex.id] ? "Hide solution" : "Solution"}</button>
                      <Button size="sm" variant="outline" className="h-6 border-border px-2 text-[11px]" onClick={() => check(ex)}>Check answer</Button>
                    </div>
                    {showHint[ex.id] && <p className="mt-1.5 rounded-md bg-amber-500/5 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200/80">💡 {ex.hint}</p>}
                    {showSolution[ex.id] && (
                      <pre className="code-surface mt-1.5 overflow-x-auto rounded-md p-2 font-mono text-[11px] text-sky-800 dark:text-sky-200/80">{ex.solution}</pre>
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
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results</span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">{result.rows.length} rows</Badge>
                  <span>{result.ms} ms</span>
                  <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px]" onClick={exportResults}><Download className="h-3 w-3" /> Export CSV</Button>
                </div>
              </div>
              <div className="max-h-[46vh] overflow-auto scrollbar-thin">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-card">
                    <tr>{result.columns.map((c, i) => <th key={i} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] font-semibold text-sky-700 dark:text-emerald-300">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 500).map((row, ri) => (
                      <tr key={ri} className="border-b border-border/50 hover:bg-muted/50">
                        {row.map((v, ci) => (
                          <td key={ci} className={`whitespace-nowrap px-3 py-1.5 font-mono text-xs ${typeof v === "number" ? "text-right text-foreground" : "text-muted-foreground"}`}>
                            {v === null || v === "" ? <span className="italic text-muted-foreground/50">NULL</span> : typeof v === "number" ? v.toLocaleString("en-US") : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 500 && <p className="px-3 py-2 text-[11px] text-muted-foreground">Showing first 500 rows.</p>}
              </div>
            </div>
          )}

          {/* csv practice files */}
          <div className={`${PANEL} flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground`}>
            <Eye className="h-3.5 w-3.5" /> Want the raw files instead? Download any sample as CSV:
            {["clean_sales", "ecom_orders"].map((id) => {
              const ds = getDatasetById(id)!;
              return (
                <button key={id} className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted" onClick={() => downloadDatasetCSV(id)}>
                  {ds.name.split(" (")[0]} ({ds.rows.length.toLocaleString()} rows)
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>

      <LiveCoach
        tool="sql"
        accent="#0284c7"
        tips={tips}
        doctor={{
          snapshot: doctorSnapshot,
          canFix: false,
          fixLabel: "SQL",
          emptyHint: "Open a table in the schema browser (or import a CSV as a table) — I profile that exact table and write the cleaning queries for ITS problems, ready to copy and run.",
        }}
      />
    </div>
  );
}
