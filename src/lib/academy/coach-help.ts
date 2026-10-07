"use client";

/* coach-help — Ask-the-coach Q&A knowledge base and "what real company work looks like"
   briefs for each tool. Written for absolute beginners: plain language, real office
   situations, concrete deliverables. */

export interface AskEntry {
  kws: string[]; // lowercase keywords, any match triggers
  q: string;
  a: string; // markdown
}

export interface RealBrief {
  id: string;
  company: string;
  role: string;
  ask: string; // the manager's actual request, verbatim style
  deliverable: string[]; // what you hand over
  how: string[]; // steps to produce it in THIS tool
  good: string; // what "good" looks like — how it's judged
}

/* ============================== EXCEL ============================== */

const EXCEL_ASK: AskEntry[] = [
  {
    kws: ["sum", "0", "zero", "wrong total", "not adding"],
    q: "Why does my SUM return 0?",
    a: "Three usual culprits: **1)** the range is empty or misses the rows (e.g. `=SUM(I2:I10)` but data goes to row 340) — fix by using the whole column `I:I`; **2)** the numbers are actually **text** (they left-align, or came from a CSV with `$` or commas) — clean them (Data tab ▸ text tools) or convert; **3)** you're summing a column of formulas that return `\"\"` — check what the cells really hold with `=COUNT(I:I)` (counts numbers only).",
  },
  {
    kws: ["vlookup", "xlookup", "lookup", "n/a", "#n/a"],
    q: "VLOOKUP vs XLOOKUP — and why #N/A?",
    a: "VLOOKUP searches the **first column** of a range and returns a column counted from there: `=VLOOKUP(\"Office Chair\", G2:H21, 2, FALSE)` — the FALSE (exact match) matters. **XLOOKUP** is the modern way and searches any direction: `=XLOOKUP(\"Office Chair\", G2:G21, I2:I21, \"not found\")`. #N/A means the value wasn't found — check for extra spaces (use TRIM) or casing, and give XLOOKUP's 4th argument so misses read nicely instead of erroring.",
  },
  {
    kws: ["if", "condition", "flag", "logic"],
    q: "How does IF work — can I nest conditions?",
    a: "`=IF(condition, value_if_true, value_if_false)` — e.g. `=IF(J2>1000, \"Big\", \"Small\")`. For several levels either nest: `=IF(J2>5000,\"XL\",IF(J2>1000,\"Big\",\"Small\"))` (read inside-out), or use the cleaner `=IFS(J2>5000,\"XL\",J2>1000,\"Big\",TRUE,\"Small\")`. For a yes/no result on a whole column, write the IF in row 2 and **fill down** — that's the standard analyst pattern for flags like High/Low risk.",
  },
  {
    kws: ["sumif", "sumifs", "countif", "conditional sum"],
    q: "How do I total only some rows (SUMIF/SUMIFS)?",
    a: "`=SUMIF(criteria_range, criteria, sum_range)` — `=SUMIF(F:F,\"North\",I:I)` totals column I where the region is North. Multiple conditions? SUMIFS (sum range comes **first**): `=SUMIFS(I:I, F:F,\"North\", E:E,\">500\")`. COUNTIF/COUNTIFS work the same for counting. These four functions answer most 'how much / how many for X' emails you'll ever get.",
  },
  {
    kws: ["pivot", "pivotable", "pivot table", "summary"],
    q: "What is a PivotTable and when do I use one?",
    a: "A PivotTable **groups and summarizes** a table without formulas: drag a category to Rows, a number to Values → instant report (revenue per region). Use it for fast exploration and one-off summaries; use SUMIFS when you need the numbers to sit inside your own designed layout. In this Excel: Insert tab ▸ **PivotTable**, then drag fields in the dialog — it builds the summary right on the sheet.",
  },
  {
    kws: ["clean", "messy", "duplicate", "trim", "text"],
    q: "How do I clean messy data in Excel?",
    a: "The standard order: **1)** Remove Duplicates (Data tab) on the full range; **2)** TRIM/UPPER/PROPER text columns (Data tab text tools) so 'north' and 'North' stop splitting into two groups; **3)** fix number-like text ($1,234 → 1234); **4)** standardize dates to one format; **5)** keep the raw copy untouched on another sheet. Cleaning first is why analysts' totals match — and why they get believed.",
  },
  {
    kws: ["chart", "graph", "visual"],
    q: "Which chart should I use?",
    a: "**Column/bar** → compare categories (revenue per region). **Line** → change over time (monthly trend). **Pie** → parts of one whole, only if slices are few. **Scatter** → relationship between two numbers. The interview answer: 'column to compare, line to trend, pie sparingly'. In this Excel: select your category + number columns, Insert tab ▸ chart.",
  },
  {
    kws: ["filter", "hide", "subtotal"],
    q: "Does SUM include hidden (filtered-out) rows?",
    a: "Yes — SUM ignores nothing. For totals of only visible rows use `=SUBTOTAL(109, I2:I500)` (109 = SUM of visible cells). Analysts put SUBTOTAL in the header row above filtered data so the total always matches what's on screen.",
  },
  {
    kws: ["freeze", "header", "scroll"],
    q: "How do I keep headers visible while scrolling?",
    a: "View tab ▸ **Freeze Top Row** (or Freeze First Column). For both, select cell B2 first then Freeze Panes — everything above and left of the selection stays put. This is the first thing analysts do on any file over one screen tall.",
  },
  {
    kws: ["format", "currency", "percent", "date", "number"],
    q: "How do number formats work?",
    a: "Formats change **appearance**, never the stored value: Currency adds $ and separators, Percent multiplies the display by 100 (0.25 shows as 25%), Date formats render date serials. Apply per column (select the column letter first) — per-cell formatting is how columns end up inconsistent. Ctrl+1 opens the full Format Cells dialog.",
  },
];

/* ============================ POWER BI ============================ */

const PBI_ASK: AskEntry[] = [
  {
    kws: ["measure", "calculated column", "difference", "dax"],
    q: "Measure vs calculated column — which do I add after cleaning?",
    a: "**Calculated column** = computed once per row, stored in the model (like a helper column: `Profit = Price - Cost`). Use when you need the value per row (slicers, axis). **Measure** = computed at query time inside the current filters (like `Total Revenue := SUM(Sales[Amount])`). Use for every KPI number — one measure correctly serves every visual, slicer and page. Rule of thumb: **row-by-row → column; business KPI → measure.** After cleaning, ask 'do I need a new field per row, or a number that reacts to filters?' — that decides it.",
  },
  {
    kws: ["calculate", "dax", "filter context"],
    q: "What does CALCULATE do in DAX?",
    a: "CALCULATE is the one DAX function that **changes filter context**: `West Revenue := CALCULATE([Total Revenue], Sales[Region] = \"West\")` evaluates the measure *as if* Region were West. Every 'share of total', 'vs last year', 'selected segment' KPI is CALCULATE underneath. Pair it with FILTER for richer conditions, and remember: filters flow from slicers/visuals first, then CALCULATE adds/overrides inside the formula.",
  },
  {
    kws: ["sumx", "iterat", "row context"],
    q: "SUM vs SUMX — when do I need the X?",
    a: "`SUM` adds one column. `SUMX(table, expression)` iterates **row by row** evaluating the expression — needed when the math doesn't exist as a column yet: `Revenue := SUMX(Sales, Sales[Qty] * Sales[Price])`. The X family (AVERAGEX, COUNTX, MINX, MAXX) is the DAX way to say 'for each row…'. If you catch yourself wanting a helper column just to multiply two columns, you wanted SUMX.",
  },
  {
    kws: ["visual", "chart type", "which"],
    q: "Which visual for which question?",
    a: "**Card** → one KPI ('how much?'). **Column/bar** → compare categories ('which region?'). **Line** → trend ('better or worse over time?'). **Pie/donut** → share of a whole (few slices only). **Scatter** → relationship of two numbers. **Matrix** → the pivot-table style detail. **Waterfall** → how parts build to a total (contribution by segment). Start every page: Card + Column + Line.",
  },
  {
    kws: ["filter", "cross", "interaction", "click"],
    q: "How does cross-filtering work?",
    a: "Click a bar/slice/point and Power BI filters **every other visual** on the page to that selection — like all visuals silently agreeing on a WHERE clause. Clear it with the filter chip above the canvas. If your numbers look oddly small, check for a filter chip first; that surprises every beginner exactly once.",
  },
  {
    kws: ["slicer"],
    q: "What's a slicer for?",
    a: "A slicer is a visible filter the report *user* operates: pick regions, dates, segments — the whole page responds. Slicers turn your report from 'a story I tell' into 'a tool they drive', which is the entire point of self-service BI. Add one per page for the dimension your audience cares about most.",
  },
  {
    kws: ["page", "report structure", "layout", "design"],
    q: "How should a real report page be laid out?",
    a: "The standard exec layout: **top-left** the headline Card (the eye starts there), **top-right** the biggest breakdown (column chart), **bottom** the trend (line) and one detail table. 4–7 visuals per page, titles that are questions ('Revenue by Region'), consistent colors, and a slicer. Detail pages hold the big tables; the summary page links the story.",
  },
  {
    kws: ["percent", "share", "total", "all"],
    q: "How do I compute % of total in DAX?",
    a: "`Revenue % := DIVIDE([Total Revenue], CALCULATE([Total Revenue], ALL(Sales[Region])))` — the inner CALCULATE with **ALL** removes the region filter to get the grand total, and DIVIDE handles division-by-zero safely. Reading it out loud helps: 'this revenue over total revenue ignoring region'. This pattern (measure + CALCULATE + ALL) is the classic interview question.",
  },
];

/* =============================== SQL =============================== */

const SQL_ASK: AskEntry[] = [
  {
    kws: ["join", "inner", "left", "two tables"],
    q: "JOIN types — INNER vs LEFT, when?",
    a: "`INNER JOIN` keeps only rows that match in **both** tables (customers who ordered). `LEFT JOIN` keeps **all** rows from the left table, NULLs where no match (all customers, even ones who never ordered — that's how you find them!). Default to INNER for transactions; use LEFT when the question is 'which ones are missing/never did X'. Always join on the key: `ON o.customer_id = c.id`.",
  },
  {
    kws: ["group", "aggregate", "sum", "count", "having"],
    q: "GROUP BY rules — and HAVING vs WHERE?",
    a: "Every SELECT column must be **in GROUP BY or inside an aggregate**. WHERE filters rows *before* grouping; HAVING filters groups *after*: `… GROUP BY region HAVING SUM(amount) > 1000`. Order matters and reads like a sentence: SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.",
  },
  {
    kws: ["window", "over", "row_number", "rank", "lag", "partition"],
    q: "What are window functions (OVER / PARTITION BY)?",
    a: "They compute across related rows **without collapsing them**. `ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC)` numbers best-to-worst *within each region*, keeping every row. RANK shares ties (1,1,3), DENSE_RANK doesn't skip (1,1,2), LAG/LEAD reach the previous/next row (month-over-month change), `SUM(amount) OVER (PARTITION BY region)` is a running subtotal beside each row. The classic interview: *'top customer per region'* — ROW_NUMBER in a CTE, then `WHERE rn = 1`.",
  },
  {
    kws: ["cte", "with", "subquery"],
    q: "Why use WITH (CTEs) instead of one giant query?",
    a: "A CTE names a step: `WITH monthly AS (SELECT month, SUM(amount) AS rev …) SELECT * FROM monthly WHERE rev > 5000;`. Read top-to-bottom like a recipe. Real analysts chain 2–4 CTEs (clean → aggregate → rank) instead of nesting subqueries three levels deep — your future teammate will thank you, and debugging is trivial: run each CTE alone.",
  },
  {
    kws: ["union", "combine", "stack"],
    q: "UNION vs UNION ALL?",
    a: "Both stack two result sets with the **same column count**. `UNION ALL` keeps everything (fast, honest). `UNION` removes duplicate rows (slower — it compares every row). Use UNION ALL unless duplicates genuinely bother you. Typical use: two months' extracts, or this-year + last-year in one comparison report.",
  },
  {
    kws: ["null", "is null", "blank"],
    q: "How does NULL work — why does my filter miss rows?",
    a: "NULL means *unknown*, not zero or empty string. `= NULL` is never true — use `IS NULL` / `IS NOT NULL`. Aggregates skip NULLs (AVG ignores them, COUNT(col) doesn't count them). COALESCE(col, 0) substitutes a default. If a LEFT JOIN shows NULLs and you filter `WHERE col = 'x'` afterwards, you silently delete the unmatched rows — a classic trap.",
  },
  {
    kws: ["date", "month", "year", "julianday"],
    q: "How do I filter or group by date?",
    a: "Dates are text here in ISO form ('2025-06-01'), so comparisons just work: `WHERE order_date >= '2025-06-01'`. For calendar parts: `JULIANDAY(order_date) - JULIANDAY('2025-01-01')` gives day offsets; `SUBSTR(order_date, 1, 7) AS month` gives '2025-06' — the classic month-key trick for GROUP BY month.",
  },
  {
    kws: ["order", "sort", "top", "limit"],
    q: "How do I get the top 5 / sort results?",
    a: "`ORDER BY revenue DESC LIMIT 5` — sort first, cap second. Sort by the **alias** of your aggregate (`ORDER BY total_revenue DESC`). ASC is default (smallest first); DESC puts biggest/newest on top. 'Top-N per group' = window function ROW_NUMBER inside a CTE, then filter rn ≤ 5.",
  },
];

export const ASK_SUGGESTIONS: Record<string, string[]> = {
  excel: ["Why does my SUM return 0?", "How does IF work?", "What is a PivotTable?", "How do I clean messy data?", "VLOOKUP vs XLOOKUP?"],
  dashboard: ["Measure vs calculated column?", "What does CALCULATE do?", "SUM vs SUMX?", "How should a page be laid out?", "How does cross-filtering work?"],
  sql: ["INNER vs LEFT JOIN?", "What are window functions?", "HAVING vs WHERE?", "Why use CTEs?", "How does NULL work?"],
};

export function askCoach(tool: string, question: string): { q: string; a: string } | null {
  const bank = tool === "excel" ? EXCEL_ASK : tool === "dashboard" ? PBI_ASK : SQL_ASK;
  const q = question.toLowerCase().trim();
  if (!q) return null;
  const words = q.split(/[^a-z0-9#]+/).filter((w) => w.length > 1);
  let best: { entry: AskEntry; score: number } | null = null;
  for (const entry of bank) {
    let score = 0;
    for (const kw of entry.kws) if (q.includes(kw)) score += kw.length > 3 ? 2 : 1;
    for (const w of words) if (entry.kws.some((k) => k.includes(w) || w.includes(k))) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best ? { q: best.entry.q, a: best.entry.a } : null;
}

/* ================== REAL COMPANY WORK BRIEFS ================== */

export const REAL_WORK: Record<string, RealBrief[]> = {
  excel: [
    {
      id: "monday-sales",
      company: "Northwind Retail (140 stores)",
      role: "You're the analyst; the sales director asks at 8:30, meeting is at 10:00.",
      ask: "\"Before the sales meeting I need last month's numbers: total revenue, best and worst region, and the top 5 products. One page I can read on my phone.\"",
      deliverable: [
        "One sheet, top section: Total revenue, Best region (with its number), Worst region (with its number)",
        "A 'Top 5 products' table sorted biggest-first with a % of total column",
        "Formatted so a tired manager reads it in 30 seconds: bold headers, currency, one highlight color",
      ],
      how: [
        "Data ▸ Get Data ▸ Retail Sales 2025 (Clean)",
        "Top area: =SUM(revenue column) — that's the headline",
        "=SUMIF(region column, each region) for every region; eyeball best/worst",
        "Sort products by revenue Z→A; top 5 = the table",
        "Add =product_revenue / total with Percent format for the % column",
        "Bold the headers, Currency the money, Save to portfolio as sales_brief_2025-05.csv",
      ],
      good: "Under 10 minutes of reading, every number traceable to a formula, no raw dump visible — managers call this 'the one-pager'.",
    },
    {
      id: "month-end",
      company: "Brightlane Finance (month-end close)",
      role: "You're the finance analyst; the controller needs the close checklist before sign-off.",
      ask: "\"Reconcile the transaction extract: no duplicates, all amounts numeric, dates consistent, and give me the monthly totals table for the report pack.\"",
      deliverable: [
        "A cleaned transactions sheet (raw kept untouched on its own sheet)",
        "A cleaning log: what was removed/fixed and how many rows",
        "Monthly totals table (SUMIFS by month) matching the ledger ± 0",
      ],
      how: [
        "Load a messy file (e.g. Bank Transactions) — raw stays on one sheet",
        "Copy to a 'Clean' sheet; Remove Duplicates; note the row count before/after",
        "Trim/UPPER text columns; fix $-text amounts with the text tools",
        "Build the monthly totals with SUMIFS on a month helper column",
        "Save both sheets to the portfolio — the log is the audit trail",
      ],
      good: "Row counts reconcile at every step; someone else can repeat your steps from the log and get the same numbers — that's what 'audit-ready' means.",
    },
    {
      id: "headcount",
      company: "Cedar Health Group (HR)",
      role: "You're the people-analytics analyst; HRBP asks for a retention snapshot.",
      ask: "\"How many leavers did we have by department last year, and what's the average tenure? I need it by this afternoon for the board pack.\"",
      deliverable: [
        "Leavers count per department (COUNTIFS)",
        "Average tenure per department (AVERAGEIF)",
        "A red flag list: departments above the company average attrition",
      ],
      how: [
        "Load HR Staff Records; freeze the header row",
        "COUNTIFS(dept, status) per department",
        "AVERAGEIF for tenure per department",
        "Company average = AVERAGE of the tenure column; conditional-format the departments above it",
        "Save as hr_retention_snapshot.csv",
      ],
      good: "The board reads counts and averages side by side, flags visible in red — the conversation starts at the problem, not at the spreadsheet.",
    },
  ],
  dashboard: [
    {
      id: "exec-weekly",
      company: "Northwind Retail",
      role: "Monday trade meeting — your dashboard is on the wall screen.",
      ask: "\"Same page every Monday: this week's revenue, how the regions compare, are we trending up, and let me click into any region live.\"",
      deliverable: [
        "One page: headline Card, region column chart, weekly trend line, one slicer",
        "Titles that are questions ('Revenue by Region')",
        "Cross-filtering that survives the meeting (clear chips!)",
      ],
      how: [
        "Get Data ▸ Retail Sales 2025 (Clean)",
        "Card: Sum of revenue — top-left",
        "Column chart: Region on X, revenue on Y — top-right",
        "Line chart: Date on X, revenue on Y — bottom",
        "Format ▸ titles on for each; add a Region slicer",
        "Save to portfolio as trade_meeting_report",
      ],
      good: "A manager answers 'how are we doing?' in under a minute without asking you anything — the page talks.",
    },
    {
      id: "campaign-review",
      company: "Brightwave Marketing",
      role: "You're the BI analyst; the CMO reviews campaigns monthly.",
      ask: "\"Which campaigns are worth scaling? I want spend vs revenue per campaign, conversion trend, and the ROI number for each — no exports, one link.\"",
      deliverable: [
        "Bar chart revenue per campaign, colored by performance",
        "A measure: ROI = (revenue - spend) / spend",
        "Trend line of conversions; slicer by channel",
      ],
      how: [
        "Get Data ▸ Marketing Performance (or enter your own)",
        "Bar chart: Campaign on X, Sum revenue on Y",
        "Modeling ▸ New Measure: ROI := DIVIDE(SUM(Revenue) - SUM(Spend), SUM(Spend))",
        "Line chart of conversions over date",
        "Slicer on channel; save as campaign_review",
      ],
      good: "The CMO drags the slicer, sees which channel's bars stay tall, and the ROI measure settles the debate — decisions in the meeting, not after it.",
    },
    {
      id: "ops-watch",
      company: "SwiftCart (operations)",
      role: "You build the ops watchlist the support lead opens all day.",
      ask: "\"Open tickets by priority, oldest first; average resolution time; and let me click a priority to drill the list.\"",
      deliverable: [
        "Card: average resolution days; Column: tickets by priority; Matrix: oldest tickets detail",
        "Cross-filtering priority → detail",
        "Clean page titles; one slicer (team)",
      ],
      how: [
        "Get Data ▸ Support Tickets",
        "Card: Average of resolution days",
        "Column chart: priority on X, count on Y",
        "Matrix: oldest tickets (sort by created date)",
        "Click a priority column → detail filters — prove the drill works, then save",
      ],
      good: "The lead keeps it open on a side monitor and answers 'what's worst right now?' at a glance — operational dashboards are tools, not art.",
    },
  ],
  sql: [
    {
      id: "cohort-request",
      company: "Northwind Retail",
      role: "Slack message from the Head of E-commerce, answer expected in 20 minutes.",
      ask: "\"Who are our top 5 customers by revenue this year, and what city are they in? Query + CSV please.\"",
      deliverable: [
        "One query: JOIN orders→customers, GROUP BY customer, SUM revenue, ORDER BY DESC, LIMIT 5",
        "The result exported as CSV",
      ],
      how: [
        "Preview customers and orders (know the keys)",
        "JOIN orders o ON o.customer_id = c.id JOIN customers c…",
        "GROUP BY c.name, SUM(o.total_amount) AS revenue",
        "ORDER BY revenue DESC LIMIT 5",
        "Export results; paste the query next to the file",
      ],
      good: "Under 20 minutes including double-checking the join key — this 'pull me the numbers' request is half of a junior analyst's real day.",
    },
    {
      id: "monthly-report",
      company: "Brightlane Finance",
      role: "The monthly metrics pack needs its numbers regenerated — same query, new month.",
      ask: "\"Monthly revenue, order count and average order value by region, like last month. The query is the documentation.\"",
      deliverable: [
        "A CTE-based query: monthly per region, with revenue / orders / AOV",
        "Sorted newest-first, saved as a .sql file in the workspace",
      ],
      how: [
        "WITH region_month AS (SELECT region, SUBSTR(order_date,1,7) AS month, SUM(total_amount) AS revenue, COUNT(*) AS orders FROM orders JOIN … GROUP BY region, month)",
        "Main query: revenue, orders, revenue/orders AS avg_order_value",
        "ORDER BY month DESC",
        "Export + save the SQL — next month you change one date",
      ],
      good: "Reproducible: same query next month = same report. Teams keep these in a repo — that's why the query text matters as much as the result.",
    },
    {
      id: "repeat-risk",
      company: "SwiftCart",
      role: "The growth team suspects churn; they ask the analyst.",
      ask: "\"Which customers haven't ordered in 90+ days but used to order monthly? And rank customers by recency within each region.\"",
      deliverable: [
        "A query using window functions: LAG for gaps, ROW_NUMBER for ranking",
        "A short list of at-risk customers with their last-order date",
      ],
      how: [
        "Per-customer last order: GROUP BY customer, MAX(order_date)",
        "LAG(previous order) OVER (PARTITION BY customer ORDER BY order_date) to see gaps",
        "ROW_NUMBER() OVER (PARTITION BY region ORDER BY last_order) for recency rank",
        "Filter stale customers; export the at-risk list for the CRM",
      ],
      good: "A defensible at-risk list (query attached) that marketing can act on — window functions are exactly how 'top per group' and 'time between events' questions get answered in production.",
    },
  ],
};
