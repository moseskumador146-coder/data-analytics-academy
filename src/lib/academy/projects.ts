// 7 real-world company projects with detailed steps, deliverables and portfolio file generation.

export interface ProjectStep {
  title: string;
  detail: string;
  hint?: string;
  tool?: string; // suggested academy tool
}

export interface ProjectDef {
  id: string;
  folder: string;
  emoji: string;
  title: string;
  company: string;
  scenario: string;
  problem: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Master";
  hours: string;
  skills: string[];
  tools: string[];
  datasetId: string;
  steps: ProjectStep[];
  deliverables: string[];
  rubric: string[];
  keyInsights: string[];
}

export const PROJECTS: ProjectDef[] = [
  {
    id: "p1",
    folder: "01-retail-sales-cleaning",
    emoji: "🧹",
    title: "Retail Sales Data Cleaning",
    company: "Northwind Retail Co. (mid-size retail chain)",
    scenario:
      "Northwind's POS system exports daily transactions to CSV. The H2-2024 export is a mess: mixed-case customer names, three date formats, prices with $ signs stored as text, duplicated rows from double-scans, and blank fields. Before ANY analysis can happen, the data team needs a trustworthy, tidy dataset — and a documented log of every fix.",
    problem:
      "Deliver a clean, analysis-ready sales table from the raw export, with a full cleaning log. Finance has complained that revenue totals 'never match twice' — your cleaned table becomes the single source of truth.",
    level: "Beginner",
    hours: "3–4 h",
    skills: ["Data profiling", "Missing values", "Deduplication", "Text standardization", "Date parsing", "Outlier handling", "Documentation"],
    tools: ["Data Cleaner", "Excel Studio"],
    datasetId: "messy_sales",
    steps: [
      {
        title: "Profile the raw data before touching anything",
        detail:
          "Load 'Retail Sales H2-2024 (Messy)' in the Data Cleaner. Record: total rows, columns, missing values per column, distinct values in region/customer, obvious type problems. Write a 3-line summary of what you see.",
        hint: "The profile panel shows missing % and distinct counts per column. Region should have 4 values — count how many it actually has.",
        tool: "Data Cleaner",
      },
      {
        title: "Fix the structure: grain & duplicates",
        detail:
          "Confirm one row = one order line. Remove exact duplicate rows (double-scanned orders). Record how many you removed and what % of the raw file that was.",
        hint: "Identical rows in every column are safe duplicates. Same order_id with different values needs a decision — investigate before deleting.",
        tool: "Data Cleaner",
      },
      {
        title: "Standardize text fields",
        detail:
          "Trim whitespace on every text column, normalize customer names to Title Case, and collapse the region chaos ('north', ' SOUTH', 'WEST ') into the 4 canonical regions. Verify distinct counts afterwards.",
        hint: "Apply Trim → Proper Case, then use find-replace or the standardize action for region variants.",
        tool: "Data Cleaner",
      },
      {
        title: "Repair types: dates, units, prices",
        detail:
          "Convert all order_date values to ISO YYYY-MM-DD (the export mixes '-' and '/' formats). Strip '$' and cast unit_price to a number. Cast units to integer. Count every value that could not be parsed.",
        hint: "The Cleaner auto-detects date and currency text issues. Note the unparseable count for your log — never let fixes happen silently.",
        tool: "Data Cleaner",
      },
      {
        title: "Handle missing values deliberately",
        detail:
          "Rows missing customer or date are unjoinable — drop them (record count). Missing units → fill with the median. Missing unit_price → fill with that product's median price. Add nothing silently.",
        hint: "Median beats mean here: one whale order would drag the mean. The Cleaner's fill actions report exactly what they did.",
        tool: "Data Cleaner",
      },
      {
        title: "Investigate the planted outliers",
        detail:
          "Find the negative price and the zero-units rows. Classify each: data error vs genuine event. Fix sign errors, null the typo prices, and document each decision in the log.",
        hint: "A negative price with positive units is almost always a returns/sign-entry error. Zero units with a price is a cancelled line.",
        tool: "Data Cleaner",
      },
      {
        title: "Compute revenue and verify totals",
        detail:
          "After cleaning, revenue = units × unit_price. Verify with 5 random rows by hand, then compare total revenue before vs after cleaning — explain the difference in one sentence (duplicates + dropped rows).",
        hint: "If before ≠ after by roughly the duplicate revenue, you did it right. A wild difference means a fix went wrong.",
        tool: "Excel Studio",
      },
      {
        title: "Export the clean dataset + write the cleaning log",
        detail:
          "Export the cleaned CSV, then write the cleaning log using the 6-point format (duplicates, text, dates, types, missing, outliers) with counts for every action. This log ships to GitHub with the project.",
        hint: "The Cleaner's log tab has your back — copy it into README.md and add your one-line profile summary from step 1.",
        tool: "Data Cleaner",
      },
    ],
    deliverables: [
      "data/raw_sales.csv — the original messy export",
      "data/cleaned_sales.csv — tidy, typed, deduplicated",
      "analysis/cleaning_log.md — every action with counts",
      "analysis/insights.md — 3 findings from the cleaned data",
      "scripts/clean_data.py — reproducible pandas cleaning script",
      "README.md — problem, approach, results",
    ],
    rubric: [
      "All 4 regions are consistently named (distinct count = 4)",
      "Zero duplicate order rows remain",
      "All dates parse and are ISO-formatted",
      "unit_price and units are fully numeric",
      "Missing-value strategy is documented, not silent",
      "Cleaning log includes counts for every action",
    ],
    keyInsights: [
      "~8% of raw rows were duplicates inflating every total",
      "Two date formats coexisted — 'Revenue by month' was double-counting",
      "A $-prefix bug made unit_price text, silently zeroing SUM()",
    ],
  },
  {
    id: "p2",
    folder: "02-executive-sales-dashboard",
    emoji: "📊",
    title: "Executive Sales Dashboard",
    company: "Northwind Retail Co. — leadership team",
    scenario:
      "The CEO asks for a Monday-morning view of the business: 'One screen. Am I on track? Where is the money? What needs attention?' You have the clean sales data from Project 1 and a BI tool. Build the 5-second/30-second dashboard executives actually open — KPIs with deltas, the trend, and the two decompositions that localize problems.",
    problem:
      "Design and build an executive sales dashboard: revenue trend, regional and category performance, top products — every number with a comparison, and an insight title on every chart.",
    level: "Beginner",
    hours: "4–5 h",
    skills: ["KPI design", "Chart selection", "Dashboard layout", "Filter context", "Insight titles"],
    tools: ["Dashboard Studio", "Excel Studio"],
    datasetId: "clean_sales",
    steps: [
      {
        title: "Define the 3 questions the dashboard must answer",
        detail:
          "Write them down: (1) Are we on track? (2) Where does revenue come from? (3) What needs attention? Every widget must serve one of these — kill anything else.",
        hint: "This is the audience contract from the Dashboard Principles lesson. 3 questions max.",
        tool: "Dashboard Studio",
      },
      {
        title: "Build the 5-second layer: KPI cards with deltas",
        detail:
          "Add KPI widgets: Total Revenue, Orders, AOV, Avg Units/Order. Give each a comparison (vs target or split by period) and format numbers for humans ($1.2M, not 1234567.89).",
        hint: "A revenue number alone is a shrug — pair it with something: last quarter, or region split.",
        tool: "Dashboard Studio",
      },
      {
        title: "Build the 30-second layer: the trend",
        detail:
          "Add a line chart: revenue by month. Title it with the insight, not the topic ('Mid-year dip, strong Q4 recovery'). If the title is hard to write, the chart may not be saying anything yet.",
        hint: "Use the month dimension on the date column. One line, no rainbow.",
        tool: "Dashboard Studio",
      },
      {
        title: "Add the regional decomposition",
        detail:
          "Bar chart: revenue by region, sorted descending, insight title. Then a second view: AOV by region — compare WHO buys big vs WHO buys often.",
        hint: "Region leading revenue ≠ region leading AOV. The gap between those two charts is usually the story.",
        tool: "Dashboard Studio",
      },
      {
        title: "Add category & product depth",
        detail:
          "Bar chart: revenue by category. Bar chart: top products by revenue. Use a filter widget to slice everything by region — the CEO will ask 'ok, but in the South?'",
        hint: "Top-N thinking: 5–7 products max on screen; the rest is 'Other'.",
        tool: "Dashboard Studio",
      },
      {
        title: "Apply the layout canon",
        detail:
          "Reorder: KPIs top row, trend second, decompositions below. One accent color for the important series, gray for the rest. Check the 5-second/30-second/5-minute layering.",
        hint: "F-pattern: eyes start top-left. Most important KPI first.",
        tool: "Dashboard Studio",
      },
      {
        title: "Stress-test with the 10-second find test",
        detail:
          "Ask someone (or role-play): 'Find North region electronics revenue in 10 seconds.' If filters are buried or titles are vague, fix it. Save the dashboard.",
        hint: "Save it via the Save button — it becomes part of your exported project folder as dashboard JSON.",
        tool: "Dashboard Studio",
      },
      {
        title: "Write the executive summary",
        detail:
          "One page: BLUF recommendation, 3 KPIs, 2 charts worth of findings, one risk. Use Situation–Complication–Resolution. This becomes report/executive_summary.md in your portfolio.",
        hint: "Line 1 = the decision you'd make. Everything else is support.",
        tool: "Dashboard Studio",
      },
    ],
    deliverables: [
      "dashboard/dashboard.json — the saved dashboard definition",
      "dashboard/mockup.md — layout spec + KPI definitions",
      "report/executive_summary.md — BLUF one-pager",
      "analysis/insights.md — findings behind each chart title",
      "data/sales_clean.csv — source data used",
      "README.md — problem, approach, dashboard walkthrough",
    ],
    rubric: [
      "Every KPI has a comparison (delta/target)",
      "Every chart title states an insight, not a topic",
      "5s / 30s / 5-minute layers present and ordered",
      "Filters find 'North electronics' in ≤10 seconds",
      "Numbers formatted for humans",
      "Executive summary leads with a recommendation",
    ],
    keyInsights: [
      "Top region by revenue ≠ top region by AOV — mix matters",
      "One category usually drives >35% of revenue (concentration risk)",
      "The mid-year dip localizes to a region+category pair, not 'the market'",
    ],
  },
  {
    id: "p3",
    folder: "03-marketing-roi-report",
    emoji: "💰",
    title: "Marketing ROI & Channel Report",
    company: "Lumen Digital (growth-stage SaaS)",
    scenario:
      "Lumen spends ~$60k/month across Google Ads, Meta, Email, Influencer and SEO. The CMO suspects money is leaking but can't see where. The board wants ROAS by channel, CAC trends, and one recommendation for next quarter's budget shift. You have 12 months of channel performance data and one week.",
    problem:
      "Analyze 12 months of marketing spend and returns: compute ROAS/CAC/CTR/CVR by channel, find the winner and the leak, and recommend a budget reallocation with a modeled impact.",
    level: "Intermediate",
    hours: "4–6 h",
    skills: ["ROAS & CAC", "Funnel math", "Trend analysis", "Budget modeling", "Executive storytelling"],
    tools: ["Dashboard Studio", "Excel Studio", "SQL Playground"],
    datasetId: "marketing",
    steps: [
      {
        title: "Define the funnel metrics precisely",
        detail:
          "Write definitions before computing: CTR = clicks/impressions, CVR = conversions/clicks, CAC = spend/conversions, ROAS = revenue/spend. Agree tolerance: what ROAS justifies spend? (Hint: LTV:CAC ≥ 3 is the classic bar.)",
        hint: "Definitions in writing first — this is the definition contract that prevents the meeting argument later.",
        tool: "Excel Studio",
      },
      {
        title: "Compute the channel scorecard",
        detail:
          "Per channel across all 12 months: total spend, conversions, revenue, ROAS, CAC, CTR, CVR. Rank by ROAS. In Excel use SUMIFS per channel; in SQL use GROUP BY channel.",
        hint: "SUMIF(channel_cell, channel_name, revenue_column) per metric — or one GROUP BY in the SQL Playground against a pasted table.",
        tool: "Excel Studio",
      },
      {
        title: "Chart the efficiency vs scale view",
        detail:
          "Build in Dashboard Studio: bar chart ROAS by channel (sorted), bar chart spend by channel, scatter spend vs revenue per channel. The scatter exposes who is efficient-but-tiny vs huge-but-bleeding.",
        hint: "The interesting channels sit top-left of the scatter (high ROAS, low spend) — that's where budget goes.",
        tool: "Dashboard Studio",
      },
      {
        title: "Find the trend break",
        detail:
          "Line chart: monthly ROAS per channel (or one channel highlighted, rest gray). Identify WHEN a channel turned — a single month where efficiency dropped tells a story (auction costs? creative fatigue?).",
        hint: "Highlight one channel in color, gray all others. The break month is your annotation.",
        tool: "Dashboard Studio",
      },
      {
        title: "Audit the funnel step-by-step",
        detail:
          "Per channel: impressions → clicks → conversions. Which step leaks? High CTR + low CVR = landing page problem; low CTR = creative/audience problem. Put the diagnosis in words per channel.",
        hint: "CTR healthy, CVR broken → the ads are fine, the page isn't. Different owner, different fix.",
        tool: "Excel Studio",
      },
      {
        title: "Model the reallocation",
        detail:
          "Scenario analysis: shift $8k/month from the worst-ROAS channel to the best. Using the winner's marginal ROAS (be conservative — use 70% of its average), model the monthly revenue delta. Show base/conservative cases.",
        hint: "Marginal returns diminish — moving $8k into a channel does not buy its average ROAS. The 70% haircut keeps you honest.",
        tool: "Excel Studio",
      },
      {
        title: "Write the CMO one-pager",
        detail:
          "BLUF: 'Shift $8k/month from X to Y; modeled +$Z/mo revenue.' Include the scorecard table, the scatter, the trend break annotation, risks (marginal returns, seasonality), and next test.",
        hint: "The ask is the budget shift. The risk section pre-answers 'what if the winner saturates?'",
        tool: "Dashboard Studio",
      },
    ],
    deliverables: [
      "analysis/channel_scorecard.csv — the computed metrics",
      "analysis/insights.md — funnel diagnosis per channel",
      "report/executive_summary.md — CMO one-pager with the reallocation ask",
      "dashboard/dashboard.json — ROAS dashboard",
      "data/marketing_spend.csv — source data",
      "README.md — problem, method, recommendation",
    ],
    rubric: [
      "All five channels scored on ROAS, CAC, CTR, CVR with written definitions",
      "Funnel leak diagnosed per channel (creative vs landing page)",
      "Trend break identified and annotated",
      "Reallocation modeled conservatively with base case",
      "One-pager leads with the recommendation and quantifies impact",
    ],
    keyInsights: [
      "The biggest spender is rarely the most efficient channel",
      "Influencer/SEO often show high ROAS at tiny scale — test scaling before celebrating",
      "One channel's ROAS cliff-dive month usually matches an auction/seasonal event",
    ],
  },
  {
    id: "p4",
    folder: "04-sql-customer-analytics",
    emoji: "🗄️",
    title: "SQL Customer Analytics (Retention & RFM)",
    company: "BrightCommerce (e-commerce platform, 45 customers pilot)",
    scenario:
      "BrightCommerce's growth team believes 'we have a churn problem'. Leadership disagrees: 'new customers keep coming in, what's the issue?' You have the full orders database. Settle it with SQL: cohort retention to prove/disprove the leaky bucket, and RFM segmentation to show where today's revenue actually sits — plus the repeat-purchase analysis that explains onboarding.",
    problem:
      "Using the SQL Playground's store database (customers, orders, order_items, products): build cohort retention, compute repeat-purchase behavior, and segment customers with RFM. Deliver queries + findings + a win-back target list.",
    level: "Intermediate",
    hours: "5–6 h",
    skills: ["CTEs", "JOINs", "Aggregation", "Cohort analysis", "RFM segmentation", "Business SQL"],
    tools: ["SQL Playground"],
    datasetId: "sql",
    steps: [
      {
        title: "Recon: learn the schema and grains",
        detail:
          "In the SQL Playground, browse all 5 tables. For each: grain, primary key, foreign keys. Run SELECT * LIMIT 5 on everything. Note: orders has no revenue column — line revenue lives in order_items (quantity × unit_price).",
        hint: "The schema browser shows columns + row counts. State each grain out loud before moving on.",
        tool: "SQL Playground",
      },
      {
        title: "Core revenue query with a CTE",
        detail:
          "Build completed-revenue per customer: JOIN orders → order_items → customers, filter status='completed', compute SUM(quantity × unit_price), GROUP BY customer. Sanity check total vs a raw COUNT(*).",
        hint: "Watch the grain after the join: one order with 3 items = 3 rows. SUM over order_items is safe; COUNT(*) needs DISTINCT orders.id.",
        tool: "SQL Playground",
      },
      {
        title: "Repeat-purchase behavior",
        detail:
          "How many customers ordered more than once? Distribution: orders per customer (1, 2, 3+). This is the 'onboarding to second purchase' hinge — compute % of customers with exactly 1 order.",
        hint: "GROUP BY customer_id, then GROUP BY the count: SELECT n_orders, COUNT(*) FROM (...) GROUP BY n_orders.",
        tool: "SQL Playground",
      },
      {
        title: "Cohort retention triangle",
        detail:
          "Assign each customer a cohort (month of first order). For each month-since-first-order, compute % of the cohort that ordered again. Build the triangle in a CTE chain: first_order → activity → pivot.",
        hint: "first_order = MIN(order_date) GROUP BY customer. Then LEFT JOIN orders on customer and compute month-diff buckets. Read down columns for improvement, across rows for the floor.",
        tool: "SQL Playground",
      },
      {
        title: "RFM scores by quintiles",
        detail:
          "Compute per customer: recency (days since last order), frequency (order count), monetary (total revenue). Score each 1–5 using NTILE-style logic (or CASE on rank). Name segments: Champions, Loyal, At Risk, Hibernating, New.",
        hint: "If window ranking feels heavy: approximate quintiles with CASE WHEN using percentiles you computed in step 4. Business sense > purity.",
        tool: "SQL Playground",
      },
      {
        title: "The at-risk revenue table",
        detail:
          "The money query: revenue share by RFM segment. If 'At Risk' (used to buy, gone quiet) holds >15% of historical revenue, the win-back campaign is funded. Output: segment, customers, revenue, % of total.",
        hint: "JOIN your RFM CTE to the revenue CTE from step 2. This table IS the boardroom slide.",
        tool: "SQL Playground",
      },
      {
        title: "Save all queries + write findings",
        detail:
          "Export every query into queries/ (01_revenue.sql ... 06_segments.sql) with comments. Write analysis/insights.md: does the cohort triangle prove the leaky bucket? Which segment holds the money? Who gets the win-back email?",
        hint: "Comment each query with its business question in one line — reviewers read comments first.",
        tool: "SQL Playground",
      },
    ],
    deliverables: [
      "queries/01_revenue.sql … queries/06_segments.sql — commented, runnable",
      "analysis/cohort_retention.md — the triangle + reading",
      "analysis/insights.md — RFM segments + at-risk revenue table",
      "data/win_back_list.csv — the at-risk customers with revenue",
      "README.md — problem, schema notes, findings",
    ],
    rubric: [
      "Every query runs in the Playground without errors",
      "Grain stated in comments before each query",
      "Retention triangle built from first-order cohorts",
      "RFM uses quintile logic with named segments",
      "At-risk revenue quantified as % of total",
      "Queries are CTE-structured, not nested spaghetti",
    ],
    keyInsights: [
      "New-customer inflow can mask terrible repeat rates — cohorts reveal it",
      "A small % of customers (top quintile) typically holds ~60% of revenue",
      "'At risk' customers are the cheapest revenue: they already converted once",
    ],
  },
  {
    id: "p5",
    folder: "05-etl-sales-pipeline",
    emoji: "⚙️",
    title: "ETL Pipeline & Automation",
    company: "Northwind Retail Co. — data engineering handoff",
    scenario:
      "The Project 1 cleaning worked once — manually. Now the business wants it every morning by 07:00: pull the daily export, validate it, clean it, aggregate it into the dashboard-ready mart, and notify the team. If the export is broken (missing file, half the rows, new column), the pipeline must fail loudly with a useful message — not serve a silently wrong dashboard.",
    problem:
      "Design and build a repeatable pipeline: ingest → validate → clean → aggregate → publish → log. Define the quality gates, make it idempotent, and generate the production Python script + scheduling plan.",
    level: "Advanced",
    hours: "5–7 h",
    skills: ["Pipeline design", "Validation gates", "Idempotency", "Aggregation marts", "Scheduling", "Logging"],
    tools: ["Automation Studio", "Data Cleaner"],
    datasetId: "messy_sales",
    steps: [
      {
        title: "Write the pipeline spec first",
        detail:
          "One page: sources (daily POS CSV), target (daily aggregated mart), SLA (07:00), grain (one row per order line), owner. List the 5 stages and what each consumes/produces. This doc goes in the repo root.",
        hint: "If you can't number the steps, you can't automate them — the litmus test from the automation module.",
        tool: "Automation Studio",
      },
      {
        title: "Define the quality gates",
        detail:
          "Write the assertion list: (1) schema — all 10 expected columns present; (2) volume — row count within ±40% of the 7-day average; (3) keys — order_id non-null; (4) values — units ≥ 0, price ≥ 0 after fixes; (5) business — revenue = units × price on 100% of rows.",
        hint: "Volume gates catch 'the export ran but was half-empty' — the most common real failure.",
        tool: "Automation Studio",
      },
      {
        title: "Build & run the pipeline in Automation Studio",
        detail:
          "Assemble: Ingest (messy sales) → Clean (trim, standardize, dedupe, fix types) → Validate (your gate list) → Aggregate (revenue by region × day) → Output (summary + report). Run it and read the step log with timings.",
        hint: "Each step shows rows in/out — the in/out numbers ARE your validation evidence. Screenshot-worthy.",
        tool: "Automation Studio",
      },
      {
        title: "Test failure modes on purpose",
        detail:
          "Break things: imagine the file missing (ingest should halt), 90% of rows null (volume gate), a new region appears (allowed-values gate). For each, write the exact alert message the pipeline would send. Update the spec's failure section.",
        hint: "An alert must name: what broke, when, the evidence (rows in/out), and the first action. 'Pipeline failed' is an anti-alert.",
        tool: "Automation Studio",
      },
      {
        title: "Make it idempotent",
        detail:
          "Verify re-running the pipeline produces identical outputs (overwrite, not append). Document the upsert logic for the mart: same day re-run = replace that day's rows, never duplicate.",
        hint: "Cron double-fires are a when, not an if. Run the pipeline twice in the studio and diff the outputs.",
        tool: "Automation Studio",
      },
      {
        title: "Export and schedule it",
        detail:
          "Export the generated Python script into scripts/. Add the scheduling plan: cron line for 06:45 (15-min buffer before SLA), failure notification path, and the GitHub Actions YAML sketch for free scheduling.",
        hint: "schedule: '45 6 * * *' — and the workflow needs a failure branch that opens an issue or posts to Slack.",
        tool: "Automation Studio",
      },
      {
        title: "Document the runbook",
        detail:
          "Write the ops one-pager: what the pipeline does, where outputs land, the 5 gates, what each alert means, how to re-run manually, who to ping. A pipeline without a runbook is a 2am crisis waiting to happen.",
        hint: "Assume the reader is future-you, mildly panicked, at 6:55 with the CEO opening the dashboard at 7.",
        tool: "Automation Studio",
      },
    ],
    deliverables: [
      "pipeline_spec.md — sources, SLA, grain, stages, gates, failures",
      "scripts/pipeline.py — the generated, runnable pipeline",
      "scripts/schedule.yml — cron + GitHub Actions sketch",
      "data/mart_daily_region.csv — sample aggregated mart output",
      "runbook.md — ops one-pager",
      "README.md — design decisions and evidence",
    ],
    rubric: [
      "Spec written before building (sources, SLA, grain, gates)",
      "5 explicit quality gates with evidence from the run log",
      "Pipeline is idempotent (verified by double-run)",
      "Failure modes tested with real alert messages written",
      "Scheduling plan includes buffer before SLA",
      "Runbook readable by someone who has never seen the project",
    ],
    keyInsights: [
      "Volume gates catch broken exports that schema checks miss",
      "Idempotency is what makes cron safe",
      "Alerts with context (rows in/out) turn 2am pages into 2-minute fixes",
    ],
  },
  {
    id: "p6",
    folder: "06-hr-attrition-analysis",
    emoji: "👥",
    title: "HR Attrition Deep-Dive",
    company: "Vertex Manufacturing (420 employees, 220 surveyed)",
    scenario:
      "Vertex's HR director is alarmed: exit interviews cost $40k per senior replacement and attrition hit 18% this year. Leadership blames pay; HR suspects burnout. You have the employee survey: salary, tenure, performance, overtime hours, satisfaction scores, and who left. Settle the debate with data, segment by department, and hand HR a retention playbook with a target list.",
    problem:
      "Analyze the HR dataset: what actually predicts attrition (pay vs burnout vs tenure)? Which departments and segments are at highest risk, and what would a targeted retention program look like with a modeled cost/benefit?",
    level: "Advanced",
    hours: "4–6 h",
    skills: ["Segmentation", "Driver analysis", "Statistical comparison", "Risk scoring", "Cost/benefit modeling"],
    tools: ["Dashboard Studio", "Excel Studio", "Data Cleaner"],
    datasetId: "hr",
    steps: [
      {
        title: "Frame the debate as testable hypotheses",
        detail:
          "H1 (leadership): leavers have lower salaries than stayers, within department. H2 (HR): leavers show high overtime + low satisfaction. H3: attrition is concentrated in specific departments/tenure bands. Write expected patterns for each.",
        hint: "Within-department comparison matters — Engineering pays more than Support overall; raw averages would fake a pay effect.",
        tool: "Excel Studio",
      },
      {
        title: "Profile and segment the workforce",
        detail:
          "Attrition rate overall, by department, by role level, by tenure band (<1y, 1–3y, 3–6y, 6y+). Chart: attrition % by department (bar, sorted). The concentration IS the first finding.",
        hint: "Dashboard Studio: dimension=department, measure=COUNT with filter attrition=Yes, or compute rates in Excel first.",
        tool: "Dashboard Studio",
      },
      {
        title: "Test the pay hypothesis",
        detail:
          "Compare salaries of leavers vs stayers within each department (AVERAGEIFS with two conditions, or grouped means). If pay explains attrition, the gap shows inside departments. Quantify: average gap in $ and %.",
        hint: "SUMIFS(salary, dept, d, attrition, 'Yes')/COUNTIFS(...) per department — a small computed table beats a chart for this.",
        tool: "Excel Studio",
      },
      {
        title: "Test the burnout hypothesis",
        detail:
          "Scatter: overtime vs satisfaction, colored by attrition if possible. Then the money chart: attrition RATE by overtime band (0–5, 6–10, 11–15, 16+ hours) and by satisfaction band. Find the threshold where risk jumps.",
        hint: "Compute rate = leavers/total per band in Excel, then chart the rates. A cliff at 12+ overtime hours is the classic finding.",
        tool: "Excel Studio",
      },
      {
        title: "Cross the signals: the risk matrix",
        detail:
          "2×2: overtime (low/high) × satisfaction (low/high) → attrition rate in each quadrant. High-overtime + low-satisfaction should dominate. Count employees in each quadrant — that's the target population size.",
        hint: "COUNTIFS twice (leavers and total) per quadrant, then divide. Four numbers, one matrix, the whole story.",
        tool: "Excel Studio",
      },
      {
        title: "Build the risk-scored watchlist",
        detail:
          "Score each current employee: +2 if overtime >12, +2 if satisfaction <2.5, +1 if tenure 1–3y, +1 if below-department-median salary. Sort by score. Top 20 = the retention program's target list.",
        hint: "This is RFM thinking applied to people. Simple, transparent, defensible — no black box needed.",
        tool: "Excel Studio",
      },
      {
        title: "Model the retention program ROI",
        detail:
          "Cost: e.g. $2k/employee program (workload review + comp check-in) × 20 targets = $40k. Benefit: if it prevents even 4 exits of senior staff ($40k replacement cost each = $160k), ROI = 4×. State assumptions honestly.",
        hint: "Use a conservative save rate (20–30%). The point is the range, not a fake precise number.",
        tool: "Excel Studio",
      },
      {
        title: "Deliver the HR playbook",
        detail:
          "One-pager: verdict on H1/H2/H3 (with the numbers), the risk matrix chart, the watchlist approach, program ROI range, and 2 immediate actions (overtime audit in the hot department; manager check-ins for the watchlist).",
        hint: "BLUF: 'It's not pay alone — it's overtime × dissatisfaction, concentrated in X department. Here's the 20-person program.'",
        tool: "Dashboard Studio",
      },
    ],
    deliverables: [
      "analysis/hypothesis_tests.md — H1/H2/H3 verdicts with numbers",
      "analysis/risk_matrix.md — the 2×2 + watchlist method",
      "data/watchlist.csv — scored top-20 retention targets",
      "report/executive_summary.md — HR playbook with ROI model",
      "dashboard/dashboard.json — attrition dashboard",
      "README.md — problem, method, findings",
    ],
    rubric: [
      "Hypotheses stated with expected patterns BEFORE testing",
      "Pay compared within departments, not raw averages",
      "Attrition thresholds found (overtime band, satisfaction band)",
      "Risk matrix quantified with population sizes",
      "Watchlist scoring method transparent and reproducible",
      "ROI model with conservative assumptions and a range",
    ],
    keyInsights: [
      "Raw pay averages mislead — within-department gaps are the honest test",
      "Overtime × low satisfaction multiplies attrition risk beyond either alone",
      "A 20-person targeted program beats a company-wide 1% raise on ROI",
    ],
  },
  {
    id: "p7",
    folder: "07-capstone-end-to-end",
    emoji: "🏆",
    title: "Capstone: Support Ops End-to-End",
    company: "CloudServe (B2B SaaS, 150-ticket support sample)",
    scenario:
      "The final boss: CloudServe's COO wants a full analytics deliverable in one week — 'our support costs are climbing and CSAT is slipping; I need to know why and what to do, with the dashboard, the pipeline, and the numbers to defend it.' You will scope it (interviews → one-pager), build the pipeline, analyze drivers of resolution time and CSAT, deliver the dashboard, and present the recommendation. Everything you've learned, one project.",
    problem:
      "Deliver an end-to-end analytics project: scoping doc → cleaned data → pipeline → driver analysis → executive dashboard → BLUF recommendation with modeled impact. This is the portfolio centerpiece.",
    level: "Master",
    hours: "8–10 h",
    skills: ["Scoping", "Pipeline", "Driver analysis", "Dashboarding", "Executive communication", "Project delivery"],
    tools: ["All tools"],
    datasetId: "tickets",
    steps: [
      {
        title: "Scope it: the one-pager",
        detail:
          "Write the capstone one-pager: decision (where to invest support budget), deliverables (dashboard + memo), data (tickets dataset), timeline, risks (sample size, missing agent data). Simulate one stakeholder interview and log its 3 answers.",
        hint: "Use the 5 interview questions. The COO's fear metric is probably 'tickets breaching SLA' — ask.",
        tool: "Automation Studio",
      },
      {
        title: "Pipeline: ingest → validate → clean → mart",
        detail:
          "In Automation Studio, build the tickets pipeline with 3+ quality gates (volume vs prior period, no null ticket_id/category, resolution_hours within 0–168). Output the clean mart: tickets + derived fields (SLA breached flag, response-time band).",
        hint: "Derive: sla_breach = resolution_hours > 24 (state the assumption), fast_resp = first_response_hours < 1.",
        tool: "Automation Studio",
      },
      {
        title: "Analyze: where do time and CSAT die?",
        detail:
          "Resolution time by category and priority (grouped means). First-response vs resolution correlation. CSAT by response-speed band and by category. Escalation rate by category. Each analysis = one hypothesis with an expected pattern.",
        hint: "If fast first response correlates with high CSAT but resolution time doesn't — the story is 'feel fast early, then work it'.",
        tool: "Excel Studio",
      },
      {
        title: "Segment: the cost engine",
        detail:
          "Volume × avg resolution time per category = workload hours. Rank categories by workload, not by ticket count — the biggest COST category is often not the loudest one.",
        hint: "COUNTIFS × AVERAGEIFS per category. Bug Reports with 2× resolution time may beat Billing on hours despite fewer tickets.",
        tool: "Excel Studio",
      },
      {
        title: "Dashboard: the COO view",
        detail:
          "KPIs: CSAT, median resolution, SLA breach %, backlog trend. Charts: workload by category, CSAT by response band, escalation share. Insight titles on everything; filter by priority and category.",
        hint: "Median not mean for resolution times — outliers (that 168h ticket) destroy means.",
        tool: "Dashboard Studio",
      },
      {
        title: "Model the intervention",
        detail:
          "Pick the top lever (e.g. first-response automation for the worst CSAT category). Model: if response time drops 1h for 40% of tickets and that lifts CSAT 0.4, what does churn-cost avoidance return? Conservative base case + assumptions listed.",
        hint: "The chain: CSAT → renewal probability → revenue. Keep each link labeled as an assumption.",
        tool: "Excel Studio",
      },
      {
        title: "Present: the 60-second story",
        detail:
          "SCR + ask: 'Support is leaking X hours/quarter in [category]; first-response speed drives CSAT; automate triage for $Y → modeled +$Z renewal protection. Approve the pilot.' Rehearse aloud, timed.",
        hint: "If the 60-second version takes 90 seconds, cut adjectives, not numbers.",
        tool: "Dashboard Studio",
      },
      {
        title: "Package the portfolio centerpiece",
        detail:
          "Assemble everything: scoping doc, pipeline spec + script, analysis, dashboard JSON, memo, and a README with the KPI tree and metric definitions. Export the whole folder to GitHub — this repo IS your interview headline.",
        hint: "Order the README: decision → evidence → method → how to run. Executives read top-down; so do hiring managers.",
        tool: "Automation Studio",
      },
    ],
    deliverables: [
      "scoping/one_pager.md — decision, deliverables, risks",
      "pipeline_spec.md + scripts/pipeline.py — gated pipeline",
      "analysis/driver_analysis.md — hypotheses + verdicts",
      "analysis/workload_model.md — cost engine by category",
      "report/executive_summary.md — the BLUF memo",
      "dashboard/dashboard.json — COO dashboard",
      "README.md — KPI tree, definitions, how to run",
    ],
    rubric: [
      "Scoping one-pager exists and names the decision",
      "Pipeline has ≥3 quality gates with run-log evidence",
      "Every analysis step had a written hypothesis first",
      "Workload measured in hours (volume × time), not ticket counts",
      "Dashboard uses medians and insight titles",
      "60-second SCR story rehearsed with a quantified ask",
    ],
    keyInsights: [
      "Cost lives in workload hours — the quiet category with slow fixes",
      "First-response speed moves CSAT more than total resolution time",
      "Scoping before building halves the work and doubles the credibility",
    ],
  },
];

export function findProject(id: string) {
  return PROJECTS.find((p) => p.id === id);
}
