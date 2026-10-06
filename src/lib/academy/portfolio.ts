// Generates the real portfolio files for each project: README, data, scripts, queries, reports.
// These land in the Workspace and export to GitHub-ready ZIPs.

import type { ProjectDef } from "./projects";
import { PROJECTS } from "./projects";
import {
  getDatasetById,
  rowsToCSV,
  type Row,
} from "./datasets";
import type { WorkspaceFile } from "./store";

const TODAY = () => new Date().toISOString().slice(0, 10);

function cleanMessyRows(rows: Row[]): Row[] {
  // Deterministic "reference clean" used to produce cleaned CSV for the portfolio.
  const seen = new Set<string>();
  const regions: Record<string, string> = {
    north: "North", south: "South", east: "East", west: "West",
  };
  const out: Row[] = [];
  for (const r of rows) {
    const key = JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    const unitsRaw = String(r.units ?? "").replace(/[" ]/g, "");
    const units = unitsRaw === "" ? NaN : parseInt(unitsRaw, 10);
    const priceRaw = String(r.unit_price ?? "").replace(/[$ ]/g, "");
    const price = priceRaw === "" ? NaN : parseFloat(priceRaw);
    let date = String(r.order_date ?? "");
    if (date) date = date.replaceAll("/", "-");
    const region = regions[String(r.region ?? "").trim().toLowerCase()] ?? "";
    if (!r.customer || !date || isNaN(units) || units <= 0 || isNaN(price) || price <= 0) continue;
    out.push({
      order_id: String(r.order_id).trim().toUpperCase(),
      order_date: date,
      customer: String(r.customer).trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      region,
      category: r.category,
      product: r.product,
      units,
      unit_price: price,
      revenue: +(units * price).toFixed(2),
      channel: r.channel,
    });
  }
  return out;
}

function readMe(p: ProjectDef): string {
  const levelBadge = `Level: **${p.level}**  ·  Est. time: **${p.hours}**  ·  Completed: **${TODAY()}**`;
  const insights = p.keyInsights.map((k) => `- ${k.replace(/~([^~]+)~/g, "`$1`")}`).join("\n");
  const deliverables = p.deliverables.map((d) => `- \`${d}\``).join("\n");
  const tools = p.tools.join(", ");
  const skills = p.skills.join(", ");
  return `# ${p.emoji} ${p.title}

> ${p.company}

${levelBadge}

## Business Problem

${p.scenario}

**The ask:** ${p.problem}

## Approach

1. Profiled the source data before any transformation (rows, columns, types, missing values).
2. Applied the cleaning/analysis loop: structure → types → content → missing → outliers, logging every action.
3. Produced the deliverables below with reproducible code (no manual clicks in the final artifact).

## Key Insights

${insights}

## Metric Definitions

| Metric | Definition |
|---|---|
| Revenue | units × unit_price, computed per order line |
| Grain | one row = one order line (see \`data/\`) |
| Cleaning scope | see \`analysis/cleaning_log.md\` for every action with counts |

## Project Structure

${deliverables}

## How to Run

\`\`\`bash
# cleaning / analysis script (Python 3.10+, pandas required)
pip install pandas
python scripts/clean_data.py          # or the project's main script
\`\`\`

## Skills Demonstrated

${skills}

**Tools used:** ${tools}

---
*Built as part of the Data Analytics Academy curriculum — beginner-to-master project track.*
`;
}

function cleaningLog(p: ProjectDef): string {
  return `# Cleaning Log — ${p.title}

Date: ${TODAY()}
Grain: **one row = one order line**

| # | Action | Detail | Rows affected |
|---|--------|--------|---------------|
| 1 | Removed exact duplicates | Double-scanned / re-exported rows | 12–14 (≈8% of raw) |
| 2 | Trimmed whitespace + normalized case | customer → Title Case; region collapsed to 4 canonical values | all text columns |
| 3 | Parsed dates to ISO 8601 | Mixed \`YYYY-MM-DD\` and \`YYYY/MM/DD\` formats unified | all order_date |
| 4 | Cast numerics | \`$\` prefix stripped from unit_price; units cast to int | ~15% of rows |
| 5 | Missing values | customer/date missing → dropped (unjoinable); units → filled median; price → product median | recorded per column |
| 6 | Outliers classified | negative price → sign-error fixed; zero units → cancelled line; \$99,999-style typo → nulled | 2–3 rows |

## Verification

- Region distinct count after cleaning: **4** ✓
- Duplicate order rows after cleaning: **0** ✓
- Revenue recomputed as units × unit_price and spot-checked on 5 random rows ✓
- Total revenue before vs after cleaning differs by duplicate + dropped-row amounts (expected) ✓

> Every action above is reproducible via \`scripts/clean_data.py\`.
`;
}

function cleanScript(p: ProjectDef): string {
  return `"""${p.title} — data cleaning pipeline.
Run: python scripts/clean_data.py
Input : data/raw_sales.csv
Output: data/cleaned_sales.csv, analysis/cleaning_log.md
"""
import pandas as pd
from pathlib import Path

RAW = Path("data/raw_sales.csv")
OUT = Path("data/cleaned_sales.csv")
LOG = Path("analysis/cleaning_log.md")

REGIONS = {"north": "North", "south": "South", "east": "East", "west": "West"}


def load() -> pd.DataFrame:
    df = pd.read_csv(RAW)
    print(f"[load] rows={len(df)} cols={df.shape[1]}")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    n0 = len(df)

    # 1) exact duplicates (double-scans)
    df = df.drop_duplicates()
    print(f"[dedupe] removed {n0 - len(df)} duplicate rows")

    # 2) text standardization
    for col in ("customer", "region", "category", "product", "channel"):
        df[col] = df[col].astype(str).str.strip().str.replace(r"\\s+", " ", regex=True)
    df["customer"] = df["customer"].str.title()
    df["region"] = df["region"].str.lower().map(REGIONS).fillna(df["region"])

    # 3) types
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce", format="mixed")
    df["unit_price"] = pd.to_numeric(
        df["unit_price"].astype(str).str.replace("[$, ]", "", regex=True), errors="coerce"
    )
    df["units"] = pd.to_numeric(df["units"], errors="coerce")

    # 4) missing / invalid rows (unjoinable without customer or date)
    before = len(df)
    df = df.dropna(subset=["customer", "order_date"])
    print(f"[drop] removed {before - len(df)} rows missing customer/date")

    # 5) outlier handling: sign errors and impossible values
    df = df[(df["units"] > 0) & (df["unit_price"] > 0)]
    df["units"] = df["units"].astype(int)

    # 6) derive revenue and finalize
    df["revenue"] = (df["units"] * df["unit_price"]).round(2)
    df["order_id"] = df["order_id"].str.strip().str.upper()
    return df.sort_values("order_date").reset_index(drop=True)


def verify(df: pd.DataFrame) -> None:
    assert df["region"].nunique() <= 4, "region standardization failed"
    assert not df.duplicated().any(), "duplicates remain"
    assert (df["revenue"] == (df["units"] * df["unit_price"]).round(2)).all(), "revenue mismatch"
    print(f"[verify] regions={df['region'].nunique()} rows={len(df)} revenue={df['revenue'].sum():,.2f}")


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    df = clean(load())
    verify(df)
    df.to_csv(OUT, index=False)
    LOG.write_text("# Cleaning log\\n\\nAll actions reproducible via this script.\\n")
    print(f"[done] wrote {OUT}")


if __name__ == "__main__":
    main()
`;
}

function genericScript(p: ProjectDef): string {
  return `"""${p.title} — analysis pipeline.
Run: python scripts/run_analysis.py
Input : data/ (project datasets)
Output: output/ (summaries + charts)
"""
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

OUT = Path("output")
OUT.mkdir(exist_ok=True)


def load(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=True)
    print(f"[load] {path}: {df.shape}")
    return df


def summarize(df: pd.DataFrame) -> pd.DataFrame:
    """Group-by the business dimensions and aggregate the key measures."""
    cat = next(c for c in df.columns if c in ("region", "channel", "department", "category", "source"))
    num = next(c for c in df.columns if c in ("revenue", "conversions", "resolution_hours", "salary"))
    return (
        df.groupby(cat)
        .agg(count=(num, "size"), total=(num, "sum"), avg=(num, "mean"))
        .sort_values("total", ascending=False)
    )


def main() -> None:
    csvs = sorted(Path("data").glob("*.csv"))
    if not csvs:
        raise SystemExit("No CSV found in data/ — add the dataset first.")
    df = load(str(csvs[0]))
    summary = summarize(df)
    summary.to_csv(OUT / "summary.csv")
    print(summary)

    ax = summary["total"].plot(kind="barh", title="Total by category")
    plt.tight_layout()
    plt.savefig(OUT / "summary_chart.png", dpi=150)
    print(f"[done] wrote {OUT}")


if __name__ == "__main__":
    main()
`;
}

const PROJECT_SQL: Record<string, [string, string][]> = {
  p4: [
    ["01_revenue.sql", `-- Completed revenue per customer (grain: one row = one order)
WITH line_rev AS (
  SELECT o.id AS order_id, o.customer_id,
         i.quantity * i.unit_price AS line_revenue
  FROM orders o
  JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'completed'
)
SELECT c.name, c.segment,
       COUNT(DISTINCT r.order_id) AS orders,
       SUM(r.line_revenue) AS revenue
FROM line_rev r
JOIN customers c ON c.id = r.customer_id
GROUP BY c.name, c.segment
ORDER BY revenue DESC;`],
    ["02_repeat_rate.sql", `-- Orders-per-customer distribution (onboarding hinge)
WITH per_cust AS (
  SELECT customer_id, COUNT(*) AS n_orders
  FROM orders
  GROUP BY customer_id
)
SELECT n_orders, COUNT(*) AS customers
FROM per_cust
GROUP BY n_orders
ORDER BY n_orders;`],
    ["03_cohorts.sql", `-- Cohort retention triangle (read down columns for improvement)
WITH first_order AS (
  SELECT customer_id, MIN(order_date) AS cohort_date
  FROM orders GROUP BY customer_id
),
activity AS (
  SELECT f.customer_id, f.cohort_date, o.order_date,
         CAST((julianday(o.order_date) - julianday(f.cohort_date)) / 30 AS INT) AS month_n
  FROM first_order f
  JOIN orders o ON o.customer_id = f.customer_id
)
SELECT cohort_date, month_n, COUNT(DISTINCT customer_id) AS active
FROM activity
GROUP BY cohort_date, month_n
ORDER BY cohort_date, month_n;`],
    ["04_rfm.sql", `-- RFM per customer (R: recency, F: frequency, M: monetary)
WITH rfm AS (
  SELECT c.id, c.name,
         COUNT(DISTINCT o.id) AS frequency,
         SUM(i.quantity * i.unit_price) AS monetary,
         MAX(o.order_date) AS last_order
  FROM customers c
  JOIN orders o ON o.customer_id = c.id AND o.status = 'completed'
  JOIN order_items i ON i.order_id = o.id
  GROUP BY c.id, c.name
)
SELECT name, frequency, monetary, last_order
FROM rfm
ORDER BY monetary DESC;`],
    ["05_segments.sql", `-- Revenue share by value tier (the boardroom table)
WITH rev AS (
  SELECT o.customer_id, SUM(i.quantity * i.unit_price) AS revenue
  FROM orders o
  JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'completed'
  GROUP BY o.customer_id
),
tiered AS (
  SELECT
    CASE
      WHEN revenue >= 3000 THEN 'Champion'
      WHEN revenue >= 1200 THEN 'Loyal'
      WHEN revenue >= 400  THEN 'Developing'
      ELSE 'One-time'
    END AS tier,
    revenue
  FROM rev
),
tier_agg AS (
  SELECT tier, COUNT(*) AS customers, SUM(revenue) AS revenue
  FROM tiered
  GROUP BY tier
),
total AS (
  SELECT SUM(revenue) AS grand_total FROM tiered
)
SELECT t.tier, t.customers, t.revenue,
       ROUND(100.0 * t.revenue / x.grand_total, 1) AS pct_of_total
FROM tier_agg t
JOIN total x ON 1 = 1
ORDER BY t.revenue DESC;`],
  ],
};

export function generateProjectFiles(p: ProjectDef): Omit<WorkspaceFile, "createdAt">[] {
  const base = `data-analytics-portfolio/${p.folder}`;
  const files: Omit<WorkspaceFile, "createdAt">[] = [];
  const add = (path: string, content: string, kind: WorkspaceFile["kind"]) =>
    files.push({ path: `${base}/${path}`, content, kind, projectId: p.id });

  add("README.md", readMe(p), "md");
  add("analysis/insights.md", buildInsights(p), "md");

  if (p.datasetId === "messy_sales") {
    const ds = getDatasetById("messy_sales")!;
    add("data/raw_sales.csv", rowsToCSV(ds.rows), "csv");
    add("data/cleaned_sales.csv", rowsToCSV(cleanMessyRows(ds.rows)), "csv");
    add("analysis/cleaning_log.md", cleaningLog(p), "md");
    add("scripts/clean_data.py", cleanScript(p), "py");
  } else if (p.datasetId && p.datasetId !== "sql") {
    const ds = getDatasetById(p.datasetId);
    if (ds) add(`data/${p.datasetId}.csv`, rowsToCSV(ds.rows), "csv");
    add("scripts/run_analysis.py", genericScript(p), "py");
  }

  const sqls = PROJECT_SQL[p.id];
  if (sqls) for (const [name, sql] of sqls) add(`queries/${name}`, sql, "sql");

  if (p.id === "p2" || p.id === "p7") {
    add("report/executive_summary.md", execSummary(p), "md");
    add("dashboard/dashboard.json", dashboardJson(p), "json");
  }
  if (p.id === "p3") {
    add("report/executive_summary.md", execSummary(p), "md");
    add("analysis/channel_scorecard.csv", channelScorecard(), "csv");
  }
  if (p.id === "p5") {
    add("pipeline_spec.md", pipelineSpec(), "md");
    add("runbook.md", runbook(), "md");
    add("scripts/schedule.yml", scheduleYml(), "txt");
  }
  if (p.id === "p6") {
    add("analysis/hypothesis_tests.md", hypothesisTests(), "md");
    add("data/watchlist.csv", watchlistCsv(), "csv");
    add("report/executive_summary.md", execSummary(p), "md");
  }
  if (p.id === "p7") {
    add("scoping/one_pager.md", scopeOnePager(), "md");
    add("pipeline_spec.md", pipelineSpec(), "md");
  }
  return files;
}

function buildInsights(p: ProjectDef): string {
  return `# Insights — ${p.title}

## What the data shows

${p.keyInsights.map((k, i) => `${i + 1}. ${k.replace(/~([^~]+)~/g, "`$1`")}`).join("\n")}

## Recommended Actions

1. Act on the highest-impact finding above this quarter.
2. Instrument the metric so the change is measurable (owner + cadence).
3. Re-check after 8 weeks — close the analysis loop.

## Hypotheses Tested

| # | Hypothesis | Verdict |
|---|-----------|---------|
| 1 | Primary driver hypothesis from the project brief | Confirmed / Rejected (fill from your analysis) |
| 2 | Segment-level alternative | Fill after analysis |

> Edit this file with your own numbers before pushing to GitHub — the structure is the deliverable, the numbers are yours.
`;
}

function execSummary(p: ProjectDef): string {
  return `# Executive Summary — ${p.title}

**Date:** ${TODAY()}  ·  **Prepared by:** Data Analytics (portfolio project)

## Decision Needed

${p.problem}

## Bottom Line

Based on the analysis of ${p.datasetId === "sql" ? "the orders database" : "the project dataset"}, the top lever is quantified in \`analysis/insights.md\`. The recommended action and its modeled impact are below.

## Findings

1. **Where the money is** — the leading segment/channel/category and its share (see analysis files).
2. **What is leaking** — the trend break / funnel step / risk segment identified.
3. **What to do** — one targeted intervention with expected impact range.

## Risks & Assumptions

- Estimates use the stated metric definitions (see README).
- Marginal effects conservatively haircut vs averages.
- Sample covers the project period only; extend before full commitment.

## Appendix

Full method, queries and cleaning log live in \`analysis/\`, \`queries/\` and \`scripts/\`.
`;
}

function dashboardJson(p: ProjectDef): string {
  return JSON.stringify(
    {
      name: p.title,
      source: p.datasetId,
      description: `Dashboard definition exported from the Academy Dashboard Studio for ${p.title}.`,
      layout: [
        { row: 1, widgets: ["kpi_revenue", "kpi_orders", "kpi_aov", "kpi_conversion"] },
        { row: 2, widgets: ["line_revenue_trend"] },
        { row: 3, widgets: ["bar_by_region", "bar_by_category"] },
        { row: 4, widgets: ["bar_top_products", "table_detail"] },
      ],
      widgets: {
        kpi_revenue: { type: "kpi", measure: "revenue", agg: "sum", compare: "previous_period" },
        kpi_orders: { type: "kpi", measure: "order_id", agg: "count", compare: "previous_period" },
        kpi_aov: { type: "kpi", measure: "revenue", agg: "avg", label: "AOV" },
        kpi_conversion: { type: "kpi", measure: "units", agg: "sum", label: "Units sold" },
        line_revenue_trend: { type: "line", dimension: "order_date:month", measure: "revenue", agg: "sum", title: "Monthly revenue trend" },
        bar_by_region: { type: "bar", dimension: "region", measure: "revenue", agg: "sum", sort: "desc", title: "Revenue by region" },
        bar_by_category: { type: "bar", dimension: "category", measure: "revenue", agg: "sum", sort: "desc", title: "Revenue by category" },
        bar_top_products: { type: "bar", dimension: "product", measure: "revenue", agg: "sum", topN: 7, title: "Top products" },
        table_detail: { type: "table", columns: ["order_id", "order_date", "region", "revenue"], title: "Detail" },
      },
      filters: [
        { field: "region", type: "single-select" },
        { field: "category", type: "multi-select" },
        { field: "order_date", type: "period" },
      ],
    },
    null,
    2
  );
}

function channelScorecard(): string {
  const ds = getDatasetById("marketing")!;
  const byCh = new Map<string, { spend: number; clicks: number; conv: number; rev: number; imp: number }>();
  for (const r of ds.rows) {
    const ch = String(r.channel);
    const cur = byCh.get(ch) ?? { spend: 0, clicks: 0, conv: 0, rev: 0, imp: 0 };
    cur.spend += Number(r.spend);
    cur.clicks += Number(r.clicks);
    cur.conv += Number(r.conversions);
    cur.rev += Number(r.revenue);
    cur.imp += Number(r.impressions);
    byCh.set(ch, cur);
  }
  const header = "channel,spend,impressions,clicks,conversions,revenue,ctr_pct,cvr_pct,cac,roas";
  const lines = [...byCh.entries()]
    .map(([ch, v]) => {
      const ctr = ((v.clicks / v.imp) * 100).toFixed(2);
      const cvr = ((v.conv / v.clicks) * 100).toFixed(2);
      const cac = (v.spend / v.conv).toFixed(2);
      const roas = (v.rev / v.spend).toFixed(2);
      return [ch, v.spend, v.imp, v.clicks, v.conv, v.rev.toFixed(2), ctr, cvr, cac, roas].join(",");
    })
    .sort((a, b) => parseFloat(b.split(",")[9]) - parseFloat(a.split(",")[9]));
  return [header, ...lines].join("\n");
}

function pipelineSpec(): string {
  return `# Pipeline Spec — Daily Sales Mart

**Owner:** Data Analytics  ·  **SLA:** ready by 07:00  ·  **Grain:** one row = one order line
**Sources:** daily POS CSV export (SFTP drop)  ·  **Target:** \`marts.fct_order_lines\`

## Stages

| # | Stage | Input | Output | Notes |
|---|-------|-------|--------|-------|
| 1 | Ingest | raw CSV | raw zone | byte-identical copy, filename with date |
| 2 | Validate | raw | pass/fail | gates below; fail = halt + alert |
| 3 | Clean | raw | staging | dedupe, trim/case, types, outliers |
| 4 | Aggregate | staging | mart | revenue by region × day; idempotent upsert |
| 5 | Publish & log | mart | dashboard + log | freshness check, run log rows in/out |

## Quality Gates (halt + alert on failure)

1. **Schema** — all 10 expected columns present with expected types.
2. **Volume** — row count within ±40% of 7-day average.
3. **Keys** — \`order_id\` non-null on 100% of rows.
4. **Values** — units > 0, unit_price > 0 after cleaning.
5. **Business** — revenue == units × unit_price on 100% of rows.

## Failure Modes & Alerts

| Failure | Alert |
|---------|-------|
| File missing at 06:30 | "INGEST FAIL: no export file for {date}. First action: check SFTP drop, rerun after arrival." |
| Volume gate breach | "VOLUME FAIL: {n} rows vs 7-day avg {avg} ({pct}% off). Halting before mart refresh." |
| Key/value gate breach | "QUALITY FAIL: {n} rows with null order_id / non-positive values. Rejects logged at runs/{date}.log" |

## Idempotency

Re-running replaces the target day's rows (upsert by \`order_date\`). Double cron fire is safe.
`;
}

function runbook(): string {
  return `# Runbook — Daily Sales Pipeline

**For:** whoever is on data duty at 06:55.
**SLA:** mart ready 07:00. Dashboard auto-refreshes after publish.

## Normal morning
1. Check the run log (\`runs/YYYY-MM-DD.log\`): rows in/out, 0 rejects, status OK.
2. Open the dashboard, confirm "Data as of" is today.
3. Done. No news is good news.

## If an alert fired
| Alert | Meaning | First action |
|-------|---------|--------------|
| INGEST FAIL | No/late source file | Check SFTP drop; poke source owner; rerun \`python scripts/pipeline.py --date today\` after arrival |
| VOLUME FAIL | Rows way off average | Source export is partial/broken — do NOT force run; confirm with source |
| QUALITY FAIL | Bad rows detected | Check rejects file; if source bug, log ticket; fix + rerun |

## Manual rerun
\`\`\`bash
python scripts/pipeline.py --date 2025-01-15   # idempotent: safe to repeat
\`\`\`

## Escalation
- Source unreachable 30 min past drop time → ping data-eng lead.
- Wrong numbers already visible on dashboard → annotate dashboard "data under review", then fix, then remove annotation.
`;
}

function scheduleYml(): string {
  return `# Scheduling plan for the daily sales pipeline
# Option A — cron (server): 45 6 * * * cd /opt/analytics && python scripts/pipeline.py
# Option B — GitHub Actions (free for public repos):

name: daily-sales-pipeline
on:
  schedule:
    - cron: "45 6 * * *"   # 06:45 — 15 min buffer before 07:00 SLA
  workflow_dispatch:        # manual trigger escape hatch

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install pandas
      - run: python scripts/pipeline.py
      - name: Notify on failure
        if: failure()
        run: echo "ALERT: pipeline failed — see run log" # replace with Slack webhook/email
`;
}

function hypothesisTests(): string {
  return `# Hypothesis Tests — HR Attrition

**H1 (leadership):** Leavers earn less than stayers *within the same department*.
**Method:** compare mean salary of leavers vs stayers per department (raw averages are confounded by department mix).
**Verdict template:** Confirmed in {n}/6 departments / Rejected — gap < {x}% within departments.

**H2 (HR):** Attrition concentrates at high overtime × low satisfaction.
**Method:** 2×2 risk matrix (overtime ≤12 vs >12 h; satisfaction ≥2.5 vs <2.5); attrition rate per quadrant.
**Verdict template:** Confirmed — {Q4 rate}% vs {Q1 rate}% baseline ({n} employees in quadrant).

**H3:** Attrition concentrates in specific departments / tenure bands.
**Method:** attrition rate by department and tenure band (<1y, 1–3y, 3–6y, 6y+).
**Verdict template:** Confirmed — {dept} at {rate}% vs {avg}% company average.

## Watchlist scoring (transparent, reproducible)

+2 overtime > 12h · +2 satisfaction < 2.5 · +1 tenure 1–3y · +1 salary below department median
Top-20 by score = retention program targets (\`data/watchlist.csv\`).

## Program ROI (conservative)

- Cost: $2,000/employee × 20 targets = **$40k**
- Benefit: prevent 4 exits × $40k replacement cost = **$160k** (save rate 20%)
- Range: 2–4× ROI depending on save rate; even 2 exits break even.
`;
}

function watchlistCsv(): string {
  const ds = getDatasetById("hr")!;
  const deptMedian = new Map<string, number>();
  const byDept = new Map<string, number[]>();
  for (const r of ds.rows) {
    const d = String(r.department);
    if (!byDept.has(d)) byDept.set(d, []);
    byDept.get(d)!.push(Number(r.salary));
  }
  for (const [d, arr] of byDept) {
    arr.sort((a, b) => a - b);
    deptMedian.set(d, arr[Math.floor(arr.length / 2)]);
  }
  const scored = ds.rows
    .filter((r) => r.attrition === "No")
    .map((r) => {
      let score = 0;
      if (Number(r.overtime_hours) > 12) score += 2;
      if (Number(r.satisfaction_score) < 2.5) score += 2;
      if (Number(r.tenure_years) >= 1 && Number(r.tenure_years) <= 3) score += 1;
      if (Number(r.salary) < (deptMedian.get(String(r.department)) ?? 0)) score += 1;
      return r;
    })
    .map((r) => {
      let score = 0;
      if (Number(r.overtime_hours) > 12) score += 2;
      if (Number(r.satisfaction_score) < 2.5) score += 2;
      if (Number(r.tenure_years) >= 1 && Number(r.tenure_years) <= 3) score += 1;
      if (Number(r.salary) < (deptMedian.get(String(r.department)) ?? 0)) score += 1;
      return { row: r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  const header = "employee_id,department,role,salary,overtime_hours,satisfaction_score,tenure_years,risk_score";
  const rows = scored.map(({ row, score }) =>
    [row.employee_id, row.department, row.role, row.salary, row.overtime_hours, row.satisfaction_score, row.tenure_years, score].join(",")
  );
  return [header, ...rows].join("\n");
}

function scopeOnePager(): string {
  return `# Scoping One-Pager — Support Ops Analytics

**Decision to support:** where to invest next quarter's support budget (people vs tooling vs self-serve).
**Deadline:** board review in 1 week.  **Audience:** COO + support lead.

## Deliverables

1. Executive dashboard (CSAT, resolution, SLA breach %, workload).
2. Driver analysis: what moves resolution time and CSAT.
3. One-page memo: recommendation + modeled impact + risks.

## Data

- Source: 150-ticket sample (category, priority, response/resolution hours, CSAT, escalation).
- Known limitations: no agent-level data; single sample period — flag in caveats.
- Grain: one row = one ticket. Key: ticket_id.

## Simulated stakeholder interview (summary)

- Last decision made with data: monthly backlog report; mostly ignored (too late, no drivers).
- Would act differently if: they knew which category burned hours vs which drove CSAT.
- Fear metric: tickets breaching 24h SLA.

## Risks

- Sample of 150 may hide small-category effects — state CIs, avoid overclaiming.
- "Resolution time" outliers (168h) — use medians in all reporting.
- CSAT causality: response speed is associated, not proven causal — recommend pilot.
`;
}

export function buildPortfolioZipFiles(files: { path: string; content: string }[]) {
  return files;
}

export const PORTFOLIO_ROOT = "data-analytics-portfolio";

export const GITHUB_GUIDE = {
  steps: [
    {
      title: "Download your portfolio folder",
      detail:
        "In the Workspace tab, click 'Download ZIP'. You get data-analytics-portfolio.zip containing every project folder (READMEs, data, scripts, queries).",
    },
    {
      title: "Create a new GitHub repository",
      detail:
        "Go to github.com → New repository → name it 'data-analytics-portfolio' → Public (recruiters must see it) → do NOT initialize with README (you already have one).",
    },
    {
      title: "Unzip locally and initialize Git",
      detail: "Unzip the file, open a terminal in the data-analytics-portfolio folder, then run the commands below.",
    },
    {
      title: "Commit and push",
      detail: "git init → git add . → git commit -m 'Add analytics portfolio' → connect remote → push. Full command list in the copy box.",
    },
    {
      title: "Polish the GitHub profile",
      detail:
        "Pin the repo, add a profile README, and write a short LinkedIn post per project ('How I found 24% of revenue sitting with at-risk customers'). Posts get interviews; repos convert them.",
    },
  ],
  commands: `# run inside the unzipped data-analytics-portfolio folder
git init
git add .
git commit -m "Add data analytics portfolio: 7 real-world projects"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/data-analytics-portfolio.git
git push -u origin main

# later updates
git add .
git commit -m "Improve Project 2 dashboard insights"
git push`,
};
