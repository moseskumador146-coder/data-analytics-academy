"use client";

/* Challenge Arena — auto-checked practice across Excel formulas, DAX measures,
   SQL queries and concept questions. Every answer is evaluated by the real
   engines, and solving earns +8 XP (persisted via the coach-step store). */

import * as React from "react";
import { CheckCircle2, Eye, Lightbulb, Swords, Trophy, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademy } from "@/lib/academy/store";
import { getCleanSales, getSqlTables, type Row } from "@/lib/academy/datasets";
import { evalSheetFormula, FormulaError } from "@/lib/academy/formula-engine";
import { createDaxEngine } from "@/lib/academy/dax-engine";
import { runSql } from "@/lib/academy/sql-engine";
import { CHALLENGES, type Challenge } from "@/lib/academy/functions-db";
import { levelBadgeCls } from "../shared";

const COL_KEYS = ["order_id", "order_date", "customer", "region", "category", "product", "units", "unit_price", "revenue", "channel", "payment_method"];

function buildSandboxCells(): Record<string, string> {
  const ds = getCleanSales();
  const cells: Record<string, string> = {};
  COL_KEYS.forEach((c, i) => { cells[`${String.fromCharCode(65 + i)}1`] = c; });
  ds.rows.slice(0, 198).forEach((row: Row, r) => {
    COL_KEYS.forEach((c, ci) => {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "") cells[`${String.fromCharCode(65 + ci)}${r + 2}`] = String(v);
    });
  });
  return cells;
}

const TOOL_FILTERS = [
  { key: "all", label: "All" },
  { key: "excel", label: "Excel" },
  { key: "dax", label: "DAX" },
  { key: "sql", label: "SQL" },
  { key: "concept", label: "Concept" },
] as const;

export function ArenaTab() {
  const { coachSteps } = useAcademy();
  const solved = new Set(coachSteps["func-arena"] ?? []);
  const [filter, setFilter] = React.useState<(typeof TOOL_FILTERS)[number]["key"]>("all");
  const list = CHALLENGES.filter((c) => filter === "all" || c.tool === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
          <Swords className="h-4 w-4 text-emerald-500" /> Prove it — real engines check every answer
        </p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(solved.size / CHALLENGES.length) * 100}%` }} />
          </div>
          <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-300"><Trophy className="h-3.5 w-3.5" /> {solved.size}/{CHALLENGES.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TOOL_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
              f.key === filter ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {list.map((ch) => <ChallengeCard key={ch.id} ch={ch} solved={solved.has(ch.id)} />)}
      </div>
    </div>
  );
}

function ChallengeCard({ ch, solved }: { ch: Challenge; solved: boolean }) {
  const { coachSteps, toggleCoachStep, addXp } = useAcademy();
  const [answer, setAnswer] = React.useState("");
  const [choice, setChoice] = React.useState<number | null>(null);
  const [verdict, setVerdict] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [showHint, setShowHint] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(solved);

  const cells = React.useMemo(() => buildSandboxCells(), []);
  const dax = React.useMemo(() => createDaxEngine("Sales", getCleanSales().rows, [
    { name: "Total Sales", formula: "SUM('Sales'[revenue])" },
    { name: "Total Units", formula: "SUM('Sales'[units])" },
    { name: "Orders", formula: "COUNTROWS('Sales')" },
    { name: "Avg Order Value", formula: "DIVIDE([Total Sales], [Orders])" },
    { name: "Unique Customers", formula: "DISTINCTCOUNT('Sales'[customer])" },
  ]), []);
  const sqlTables = React.useMemo(() => getSqlTables(), []);

  const check = () => {
    if (ch.check.kind === "choice") {
      if (choice === null) { setVerdict({ ok: false, msg: "Pick an option first." }); return; }
      const ok = choice === ch.check.answer;
      finish(ok);
      return;
    }
    const src = answer.trim();
    if (!src) { setVerdict({ ok: false, msg: "Type your answer first — you've got this." }); return; }
    try {
      if (ch.check.kind === "formula") {
        const v = evalSheetFormula(src.replace(/^=/, ""), cells, new Set());
        const exp = ch.check.expected;
        const ok = typeof exp === "number"
          ? Math.abs((typeof v === "number" ? v : parseFloat(String(v))) - exp) <= (ch.check.tol ?? 0.02)
          : String(v).toLowerCase() === String(exp).toLowerCase();
        finish(ok, ok ? undefined : `Got ${typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(v)} — not quite. Check the hint.`);
      } else if (ch.check.kind === "dax") {
        // Accept "Measure Name = expression" — but only when the part before '=' is a plain
        // name (no parens/brackets/quotes). A bare CALCULATE(...= "East") keeps its first '='.
        const named = src.match(/^[A-Za-z][A-Za-z0-9 _'%-]*\s*=(?![=>])\s*([\s\S]+)$/);
        const expr = named ? named[1].trim() : src;
        const { value } = dax.evaluate(expr);
        const exp = ch.check.expected;
        const ok = exp === null ? value === null : typeof exp === "number"
          ? typeof value === "number" && Math.abs(value - exp) <= (ch.check.tol ?? 0.02)
          : String(value).toLowerCase() === String(exp).toLowerCase();
        finish(ok, ok ? undefined : `The measure evaluated to ${value === null ? "(BLANK)" : String(value)} — compare with the hint.`);
      } else {
        const mine = runSql(src, sqlTables);
        const model = runSql(ch.check.sql, sqlTables);
        const mv = mine.rows[0]?.[0];
        const ev = model.rows[0]?.[0];
        const ok = String(mv) === String(ev) && String(ev) === String(ch.check.expected);
        finish(ok, ok ? undefined : `Your query returned ${mine.rows.length ? String(mine.rows[0][0]) : "no rows"} — expected ${String(ch.check.expected)}.`);
      }
    } catch (e) {
      const msg = (e as Error).message;
      setVerdict({ ok: false, msg: e instanceof FormulaError || msg.startsWith("#") ? `Formula error: ${msg}` : msg });
    }
  };

  const finish = (ok: boolean, failMsg?: string) => {
    setVerdict({ ok, msg: ok ? "Correct! +8 XP — and the real-world version is one Google search away." : failMsg ?? "Not quite — try again." });
    setShowSolution(ok || showSolution);
    if (ok && !solved) {
      toggleCoachStep("func-arena", ch.id); // +8 XP, persisted
    }
  };

  return (
    <div className={cn("rounded-xl border bg-card p-4 transition-colors", solved ? "border-emerald-500/30" : "border-border")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-muted-foreground">{ch.tool === "concept" ? "concept" : ch.tool}</span>
        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", levelBadgeCls(ch.level))}>{ch.level}</span>
        {solved && <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> solved</span>}
        <p className="min-w-0 flex-1 text-[13.5px] font-semibold text-foreground">{ch.prompt}</p>
      </div>

      {ch.check.kind === "choice" ? (
        <div className="mt-3 grid gap-1.5">
          {ch.check.options.map((o, i) => (
            <button
              key={i}
              onClick={() => { setChoice(i); setVerdict(null); }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors",
                choice === i ? "border-emerald-500/40 bg-emerald-500/[0.07] text-foreground" : "border-border text-foreground/80 hover:bg-muted/60"
              )}
            >
              <span className={cn("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold", choice === i ? "border-emerald-500 bg-emerald-500 text-black" : "border-border text-muted-foreground")}>{String.fromCharCode(65 + i)}</span>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setVerdict(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") check(); }}
            placeholder={ch.tool === "excel" ? "=SUMIF(…)" : ch.tool === "dax" ? "CALCULATE(…)" : "SELECT …"}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12.5px] outline-none focus:border-emerald-500/50"
            aria-label={`Answer for ${ch.id}`}
          />
          <button onClick={check} className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-[12.5px] font-bold text-black hover:bg-emerald-400">Check</button>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400 hover:underline">
          <Lightbulb className="h-3.5 w-3.5" /> {showHint ? "Hide hint" : "Hint"}
        </button>
        {(solved || showSolution) && (
          <button onClick={() => setShowSolution(!showSolution)} className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground hover:underline">
            <Eye className="h-3.5 w-3.5" /> {showSolution ? "Hide solution" : "Solution"}
          </button>
        )}
        {!solved && !showSolution && (
          <button onClick={() => setShowSolution(true)} className="text-[11.5px] text-muted-foreground/70 hover:underline">Give up &amp; learn the answer</button>
        )}
      </div>
      {showHint && <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 font-mono text-[12px] text-foreground/85">{ch.hint}</p>}
      {showSolution && <p className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 font-mono text-[12px] text-emerald-800 dark:text-emerald-200/90">{ch.solution}</p>}
      {verdict && (
        <p className={cn(
          "mt-2.5 flex items-start gap-1.5 rounded-lg border px-3 py-2 text-[12.5px]",
          verdict.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}>
          {verdict.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {verdict.msg}
        </p>
      )}
    </div>
  );
}
