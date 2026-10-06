// Curriculum part A: Beginner + Intermediate levels.
// Content syntax: **bold**, ~inline code~, "- " bullets, "~~~" code fences, "> " callouts.

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  content: string;
  takeaways: string[];
  practice?: string;
}

export interface Module {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
}

export interface PathLevel {
  id: string;
  title: string;
  tagline: string;
  duration: string;
  modules: Module[];
  outcomes: string[];
}

const beginner: PathLevel = {
  id: "beginner",
  title: "Beginner — Foundations",
  tagline: "Zero to confident: what analytics is, how data works, and your first spreadsheets & charts.",
  duration: "Weeks 1–4",
  outcomes: [
    "Explain what analysts do and the 4 types of analytics",
    "Read and question any dataset (types, keys, granularity)",
    "Build spreadsheets with formulas, filters, pivots and charts",
    "Compute and interpret mean/median/spread correctly",
    "Turn a vague business question into a measurable one",
  ],
  modules: [
    {
      id: "b1",
      title: "Data Analytics 101",
      summary: "What the job really is, the four types of analytics, and how companies turn data into money.",
      lessons: [
        {
          id: "b1l1",
          title: "What Data Analysts Actually Do",
          minutes: 8,
          content: `A data analyst sits between **raw data** and **business decisions**. Companies generate millions of rows — orders, clicks, salaries, tickets — and someone has to turn that noise into answers like "which region is losing money?" or "why did churn jump last month?"

Your day-to-day work falls into five buckets:

- **Request intake** — a manager asks a question; you clarify what decision it supports and what numbers would settle it.
- **Data pull** — you get the data with SQL, exports, or APIs, from warehouses like BigQuery/Snowflake or plain CSVs.
- **Cleaning** — 60–80% of real analyst time. Fixing duplicates, blanks, mixed formats before any analysis.
- **Analysis & visuals** — aggregations, pivots, charts, dashboards (Excel, Power BI, Tableau, Python).
- **Communication** — a one-page summary with 2–3 insights and a recommended action. **This is the part that gets analysts promoted.**

> REAL WORLD: A retail analyst is asked "are discounts working?" They pull 90 days of transactions, clean it, compare margin on discounted vs full-price orders by category, and discover discounts raise volume 8% but cut margin 22% — a loss. That one slide changes pricing strategy.

The core skill loop you will repeat forever: **question → data → cleaning → analysis → recommendation**. Every tool in this academy maps to one step of that loop.`,
          takeaways: [
            "Analysts convert raw data into decisions, not just charts",
            "Cleaning is 60–80% of the job — embrace it",
            "Communication of ONE clear recommendation is the highest-value step",
          ],
          practice: "Pick any app you used today. Write down 3 business questions its company probably asks (e.g. Spotify: which playlists get skipped fastest?).",
        },
        {
          id: "b1l2",
          title: "The 4 Types of Analytics",
          minutes: 7,
          content: `Every analytics task you will ever do fits into one of four escalating types. Know them — interviewers love this question.

- **Descriptive — "What happened?"** Monthly revenue, ticket counts, sales by region. The backbone of dashboards. Tools: SQL, Excel, Power BI.
- **Diagnostic — "Why did it happen?"** Revenue dropped 12% — drill down: which region, which product, which channel? Techniques: drill-downs, segmentation, correlation.
- **Predictive — "What will happen?"** Forecast next-quarter demand, predict churn probability. Techniques: regression, time-series, ML. Tools: Python, statistics.
- **Prescriptive — "What should we do?"** Which customers should get a retention offer? How much stock to reorder? Optimization and scenario analysis.

The value (salary) curve rises with each type, but so does uncertainty. A senior analyst is not someone who only does predictive ML — it is someone who does **descriptive work so reliably that leadership trusts their numbers**, then earns the right to predict.

> TIP: When you get any task, silently label it: "this is diagnostic". It tells you which tools and how much rigor the answer needs, and it stops you from over-engineering (building an ML model when a GROUP BY would do).`,
          takeaways: [
            "Descriptive → Diagnostic → Predictive → Prescriptive",
            "Most day-one jobs are descriptive + diagnostic — master them first",
            "Label every task by type to pick the right rigor",
          ],
          practice: "Classify these: 1) A dashboard of weekly active users. 2) A model predicting which subscribers will cancel. 3) Investigating why returns doubled. (Answers: descriptive, predictive, diagnostic)",
        },
        {
          id: "b1l3",
          title: "How Companies Actually Use Data",
          minutes: 9,
          content: `Real companies run on a handful of recurring analytic workflows. If you can do these five, you can do the job.

- **Sales & revenue reporting** — daily/weekly/monthly revenue by region, product, channel. Detects problems early. You will build this in Project 2.
- **Customer analysis** — who buys, what is our repeat rate, which segment is most profitable (RFM, cohorts — Level: Master).
- **Marketing attribution** — which channel brings customers at acceptable cost. CAC = total spend ÷ new customers. You will compute this in Project 6.
- **Operations & supply** — stock-outs, delivery times, support backlog. The HR and ticket datasets here simulate this.
- **Finance & cost control** — margins, burn rate, budget vs actual.

Where does data live? **Transactional databases** (orders, users — created by the app), **SaaS exports** (Salesforce, Stripe, ad platforms — usually CSV), **event streams** (clicks), and **spreadsheets** (yes, still — every company runs partly on Excel sent by email).

> REAL WORLD: A 40-person e-commerce brand typically has one analyst producing: a KPI dashboard (revenue, orders, CAC, return rate), a weekly ops report, and ad-hoc questions ("should we drop this supplier?"). That analyst is more valuable than their salary suggests — because decisions without them are guesses.`,
          takeaways: [
            "Five recurring workflows: sales reporting, customers, marketing, ops, finance",
            "Data lives in databases, SaaS exports, events — and lots of spreadsheets",
            "One analyst owning these workflows is a company's decision safety-net",
          ],
          practice: "Choose a store you know. List its 4 most important metrics and what decision each one drives.",
        },
        {
          id: "b1l4",
          title: "Your 6-Month Roadmap",
          minutes: 6,
          content: `Here is the exact path this academy takes you through, and how it maps to what employers ask for.

- **Weeks 1–4 · Foundations (this level)** — data literacy, Excel, statistics basics. Outcome: you can explore any spreadsheet without fear.
- **Weeks 5–10 · Core toolkit** — SQL (the #1 interview skill), data cleaning, visualization, BI tool thinking, advanced spreadsheet work. Outcome: junior-analyst ready.
- **Weeks 11–18 · Analyst-engineer** — Python/pandas, statistics & A/B testing, ETL pipelines, automation, warehouse modeling. Outcome: you build data products, not just reports.
- **Weeks 19–26 · Master** — capstone scoping, cohort/RFM analytics, analytics engineering (Git, dbt, tests), executive communication, portfolio & interviews.

Rules that make this work:

1. **Projects over videos.** After each module, do the linked project. Employers hire evidence, not certificates.
2. **One tool per week, then combine.** Shallow on five tools beats deep on none — but only if you can chain them: SQL → clean → dashboard → automate.
3. **Export everything to GitHub.** Your workspace folder here is built to become your public portfolio.

> TIP: Bookmark the Projects tab. It contains 7 real company scenarios (retail cleaning, executive dashboard, ETL pipeline...) — finishing all 7 in order IS the course.`,
          takeaways: [
            "4 levels: Foundations → Core toolkit → Analyst-engineer → Master",
            "Projects are the proof; do every one in order",
            "GitHub portfolio from day one, not at the end",
          ],
          practice: "Open the Projects tab and read Project 1's brief. Knowing the destination makes the first lessons click.",
        },
      ],
    },
    {
      id: "b2",
      title: "Data Fundamentals",
      summary: "Tables, keys, data types, file formats, granularity — the vocabulary every tool assumes you know.",
      lessons: [
        {
          id: "b2l1",
          title: "Tables, Rows, Columns & Keys",
          minutes: 8,
          content: `Nearly all business data is stored as **tables**. A table has **columns** (fields — what kind of thing: price, date, region) and **rows** (records — one instance: one order, one employee).

**Keys** make tables trustworthy:

- **Primary key** — a column (or combo) that uniquely identifies each row: ~order_id~. If two rows share it, something is broken (a duplicate).
- **Foreign key** — a column pointing at another table's primary key: ~orders.customer_id~ → ~customers.id~. This is how tables connect.
- **Composite key** — uniqueness from two columns together, e.g. (student, course).

Why you must care: every JOIN you write, every duplicate you remove, every dashboard total that "looks wrong" traces back to key logic. Before analyzing any dataset, ask: **"What is one row here?"** (one order? one order-line? one customer?) — that question is called identifying the **grain**, and it is the single most important habit in analytics.

> TIP: In the SQL Playground, run ~SELECT * FROM orders LIMIT 5~ and identify: primary key, foreign key, grain. Do it for all 5 tables — takes 3 minutes and locks the concept in.`,
          takeaways: [
            "Rows = records, columns = fields; ask 'what is one row?' first",
            "Primary key guarantees uniqueness; foreign keys connect tables",
            "Duplicate keys = broken data, and the source of many 'wrong totals' bugs",
          ],
          practice: "In the Cleaner tool, load the messy sales dataset and try to identify its grain before cleaning anything.",
        },
        {
          id: "b2l2",
          title: "Data Types & File Formats",
          minutes: 8,
          content: `Every column has a **type**, and mixing types silently breaks analysis.

- **Text (string)** — names, categories, IDs. Even ~"ORD-1001"~ is text because of the prefix.
- **Number (integer / decimal)** — quantities and measures you will SUM or AVERAGE.
- **Date/Datetime** — deceptively hard: ~2024-07-15~, ~15/07/2024~, ~July 15, 2024~ are all dates to a human, not to software.
- **Boolean** — Yes/No, true/false.
- **Currency** — a number with formatting; beware ~"$1,200.50"~ which is *text* because of ~$~ and the comma.

Common formats you will meet:

- **CSV** — plain text, one row per line, comma-separated. Universal, human-readable, no types — everything is text until you declare otherwise. The lingua franca of data exchange.
- **Excel (.xlsx)** — cells, formulas, multiple sheets. Great for humans, risky as a data source (hidden cells, merged headers).
- **JSON** — nested key-value format, standard for APIs.
- **Parquet** — compressed columnar file; what warehouses export for speed.

> REAL WORLD: A classic failure: revenue stored as text because someone typed $ signs. ~SUM~ returns 0, the dashboard shows zero revenue, leadership panics. The fix is one type conversion — but only if you *check types first*. The Cleaner tool flags exactly this.`,
          takeaways: [
            "Check every column's type before analyzing — text-numbers are the #1 trap",
            "Dates come in a dozen formats; normalize early",
            "CSV = universal exchange format; Excel = human layer, not a data source of truth",
          ],
          practice: "Load the messy dataset in the Cleaner tool and count how many columns have type problems.",
        },
        {
          id: "b2l3",
          title: "Structured vs Unstructured Data",
          minutes: 6,
          content: `**Structured data** fits rows and columns: orders, employees, payments. It is what 90% of analyst work consumes — SQL, Excel, and BI tools all assume it.

**Semi-structured** data has structure but not a rigid table: JSON from an API (~{"user": {"id": 7, "orders": [...]}}~), event logs. You flatten (parse) it into tables to analyze.

**Unstructured** data has no inherent tabular shape: emails, PDFs, chat transcripts, images, review text. Traditional analysis extracts features from it first (sentiment score, category, word counts) — often via AI these days — and then the *result* becomes structured.

Why this matters to a beginner:

- You will be handed "exports" that claim to be tables but are actually reports formatted for humans (merged cells, subtotals inside the data). Your first real job is often converting these into clean structured tables.
- Know that when a stakeholder says "can you analyze the customer emails?", the honest answer is: "I can analyze structured fields *about* them (dates, categories, scores); text mining is possible but different work."

> TIP: The discipline of this course — one header row, one record per row, no merged cells — is exactly what makes data *structured*. The Cleaner tool's tidy rules enforce it.`,
          takeaways: [
            "Structured = rows/columns; analysts live here",
            "JSON/logs need flattening before analysis",
            "Reports formatted for humans are NOT datasets — restructure first",
          ],
          practice: "Find one messy table in your life (bank export, class sheet). What makes it unstructured or untidy?",
        },
        {
          id: "b2l4",
          title: "Granularity & Data Quality",
          minutes: 8,
          content: `**Granularity (grain)** = what one row represents. Order-line grain (one product within one order) vs order grain vs daily-summary grain give different row counts for the same business — and SUM(revenue) triples if you accidentally mix them.

The 6 dimensions of **data quality** you will hunt for your whole career:

- **Completeness** — missing values: blank emails, empty revenue cells.
- **Validity** — values in allowed form: age 250, negative prices, dates like 2024-13-45.
- **Consistency** — same fact same way: "North", "NORTH", "north " are three regions to software.
- **Uniqueness** — no duplicated records.
- **Accuracy** — does it match reality? (Needs a source of truth or sample check.)
- **Timeliness** — is it fresh enough for the decision?

A quick **data profile** before any analysis: row count, column count, per-column type, missing counts, distinct counts, min/max. It takes 5 minutes and catches 80% of surprises. The Cleaner tool automates exactly this.

> REAL WORLD: An analyst summed revenue over order-line data twice (once for the report, once after a re-join) and reported 2× revenue to the board. The grain question — "what is one row *in this query*?" — would have caught it instantly.`,
          takeaways: [
            "Always state the grain before aggregating",
            "Six quality checks: complete, valid, consistent, unique, accurate, timely",
            "Profile first, analyze second — always",
          ],
          practice: "Profile the messy sales dataset: rows, columns, which columns have missing values, which have duplicates.",
        },
      ],
    },
    {
      id: "b3",
      title: "Spreadsheets from Zero",
      summary: "Excel/Sheets mechanics: the interface, core formulas, sorting & filtering, charts, and pivot tables.",
      lessons: [
        {
          id: "b3l1",
          title: "The Interface & Cell Mechanics",
          minutes: 7,
          content: `Open the **Excel Studio** tab now and follow along — reading about spreadsheets without touching cells is useless.

The anatomy:

- **Cells** — addressed by column letter + row number: ~B3~. The **active cell** shows its true content in the **formula bar**, while the cell displays the *result* (or formatted value).
- **Ranges** — a rectangle of cells: ~A1:A10~ (one column), ~A1:C10~ (a block). Nearly every function takes ranges.
- **Headers & freeze panes** — row 1 is usually column names; freezing it keeps headers visible. (In our Excel Studio, the header row is fixed for you.)
- **Data types in cells** — text left-aligns by default, numbers right-align. Right-aligned-but-broken data (e.g. ~$1,200.50~ as text) is a classic tell.

Cell references:

- **Relative** (~A1~) — changes when you copy the formula down/right. This is what makes formulas *scale*.
- **Absolute** (~$A$1~) — locked with ~$~; used for constants like tax rates.

> TIP: In the Excel Studio, click any cell, type a number, press Tab, type another, then in a third cell type ~=SUM(A1:B1)~ — you have just written your first formula. The formula bar shows the source of truth.`,
          takeaways: [
            "Cells = address + content + displayed value; the formula bar is truth",
            "Ranges power every function: A1:A10",
            "Relative refs scale formulas; $ locks references",
          ],
          practice: "In Excel Studio: load 'Retail Sales 2025', click cell L2, type =SUM(H2:H50) and watch the units total appear.",
        },
        {
          id: "b3l2",
          title: "Your First 10 Formulas",
          minutes: 10,
          content: `These ten functions cover ~70% of everyday spreadsheet work. Type each into the Excel Studio against the Retail Sales data.

- **SUM(range)** — total. ~~=SUM(H2:H341)~~ total units sold.
- **AVERAGE(range)** — mean. Watch out: blanks are ignored, zeros are counted (big difference!).
- **COUNT(range)** — counts *numbers only*; **COUNTA** counts anything non-empty.
- **MIN / MAX** — extremes; instant outlier detectors (a unit price of 99999 will stare at you).
- **ROUND(x, n)** — control decimals.
- **IF(condition, yes, no)** — branching: ~~=IF(J2>1000,"Big","Small")~~.
- **SUMIF(range, criteria, sum_range)** — conditional totals: ~~=SUMIF(E2:E341,"North",J2:J341)~~ = North revenue.
- **COUNTIF(range, criteria)** — how many rows match: ~~=COUNTIF(E2:E341,"North")~~.
- **TODAY()** — current date (our studio supports the math around dates too).

Operator kit: ~+ - * /~ for arithmetic, ~&~ to join text (~~"Q" & 1~~ → "Q1"), ~> < >= <= <>~ for comparisons inside IF.

> TIP: Build the habit of writing the formula for ONE row, checking the result by hand, then copying down. Copying an unverified formula 300 times is how bad reports happen.`,
          takeaways: [
            "SUM/AVERAGE/COUNT/MIN/MAX = the descriptive five",
            "SUMIF/COUNTIF/IF = conditional thinking in one cell",
            "Blanks vs zeros change AVERAGE — know which you have",
          ],
          practice: "Compute: total revenue, average unit price, biggest single order, and count of orders over $500 — four formulas, four cells.",
        },
        {
          id: "b3l3",
          title: "Sort, Filter & Conditional Formatting",
          minutes: 7,
          content: `Before charts and models, analysts *look* at data. Three tools make looking fast.

**Sort** — reorder rows by a column. Sort revenue descending: your biggest orders float to the top. Multi-level sort (region A→Z, then revenue high→low) answers "who leads each region?" by eye. DANGER: sorting a partial selection can tear related columns apart — always sort the whole table (in real Excel: Ctrl+A first; in our studio it is safe by default).

**Filter** — show only rows matching a condition. Filter ~region = North~ and ~category = Electronics~ → the exact slice a stakeholder asked about. Filters are *view-level*: they hide rows, they do not delete them — totals in dashboard formulas (SUMIF etc.) ignore filters, which surprises everyone once.

**Conditional formatting** — color cells by rule: revenue > $1000 green, negative red, top-10% shaded. It turns a wall of numbers into a heat map. Rules to live by:

- One meaning = one color (red always = bad/attention, never decoration).
- Use data bars / color scales for magnitude, discrete colors for categories.
- If everything is highlighted, nothing is — cap it at the top/bottom 10%.

> REAL WORLD: Managers open reports on phones. A red/amber/green conditional format on a KPI table communicates status in 2 seconds — no chart needed. Cheap, powerful, underused.`,
          takeaways: [
            "Sort = order, Filter = slice, Conditional formatting = instant visual meaning",
            "Filters hide rows, they don't delete them — totals still count hidden rows",
            "Color with restraint: one meaning per color",
          ],
          practice: "In Excel Studio: sort by revenue (top 5), filter to East region, and highlight revenue over 800 using the style tool.",
        },
        {
          id: "b3l4",
          title: "Charts That Make Sense",
          minutes: 8,
          content: `A chart is an *argument*, not decoration. The right chart makes the argument obvious; the wrong one hides it.

The beginner mapping (memorize this):

- **Column/bar chart** — compare categories: revenue by region. Bars for magnitude, sorted descending.
- **Line chart** — trend over time: daily orders. Time ALWAYS on the x-axis, zero-based only if the story needs it.
- **Pie chart** — parts of a whole, only when ≤5 slices and they really sum to a whole. (Honestly: a sorted bar chart is almost always better.)
- **Scatter plot** — relationship between two numbers: ad spend vs conversions. Spot correlation and outliers.
- **KPI card** — one big number for "how are we doing right now?"

Chart hygiene:

1. Title states the insight, not the topic: "**South drives 34% of revenue with only 22% of orders**", not "Revenue by region".
2. Label axes; add units ($, %, count).
3. Start bar axes at zero; lines may zoom.
4. Max ~7 categories per chart — aggregate the rest into "Other".

> TIP: You will build all of these in the **Dashboard Studio** — every chart type there maps 1:1 to this list. Try building 'Revenue by Region' (bar) and 'Monthly Revenue' (line) right after this lesson.`,
          takeaways: [
            "Bar=compare, Line=time, Pie=≤5 parts of whole, Scatter=relationship, KPI=now",
            "Titles carry the insight, not the topic",
            "Fewer categories, labeled axes, honest baselines",
          ],
          practice: "In Dashboard Studio: create a bar chart 'Revenue by Region' and a line chart 'Monthly Revenue' from the clean sales data.",
        },
        {
          id: "b3l5",
          title: "Pivot Tables — The Analyst's Swiss Army Knife",
          minutes: 9,
          content: `A **pivot table** answers "aggregate X by Y" without a single formula. It is the fastest data summary machine ever shipped, and it exists in Excel, Google Sheets, Power BI (matrices), pandas (~pivot_table~) — same idea everywhere.

Four boxes, one mental model:

- **Rows** — what to group by (region, category, month).
- **Values** — what to aggregate and how (SUM of revenue, COUNT of orders, AVERAGE of price).
- **Columns** — a second grouping dimension laid out sideways (months across the top).
- **Filters** — exclude data before pivoting (only 2025, only Online channel).

Example: Rows=region, Columns=category, Values=SUM(revenue) → a full management grid in 10 seconds. Swap Values to COUNT(order_id) → order volume. Swap to AVERAGE(unit_price) → pricing view. Same data, three business questions.

Pivot discipline:

- Your source must be **tidy** (one header row, no merged cells, no subtotal rows) — pivots on messy data produce lies efficiently.
- Every pivot should answer ONE question you can say out loud.
- Refresh after data changes (real Excel); our studio recalculates live.

> TIP: The Dashboard Studio's "Group-by chart" IS a visual pivot: dimension = rows, measure+agg = values, filter = filters. Master one and you know both.`,
          takeaways: [
            "Pivot = group-by machine: Rows, Values, Columns, Filters",
            "Same data, different aggregation = different business question",
            "Tidy source data or the pivot lies beautifully",
          ],
          practice: "In Dashboard Studio build the 'region × category' revenue view: bar chart, dimension=category, filter=North region, measure=SUM revenue.",
        },
      ],
    },
    {
      id: "b4",
      title: "Descriptive Statistics",
      summary: "Mean vs median, spread, percentiles, distributions, correlation — the math behind every honest summary.",
      lessons: [
        {
          id: "b4l1",
          title: "Mean, Median, Mode — and When Each Lies",
          minutes: 8,
          content: `**Mean** = sum ÷ count. **Median** = the middle value when sorted. **Mode** = most frequent value.

The critical lesson: **the mean is destroyed by outliers**. Salaries: 45k, 48k, 50k, 52k, 950k. Mean = 229k ("our average employee earns a fortune!"), median = 50k (the truth). Revenue data behaves the same — a handful of enterprise orders can double the mean while the typical order never changes.

Rules of thumb:

- **Use median** for skewed data: incomes, house prices, order values, session times, response times.
- **Use mean** for well-behaved symmetric data: unit counts, scores — and when the *total* matters (mean × count = total, which finance needs).
- **Use mode** for categories: most common payment method, top product.

Report both when in doubt: "Average order value $86 (median $54)" tells a reader the distribution is right-skewed — whales exist.

> REAL WORLD: "Our average customer satisfaction is 4.2/5" hides that 15% rated 1. One unhappy segment with a median split is often the actual story. Percentiles (next lesson) expose what averages bury.

Try it now: in Excel Studio on Retail Sales, compute ~AVERAGE~ and ~MEDIAN~ of revenue in two cells (our studio supports both). If they differ a lot, the data is skewed — say so in any report you write.`,
          takeaways: [
            "Mean is fragile to outliers; median is robust",
            "Skewed data → lead with median, keep mean for totals",
            "Mode is for categories",
          ],
          practice: "Compute mean and median revenue on the clean sales data. Which is higher, and what does that tell you about order sizes?",
        },
        {
          id: "b4l2",
          title: "Spread: Range, Variance, Standard Deviation",
          minutes: 8,
          content: `Two stores both average $50 per order. Store A: orders are $45–$55. Store B: orders are $5–$400. Same mean, **completely different businesses**. Spread is the missing half of every average.

- **Range** = max − min. Simple, but one outlier breaks it.
- **IQR (interquartile range)** = 75th percentile − 25th percentile — the spread of the *middle 50%*, outlier-resistant. Boxplots draw exactly this.
- **Variance** = average of squared deviations from the mean. In squared units (useless to read directly, essential to compute).
- **Standard deviation (std)** = √variance — back in original units. THE workhorse: "orders average $50 ± $12".

The **68–95 rule** for bell-shaped data: ~68% of values fall within mean ± 1 std, ~95% within ± 2 std. So in a $50 ± $12 store, an order of $90 is beyond 95% of days — flag it, don't ignore it.

Why analysts care daily: **std is how you say "is this change real or noise?"** Last week's conversion 3.1% vs this week 3.4% — if weekly std is 0.2%, that is a real move; if it is 1.5%, it is noise. Every A/B test (Level: Advanced) is formalized spread-judgment.

> TIP: Excel: ~STDEV.P~ for a full population, ~STDEV.S~ for a sample. Our studio's stats panel computes std for any numeric column instantly.`,
          takeaways: [
            "Never report an average without a spread (std or IQR)",
            "IQR resists outliers; std is the workhorse",
            "±1 std ≈ 68% of data, ±2 std ≈ 95% (bell-shaped data)",
          ],
          practice: "Get mean and std of unit_price in the stats panel. What price would count as 'unusual' (beyond 2 std)?",
        },
        {
          id: "b4l3",
          title: "Percentiles, Distributions & Outliers",
          minutes: 8,
          content: `**Percentiles** cut sorted data into 100 parts. The 50th = median. The 90th percentile of response time = "90% of tickets resolved faster than this" — the standard SLA language. Quartiles = 25/50/75.

**Distributions** — the shape of your data:

- **Normal (bell)** — symmetric: heights, measurement errors. Stats get easy here.
- **Right-skewed** — long tail of big values: revenue, salaries, session times, file sizes. Most orders small, a few whales.
- **Left-skewed** — long tail of small values: exam scores mostly high.
- **Bimodal** — two humps: often two hidden populations (mobile vs desktop behavior) — a segmentation clue!

**Outliers** — values far from the pack. Two detection rules used everywhere:

- **IQR rule**: outlier if ~value < Q1 − 1.5×IQR~ or ~> Q3 + 1.5×IQR~.
- **Z-score rule**: outlier if ~|z| > 3~ where ~z = (value − mean) ÷ std~.

Outliers are **either errors or gold**: a $99,999 unit price is a typo (fix it); a $99,000 order is your best customer (investigate, don't delete). The Cleaner tool lets you *review* flagged outliers rather than auto-deleting — that is professional practice.

> TIP: Never trust an average again without asking: "what does the distribution look like?" One histogram (or our cleaner's min/max/percentile profile) changes the whole story.`,
          takeaways: [
            "Percentiles = position in sorted data; SLAs live at p90",
            "Shape matters: skewed data breaks mean-based thinking",
            "Outliers = errors OR insights — investigate before deleting",
          ],
          practice: "In Cleaner, load the messy data and find the negative price and zero-unit rows. Decide for each: error or signal?",
        },
        {
          id: "b4l4",
          title: "Correlation vs Causation",
          minutes: 7,
          content: `**Correlation** measures how two numeric variables move together, from −1 to +1:

- **+0.8** — strong positive: more ad spend, more conversions.
- **0** — no linear relationship.
- **−0.8** — strong negative: higher price, fewer units.

In Excel: ~CORREL(x_range, y_range)~. Rough guide: |r| > 0.5 interesting, 0.3–0.5 weak, < 0.2 usually noise (depends on context and n).

The trap every analyst must survive: **correlation ≠ causation**. Classic fails:

- Ice-cream sales correlate with drowning deaths. Cause? No — a third variable: **summer**.
- Brands that advertise more have higher sales — or do brands with higher sales *afford* more advertising?
- Employees with more training get better reviews — or are high performers *given* more training?

The three usual explanations for a correlation: **A causes B**, **B causes A**, **C causes both** (confounder), plus **coincidence** (especially with small samples or many tested pairs — "p-hacking").

What earns you the right to say "causes":

- A **controlled experiment** (A/B test — randomized, one variable changed).
- Solid domain reasoning + temporal order (cause before effect).
- The correlation survives when you control for obvious confounders.

> REAL WORLD: Analysts who jump from "these correlate" to "so do more of this" get burned once and become cautious forever. Say "associated with" until an experiment proves "causes". This vocabulary discipline is a mark of seniority.`,
          takeaways: [
            "Correlation ∈ [−1, +1]; CORREL computes it",
            "Three innocent explanations: reverse cause, confounder, coincidence",
            "Only randomized experiments license the word 'causes'",
          ],
          practice: "Marketing data: compute correlation of spend vs revenue per channel (group first). Which channel shows the strongest association — and what confounder might explain it?",
        },
      ],
    },
    {
      id: "b5",
      title: "Think Like an Analyst",
      summary: "Business questions → measurable questions, KPIs companies track, hypothesis framing, and a guided first analysis.",
      lessons: [
        {
          id: "b5l1",
          title: "Turning Business Questions into Data Questions",
          minutes: 8,
          content: `Stakeholders ask vague questions: "How are we doing?" "Is marketing working?" "Something feels off with sales." Your first job is **translation** into something a dataset can answer.

The translation checklist:

1. **Who/what** exactly — which customers? Which region? Which period? ("Sales" → "completed orders, Jan–Mar 2025, all regions, revenue in $".)
2. **What metric** — "is marketing working" → "what is CAC by channel, and how does it compare to last quarter?"
3. **What comparison** — every number needs a benchmark: vs last month, vs target, vs another segment. A number alone is meaningless.
4. **What decision** — what will they DO differently based on the answer? If nothing, deprioritize the request politely.
5. **What granularity** — daily? monthly? per customer? per order?

Example transformation:

> Vague: "Our customers seem unhappy."
> Data question: "What is the CSAT trend over the last 8 weeks, split by ticket category, and which category dropped the most vs the prior 8 weeks?"

That second version can be answered with one query and one chart — and it *chooses itself* where to look.

> TIP: Write the question as a chart title before touching data ("CSAT fell 0.4 in Billing since June"). If you cannot phrase the title, you are not ready to query. This trick is called 'title-first analysis' and senior analysts swear by it.`,
          takeaways: [
            "Vague in, precise out: who, metric, comparison, decision, granularity",
            "Every metric needs a benchmark to mean anything",
            "Write the final chart title FIRST, then make the data fill it in",
          ],
          practice: "Translate these three: 'Is the new website good?', 'We need more sales', 'What about the churn thing?'",
        },
        {
          id: "b5l2",
          title: "KPIs & Metrics Companies Care About",
          minutes: 9,
          content: `A **KPI** is a metric someone will make a decision with, on a cadence. Learn this starter dictionary — interviews and projects both use them:

**Growth & sales**
- **Revenue** and **order volume**; **AOV** (average order value) = revenue ÷ orders.
- **Conversion rate** = purchases ÷ visitors (or leads ÷ calls).
- **Pipeline coverage** (B2B) = open pipeline ÷ quota.

**Marketing**
- **CAC** (customer acquisition cost) = marketing spend ÷ new customers.
- **ROAS** = revenue from ads ÷ ad spend. **LTV:CAC** — healthy ≥ 3:1.
- **CTR** = clicks ÷ impressions; **CVR** = conversions ÷ clicks.

**Retention & product**
- **Churn rate** = customers lost ÷ starting customers (per period).
- **Retention curve** by cohort (Master level covers cohort analysis).
- **NPS / CSAT** — survey-based satisfaction.

**Operations**
- **First response time / resolution time** (support), **on-time delivery %**, **stock-out rate**, **overtime hours** (HR).

Good KPI hygiene:

1. **Rate + volume together** (conversion 5% of 40 leads ≠ 2% of 10,000).
2. **One owner, one definition, one source** — duplicated metric definitions destroy trust.
3. **Paired metrics** to prevent gaming: speed without quality = disaster; add CSAT to resolution time.

> TIP: In Project 2 you will build an executive dashboard with revenue, AOV, top region, top product — exactly this vocabulary in action.`,
          takeaways: [
            "KPI = metric + decision + cadence + owner",
            "Core set: revenue, AOV, conversion, CAC, ROAS, churn, CSAT",
            "Always pair rate with volume, and speed with quality",
          ],
          practice: "From the HR dataset, propose 3 KPIs an HR director would track monthly, each with definition and decision.",
        },
        {
          id: "b5l3",
          title: "Framing Hypotheses",
          minutes: 7,
          content: `A **hypothesis** is a testable guess that directs your analysis instead of wandering the data aimlessly. Format:

> "We believe **[change/cause]** is driving **[metric]** among **[segment]**. If true, we should see **[expected pattern]** in the data."

Examples:

- "We believe the revenue dip is driven by the **Electronics category in the North region**, so we should see North-Electronics down >20% while others stay flat."
- "We believe **long first-response times cause low CSAT**, so tickets answered in >4h should average ≥1 point lower satisfaction."
- "We believe **overtime pushes people out**, so attrition should rise sharply above ~12 overtime hours."

Why this discipline matters:

1. It names the **segment** to slice by (region, category, cohort) — no more "looking at everything".
2. It predicts a **direction and magnitude**, so the data can actually contradict you. A hypothesis that cannot fail is an opinion.
3. It produces a **next action** either way: confirmed → recommend; rejected → the alternative hypothesis is now sharper.

The workflow: **stakeholder hunch → written hypothesis → targeted query → verdict → recommendation**. Keep a running list of hypotheses in your project README — reviewers and interviewers love seeing this structure, and your future self will too.

> TIP: After each project here, add a 'Hypotheses tested' section to the auto-generated README — our file generator gives you the scaffold for exactly that.`,
          takeaways: [
            "Hypothesis = cause + metric + segment + expected pattern",
            "If it can't be wrong, it's not a hypothesis",
            "Either verdict produces an action — that's the point",
          ],
          practice: "Convert into hypotheses: 'Sales are weird lately', 'Support is slow', 'People don't like our pricing'.",
        },
        {
          id: "b5l4",
          title: "Guided First Analysis (Walkthrough)",
          minutes: 12,
          content: `Time to run the full loop — question → clean → analyze → recommend — on real data. Open the **Dashboard Studio** with the Retail Sales 2025 dataset and follow along.

**Step 1 — Question.** Business asks: "Where is revenue coming from, and where should we push next quarter?" Data question: revenue by region and category, monthly trend, top products.

**Step 2 — Trust check.** Profile first: 340 rows, no missing values, revenue = units × unit_price (verify on 2 random rows — do it in Excel Studio with ~~=G2*H2-J2~~ and check for zeros). 30 seconds now saves an embarrassing correction later.

**Step 3 — Decompose.** Build:
- KPI: total revenue, orders count, AOV.
- Bar: revenue by region (sorted).
- Bar: revenue by category.
- Line: revenue by month.
- Bar: top products by revenue.

**Step 4 — Read the story.** Suppose you find: South leads revenue but with low AOV and heavy Office Supplies mix; Electronics drives high AOV but only in West/North; monthly trend dips mid-year. That is not "data", that is a narrative: *growth lever = push Electronics into South; risk = mid-year softness*.

**Step 5 — Recommend.** One slide: 3 KPIs, 2 charts (region + trend), 2 bullets:
- "South = 30% of revenue but only 18% of Electronics sales — pilot Electronics promo in South."
- "Revenue dips Jun–Jul; investigate seasonality vs stockouts with ops."

> TIP: Do this exact flow on Project 2 (Executive Sales Dashboard) — same muscles, with a cleaner deliverable and a portfolio artifact at the end. And remember: **one recommendation per insight**, always.`,
          takeaways: [
            "The full loop: question → trust check → decompose → story → recommendation",
            "KPIs + 2–4 grouped charts answer 90% of 'where is revenue coming from'",
            "Recommendations name a segment and an action",
          ],
          practice: "Complete the 5-step walkthrough, then export/save your dashboard and screenshot-grade it: could a stranger state the insight in 10 seconds?",
        },
      ],
    },
  ],
};

const intermediate: PathLevel = {
  id: "intermediate",
  title: "Intermediate — Core Toolkit",
  tagline: "SQL, data cleaning, visualization, BI thinking and spreadsheet mastery — the daily-use skills of every analyst job.",
  duration: "Weeks 5–10",
  outcomes: [
    "Write real SQL: joins, groups, aggregates — the #1 interview skill",
    "Clean any messy dataset methodically and document it",
    "Design dashboards people actually use",
    "Understand BI data models (star schema, measures)",
    "Wield lookup formulas and pivot analysis like a pro",
  ],
  modules: [
    {
      id: "i1",
      title: "SQL Complete",
      summary: "SELECT to JOINs — written against live tables in the built-in SQL Playground.",
      lessons: [
        {
          id: "i1l1",
          title: "SELECT & WHERE — Your First Queries",
          minutes: 10,
          content: `SQL is *the* language of data jobs. It reads like English but runs against millions of rows. Open the **SQL Playground** — the built-in engine runs your queries instantly against the sample store database (customers, orders, order_items, products, employees).

Basic shape:

~~~
SELECT name, city, segment
FROM customers
WHERE segment = 'Enterprise'
LIMIT 10;
~~~

- ~SELECT~ chooses **columns**; ~*~ means all (fine for exploring, wasteful in production).
- ~FROM~ names the table.
- ~WHERE~ filters **rows before** any aggregation. Operators: ~=~, ~!=~, ~>~ ~<~ ~>=~ ~<=~, ~IN ('a','b')~, ~BETWEEN 10 AND 20~, ~LIKE 'A%'~ (% = wildcard), ~IS NULL~ (never ~= NULL~ — NULL equals nothing, even itself!).
- Combine conditions with ~AND~ / ~OR~ (use parentheses — precedence bites everyone once).
- ~ORDER BY col DESC~ sorts; ~LIMIT n~ trims output.

~~~
SELECT * FROM orders
WHERE status = 'completed'
  AND order_date >= '2025-06-01'
ORDER BY order_date DESC
LIMIT 20;
~~~

> TIP: Keywords are case-insensitive but the convention UPPER keyword / lower column makes queries scannable. Run your first five queries now in the Playground's exercise list — exercises 1–3 map to this lesson.`,
          takeaways: [
            "SELECT columns FROM table WHERE rows ORDER BY sort LIMIT n",
            "NULL never equals anything — test with IS NULL",
            "Filter early (WHERE) — cheaper and clearer than filtering later",
          ],
          practice: "SQL Playground exercises 1–3: basic selects, date filters, pattern matching with LIKE.",
        },
        {
          id: "i1l2",
          title: "Aggregates & GROUP BY — Where Analysis Starts",
          minutes: 10,
          content: `Aggregation turns millions of rows into answers. The five workhorses: ~COUNT~, ~SUM~, ~AVG~, ~MIN~, ~MAX~.

~~~
SELECT status, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders
GROUP BY status;
~~~

The contract: **every column in SELECT must be either in GROUP BY or inside an aggregate**. Break it and real databases reject you (our engine is polite but the discipline stands).

- ~COUNT(*)~ counts rows; ~COUNT(col)~ skips NULLs; ~COUNT(DISTINCT col)~ counts uniques (try it on customer_id → "how many customers actually ordered").
- **HAVING** filters *after* grouping — the WHERE of aggregates:

~~~
SELECT customer_id, COUNT(*) AS n
FROM orders
GROUP BY customer_id
HAVING COUNT(*) >= 5
ORDER BY n DESC;
~~~
→ repeat customers. This exact pattern (group → aggregate → filter → sort) answers half of all business questions: top products, top regions, biggest customers, busiest months.

> REAL WORLD: "Show me our best sellers" = ~SELECT product_id, SUM(quantity) FROM order_items GROUP BY product_id ORDER BY 2 DESC~. One line, one promotion decision. In the Playground, exercise 4–6 walk you through group-bys step by step — do them now.`,
          takeaways: [
            "GROUP BY collapses rows; aggregates summarize each group",
            "SELECT columns must be grouped or aggregated",
            "WHERE filters rows, HAVING filters groups",
          ],
          practice: "Exercises 4–6 in the Playground: orders by status, revenue by month, customers with 5+ orders.",
        },
        {
          id: "i1l3",
          title: "JOINs — Combining Tables",
          minutes: 12,
          content: `Real answers live across tables: orders know *when*, customers know *who*, products know *what*. JOINs stitch them by key.

~~~
SELECT c.name, c.segment, o.id AS order_id, o.order_date
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'completed';
~~~

The join family:

- **INNER JOIN** — only rows matching in both tables. Default ~JOIN~.
- **LEFT JOIN** — all rows from the left table, matches from the right, NULLs where missing. THE analyst join: "all customers **and** their orders if any" — LEFT JOIN customers→orders then ~WHERE o.id IS NULL~ gives **customers who never ordered** (a growth team's favorite query).
- (RIGHT/FULL exist; professionals just flip the table order and use LEFT.)

Three sins to avoid:

1. **Joining on the wrong key** — always check grain: joining order_items to orders is 1-to-many and fine; joining orders to customers is many-to-1 and fine; joining two many-to-1 tables *row-duplicating* each other multiplies rows silently.
2. **Forgetting to deduplicate after 1-to-many joins** — revenue "doubling" after a join is the most common real-world bug. After any join, ~COUNT(*)~ should make sense: state the expected grain out loud.
3. **NULL match traps** — NULL keys never match; NULLs in LEFT JOIN results are a *feature* (missing side), use ~COALESCE(col, 0)~ or IS NULL logic.

> TIP: Playground exercises 7–9 are join drills: completed orders with customer city, revenue per product name, employees with manager names. The schema browser shows every key relationship.`,
          takeaways: [
            "JOIN ... ON = stitch tables by keys",
            "LEFT JOIN + IS NULL = 'who never did X' finder",
            "After every join, re-state the grain — or totals will lie",
          ],
          practice: "Exercises 7–9: join orders↔customers, compute revenue per product (two joins), list customers with zero orders.",
        },
        {
          id: "i1l4",
          title: "Subqueries & CTEs — Organizing Complex Logic",
          minutes: 9,
          content: `As questions grow ("top 3 cities by revenue *among customers who ordered in 2025*"), one flat SELECT stops being readable. Two tools fix that.

**Subquery** — a query inside a query:

~~~
SELECT name FROM customers
WHERE id IN (
  SELECT customer_id FROM orders
  WHERE order_date >= '2025-01-01'
);
~~~

**CTE (WITH clause)** — named, sequential steps; the professional style:

~~~
WITH recent AS (
  SELECT * FROM orders
  WHERE order_date >= '2025-01-01'
),
city_rev AS (
  SELECT c.city, SUM(i.quantity * i.unit_price) AS revenue
  FROM recent r
  JOIN customers c ON r.customer_id = c.id
  JOIN order_items i ON i.order_id = r.id
  GROUP BY c.city
)
SELECT * FROM city_rev
ORDER BY revenue DESC
LIMIT 3;
~~~

Why CTEs change your life:

1. **Readability** — each step does one thing, named like a variable.
2. **Reuse** — ~recent~ used twice? Defined once.
3. **Debuggability** — comment out the final SELECT, run ~city_rev~ alone to inspect intermediate output. In real warehouses (BigQuery, Snowflake) this is daily practice.

> TIP: Note the revenue formula: ~SUM(quantity × unit_price)~ — order_items has no revenue column; analysts compute line revenue by multiplication constantly. Exercise 10 in the Playground is exactly this pattern with a CTE. Build the habit: **hard logic → CTE steps, not nested spaghetti**.`,
          takeaways: [
            "CTEs = named steps = readable, reusable, debuggable SQL",
            "Line revenue = quantity × unit_price (computed, not stored)",
            "Test CTEs top-down: run each step alone before chaining",
          ],
          practice: "Exercise 10: top 3 cities by 2025 revenue using a CTE, then rewrite it as a subquery to feel the difference.",
        },
        {
          id: "i1l5",
          title: "Window Functions — Rankings & Running Totals",
          minutes: 10,
          content: `Window functions aggregate **without collapsing rows** — each row keeps its identity plus a computed stat. They are the mark of an intermediate+ SQL user, and interviews test them constantly. (Our built-in engine keeps things simple, so study the patterns here — they run 1:1 in real warehouses.)

The three patterns:

**1. Ranking** — top-N per group:
~~~
SELECT *,
  ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
FROM sales;
-- then filter rnk <= 3 for top 3 per region
~~~

**2. Running totals** — cumulative metrics:
~~~
SELECT order_date,
  SUM(revenue) OVER (ORDER BY order_date) AS running_rev
FROM daily_sales;
~~~

**3. Comparisons** — vs previous row / vs group average:
~~~
SELECT month, revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_month,
  revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM monthly;
~~~

The grammar: ~f() OVER (PARTITION BY x ORDER BY y)~ — PARTITION defines the "window" of rows each calculation sees; ORDER defines sequence inside it. ~ROW_NUMBER~, ~RANK~, ~LAG~, ~LEAD~, ~SUM/AVG OVER~ are the core five.

> REAL WORLD: "MoM change" dashboards = LAG. "Top product per category" = ROW_NUMBER with PARTITION. "Running MTD revenue" = SUM OVER. Three lines each, endlessly reused. You can *practice the thought pattern* in the Playground by combining GROUP BY results with self-reads — then graduate to a real engine (DuckDB is free) for true windows.`,
          takeaways: [
            "Windows keep every row: aggregate alongside detail",
            "ROW_NUMBER/PARTITION = top-N per group",
            "LAG = period-over-period change, the heart of trend reporting",
          ],
          practice: "Write (on paper or in a free DuckDB) the top 2 products per category with ROW_NUMBER — then explain each clause out loud.",
        },
      ],
    },
    {
      id: "i2",
      title: "Data Cleaning Mastery",
      summary: "The 60–80% skill: missing values, duplicates, text chaos, dates, outliers — methodically, with a documented trail.",
      lessons: [
        {
          id: "i2l1",
          title: "Why Data Is Always Messy",
          minutes: 7,
          content: `Real data comes from humans typing, systems exporting, and companies merging — messiness is structural, not exceptional.

The seven horsemen you will meet (all of them are in the messy sales dataset in the **Data Cleaner** tool):

- **Whitespace & case chaos** — ~"  John SMITH "~ vs ~"john smith"~. Breaks grouping and matching.
- **Format drift** — dates as ~2024-07-01~, ~01/07/2024~, ~July 1~; prices with ~$~, commas, or as text.
- **Missing values** — blank cells, ~NULL~, ~"N/A"~, ~"-"~, ~999~ as fake sentinel.
- **Duplicates** — double-submitted forms, re-runs of exports, system migrations.
- **Impossible values** — negative prices, age 250, units 0 with revenue > 0.
- **Inconsistent categories** — "North", "NORTH", "north ", "N" for one region.
- **Structural mess** — merged headers, subtotal rows, multiple tables in one sheet.

The professional cleaning loop:

1. **Profile** (row/col counts, types, missing, distincts) — never skip.
2. **Fix structure** (headers, one table, correct grain).
3. **Fix types** (dates → ISO, prices → numbers).
4. **Fix content** (trim, case, standardize categories, dedupe).
5. **Handle missing** (deliberately — next lesson).
6. **Document every action** — a cleaning log is part of the deliverable.

> REAL WORLD: The messy dataset here mirrors a real POS export I have seen a dozen times: mixed-case customers, ~$1,200.50~ text prices, three date formats, 8% duplicates. Cleaning it in the tool now = recognizing it instantly in your first job.`,
          takeaways: [
            "Messiness is structural — expect all seven horsemen",
            "Clean in order: structure → types → content → missing",
            "Every fix gets logged; the log is part of the deliverable",
          ],
          practice: "Load 'Retail Sales H2-2024 (Messy)' in the Cleaner and list which of the seven horsemen you can spot before applying any fix.",
        },
        {
          id: "i2l2",
          title: "Missing Values — Fix, Fill, or Drop?",
          minutes: 9,
          content: `Missing data is a **decision**, not just a nuisance. Every choice changes results.

First, understand *why* it is missing:

- **Random gaps** (sensor blip) — safe to fill with statistics.
- **Structurally missing** — apartment number for houses; revenue for a cancelled order. Filling these invents fiction.
- **Informative missing** — customers who hide income have different credit risk. The missingness IS signal (flag it with a ~was_missing~ column).

Your four options:

1. **Drop rows** — only if few (<5%) and random, or the row is unusable (no customer, no date on an order). Never drop silently in a report.
2. **Drop columns** — if >60–70% missing and not critical.
3. **Fill (impute)** — numeric: mean/median (median survives outliers); categorical: mode or explicit "Unknown". Time series: forward-fill.
4. **Flag & keep** — add ~revenue_missing~ boolean, fill neutral, let downstream decide.

Rules of thumb:

- Fill **median** for skewed money columns (mean gets dragged by whales).
- Fill **"Unknown"** for categories — never invent "North" for a blank region.
- Never fill a **key** (order_id blank = broken row).
- Report: "34 of 168 rows (20%) had missing revenue; filled with category median" — one sentence, massive credibility.

> TIP: The Cleaner tool shows missing counts per column and offers targeted fixes (drop rows missing keys, fill numerics with median, fill text with 'Unknown'). Its log records exactly what you did — read it before exporting.`,
          takeaways: [
            "Classify why data is missing before choosing a fix",
            "Median for skewed numbers, 'Unknown' for categories, never fill keys",
            "Report the missingness — silently clean data is a hidden lie",
          ],
          practice: "In Cleaner: drop rows missing customer or date; fill missing units with median; fill missing prices with the product's median. Check the log.",
        },
        {
          id: "i2l3",
          title: "Duplicates, Text Chaos & Dates",
          minutes: 9,
          content: `**Duplicates.** First define the key: is a duplicate an identical ~order_id~, or identical *everything*? Exact-duplicate rows are usually safe to remove; same key with different values needs investigation (which is correct — the re-run or the original?). Always count before/after and sample-verify a few removals.

**Text chaos.** The standard sequence, available as one-click actions in the Cleaner:

- ~TRIM~ — kill leading/trailing spaces (invisible, deadly: "North " ≠ "North").
- **Case normalize** — PROPER/named entities ("John Smith"), UPPER for codes ("ORD-1001"), lower for emails.
- **Collapse internal spaces** — double spaces from pasted data.
- **Standardize categories** — map "north"/"NORTH"/"N" → "North". Build a mapping, apply, verify distinct counts.

**Dates.** The three-step fix:

1. Detect the format(s) — the Cleaner flags mixed formats like ~2024-07-15~ vs ~15/07/2024~.
2. Parse to ISO (~YYYY-MM-DD~) — the universal standard; ambiguity dies.
3. Derive parts you need: ~month~, ~quarter~, ~weekday~ (weekday is a shocking common insight: B2B sells Mon–Fri).

Why care this much: **joins, groupings and time-series all break on dirty text/dates**. "Revenue by month" with three date formats produces three rows per month and a jagged lie of a chart.

> REAL WORLD: A 30-minute standardization pass (trim + case + date-normalize + dedupe) routinely fixes "impossible" dashboard numbers. It is the highest-ROI half-hour in analytics — and Project 1 is exactly this pass, end to end.`,
          takeaways: [
            "Define 'duplicate' by key before removing anything",
            "TRIM → case → categories is the text-fix sequence",
            "Normalize all dates to ISO YYYY-MM-DD before time analysis",
          ],
          practice: "Cleaner: apply trim, proper-case, category standardization and date normalization to the messy data, then count remaining duplicates.",
        },
        {
          id: "i2l4",
          title: "Outliers — Signal or Noise?",
          minutes: 8,
          content: `Outliers are extreme values. Your job is **classification before deletion**.

Detect them (Cleaner does this automatically; here is the math):

- **IQR rule** — outside ~[Q1 − 1.5×IQR, Q3 + 1.5×IQR]~. Robust, the default.
- **Z-score** — ~|z| > 3~. Assumes roughly normal data.
- **Business rules** — negative prices, units 0 with revenue, price 0 with units 12: often *validations*, not statistics.

Classify into four buckets:

1. **Data error** — typo ($99,999 keyboard), wrong unit (cents vs dollars), sign flip. → Fix or null it.
2. **Genuine rare event** — whale order, viral day. → **KEEP** (it is revenue!) but consider reporting median alongside mean.
3. **Different population** — B2B bulk orders mixed into B2C. → Segment, don't delete.
4. **Fraud/abuse** — repeated max refunds. → Flag to the business; that is a finding, not dirt.

Golden rules:

- Never delete outliers just to make charts pretty.
- When an outlier legitimately distorts an average ("mean AOV $860, median $54"), show both and let the reader see the whale.
- Log every outlier decision — auditors and stakeholders *will* ask why Q3 revenue changed.

> TIP: In the Cleaner, enable outlier review: the negative price and zero-unit rows in the messy dataset are *errors*; a huge but plausible order is *signal*. Making that distinction on purpose is the whole lesson.`,
          takeaways: [
            "Detect with IQR/z-score, classify with business sense",
            "Errors → fix; whales → keep and report median too",
            "Outlier deletion changes totals — always document it",
          ],
          practice: "Find both planted outliers in the messy data. For each: which bucket, and what action did you take?",
        },
        {
          id: "i2l5",
          title: "Tidy Data Rules & Documentation",
          minutes: 7,
          content: `**Tidy data** (a formal standard from statistics, used everywhere) is the shape every tool — pivot, BI, pandas — assumes:

1. **Each variable is one column** — no "Jan Rev | Feb Rev" columns (months belong in a column, not headers).
2. **Each observation is one row** — one order-line per row, not a mashup.
3. **Each type of observational unit is one table** — customers table, orders table, items table.
4. **One header row**, no merged cells, no subtotal rows embedded in data.

Violations you must fix: headers-as-data (widen→long reshape), multi-table sheets, footnotes inside data, subtotal rows (they double your SUMs — the classic 2× revenue bug), colors encoding meaning (a red cell instead of a "status" column — invisible to SQL!).

**Documentation** is what separates a professional from a cowboy:

~~~
## Cleaning Log — sales_h2_2024
1. Removed 12 exact duplicate rows (8% of raw).
2. Trimmed whitespace + proper-cased customer/region (7 variants → 4 regions).
3. Parsed dates from 3 formats → ISO 8601; 4 unparseable → dropped.
4. unit_price: stripped '$', cast numeric; 3 negatives → investigated, 2 sign errors fixed, 1 dropped.
5. Missing: units 6 → filled median(3); customer 5 → dropped (unjoinable).
6. Outliers: 1 price $99,999 → typo → set null. Grain: one row = one order line.
~~~

That log takes 3 minutes and turns "I cleaned it" into *evidence*. The Cleaner tool generates this log for you as you work — export it with the cleaned CSV (Project 1 grades it).

> TIP: Before ANY analysis, run the tidy checklist on the source. 90% of "weird numbers" trace to a tidy-data violation, usually subtotal rows or duplicated grain.`,
          takeaways: [
            "Tidy = variable per column, observation per row, unit per table",
            "Subtotal rows and merged cells poison totals",
            "A written cleaning log converts cleaning into evidence",
          ],
          practice: "Export the cleaning log from your Cleaner session and check it against the 6-point example above.",
        },
      ],
    },
    {
      id: "i3",
      title: "Visualization & Storytelling",
      summary: "Chart selection, design systems, dashboard layout, and the insight → action narrative that moves meetings.",
      lessons: [
        {
          id: "i3l1",
          title: "Choosing the Right Chart (Decision Tree)",
          minutes: 8,
          content: `Use this decision tree every time — it covers 95% of real needs:

**1. Comparing categories?**
- Few categories, emphasize magnitude → **sorted bar chart**.
- Many categories (10+) → bar, horizontal, or aggregate into "Other".
- Two dimensions (region × category) → grouped/stacked bar, or a matrix with color.

**2. Change over time?**
- Few points, discrete steps → column chart.
- Trend, many points → **line chart** (multiple series = multiple lines, max 3–4).
- Cumulative story → area chart (only stacked when parts genuinely sum to a whole).

**3. Part of a whole?**
- Few slices, one period → pie/donut (acceptable here).
- Parts over time → **stacked 100% bar** — pie's superior cousin.
- Comparing two wholes → two bars, not two pies (humans compare lengths, not angles).

**4. Relationship between two numbers?** → **scatter**; add trend line; bubble size only if a third variable truly matters.

**5. Distribution?** → histogram (or boxplot for comparing groups).

**6. One number that matters?** → KPI card with delta vs target/last period.

> TIP: In the Dashboard Studio every widget type maps to this tree: KPI, bar, line, area, pie, table. Next time you build, write the question first, then pick the widget from the tree — never the reverse.`,
          takeaways: [
            "Bar=compare, Line=time, Scatter=relationship, Histogram=distribution",
            "Stacked-100% bars beat pies for part-of-whole over time",
            "Question first, chart second",
          ],
          practice: "For each question pick the chart: (a) Which channel has best ROAS? (b) Signups per week? (c) Does spend relate to conversions? (d) What % of revenue by channel over months?",
        },
        {
          id: "i3l2",
          title: "Design: Color, Order, Labels",
          minutes: 8,
          content: `Design is not decoration — it is **attention engineering**. Three levers do most of the work.

**Color**
- One accent color for the *important* thing; everything else gray. This single rule improves charts more than any other.
- Sequential scale (light→dark) for magnitude; diverging scale (red↔green or blue↔orange) only around a meaningful midpoint (vs target).
- Colorblind-safe palettes — never encode meaning in red/green alone; add labels/shapes.
- On dashboards: 1 accent + 2–3 neutrals. Rainbow = confusion.

**Order**
- Bars sorted by value (always, unless there is a natural order like months).
- Legends ordered to match visual order.
- Tables sorted by the decision column, descending.

**Labels & framing**
- Title = the insight ("South: 34% of revenue, 22% of orders"); subtitle = scope (period, filter).
- Direct-label lines/bars when possible; kill legend detours.
- Numbers formatted for humans: $1.2M, 34%, 45k — decimals nobody reads are noise.
- Consistent axes across a dashboard so eyes can compare honestly.

> REAL WORLD: An analyst recolored a 12-series rainbow line chart to: gray series + emerald "our channel" + red "benchmark". The director said "finally I can SEE it" — same data, different attention design. Try exactly this in the Dashboard Studio: build a multi-channel line chart, then rebuild it around one highlighted series.`,
          takeaways: [
            "Gray + one accent = instant hierarchy",
            "Sort bars by value; direct-label what matters",
            "Insight titles + human number formats",
          ],
          practice: "Build 'Marketing spend by channel' bar chart in Dashboard Studio — then reorder/retitle it until the insight is readable in 3 seconds.",
        },
        {
          id: "i3l3",
          title: "Dashboard Principles That Survive Contact With Users",
          minutes: 9,
          content: `Most dashboards die from two diseases: **everything-on-one-page** and **nobody-asked-for-this-metric**. The cure is a small canon:

**1. One audience, one job.** An exec dashboard (KPIs + trend + 2 decompositions) ≠ an ops dashboard (daily detail, drill-downs). Write the audience and the 3 questions it must answer at the top of your design doc.

**2. The 5-second / 30-second / 5-minute layers.**
- 5s: 4–6 KPI cards with deltas (good/bad at a glance).
- 30s: the 2–4 primary charts answering the core questions.
- 5min: detail tables/filters for the curious.

**3. F-pattern layout.** Eyes start top-left: most important KPI first, then the hero chart, then supporting breakdowns. Reading order = importance order.

**4. Filters are ergonomic, not archaeological.** Period (this month/quarter/YTD), region, category. Slicers visible, not buried. Default view = the most common question.

**5. Every number knows its comparison.** Delta vs last period or vs target on every KPI. A revenue number alone is a shrug.

**6. Performance & trust.** Slow dashboards die; wrong numbers die faster. Document metric definitions on the dashboard footer (our generated dashboards include a definitions block — keep that habit in Power BI too).

> TIP: Rebuild Project 2's dashboard twice: once "everything I found", once "exec 5-second layer". Feel the difference — restraint is the skill. The Dashboard Studio's grid naturally enforces the F-pattern.`,
          takeaways: [
            "Design for ONE audience and 3 questions",
            "5s KPIs → 30s charts → 5min detail layers",
            "Every KPI carries a delta; every dashboard carries definitions",
          ],
          practice: "Audit any dashboard you find online (or Project 2's): identify its 5s/30s/5min layers and one violation of the canon.",
        },
        {
          id: "i3l4",
          title: "Telling the Story: Insight → Action",
          minutes: 8,
          content: `Charts inform; **stories move budgets**. The professional narrative arc for any analysis:

**1. Situation** — one sentence of shared context. "Q3 revenue was $1.2M, flat vs Q2."
**2. Complication** — the tension. "But South region fell 18% while others grew 6%."
**3. Question** — the natural question that tension raises. "Why is South falling?"
**4. Answer** — your finding, stated as a claim. "South's drop is concentrated in Electronics (−41%), driven by two stockout months."
**5. Action** — what to DO, with expected impact. "Fix Electronics supply in South; modeled recovery ≈ $38k/quarter."

Support with the **Pyramid Principle**: lead with the answer, then evidence. Executives read the first line; analysts read the appendix. Write both for both.

Language rules:

- Say "**revenue fell 18% QoQ in South Electronics**" not "there seems to be some softness" — precision is confidence.
- Quantify the prize: "$38k/quarter" beats "significant opportunity".
- Own uncertainty honestly: "based on 2 months of stockout data — ops should confirm supplier logs."

> TIP: Your project README generator ends with 'Key Insights' and 'Recommended Actions' sections. Fill them with this arc — when you show the portfolio in interviews, this structure is exactly what they grade. Story beats dashboard; dashboard beats table.`,
          takeaways: [
            "Arc: Situation → Complication → Question → Answer → Action",
            "Pyramid principle: answer first, evidence after",
            "Quantify impact and own your uncertainty",
          ],
          practice: "Take any insight from your dashboard and write the 5-line arc for it. Read it aloud — does it sound like a decision memo?",
        },
      ],
    },
    {
      id: "i4",
      title: "Power BI & BI Concepts",
      summary: "How real BI tools think: data models, star schemas, measures vs columns, DAX basics, interactivity.",
      lessons: [
        {
          id: "i4l1",
          title: "How BI Tools Think",
          minutes: 8,
          content: `Power BI, Tableau and Looker share one mental model — learn it once, use it everywhere.

**The anatomy:**

- **Data model** — tables and the *relationships* between them (one-to-many from dimension to fact). This is the engine room; visuals are just windows into it.
- **Measures** — calculations computed *at query time* on the current filter context: ~Total Revenue = SUM(Sales[Amount])~. They adapt to every slicer click.
- **Calculated columns** — computed once per row, stored, static. Use for row labels (age bands); never for aggregations.
- **Visuals** — charts bound to fields; they *filter each other* through cross-filtering.
- **Filter context** — the set of active filters flowing to every measure. This concept is 80% of BI thinking.

**The rookie mistake** that defines BI newcomers: building dashboards on ONE wide flat table (or worse, on the raw export). It works until someone asks for both region-level and product-level views and the model can't answer both without duplication. Professionals import several tidy tables and define relationships — exactly the customers/orders/products structure in the SQL Playground.

**The workflow** in Power BI: **Get Data → Transform (Power Query = the Cleaner skills you already have) → Model (relationships) → Measure (DAX) → Visualize → Publish**. Notice: steps 1–2 are the Data Cleaner tool, step 3 is the SQL schema, step 5 is the Dashboard Studio. This academy's tools ARE the BI workflow, decomposed.

> TIP: Open the Dashboard Studio and note how each widget = fields + aggregation + filter. That is filter context, simplified. When you open Power BI for real, everything will feel like an old friend with better clothes.`,
          takeaways: [
            "Model first, visuals second",
            "Measures compute on the fly; calculated columns are static rows",
            "Filter context = which filters reach each calculation",
          ],
          practice: "Sketch the model for our store: customers 1—* orders 1—* order_items *—1 products. Name the fact table and the dimensions.",
        },
        {
          id: "i4l2",
          title: "Star Schema & Data Modeling",
          minutes: 9,
          content: `The **star schema** is the gold-standard shape for analytics databases: one **fact table** in the center (events/measures: orders, transactions) surrounded by **dimension tables** (who/what/where: customers, products, dates, stores). The picture looks like a star; hence the name.

**Fact tables** — rows = events at a grain; columns = **measures** (quantity, price, amount) + **keys** to dimensions. Big (millions of rows), narrow, append-heavy. Ask: "what is one row?" — if the answer is "one transaction line", it is a fact table.

**Dimension tables** — rows = entities; columns = **attributes** (customer name, city, segment; product name, category). Small, wide, descriptive. These are what you slice and group BY.

**Conformed dimensions** — one date dimension used by sales AND marketing facts, so time filters work everywhere consistently.

Why stars beat one-big-table:

1. **Both granularities work** — region rollups and line-item detail from the same model.
2. **Smaller storage, faster queries** — "Electronics" stored once in a dimension, not per million rows.
3. **Clean semantics** — every visual has an unambiguous path through the model.

Modeling rules of thumb: relationships flow one-to-many (dimension 1 → * fact); hide key columns from report view; mark your date table as the calendar; never join fact-to-fact directly (bridge through shared dimensions).

> REAL WORLD: In Power BI interviews, "how would you model this?" is a senior-signal question. Answer: fact at transaction grain + conformed date/customer/product dimensions + measures in DAX — then they know you have done it.`,
          takeaways: [
            "Fact = events + measures at a stated grain; Dimensions = slicing attributes",
            "Star schema enables both detail and rollup honestly",
            "Relationships: dimension 1 → * fact; hide keys; mark date table",
          ],
          practice: "Classify each Playground table: which are facts, which are dimensions, and what is the grain of each?",
        },
        {
          id: "i4l3",
          title: "DAX Basics — Measures That Think",
          minutes: 9,
          content: `DAX (Data Analysis Expressions) is Power BI's formula language. The core patterns cover most needs (syntax shown for reference — the *thinking* is what transfers, and the Dashboard Studio implements the same aggregations visually).

**Simple measures** — react to filter context automatically:
~~~
Total Revenue = SUM(Sales[Amount])
Orders = COUNTROWS(Sales)
AOV = DIVIDE([Total Revenue], [Orders])
~~~

**Time intelligence** — the reason BI tools beat spreadsheets:
~~~
Revenue LY = CALCULATE([Total Revenue], SAMEPERIODLASTYEAR('Date'[Date]))
Revenue YoY % = DIVIDE([Total Revenue] - [Revenue LY], [Revenue LY])
~~~

**Conditional logic**:
~~~
Big Orders = CALCULATE([Orders], Sales[Amount] > 500)
~~~

The three concepts that make DAX click:

1. **Filter context** — each visual cell = a filtered slice; measures recompute per slice. Slicer clicks change context; measures update. Magic explained.
2. **CALCULATE** — the ONE function that *modifies* filter context. 90% of advanced DAX is ~CALCULATE(expression, new_filter)~.
3. **DIVIDE not /** — divide-by-zero-safe, saves you from the classic blank-dashboard bug.

 rookie mistakes to avoid: building measures as calculated columns (they won't respond to slicers); forgetting a marked date table (time intelligence silently breaks); writing ~SUM~ where ~CALCULATE(SUM, filter)~ is needed.

> TIP: You do not need to memorize DAX today. You need the *measure mindset*: "every number on screen is an aggregation over a filter context." The Dashboard Studio's per-widget filter boxes are exactly that, made visible.`,
          takeaways: [
            "Measures live in filter context — they recompute per visual cell",
            "CALCULATE modifies context; DIVIDE prevents zero-division",
            "Time intelligence requires a proper date table",
          ],
          practice: "In Dashboard Studio, create KPI widgets for Revenue and Orders, then a filtered bar chart — observe how the filter changes the numbers (that's filter context).",
        },
        {
          id: "i4l4",
          title: "Filters, Slicers & Interactive Design",
          minutes: 7,
          content: `Interactivity is BI's superpower — used well it turns a report into an instrument; used badly it turns it into a maze.

**Slicer design** (the left-rail or top-bar filters):

- The big three: **Period**, **Geography/Org**, **Category**. Everything else is clutter until proven wanted.
- Single-select by default where confusion hurts (two periods selected makes "vs last period" meaningless).
- Show current selections visibly ("Q3 2025 · North · Electronics") so screenshots are self-describing.

**Cross-filtering** — clicking a bar filters other visuals. Powerful, disorienting; teach users with a hint icon, and provide a "clear all filters" escape hatch (users WILL get lost without it).

**Drill-down** — define hierarchies once (Year → Quarter → Month; Region → Store) and users can descend themselves instead of requesting "can you also show monthly?" tickets.

**Sync & scope** — decide which slicers affect which pages (period syncs everywhere; team filter only on the team page).

**Bookmarks/buttons** — for toggle views (Units vs Revenue) and reset actions. Use sparingly; discoverability is poor.

**Trust layer** — a "last refreshed" timestamp and a definitions tooltip on every KPI (revenue = net of refunds? says so). The fastest way to lose a dashboard war is two people computing "revenue" differently in a meeting.

> TIP: The Dashboard Studio's per-widget filter + your global dataset choice mirror this exactly: build one dashboard with a period filter and one category filter — then ask a friend to find "North Electronics Q2" in under 10 seconds. If they can, the design passed.`,
          takeaways: [
            "Slicers: Period, Geo, Category — resist everything else",
            "Drill hierarchies kill repetitive requests",
            "Refresh timestamp + metric definitions = trust",
          ],
          practice: "Add two filters to a dashboard and test the 10-second find test with someone (or with a checklist written as if you were the exec).",
        },
      ],
    },
    {
      id: "i5",
      title: "Spreadsheet Power User",
      summary: "Lookups, conditional logic families, pivot deep-dives and scenario analysis — Excel as a real analysis engine.",
      lessons: [
        {
          id: "i5l1",
          title: "Lookups: VLOOKUP → XLOOKUP → INDEX-MATCH",
          minutes: 10,
          content: `Lookups join tables *inside* a spreadsheet — the bridge between "SQL joins" and Excel reality.

**VLOOKUP** (the classic, still everywhere in corporate land):
~~~
=VLOOKUP(A2, Customers!A:D, 3, FALSE)
~~~
Finds A2 (customer id) in the FIRST column of the range, returns the 3rd column, FALSE = exact match. Its flaws: cannot look left, breaks silently when columns are inserted, and the range lock ~$~ matters on copy-down.

**INDEX-MATCH** (the pro classic — direction-free and insert-proof):
~~~
=INDEX(Customers!C:C, MATCH(A2, Customers!A:A, 0))
~~~
~MATCH~ finds the row number; ~INDEX~ fetches that row from any column. Works left, right, any order.

**XLOOKUP** (the modern replacement):
~~~
=XLOOKUP(A2, Customers!A:A, Customers!C:C, "Not found")
~~~
Exact by default, looks any direction, has a built-in if-not-found. In real Excel: this is the one to learn first.

The **join mindset** is the real skill: identify the key column, ensure both sides share format (trimmed, same case — text chaos breaks lookups invisibly), then fetch attributes. ~SUMIF~/~COUNTIF~ from the Beginner level are "lookup + aggregate" cousins.

> TIP: The Excel Studio supports ~VLOOKUP~-style thinking via SUMIF/COUNTIF; practice the *patterns* here, then verify syntax in real Excel/Sheets. Exercise: load Retail Sales, then SUMIF revenue by each region into a small side summary — that is a manual pivot, and it teaches you what pivots automate.`,
          takeaways: [
            "VLOOKUP legacy, INDEX-MATCH pro, XLOOKUP modern default",
            "Key format mismatches break lookups silently — trim & case-normalize first",
            "SUMIF family = lookup thinking with aggregation",
          ],
          practice: "Build a 4-row region summary in Excel Studio using SUMIF/COUNTIF: region, revenue, orders, AOV. Compare with a pivot of the same data.",
        },
        {
          id: "i5l2",
          title: "The IF Family: IF, IFS, SUMIFS, COUNTIFS",
          minutes: 9,
          content: `Conditional logic is where spreadsheets stop being calculators and start being analysts.

**IF** — one branch: ~~=IF(J2>=1000,"Big","Normal")~~
**Nested IF / IFS** — multiple tiers:
~~~
=IFS(J2>=1000,"Gold", J2>=500,"Silver", TRUE,"Bronze")
~~~
(IFS reads top-down, stops at first true; ~TRUE~ as the final condition = else.)

**SUMIFS / COUNTIFS / AVERAGEIFS** — multiple conditions:
~~~
=SUMIFS(J:J, E:E,"North", F:F,"Electronics")
=COUNTIFS(E:E,"North", G:G,"Standing Desk")
~~~
→ revenue for North-Electronics; count of Standing Desk orders in North. This is a *filtered pivot in one cell* — and the pattern transfers directly to SQL's ~WHERE~ + ~SUM~, pandas' ~groupby~, and DAX's ~CALCULATE~.

**Design discipline for complex formulas:**

1. Build ONE condition, verify, then add the next — never write the 4-condition monster blind.
2. Put criteria in cells and reference them (~$B$1~ = "North") — the sheet becomes an interactive tool.
3. Name ranges in real Excel (~Revenue~, ~Region~) for readability.
4. Test the boundaries: exactly 1000, exactly 500, empty cell.

> REAL WORLD: A pricing analyst builds a "what's the discount for this customer?" sheet: IFS tiers by volume + SUMIFS history. Non-technical sales uses it daily. That is analytics leverage without any code — and it makes you the person who builds the tools, not just the reports.`,
          takeaways: [
            "IFS tiers beat nested-IF spaghetti",
            "SUMIFS/COUNTIFS = multi-condition aggregation = SQL WHERE in a cell",
            "Parameterize criteria in cells — formula becomes a tool",
          ],
          practice: "In Excel Studio create a mini scoring engine: if revenue>800 'A', >400 'B', else 'C' — then COUNTIFS to size each tier.",
        },
        {
          id: "i5l3",
          title: "Pivot Deep Dive: % Share, Running Totals, Differences",
          minutes: 8,
          content: `Beyond basic group-bys, pivots (and their visual twin in the Dashboard Studio) compute the four calculations analysts live on. Here is how each works conceptually — and what to click in real Excel:

**1. % of total (share)** — each region's slice of revenue. Excel: Value Field Settings → Show Values As → % of Grand Total. The Dashboard Studio equivalent: KPI + share bar chart, or compute ~SUMIF(region)/SUM$~ in a cell.

**2. % of parent** — each category's share *within* its region — exposes mix: "South is 30% of total revenue but 55% of it is Office Supplies." The mix-vs-magnitude distinction is a promotion-grade insight.

**3. Running total** — cumulative revenue by month: pace against targets. Excel: Show Values As → Running Total In. Dashboard equivalent: area/line of cumulative sum (the Studio's line chart on a cumulative helper column).

**4. Difference from** — month-over-month delta: Show Values As → Difference From → previous month. Instant "which month broke the trend".

The analysis moves these enable:

- **Pareto**: sort products by revenue desc + running total % → "the top 20% of SKUs = 68% of revenue" (find the cut point).
- **Mix shift**: share-by-segment this year vs last → what changed under a flat total.
- **Contribution to growth**: each region's delta ÷ total delta → who *caused* the quarter.

> TIP: These four show-values modes + sorting cover 90% of "advanced pivot" interview questions. Rehearse the Pareto move until it takes you under 2 minutes.`,
          takeaways: [
            "% of total vs % of parent = magnitude vs mix",
            "Running total → pacing; Difference-from → trend breaks",
            "Pareto (sorted + cumulative %) is the killer 2-minute analysis",
          ],
          practice: "Compute a Pareto on products: sort by revenue, add cumulative %, find the smallest set covering 80% of revenue.",
        },
        {
          id: "i5l4",
          title: "Scenario & What-If Analysis",
          minutes: 8,
          content: `Analysts get asked "what if we grow 10%?" weekly. Spreadsheets answer this *live* if you structure them right.

**1. Parameterize.** Never hardcode assumptions in formulas. Put drivers in a clearly-marked block: ~growth_rate = 10%~ in B1, formulas reference ~$B$1~. Change one cell, the whole model breathes. (This is the single highest-leverage spreadsheet habit.)

**2. Data tables (What-If).** One-variable: rows of growth rates (0%, 5%, 10%...) → resulting revenue via one formula. Two-variable: growth × price → a sensitivity grid. In real Excel: Data → What-If Analysis → Data Table. The point: leadership sees the *range*, not one guess.

**3. Goal Seek.** Reverse question: "what growth do we need for $2M revenue?" Goal Seek adjusts the driver to hit a target. Great for break-even discussions.

**4. Scenario manager / switch cells.** Named scenarios (base, upside, downside) via a dropdown that flips multiple drivers at once.

**5. Sensitivity honesty.** Present a base case + best/worst with the drivers stated: "±3pp on churn moves next-quarter revenue ±$45k" — that sentence makes you sound (and be) senior.

> REAL WORLD: FP&A analysts live on this. A marketing analyst with a parameterized budget model answers "what if we shift $10k from Meta to Google?" in 30 seconds during the meeting — while the person with hardcoded numbers goes silent. Build the model BEFORE the meeting; look like a wizard IN it.

> TIP: In the Excel Studio, build a mini revenue model: B1 = growth %, B2 = base revenue, B3 = ~B2*(1+B1)~. Play with B1. Congratulations — that is scenario analysis, the baby version of what FP&A does full-time.`,
          takeaways: [
            "Parameters in cells; formulas reference them — models stay alive",
            "Data tables show ranges; Goal Seek answers reverse questions",
            "Always present base/upside/downside with stated drivers",
          ],
          practice: "Build the 3-cell model above, then add a SUMIFS-driven 'current revenue' cell as the base. Change growth to -10% and watch it respond.",
        },
      ],
    },
  ],
};

export const CURRICULUM_A: PathLevel[] = [beginner, intermediate];
