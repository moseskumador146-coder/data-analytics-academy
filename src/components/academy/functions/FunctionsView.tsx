"use client";

/* Functions Lab — the teaching hub for calculations across the stack:
   1. Start Here     — from clean data to calculations (framework + playbooks)
   2. Excel Formulas — searchable library + live formula sandbox
   3. DAX & Measures — library + live measure studio (CALCULATE, SUMX, time intel)
   4. SQL Functions  — library + live query runner
   5. Challenge Arena— auto-checked practice on real engines */

import * as React from "react";
import { Sigma } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolHeader } from "../shared";
import { Coach } from "../Coach";
import { GuideTab } from "./GuideTab";
import { ExcelTab } from "./ExcelTab";
import { DaxTab } from "./DaxTab";
import { SqlTab } from "./SqlTab";
import { ArenaTab } from "./ArenaTab";

const TABS = [
  { key: "guide", label: "Start Here", sub: "after cleaning → what to compute" },
  { key: "excel", label: "Excel Formulas", sub: "SUM → XLOOKUP, live sandbox" },
  { key: "dax", label: "DAX & Measures", sub: "CALCULATE, SUMX, time intelligence" },
  { key: "sql", label: "SQL Functions", sub: "aggregates, CASE, CTEs, windows" },
  { key: "arena", label: "Challenge Arena", sub: "22 auto-checked drills" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FunctionsView() {
  const [tab, setTab] = React.useState<TabKey>("guide");

  return (
    <div>
      <ToolHeader
        icon={<Sigma className="h-5 w-5 text-emerald-500" />}
        title="Functions Lab"
        subtitle="Every calculation an analyst needs — Excel formulas, DAX measures, SQL functions — taught and live-evaluated on real data."
        actions={
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Functions Lab sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-left transition-colors",
                  tab === t.key
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-border hover:bg-muted"
                )}
              >
                <span className={cn("block text-[12px] font-bold leading-tight", tab === t.key ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>{t.label}</span>
                <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">{t.sub}</span>
              </button>
            ))}
          </div>
        }
      />

      {tab === "guide" && <GuideTab />}
      {tab === "excel" && <ExcelTab />}
      {tab === "dax" && <DaxTab />}
      {tab === "sql" && <SqlTab />}
      {tab === "arena" && <ArenaTab />}

      <Coach
        view="functions"
        accent="emerald"
        mission={[
          { id: "f1", label: "Walk the 8-step framework", detail: "Open **Start Here** and work through the steps — confirm the grain, derive columns, build measures. Tick each as you read it. The playbooks show *what to add* for every dataset type." },
          { id: "f2", label: "Run =SUM(I:I) in the sandbox", detail: "Excel Formulas tab → type `=SUM(I:I)` and press Run. Revenue lives in column I. That's total revenue of the loaded sample, evaluated by the real engine." },
          { id: "f3", label: "Slice it: =SUMIF(D:D,\"West\",I:I)", detail: "One condition → one segment's revenue. Try `\"South\"`, `\"East\"` too. This is the same thought as SQL's WHERE and DAX's CALCULATE filter." },
          { id: "f4", label: "Evaluate your first DAX measure", detail: "DAX & Measures tab → run `CALCULATE(SUM('Sales'[revenue]), 'Sales'[region] = \"West\")`. Then load the **Sales % of Total** pattern to see ALL() in action." },
          { id: "f5", label: "Save a measure of your own", detail: "In the Measure Studio, name it and hit **Save measure**. Saved measures persist in your browser and can be referenced by other measures — exactly like Power BI." },
          { id: "f6", label: "Run a GROUP BY query", detail: "SQL Functions tab → run `SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY orders DESC`. Then load the CTE example to build a two-step analysis." },
          { id: "f7", label: "Solve 3 Challenge Arena drills", detail: "Real engines grade you: formulas against the sheet, measures against the Sales model, queries against the playground tables. +8 XP each." },
        ]}
        tips={[
          "The **Guide** tab's decision helper answers “which function do I need?” — search it by task (unique, percent, running total…).",
          "Every example in the libraries shows the **real result on this platform's data**, so you can verify each one live before trusting it.",
          "Excel sandbox columns: **A** order_id · **B** order_date · **D** region · **E** category · **G** units · **H** unit_price · **I** revenue.",
          "DAX gotcha to remember: a bare column like `'Sales'[revenue]` can't be used outside SUM/iterator — that error message is teaching you filter vs row context.",
        ]}
        why="Function fluency is the actual daily work of analysts: 80% of stakeholder requests become 'add this up, split it by that, compare to last year'. Interviews test exactly these — SUMIFS, CALCULATE, GROUP BY CASE — and the three dialects map 1:1. Learn the concept once here, and Excel, Power BI and SQL all become the same skill wearing different syntax."
      />
    </div>
  );
}
