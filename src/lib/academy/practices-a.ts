// Practice labs — BEGINNER level (b1l1 … b5l4).

import type { Practice } from "./practices";

export const PRACTICES_A: Record<string, Practice> = {
  b1l1: {
    kind: "quiz",
    title: "The analyst's job, in practice",
    brief: "Day one at Northwind Retail. Before you touch a single tool, prove you understand what the job actually is.",
    questions: [
      {
        q: "The core skill loop you will repeat forever is:",
        options: [
          "Collect data → delete data → present slides",
          "Question → data → cleaning → analysis → recommendation",
          "Buy tools → build dashboards → wait",
          "Model → deploy → monitor",
        ],
        correct: 1,
        explain: "Everything starts from a business question and ends with a recommendation someone can act on. Cleaning sits in the middle — it is where most of the work happens.",
      },
      {
        q: "What share of real analyst time does cleaning usually take?",
        options: ["About 10%", "About 30%", "60–80%", "None — data always arrives clean"],
        correct: 2,
        explain: "Real-world data arrives with blanks, duplicates and mixed formats. Cleaning is 60–80% of the job — that is exactly why this academy invests so heavily in it.",
      },
      {
        q: "Which deliverable most often gets analysts promoted?",
        options: [
          "A 40-page technical appendix",
          "A one-page summary with 2–3 insights and ONE recommended action",
          "A dashboard with 30 charts",
          "The most complex model possible",
        ],
        correct: 1,
        explain: "Managers act on clarity. 'Revenue fell 12% in the South — recommend a supplier audit' changes decisions; 40-page appendices change nothing.",
      },
    ],
    hints: ["Re-read the five work buckets in the lesson — the loop is five steps long.", "Think about what a busy manager can actually act on."],
  },

  b1l2: {
    kind: "quiz",
    title: "Classify the analytics types",
    brief: "Brightlane Finance runs three new requests through triage. Label each one with its analytics type.",
    questions: [
      {
        q: "1) A dashboard showing weekly active users.",
        options: ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"],
        correct: 0,
        explain: "Describing what happened — the backbone of dashboards.",
      },
      {
        q: "2) A model predicting which subscribers will cancel next month.",
        options: ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"],
        correct: 2,
        explain: "Predicting what will happen — regression / ML territory.",
      },
      {
        q: "3) Investigating why returns doubled last month.",
        options: ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"],
        correct: 1,
        explain: "Drilling into why it happened — segmentation and drill-downs.",
      },
    ],
    hints: ["'What happened' = descriptive, 'why' = diagnostic, 'what next' = predictive, 'what should we do' = prescriptive.", "Value (and salary) rises with each type — but so does uncertainty."],
  },

  b1l3: {
    kind: "quiz",
    title: "How the business runs on data",
    brief: "You are the first analyst at a 40-person e-commerce brand. Show you know the recurring workflows.",
    questions: [
      {
        q: "CAC (customer acquisition cost) is calculated as:",
        options: [
          "Total marketing spend ÷ new customers acquired",
          "Revenue ÷ orders",
          "Profit ÷ employees",
          "Clicks ÷ impressions",
        ],
        correct: 0,
        explain: "You will compute this yourself in Project 6 — spend divided by the new customers it brought in.",
      },
      {
        q: "Where does a typical company's operational data actually live?",
        options: [
          "Only in modern data warehouses",
          "Transactional databases, SaaS exports — and lots of spreadsheets emailed around",
          "Faxes and paper only",
          "In the analyst's head",
        ],
        correct: 1,
        explain: "Every company still runs partly on Excel sent by email. Knowing how to pull from all these sources is a core skill.",
      },
      {
        q: "Which recurring workflow detects problems early by tracking revenue by region, product and channel?",
        options: ["Sales & revenue reporting", "HR analytics", "Bug triage", "Churn modelling"],
        correct: 0,
        explain: "Daily/weekly/monthly revenue reporting is the company's early-warning system — you build it in Project 2.",
      },
    ],
    hints: ["CAC is a marketing-metric formula — think 'spend per customer won'.", "The five workflows: sales reporting, customers, marketing, ops, finance."],
  },

  b1l4: {
    kind: "quiz",
    title: "Your roadmap, memorised",
    brief: "Knowing the destination makes every lesson click. Check you can navigate the path.",
    questions: [
      {
        q: "The four levels of this path, in order:",
        options: [
          "Foundations → Core toolkit → Analyst-engineer → Master",
          "Master → Foundations → Core toolkit → Analyst-engineer",
          "Excel → Python → SQL → BI",
          "Whatever order feels right",
        ],
        correct: 0,
        explain: "Literacy first, then the #1 interview skill (SQL), then building data products, then leading and delivering.",
      },
      {
        q: "Rule #1 that makes this path work:",
        options: [
          "Watch videos passively",
          "Projects over videos — employers hire evidence, not certificates",
          "Memorise as many formulas as possible",
          "Collect certificates",
        ],
        correct: 1,
        explain: "After each module you produce real work. Your Workspace folder is built to become your public GitHub portfolio.",
      },
      {
        q: "Where should everything you build go?",
        options: ["A drawer on your desktop", "GitHub — public, from day one", "Nowhere — keep it private forever", "A USB stick"],
        correct: 1,
        explain: "The GitHub tab exports your work with one click. Recruiters browse repos, not certificates.",
      },
    ],
    hints: ["Weeks 1–4 foundations, 5–10 toolkit, 11–18 analyst-engineer, 19–26 master.", "Open the Projects tab after this lesson — Project 1 is the destination of the beginner level."],
  },

  b2l1: {
    kind: "quiz",
    title: "Tables, keys and grain",
    brief: "New hire orientation at SwiftCart: prove you can read any table thrown at you.",
    questions: [
      {
        q: "The 'grain' of a table answers:",
        options: ["One row = one what?", "How many columns it has", "How big the file is", "How many tables exist"],
        correct: 0,
        explain: "Before ANY analysis, state the grain: 'one row = one order-line' vs 'one row = one customer' changes every total you compute.",
      },
      {
        q: "A primary key must be:",
        options: [
          "Unique and non-empty for every row",
          "Always the first column",
          "Always named 'id' and numeric",
          "Sorted ascending",
        ],
        correct: 0,
        explain: "Uniqueness is the definition — the name and position are conventions, not rules.",
      },
      {
        q: "customers 1—* orders means:",
        options: [
          "One customer can place many orders",
          "One order can belong to many customers",
          "Customers and orders are unrelated",
          "Every customer has exactly one order, ever",
        ],
        correct: 0,
        explain: "The * side holds the foreign key (orders.customer_id points at customers.id). This is the join you'll write a thousand times.",
      },
    ],
    hints: ["Grain = the thing one row represents.", "Foreign keys always live on the 'many' side."],
  },

  b2l2: {
    kind: "quiz",
    title: "Data types & formats",
    brief: "A vendor CSV just landed in your inbox. Predict what will break before you even open it.",
    questions: [
      {
        q: "'2025-03-14' is best stored as:",
        options: ["Plain text", "A proper date type", "A number", "A boolean"],
        correct: 1,
        explain: "With a real date type you get sorting, filtering, month extraction and date arithmetic for free. Text dates give you nothing.",
      },
      {
        q: "Which is the lean, universal format for exchanging tabular data?",
        options: ["CSV", "A photo of the table", "PDF", "DOCX"],
        correct: 0,
        explain: "CSV loads everywhere — pandas, Excel, SQL importers, Power BI. It is the lingua franca of data work.",
      },
      {
        q: "A price stored as the text '$1,234.50' will break:",
        options: ["Arithmetic like SUM", "Nothing at all", "Only sorting, never sums", "Only filters"],
        correct: 0,
        explain: "Text that looks like a number is the classic silent killer — SUM treats it as 0 or errors. Strip $ and commas, then convert.",
      },
    ],
    hints: ["Dates as text can't be subtracted or grouped by month.", "If SUM returns 0 on a column that looks numeric — you have text-numbers."],
  },

  b2l3: {
    kind: "quiz",
    title: "Structured vs unstructured",
    brief: "Sort the incoming work at Cedar Health into what loads straight into a table and what needs extra work.",
    questions: [
      {
        q: "Which of these is UNSTRUCTURED data?",
        options: ["An orders table", "A CSV of clicks", "A folder of support-call recordings", "A products list"],
        correct: 2,
        explain: "Audio/video/free text has no rows or columns — it needs transcription or NLP before it can join a table.",
      },
      {
        q: "A tidy table has:",
        options: [
          "One variable per column, one observation per row",
          "Merged headline rows across the top",
          "Colour-coded cells for meaning",
          "A different layout on every sheet",
        ],
        correct: 0,
        explain: "Tidy data is what makes filters, pivots and models work without re-writing everything first.",
      },
      {
        q: "What usually needs cleaning before analysis?",
        options: [
          "Only data exported by other teams",
          "Nearly everything — including database exports",
          "Nothing, all data arrives clean",
          "Only data from databases",
        ],
        correct: 1,
        explain: "Even system exports carry blanks, duplicates and mixed formats. Profile first, always.",
      },
    ],
    hints: ["If it has no inherent rows/columns, it's unstructured.", "The Data Cleaner tab exists precisely because 'nearly everything' is the right answer."],
  },

  b2l4: {
    kind: "quiz",
    title: "Grain & quality in action",
    brief: "The messy Retail Sales file is about to hit your desk. Show you'd catch the quality traps before totalling anything.",
    questions: [
      {
        q: "order_items with one row per product per order has the grain:",
        options: ["One row = one order-line", "One row = one customer", "One row = one month", "One row = one company"],
        correct: 0,
        explain: "An order with 3 products appears as 3 rows. Summing order-level totals per row would double-count the order.",
      },
      {
        q: "Summing revenue on a table that contains duplicate rows gives:",
        options: ["Inflated totals", "Correct totals", "Zero", "Averages"],
        correct: 0,
        explain: "Duplicates are the quietest way to report numbers that never happened. Dedupe before you total.",
      },
      {
        q: "Which of these is a data-QUALITY check?",
        options: [
          "Are there blanks in customer_id?",
          "Is the logo centred?",
          "Is the font Calibri?",
          "Is the sheet named nicely?",
        ],
        correct: 0,
        explain: "Quality = completeness, uniqueness, validity, consistency. Blanks in a key column break every join downstream.",
      },
    ],
    hints: ["Match the grain before aggregating.", "Quality checks are about the DATA, never the formatting."],
  },

  b3l1: {
    kind: "excel",
    title: "Your first formulas, live",
    brief: "Excel Studio — Retail Sales 2025 is loaded in the lab. Write the three formulas every analyst types in week one.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Total units sold — column G holds units.", cell: "M1", solution: "=SUM(G2:G199)", hint: "SUM adds a whole range: =SUM(G2:G199)." },
      { prompt: "Average order revenue — column I holds revenue.", cell: "M2", solution: "=ROUND(AVERAGE(I2:I199),2)", hint: "AVERAGE(I2:I199) then wrap in ROUND(...,2)." },
      { prompt: "Biggest single order (highest revenue).", cell: "M3", solution: "=MAX(I2:I199)", hint: "MAX finds the largest value in a range." },
    ],
    hints: ["Every formula starts with = — no exceptions.", "Ranges are written start:end, like G2:G199.", "Type in the answer boxes below; the engine checks against real data."],
    functions: ["SUM", "AVERAGE", "MAX", "ROUND"],
  },

  b3l2: {
    kind: "excel",
    title: "The four numbers every manager asks for",
    brief: "Your manager pings: 'total revenue, average unit price, biggest order, and how many orders went over $500.' Four cells, four formulas.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Total revenue (column I).", cell: "M1", solution: "=SUM(I2:I199)", hint: "One SUM over I2:I199." },
      { prompt: "Average unit price (column H), rounded to 2 decimals.", cell: "M2", solution: "=ROUND(AVERAGE(H2:H199),2)", hint: "AVERAGE(H2:H199) inside ROUND(...,2)." },
      { prompt: "How many orders have revenue over 500?", cell: "M3", solution: "=COUNTIF(I2:I199,\">500\")", hint: "COUNTIF takes a range and a criteria string: \">500\"." },
      { prompt: "Largest single order revenue.", cell: "M4", solution: "=MAX(I2:I199)", hint: "MAX again — it is that useful." },
    ],
    hints: ["COUNTIF's criteria is TEXT even when it means a number: \">500\".", "Nest AVERAGE inside ROUND to control decimals.", "Check your column letters: H = unit_price, I = revenue."],
    functions: ["SUM", "AVERAGE", "COUNTIF", "MAX", "ROUND"],
  },

  b3l3: {
    kind: "excel",
    title: "Prove what the filter would show",
    brief: "Sorting and filtering are clicks; the professional move is confirming them with formulas. Replicate the filter results with SUMIF/COUNTIF.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Revenue from the East region only (column D = region).", cell: "M1", solution: "=SUMIF(D2:D199,\"East\",I2:I199)", hint: "SUMIF(range, criteria, sum_range): =SUMIF(D2:D199,\"East\",I2:I199)." },
      { prompt: "How many orders your 'highlight over 800' rule would catch.", cell: "M2", solution: "=COUNTIF(I2:I199,\">800\")", hint: "COUNTIF(I2:I199,\">800\")." },
      { prompt: "The value sorting revenue descending would put first.", cell: "M3", solution: "=MAX(I2:I199)", hint: "Sorted descending, the first value is the MAX." },
    ],
    hints: ["SUMIF's first argument is what you test (region), the last is what you add (revenue).", "Text criteria needs quotes: \"East\".", "Sorting descending puts MAX first — same answer, different route."],
    functions: ["SUMIF", "COUNTIF", "MAX"],
  },

  b3l4: {
    kind: "quiz",
    title: "Choose the chart",
    brief: "SwiftCart's marketing lead sends four questions. Pick the chart that answers each one honestly.",
    questions: [
      {
        q: "Monthly revenue over the last 2 years — you want to show the trend.",
        options: ["Line chart", "Pie chart", "Map", "A wall of numbers"],
        correct: 0,
        explain: "Time on the x-axis, lines for continuity — trends are what lines are FOR.",
      },
      {
        q: "Revenue by region (4 regions) — you want to compare sizes.",
        options: ["Bar chart sorted descending", "3D pie", "Radar chart", "Scatter"],
        correct: 0,
        explain: "Few categories + comparison = horizontal bars, sorted. Instantly readable.",
      },
      {
        q: "Why is a 14-slice pie a bad idea?",
        options: [
          "Human eyes can't compare 14 angles — slices become unreadable; use a bar",
          "Pies are always wrong for everything",
          "14 is an unlucky number",
          "Colours run out",
        ],
        correct: 0,
        explain: "Pies work with ≤5 slices sharing an obvious whole. Beyond that, bars beat angles every time.",
      },
    ],
    hints: ["Trend → line. Comparison → bar. Part-of-whole (few slices) → pie. Relationship → scatter.", "If you must squint, the chart failed."],
  },

  b3l5: {
    kind: "excel",
    title: "Build the pivot's logic with formulas",
    brief: "Before trusting any pivot, build it once by hand. Compute the 'region × category' view the lesson's pivot shows.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Revenue for the North region.", cell: "M1", solution: "=SUMIF(D2:D199,\"North\",I2:I199)", hint: "SUMIF over region = \"North\", summing revenue." },
      { prompt: "Number of Furniture orders (column E = category).", cell: "M2", solution: "=COUNTIF(E2:E199,\"Furniture\")", hint: "COUNTIF(E2:E199,\"Furniture\")." },
      { prompt: "Average revenue of Electronics orders (2 decimals).", cell: "M3", solution: "=ROUND(AVERAGEIF(E2:E199,\"Electronics\",I2:I199),2)", hint: "AVERAGEIF(range, criteria, average_range) is the averaging twin of SUMIF." },
    ],
    hints: ["A pivot is grouped SUMIF/COUNTIF logic with a nicer interface.", "AVERAGEIF works exactly like SUMIF but averages.", "Column E is category, D is region."],
    functions: ["SUMIF", "COUNTIF", "AVERAGEIF"],
  },

  b4l1: {
    kind: "excel",
    title: "Mean vs median on real orders",
    brief: "Compute both on actual revenue data, then decide which one you'd report — and why.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Mean revenue (2 decimals).", cell: "M1", solution: "=ROUND(AVERAGE(I2:I199),2)", hint: "AVERAGE(I2:I199)." },
      { prompt: "Median revenue (2 decimals).", cell: "M2", solution: "=ROUND(MEDIAN(I2:I199),2)", hint: "MEDIAN(I2:I199)." },
      { prompt: "Which is higher? Type \"mean\" or \"median\" (build it with a formula!).", cell: "M3", solution: "=IF(AVERAGE(I2:I199)>MEDIAN(I2:I199),\"mean\",\"median\")", hint: "IF(test, value_if_true, value_if_false) can compare the two and return the word itself." },
    ],
    hints: ["A few big orders pull the MEAN up; the median resists outliers.", "The gap between mean and median tells you how skewed the data is.", "Task 3 can be a real IF formula, not a guess."],
    functions: ["AVERAGE", "MEDIAN", "IF"],
  },

  b4l2: {
    kind: "excel",
    title: "Spread & the 2-sigma rule",
    brief: "Averages hide risk. Compute the spread of revenue and the price threshold beyond which a product counts as 'unusual'.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Standard deviation of revenue (2 decimals).", cell: "M1", solution: "=ROUND(STDEV(I2:I199),2)", hint: "STDEV(I2:I199) — sample standard deviation." },
      { prompt: "'Unusual' price threshold: mean unit_price + 2 × its std dev (2 decimals).", cell: "M2", solution: "=ROUND(AVERAGE(H2:H199)+2*STDEV(H2:H199),2)", hint: "AVERAGE(H2:H199)+2*STDEV(H2:H199), wrapped in ROUND." },
      { prompt: "Range of revenue (max − min).", cell: "M3", solution: "=MAX(I2:I199)-MIN(I2:I199)", hint: "MAX minus MIN in one formula." },
    ],
    hints: ["±2σ covers ~95% of a normal distribution — beyond that is 'unusual'.", "MIN exists too — pair it with MAX for the range.", "Wrap the whole arithmetic in ROUND(...,2)."],
    functions: ["STDEV", "AVERAGE", "MAX", "MIN", "ROUND"],
  },

  b4l3: {
    kind: "clean",
    title: "Signal or noise? Judge the outliers",
    brief: "The messy Retail Sales file has planted problems. For each one, call the right play — deleting signal is as bad as keeping noise.",
    dataset: "messy_sales",
    issues: [
      {
        situation: "A row has unit_price = -12.50 — a negative price.",
        options: [
          "Keep it — revenue can be negative sometimes",
          "Treat as an ERROR: a price cannot be negative — fix or remove the row",
          "Multiply the whole column by -1",
          "Change it to 0 and move on",
        ],
        correct: 1,
        explain: "Negative prices corrupt every total. Real refunds are usually separate records — a negative unit price is a data-entry error, not signal.",
      },
      {
        situation: "One order shows units = 0 but revenue > 0.",
        options: [
          "Perfectly normal",
          "ERROR: revenue without units breaks price × units logic — investigate the source",
          "Delete all zero rows in the whole dataset",
          "Set revenue to 0 too",
        ],
        correct: 1,
        explain: "Units=0 with revenue>0 is internally contradictory. Fix the source or null it out — never let contradictory rows into totals.",
      },
      {
        situation: "One wholesale order is $9,800 while 99% of orders are under $1,500.",
        options: [
          "Delete it immediately — it's an outlier",
          "VERIFY first: it may be a genuine bulk buyer (signal). Confirm with the business before removing",
          "Average it away",
          "Round it down to 1,500",
        ],
        correct: 1,
        explain: "Outliers are either errors or your most interesting customers. The IQR rule flags them; only business context decides delete vs keep.",
      },
    ],
    hints: ["Impossible values (negative prices) are always errors.", "Contradictory values (units=0, revenue>0) are errors.", "Unusual-but-possible values deserve verification, not deletion."],
  },

  b4l4: {
    kind: "quiz",
    title: "Correlation is not causation",
    brief: "Marketing wants to claim 'ads drive revenue'. Keep them honest.",
    questions: [
      {
        q: "Ice-cream sales correlate strongly with drowning deaths. The explanation:",
        options: ["A confounder: hot weather drives both", "Ice cream is dangerous", "Pure causation", "A data error"],
        correct: 0,
        explain: "A third variable (temperature) moves both. Confounders are THE reason correlation ≠ causation.",
      },
      {
        q: "Spend and revenue correlate at r = 0.98. What can you claim?",
        options: [
          "Strong association — but not proof that spend causes revenue",
          "Spend causes revenue with certainty",
          "Nothing at all",
          "Revenue causes spend",
        ],
        correct: 0,
        explain: "r measures co-movement. Causation requires experiments or careful controls — a 0.98 correlation alone is a hypothesis, not a verdict.",
      },
      {
        q: "Best first step before claiming 'spend drives revenue'?",
        options: [
          "Segment per channel and control for seasonality / confounders",
          "Delete the low months",
          "Make the chart bigger",
          "Assume causation and tell the CEO",
        ],
        correct: 0,
        explain: "You'll compute per-channel correlations yourself later. Controls and segmentation are how analysts earn causal claims.",
      },
    ],
    hints: ["Always ask: what ELSE moves both of these variables?", "r measures association strength (−1 to +1), never cause."],
  },

  b5l1: {
    kind: "quiz",
    title: "Vague asks → measurable questions",
    brief: "Three managers, three foggy requests. Turn each into a question data can actually answer.",
    questions: [
      {
        q: "'Is the new website good?' becomes:",
        options: [
          "What is signup conversion before vs after the redesign, per device?",
          "It's good",
          "It's bad",
          "Make it pop more",
        ],
        correct: 0,
        explain: "A metric (conversion), a comparison (before/after) and a segment (device) — now it's answerable.",
      },
      {
        q: "'We need more sales' first becomes:",
        options: [
          "Which channel or segment is underperforming vs target?",
          "Sell more",
          "Discount everything",
          "Run more ads everywhere",
        ],
        correct: 0,
        explain: "'More sales' hides a dozen levers. Finding the underperformer turns a wish into an analysis.",
      },
      {
        q: "A good data question always has:",
        options: ["A metric, a segment, and a comparison", "Vibes", "At least 40 KPIs", "No baseline needed"],
        correct: 0,
        explain: "Metric + segment + comparison is the anatomy of every question worth querying.",
      },
    ],
    hints: ["Good = measurable, comparable, segmented.", "If you can't say what number would change your mind, it's not a data question yet."],
  },

  b5l2: {
    kind: "quiz",
    title: "KPIs that survive contact with reality",
    brief: "HR's director asks what you'd track monthly. Prove you know what makes a KPI real.",
    questions: [
      {
        q: "AOV (average order value) is:",
        options: ["Revenue ÷ number of orders", "Revenue × orders", "Orders ÷ customers", "Profit ÷ revenue"],
        correct: 0,
        explain: "AOV = total revenue / order count. It is the KPI every retail dashboard opens with.",
      },
      {
        q: "Monthly attrition rate for HR is:",
        options: [
          "Employees who left ÷ average headcount that month",
          "Hires ÷ employees who left",
          "Total salaries ÷ 12",
          "Vacation days used ÷ 30",
        ],
        correct: 0,
        explain: "Leavers over average headcount — you'll compute exactly this on the HR dataset in the projects.",
      },
      {
        q: "A KPI is only real when it has:",
        options: ["An owner, a target, and a review cadence", "A rainbow colour scheme", "No written definition", "A monthly surprise"],
        correct: 0,
        explain: "Owner (who acts), target (what is good), cadence (when we look). Miss one and the KPI is decoration.",
      },
    ],
    hints: ["Every KPI needs a decision attached — what would we DO if it moved?", "Formulas first: AOV and attrition both have one 'right' definition."],
  },

  b5l3: {
    kind: "quiz",
    title: "Hypotheses you can test",
    brief: "Convert three vague complaints into hypotheses you could actually confirm or refute with data.",
    questions: [
      {
        q: "Which is a proper, testable hypothesis?",
        options: [
          "'Support tickets resolve slower after the new queue — median resolution went from 2.1 to 3.4 days'",
          "'Support feels slow'",
          "'Everything is broken'",
          "'Users hate us'",
        ],
        correct: 0,
        explain: "Specific mechanism + direction + measurable quantity. You can pull the data and check it today.",
      },
      {
        q: "To test 'pricing hurts sales' you would:",
        options: [
          "Compare conversion across price tiers / before-vs-after price changes",
          "Ask your cousin",
          "Redesign the logo",
          "Look at the font on the pricing page",
        ],
        correct: 0,
        explain: "Hypotheses are settled by comparisons the data supports — tiers, periods, segments.",
      },
      {
        q: "Immediately after forming a hypothesis you:",
        options: [
          "Define the data and metric that would confirm or refute it",
          "Publish it company-wide",
          "Delete the raw data",
          "Wait for someone else to check",
        ],
        correct: 0,
        explain: "A hypothesis without a falsification plan is just an opinion with confidence.",
      },
    ],
    hints: ["Testable = specific metric + direction + population.", "Next step is always 'what data would change my mind?'"],
  },

  b5l4: {
    kind: "quiz",
    title: "The walkthrough, recap",
    brief: "You just completed your first end-to-end analysis. Lock in the sequence and the quality bar.",
    questions: [
      {
        q: "The 5-step order of your first analysis was:",
        options: [
          "Question → data → clean → analyse → recommend",
          "Analyse → question → clean → data → recommend",
          "Recommend → clean → question → analyse → data",
          "Data → plot → pray",
        ],
        correct: 0,
        explain: "This loop is the muscle memory of the whole job — every tool here maps to one step.",
      },
      {
        q: "The '10-second test' on a chart asks:",
        options: [
          "Can a stranger state the insight within 10 seconds?",
          "Does it animate nicely?",
          "Is it 3D?",
          "Does it fill the slide?",
        ],
        correct: 0,
        explain: "If the takeaway isn't visible in 10 seconds, redesign — clearer title, sorting, or fewer elements.",
      },
      {
        q: "Your first analysis deliverable should be:",
        options: [
          "One insight + one recommended action",
          "50 charts for everyone to explore",
          "A 60-page deck",
          "Nothing — wait for perfect data",
        ],
        correct: 0,
        explain: "One sharp insight with an action beats a hundred unfocused charts. Depth comes with practice.",
      },
    ],
    hints: ["The loop order never changes.", "Deliverables are decisions, not artifacts."],
  },
};
