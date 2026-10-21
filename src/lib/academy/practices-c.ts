// Practice labs — ADVANCED level (a1l1 … a5l4).

import type { Practice } from "./practices";

export const PRACTICES_C: Record<string, Practice> = {
  a1l1: {
    kind: "quiz",
    title: "pandas in 30 minutes, checked",
    brief: "You generated real pandas code in Automation Studio. Confirm the fundamentals stuck.",
    questions: [
      {
        q: "The universal pandas import is:",
        options: ["import pandas as pd", "import pandas as pandas", "from pandas import everything", "require('pandas')"],
        correct: 0,
        explain: "'pd' is the community-standard alias — every tutorial and codebase you'll read uses it.",
      },
      {
        q: "The pandas object that holds a table is a:",
        options: ["DataFrame", "ArrayBook", "Sheet", "Workbook"],
        correct: 0,
        explain: "DataFrame = table (rows × columns). A single column is a Series. These two words are 90% of pandas vocabulary.",
      },
      {
        q: "df.head() shows:",
        options: ["The first 5 rows", "All rows", "Column types", "A chart"],
        correct: 0,
        explain: "head() is your first look at any dataset — 5 rows to sanity-check columns and values.",
      },
    ],
    hints: ["pd.DataFrame — the alias always rides along.", "Series = one column, DataFrame = the table."],
  },

  a1l2: {
    kind: "quiz",
    title: "Inspecting data like pandas does",
    brief: "Map each pandas inspection line to what it reveals — the same things the Data Cleaner shows you.",
    questions: [
      {
        q: "Which line shows missing counts per column at a glance?",
        options: ["df.isna().sum()", "df.style()", "df.plot()", "df.zip()"],
        correct: 0,
        explain: "isna() marks blanks True/False; .sum() adds them per column. Identical to the Cleaner's missing-values panel.",
      },
      {
        q: "df.describe() gives:",
        options: [
          "count / mean / std / min / quartiles / max for numeric columns",
          "Only the row count",
          "SQL joins",
          "Duplicated rows",
        ],
        correct: 0,
        explain: "One call = the whole stats panel: centre, spread, and the min/max you'd eyeball for outliers.",
      },
      {
        q: "df.dtypes matters because:",
        options: [
          "It catches numbers-stored-as-text and dates-as-strings before they break analysis",
          "It shows the file size",
          "It picks the font",
          "It sorts columns",
        ],
        correct: 0,
        explain: "The '$1,234.50' problem shows up here as 'object'. Converting types is step one after loading.",
      },
    ],
    hints: ["isna().sum() ↔ Cleaner's blank counter.", "describe() ↔ the stats panel."],
  },

  a1l3: {
    kind: "sql",
    title: "The Project 2 summary, in SQL",
    brief: "This exact aggregation exists in the generated pandas script of Project 2. Build it in SQL — same logic, different tool.",
    sqlTasks: [
      {
        prompt: "Revenue and order count by customer segment and product category (the Project 2 summary table).",
        solution:
          "SELECT c.segment, p.category, ROUND(SUM(oi.quantity*oi.unit_price),2) AS revenue, COUNT(DISTINCT o.id) AS orders FROM orders o JOIN customers c ON c.id=o.customer_id JOIN order_items oi ON oi.order_id=o.id JOIN products p ON p.id=oi.product_id GROUP BY c.segment, p.category ORDER BY c.segment, p.category",
      },
    ],
    hints: ["Three joins chain: orders→customers, orders→order_items, order_items→products.", "GROUP BY both dimensions: segment AND category.", "COUNT(DISTINCT o.id) counts orders, not order-lines."],
    functions: ["JOIN", "GROUP BY", "SUM", "COUNT DISTINCT"],
  },

  a1l4: {
    kind: "quiz",
    title: "Quick EDA chart choices",
    brief: "The HR dataset is loaded in pandas. Match each EDA question to its chart.",
    questions: [
      {
        q: "The shape of the salary distribution?",
        options: ["Histogram", "Line chart", "Pie chart", "Table"],
        correct: 0,
        explain: "One numeric variable's distribution → histogram. Bins reveal skew and bumps.",
      },
      {
        q: "Attrition (yes/no counts) across 5 departments?",
        options: ["Grouped/stacked bar chart", "Scatter", "Gauge", "Word cloud"],
        correct: 0,
        explain: "Counts by category (+category split) → bars. One bar per department, stacked or side-by-side.",
      },
      {
        q: "Does overtime relate to satisfaction score (both numeric)?",
        options: ["Scatter plot", "3D pie", "Histogram", "Donut"],
        correct: 0,
        explain: "Two numerics and their relationship → scatter. Clusters and trends live there.",
      },
    ],
    hints: ["Distribution → histogram · Category counts → bar · Numeric-vs-numeric → scatter.", "EDA is chart+question pairs — memorise the pairs."],
  },

  a1l5: {
    kind: "quiz",
    title: "The analysis script, reviewed",
    brief: "Project 5's generated script is a full pipeline. Verify you can read it like an engineer.",
    questions: [
      {
        q: "A reproducible analysis script must:",
        options: [
          "Run top-to-bottom on raw data and produce the same result every time",
          "Depend on manual cell edits",
          "Live only on your desktop",
          "Avoid imports",
        ],
        correct: 0,
        explain: "Same inputs → same outputs, no human steps. That's what makes it a pipeline instead of a one-off.",
      },
      {
        q: "The standard step order:",
        options: ["load → clean → aggregate → plot/save", "plot → load", "clean → load", "random order"],
        correct: 0,
        explain: "You can't clean what isn't loaded, can't aggregate what isn't clean. The order is forced by dependencies.",
      },
      {
        q: "Why wrap repeated cleaning in functions?",
        options: [
          "DRY — fix once, applies everywhere; scripts stay readable",
          "Longer scripts impress managers",
          "To add bugs",
          "To slow execution",
        ],
        correct: 0,
        explain: "Don't Repeat Yourself — one well-named function beats five copied blocks that drift apart.",
      },
    ],
    hints: ["Reproducible = no manual steps.", "load → clean → aggregate → output."],
  },

  a2l1: {
    kind: "quiz",
    title: "Sampling & confidence intervals",
    brief: "Your manager asks what '95% confident' actually means. Answer like a statistician, not a vibes-analyst.",
    questions: [
      {
        q: "A 95% confidence interval means:",
        options: [
          "If we re-sampled many times, ~95% of such intervals would contain the true mean",
          "95% of the data falls inside",
          "There's a 95% chance of being right",
          "95% of staff feel confident",
        ],
        correct: 0,
        explain: "The confidence is about the PROCEDURE across repeated samples — the most-missed stats question in interviews.",
      },
      {
        q: "Collecting a bigger sample does what to the CI?",
        options: ["Narrows it", "Widens it", "Nothing", "Reverses it"],
        correct: 0,
        explain: "More data → less uncertainty → a tighter (narrower) interval. Precision is purchasable with n.",
      },
      {
        q: "AOV's CI is [480, 540]. Correct reading:",
        options: [
          "We estimate the true average order value plausibly lies between 480 and 540",
          "AOV is exactly 510",
          "Half the orders are 480",
          "Revenue will double",
        ],
        correct: 0,
        explain: "The interval quantifies uncertainty around the estimate — it is NOT a promise about individual orders.",
      },
    ],
    hints: ["Confidence = the long-run behaviour of the method.", "n↑ → precision↑ → interval↓."],
  },

  a2l2: {
    kind: "quiz",
    title: "A/B tests done right",
    brief: "SwiftCart wants to test a new checkout button. Grade the test design.",
    questions: [
      {
        q: "The primary metric for a checkout-button test:",
        options: ["Completed purchase rate", "Time on page", "Total clicks anywhere", "Bounce rate"],
        correct: 0,
        explain: "The metric must measure the DECISION the button influences: did they finish buying?",
      },
      {
        q: "p < 0.05 means:",
        options: [
          "Under the null hypothesis, a result this extreme is <5% likely — evidence, not proof",
          "5% profit increase",
          "A guaranteed winner",
          "5% of users converted",
        ],
        correct: 0,
        explain: "p-values quantify surprise under the null. They never give certainty — that's why we also demand effect size.",
      },
      {
        q: "The right moment to stop an A/B test:",
        options: [
          "When the pre-planned duration / sample size is reached",
          "The first morning it looks good",
          "When you feel it",
          "After 20 clicks",
        ],
        correct: 0,
        explain: "Peeking and early-stopping inflate false positives. Fix the horizon BEFORE starting.",
      },
    ],
    hints: ["Primary metric = the decision, not vanity.", "Pre-register duration; peeking ruins tests."],
  },

  a2l3: {
    kind: "quiz",
    title: "Regression, demystified",
    brief: "The retail regression output is on the table. Read it like the lesson taught.",
    questions: [
      {
        q: "'spend coefficient = 4.2' means:",
        options: [
          "Each extra $1 of spend associates with +$4.2 revenue, holding other variables constant",
          "Spend is 4.2 dollars",
          "R² = 4.2",
          "p-value = 4.2",
        ],
        correct: 0,
        explain: "Coefficients are slopes: change-per-unit with everything else held fixed (ceteris paribus).",
      },
      {
        q: "R² tells you:",
        options: [
          "The share of variance the model explains (0–1)",
          "The slope",
          "The p-value",
          "The chart colour",
        ],
        correct: 0,
        explain: "R² = 0.72 → the model explains 72% of revenue variation. It says nothing about causation.",
      },
      {
        q: "A confounder you'd worry about in spend→revenue:",
        options: ["Seasonality driving both", "Font size", "Chart colour", "Sheet name"],
        correct: 0,
        explain: "Holidays lift both spend AND revenue — the coefficient would claim credit that belongs to December.",
      },
    ],
    hints: ["Coef = slope per unit, others held constant.", "R² is about fit, not truth."],
  },

  a2l4: {
    kind: "quiz",
    title: "Forecasting fundamentals",
    brief: "Three forecasting candidates walk into a monthly revenue series. Pick the right tool for each pattern.",
    questions: [
      {
        q: "The naive forecast for next month is:",
        options: ["Last month's actual value", "The all-time average", "Zero", "A coin flip"],
        correct: 0,
        explain: "Naive = 'tomorrow looks like today'. Surprisingly hard to beat on stable series — always benchmark it.",
      },
      {
        q: "A series with trend AND strong seasonality is best served by:",
        options: [
          "Seasonal-naive or a model with trend + seasonality terms",
          "Naive only",
          "A pie chart",
          "Deleting the history",
        ],
        correct: 0,
        explain: "Ignoring seasonality makes December look like a miracle every year. Match the model to the pattern.",
      },
      {
        q: "How do you know a forecast is any good?",
        options: [
          "Backtest it on held-out months and compare error metrics",
          "Hope",
          "Pick the biggest number",
          "Ask the loudest stakeholder",
        ],
        correct: 0,
        explain: "Train on the past, test on withheld months. Error (MAE/MAPE) decides — not opinion.",
      },
    ],
    hints: ["Naive = last value. Seasonal-naive = same month last year.", "Backtesting is the forecast CV."],
  },

  a3l1: {
    kind: "quiz",
    title: "ETL/ELT essentials",
    brief: "You sketched a support-tickets pipeline. Verify the vocabulary and the validation instincts.",
    questions: [
      {
        q: "ETL stands for:",
        options: ["Extract, Transform, Load", "Email, Text, Log", "Enter, Tally, Link", "Export, Test, Launch"],
        correct: 0,
        explain: "Pull from sources, reshape to the model, land in the warehouse. The daily bread of analytics engineering.",
      },
      {
        q: "In ELT, transformation happens:",
        options: [
          "Inside the warehouse AFTER loading (using its compute power)",
          "Before extraction",
          "Never",
          "In Excel by hand",
        ],
        correct: 0,
        explain: "Modern warehouses are so fast that loading raw and transforming in-place (dbt-style) is now the default.",
      },
      {
        q: "The FIRST validation after any load:",
        options: [
          "Row count + key uniqueness match the source",
          "The colour scheme",
          "The font",
          "Nothing — trust everything",
        ],
        correct: 0,
        explain: "You built exactly these checks in Project 5: count reconciliation and key uniqueness are the two gates every pipeline opens with.",
      },
    ],
    hints: ["E→T→L, in order or after load.", "Count + uniqueness = the two universal gates."],
  },

  a3l2: {
    kind: "quiz",
    title: "Batch vs streaming",
    brief: "Four workloads, one architecture decision each. Don't overpay for latency you don't need.",
    questions: [
      {
        q: "Fraud alerts on card transactions need:",
        options: ["Streaming — seconds matter", "Monthly batch", "A fax machine", "Nothing"],
        correct: 0,
        explain: "Blocking fraud 30 seconds after it starts vs next morning is the whole product.",
      },
      {
        q: "The monthly board report is:",
        options: ["Batch", "Streaming", "Realtime", "A phone call"],
        correct: 0,
        explain: "Once-a-month + trusted numbers = classic batch. Streaming here would be expensive theatre.",
      },
      {
        q: "The true cost of streaming is:",
        options: [
          "Infrastructure + operational complexity — use it only when latency pays",
          "Nothing, it's free",
          "Slower data",
          "Lower quality",
        ],
        correct: 0,
        explain: "Streams add brokers, checkpoints and 3am pages. The rule: batch by default, stream when seconds make money.",
      },
    ],
    hints: ["Latency need drives the choice.", "Batch default; streaming is a paid upgrade."],
  },

  a3l3: {
    kind: "quiz",
    title: "Pipeline design walkthrough",
    brief: "You wrote the 8-line spec for the tickets pipeline. Grade the design decisions.",
    questions: [
      {
        q: "The correct pipeline step order:",
        options: [
          "ingest → validate → clean → aggregate → load/serve",
          "load → ingest",
          "aggregate → ingest",
          "clean → extract",
        ],
        correct: 0,
        explain: "Validate EARLY — bad rows should die at the door, not in the warehouse.",
      },
      {
        q: "Writing the README spec before code:",
        options: [
          "Aligns scope and catches design errors while they're cheap",
          "Slows everything down",
          "Replaces testing",
          "Hides assumptions",
        ],
        correct: 0,
        explain: "One page of design saves a week of rework. You compared yours against Project 5's brief for exactly this reason.",
      },
      {
        q: "An idempotent pipeline is one where:",
        options: [
          "Re-running produces the same result — no duplicates, no drift",
          "It only runs once ever",
          "It needs a restart daily",
          "Output is random",
        ],
        correct: 0,
        explain: "Idempotency is what makes re-runs safe after failures — the property your upsert logic provides.",
      },
    ],
    hints: ["Validate early, aggregate late.", "Idempotent = rerun-safe."],
  },

  a3l4: {
    kind: "quiz",
    title: "Data quality checks & monitoring",
    brief: "Your 6-assertion list is about to become Project 5's quality gate. Confirm the taxonomy.",
    questions: [
      {
        q: "A schema check asserts:",
        options: ["Expected columns and types exist", "The colours look right", "The file is small", "Column names are pretty"],
        correct: 0,
        explain: "Upstream 'small changes' (a renamed column) break everything — schema checks catch them in seconds.",
      },
      {
        q: "A volume check asserts:",
        options: [
          "Row count within an expected range (e.g. ±20% vs yesterday)",
          "The file has rows",
          "Rows are blue",
          "The query is short",
        ],
        correct: 0,
        explain: "A silent source outage often shows up as 0 rows or half of yesterday — volume gates catch what nothing else does.",
      },
      {
        q: "Which is a business-rule check?",
        options: [
          "No order total below 0",
          "The SQL has comments",
          "The dashboard is fast",
          "The table is wide",
        ],
        correct: 0,
        explain: "Business rules encode domain logic: non-negative totals, valid statuses, dates not in the future.",
      },
    ],
    hints: ["Schema / volume / value / business — the four families.", "Assertions are automated trust."],
  },

  a4l1: {
    kind: "quiz",
    title: "The automation audit",
    brief: "Before automating anything, prove you can pick the RIGHT thing to automate first.",
    questions: [
      {
        q: "The ideal first automation is:",
        options: [
          "High frequency + high effort + low judgement",
          "A once-a-year task",
          "The task you enjoy most",
          "Everything at once",
        ],
        correct: 0,
        explain: "Frequent × tedious × rule-based = maximum ROI. Judgement-heavy tasks resist scripting.",
      },
      {
        q: "The audit scores tasks by:",
        options: [
          "Frequency, effort, and how much human judgement each run needs",
          "Alphabetical order",
          "Manager mood",
          "Colour of the report",
        ],
        correct: 0,
        explain: "You scored 1–5 on each axis in the lesson — the top scorer is your automation target.",
      },
      {
        q: "A task needing fresh human judgement every run is:",
        options: [
          "A poor first target — automate the mechanical wrapper instead",
          "Perfect for cron",
          "Impossible to ever automate",
          "Already automated",
        ],
        correct: 0,
        explain: "Automate the glue (fetching, formatting, sending) and leave the judgement to humans — that's a realistic first win.",
      },
    ],
    hints: ["ROI = frequency × effort saved.", "Automate the wrapper, not the judgement."],
  },

  a4l2: {
    kind: "quiz",
    title: "From script to cron",
    brief: "Your weekly sales report just became a cron entry and a GitHub Action. Check the details.",
    questions: [
      {
        q: "The cron expression '0 7 * * 1' fires:",
        options: ["Every Monday at 07:00", "Daily at 7:01", "Every minute", "On January 7"],
        correct: 0,
        explain: "Five fields: minute hour day month weekday. 0 7 * * 1 = 07:00, every (*), Monday (1).",
      },
      {
        q: "A scheduled report script must be:",
        options: [
          "Idempotent, log its runs, and alert when it fails",
          "Interactive",
          "Colourful",
          "Run manually each time",
        ],
        correct: 0,
        explain: "Nobody watches scheduled jobs — logs and failure alerts ARE the interface.",
      },
      {
        q: "In GitHub Actions, the schedule lives:",
        options: ["In the `cron:` field of the workflow YAML", "In the README", "On a sticky note", "In the commit message"],
        correct: 0,
        explain: "on: schedule: cron: [...] — the same five-field syntax, run on GitHub's clock (UTC).",
      },
    ],
    hints: ["minute · hour · day · month · weekday.", "Unattended scripts need logs + alerts."],
  },

  a4l3: {
    kind: "quiz",
    title: "Alerting that works",
    brief: "You designed 3 alerts for support. Grade them against the anti-fatigue rules.",
    questions: [
      {
        q: "A good threshold alert:",
        options: [
          "Has a threshold grounded in history and sends the actual number + a link",
          "Spams hourly",
          "Says 'something happened'",
          "Has no owner",
        ],
        correct: 0,
        explain: "Actionable = context + numbers + where to look. Unowned alerts are ignored alerts.",
      },
      {
        q: "Alert fatigue is cured by:",
        options: [
          "Fewer, sharper alerts — each with an owner and a runbook",
          "More alerts",
          "Louder sounds",
          "Muting the channel",
        ],
        correct: 0,
        explain: "Every unnecessary alert taxes attention. Precision beats volume — trim until every alert deserves its interruption.",
      },
      {
        q: "Weekly digests exist to:",
        options: [
          "Batch the small-but-useful so real signal survives",
          "Replace dashboards",
          "Hide bad news",
          "Should really be hourly",
        ],
        correct: 0,
        explain: "Not everything is urgent. Digests carry the routine; alerts carry the exceptions.",
      },
    ],
    hints: ["Every alert needs: threshold, owner, runbook.", "If nobody acts on it, delete it."],
  },

  a4l4: {
    kind: "quiz",
    title: "The four automation patterns",
    brief: "Almost every analyst automation is one of four shapes. Match them.",
    questions: [
      {
        q: "The four patterns from the lesson:",
        options: [
          "Scheduled report · threshold alert · file-watch pipeline · digest",
          "Vibes · chaos · hope · panic",
          "Excel · Word · PowerPoint · Paint",
          "Big · medium · small · tiny",
        ],
        correct: 0,
        explain: "These four cover 90% of what analysts automate — recognise the shape and half the design is done.",
      },
      {
        q: "A file-watch pipeline fits:",
        options: [
          "'When the daily CSV lands in the folder, clean and load it'",
          "When nothing ever happens",
          "Manual typing tasks",
          "Only streaming apps",
        ],
        correct: 0,
        explain: "Trigger = file arrival. Common with vendor drops and exports — you mapped your own task to this pattern.",
      },
      {
        q: "Your first personal automation should:",
        options: [
          "Save ≥30 min/week and be boring to run",
          "Be a chatbot with AI",
          "Take 3 months",
          "Impress nobody but be complex",
        ],
        correct: 0,
        explain: "Boring and reliable is the goal — automations earn trust by never surprising anyone.",
      },
    ],
    hints: ["Report · alert · file-watch · digest.", "Boring, reliable, time-saving."],
  },

  a5l1: {
    kind: "quiz",
    title: "OLTP vs OLAP",
    brief: "Two kinds of databases, two jobs. Route each workload correctly.",
    questions: [
      {
        q: "'Process a checkout transaction' belongs to:",
        options: ["OLTP — many small, fast writes", "OLAP", "A spreadsheet", "A log file"],
        correct: 0,
        explain: "OLTP = Online Transaction Processing: row-oriented, write-optimised, consistency-first.",
      },
      {
        q: "'Revenue by region for 3 years' belongs to:",
        options: ["OLAP — aggregation over history", "OLTP", "A transaction log", "Nothing"],
        correct: 0,
        explain: "OLAP = Online Analytical Processing: columnar storage built for scanning and aggregating millions of rows.",
      },
      {
        q: "OLAP engines store data:",
        options: [
          "Columnar and denormalised — fast reads for aggregation",
          "Row-by-row only",
          "As PDFs",
          "As images",
        ],
        correct: 0,
        explain: "Columns together = read only what you aggregate. That's why warehouses scan billions of rows in seconds.",
      },
    ],
    hints: ["Writes → OLTP. Reads/aggregates → OLAP.", "Columnar storage is the warehouse superpower."],
  },

  a5l2: {
    kind: "quiz",
    title: "Facts, dimensions & grain drill",
    brief: "You ran the 5-step drill on the tickets dataset. Re-run it mentally here.",
    questions: [
      {
        q: "The FIRST modeling question is always:",
        options: ["What is the grain — one row = one what?", "What colour?", "How many tables?", "Which font?"],
        correct: 0,
        explain: "Grain determines every measure's meaning. Get it wrong and all sums are fiction.",
      },
      {
        q: "order_items' grain is:",
        options: [
          "One row per order-line (one product within one order)",
          "One row per customer",
          "One row per month",
          "One row per warehouse",
        ],
        correct: 0,
        explain: "A 3-product order = 3 rows here. Knowing this prevents double-counting order totals.",
      },
      {
        q: "Which is an ADDITIVE measure?",
        options: [
          "revenue — safe to SUM across any dimension",
          "a percentage",
          "an average",
          "a customer name",
        ],
        correct: 0,
        explain: "Additive = summable across everything. Percentages and averages must be RE-computed from their parts, never summed.",
      },
    ],
    hints: ["Grain → measures → dimensions → relationships → names.", "Averages are never summed — recompute them."],
  },

  a5l3: {
    kind: "quiz",
    title: "Slowly changing dimensions",
    brief: "Customers move, emails change, prices shift. Pick the SCD type that keeps history honest.",
    questions: [
      {
        q: "Customer email — only the current value matters:",
        options: ["SCD Type 1 — overwrite in place", "Type 2", "Type 0", "Type 9"],
        correct: 0,
        explain: "Type 1 = no history wanted. Overwrite and move on — cheapest and correct for contact details.",
      },
      {
        q: "Customer region — you must analyse 'sales while they lived in the North':",
        options: [
          "SCD Type 2 — new row with valid_from / valid_to",
          "Type 1 overwrite",
          "Delete the history",
          "Store regions in a text blob",
        ],
        correct: 0,
        explain: "Type 2 keeps a version history so old facts join to the region that was TRUE at the time.",
      },
      {
        q: "Birth date:",
        options: ["Type 0 — fixed forever, never changes", "Type 2 with weekly versions", "Overwrite daily", "Type 4"],
        correct: 0,
        explain: "Type 0 = immutable. Birth dates don't change; store once and leave alone.",
      },
    ],
    hints: ["0 = frozen · 1 = overwrite · 2 = version history.", "Ask: 'do we need to know the PAST value?'"],
  },

  a5l4: {
    kind: "quiz",
    title: "Metrics layer & semantic models",
    brief: "Two dashboards say two different revenues — the disease is missing governance. Check the cure.",
    questions: [
      {
        q: "A governed metric definition includes:",
        options: [
          "Formula, grain, default filters, and known caveats",
          "Just a name",
          "A chart type",
          "A colour",
        ],
        correct: 0,
        explain: "'Revenue = SUM(revenue) EXCLUDING returns, tax excluded, from fact_orders' — one sentence that kills a thousand arguments.",
      },
      {
        q: "Defining 'Revenue' must state:",
        options: [
          "Whether returns are excluded, tax treatment, currency, and the source table",
          "Nothing — everyone knows",
          "The CEO's opinion",
          "A pie chart preference",
        ],
        correct: 0,
        explain: "Ambiguity lives in the defaults. Explicit filters and scope make numbers comparable across teams.",
      },
      {
        q: "The benefit of a semantic model / metrics layer:",
        options: [
          "ONE definition reused by every dashboard — no number duels in meetings",
          "More dashboards per analyst",
          "Slower queries",
          "Fewer metrics overall",
        ],
        correct: 0,
        explain: "Define once, reuse everywhere. The metric layer is the peace treaty of analytics.",
      },
    ],
    hints: ["Formula + grain + filters + caveats.", "One definition, every dashboard."],
  },
};
