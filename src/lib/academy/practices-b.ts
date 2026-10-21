// Practice labs — INTERMEDIATE level (i1l1 … i5l4).

import type { Practice } from "./practices";

export const PRACTICES_B: Record<string, Practice> = {
  i1l1: {
    kind: "sql",
    title: "First queries on the store database",
    brief: "SwiftCart's live store DB: 45 customers, 230 orders. Pull the first lists a real analyst would need.",
    sqlTasks: [
      {
        prompt: "List every customer in the 'Enterprise' segment.",
        solution: "SELECT * FROM customers WHERE segment = 'Enterprise'",
      },
      {
        prompt: "Show the name and city of every London customer, sorted by name.",
        solution: "SELECT name, city FROM customers WHERE city = 'London' ORDER BY name",
      },
    ],
    hints: ["SELECT picks columns, FROM picks the table, WHERE filters rows.", "Text values need single quotes: 'Enterprise'.", "ORDER BY name sorts the result alphabetically."],
    functions: ["SELECT", "WHERE", "ORDER BY"],
  },

  i1l2: {
    kind: "sql",
    title: "GROUP BY — where analysis starts",
    brief: "Counts per group are the first question of every analysis. Aggregate the store tables.",
    sqlTasks: [
      {
        prompt: "Number of orders per status (orders table).",
        solution: "SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY status",
      },
      {
        prompt: "Number of customers per segment (customers table).",
        solution: "SELECT segment, COUNT(*) AS customers FROM customers GROUP BY segment ORDER BY segment",
      },
    ],
    hints: ["Every non-aggregated column in SELECT must appear in GROUP BY.", "COUNT(*) counts rows; name it with AS for a clean header.", "ORDER BY makes the output readable and deterministic."],
    functions: ["COUNT", "GROUP BY", "ORDER BY", "AS"],
  },

  i1l3: {
    kind: "sql",
    title: "JOINs — combining tables",
    brief: "The store splits data across tables (that's normalisation). Join it back together to answer business questions.",
    sqlTasks: [
      {
        prompt: "Every order with its customer's name and city (join orders → customers).",
        solution: "SELECT o.id, c.name, c.city, o.order_date, o.status FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.id",
      },
      {
        prompt: "Revenue per product — line total is quantity × unit_price (two joins: order_items → products).",
        solution: "SELECT p.name, ROUND(SUM(oi.quantity*oi.unit_price),2) AS revenue FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.name ORDER BY revenue DESC, p.name",
      },
    ],
    hints: ["JOIN ... ON connects the foreign key to the primary key.", "Aliases (o, c, oi, p) keep long queries readable.", "Revenue per product = SUM(quantity × unit_price) GROUP BY product name."],
    functions: ["JOIN", "ON", "SUM", "GROUP BY", "ROUND"],
  },

  i1l4: {
    kind: "sql",
    title: "CTEs — organizing complex logic",
    brief: "Top cities by revenue needs a two-stage query: aggregate first, then rank. Do it the readable way — with a CTE.",
    sqlTasks: [
      {
        prompt: "Top 3 cities by revenue, using a WITH clause (join orders→customers→order_items).",
        solution:
          "WITH city_rev AS (SELECT c.city, ROUND(SUM(oi.quantity*oi.unit_price),2) AS revenue FROM orders o JOIN customers c ON c.id=o.customer_id JOIN order_items oi ON oi.order_id=o.id GROUP BY c.city) SELECT city, revenue FROM city_rev ORDER BY revenue DESC, city LIMIT 3",
      },
    ],
    hints: ["WITH name AS (query) builds a named temp result you can SELECT from.", "Stage 1: revenue per city. Stage 2: ORDER BY revenue DESC LIMIT 3.", "Read a CTE as 'first compute this, then…'."],
    functions: ["WITH", "JOIN", "GROUP BY", "ORDER BY", "LIMIT"],
  },

  i1l5: {
    kind: "sql",
    title: "Window functions — rank without collapsing rows",
    brief: "Window functions rank and total ACROSS rows while keeping every row visible. Rank the biggest order lines.",
    sqlTasks: [
      {
        prompt: "Top 5 biggest order lines with their rank (1 = largest). Use ROW_NUMBER() OVER (...) in a CTE.",
        solution:
          "WITH ranked AS (SELECT id, quantity, unit_price, quantity*unit_price AS line_rev, ROW_NUMBER() OVER (ORDER BY quantity*unit_price DESC) AS rnk FROM order_items) SELECT * FROM ranked WHERE rnk <= 5",
      },
    ],
    hints: ["ROW_NUMBER() OVER (ORDER BY expr DESC) numbers rows by expr without grouping.", "Wrap it in a CTE, then filter rnk <= 5 outside — you can't filter window results in the same WHERE.", "Line revenue = quantity × unit_price."],
    functions: ["ROW_NUMBER", "OVER", "ORDER BY", "WITH"],
  },

  i2l1: {
    kind: "clean",
    title: "Spot the horsemen",
    brief: "Retail Sales H2-2024 (Messy) just arrived from a regional team. Name the right fix for each classic problem — before touching anything.",
    dataset: "messy_sales",
    issues: [
      {
        situation: "Customer names appear as 'acme corp', 'ACME CORP' and 'Acme Corp' in the same column.",
        options: [
          "Leave them — analysis still works",
          "Standardise capitalisation (Proper Case) so groups match",
          "Delete all rows with short names",
          "Rename the column",
        ],
        correct: 1,
        explain: "Group-by treats different cases as different customers. Standardising case is step one of text cleaning.",
      },
      {
        situation: "Some prices are stored as text like '$1,200.00'.",
        options: [
          "Nothing — Excel shows them fine",
          "Strip '$' and commas, then convert to real numbers",
          "Delete those rows",
          "Multiply by 100",
        ],
        correct: 1,
        explain: "Text-numbers silently break SUM and AVERAGE. Convert AFTER stripping symbols.",
      },
      {
        situation: "Dates mix '2024-11-03' and '03-Nov-2024' formats.",
        options: [
          "Sort and hope",
          "Normalise every value to ONE date format (e.g. YYYY-MM-DD)",
          "Delete the date column",
          "Keep both — variety is fine",
        ],
        correct: 1,
        explain: "Mixed formats sort wrong and break month grouping. One format, everywhere.",
      },
      {
        situation: "Two rows are exact copies of each other.",
        options: [
          "Keep both — more data is better",
          "Remove the duplicate row",
          "Average the two",
          "Change one row's values",
        ],
        correct: 1,
        explain: "Duplicates inflate every total. Remove them before any aggregation.",
      },
    ],
    hints: ["The seven horsemen: blanks, duplicates, whitespace, text-numbers, mixed dates, mixed case, contradictions.", "Text problems → standardise; structural problems → remove."],
  },

  i2l2: {
    kind: "clean",
    title: "Missing values — fix, fill, or drop?",
    brief: "The messy sales file has three different missing-value situations. Each deserves a DIFFERENT treatment — match them.",
    dataset: "messy_sales",
    issues: [
      {
        situation: "customer (the name) is blank on 4 rows.",
        options: [
          "Fill with 'Unknown'",
          "Drop those rows — you can't attribute the order without the customer",
          "Fill with the previous row's customer",
          "Leave blank",
        ],
        correct: 1,
        explain: "A missing KEY (who bought?) can't be invented. Dropping a few unattributable rows beats fabricating them.",
      },
      {
        situation: "units is blank on 9 rows, but price and product are present.",
        options: [
          "Drop the rows",
          "Fill with the MEDIAN units of that product's other orders",
          "Fill with 999",
          "Fill with 0",
        ],
        correct: 1,
        explain: "Median-fill preserves the distribution without inventing extremes — the standard treatment for numeric gaps.",
      },
      {
        situation: "One row is completely empty except the order_id.",
        options: [
          "Remove the empty row",
          "Fill every cell with 'N/A'",
          "Keep it — the id matters",
          "Copy another row over it",
        ],
        correct: 0,
        explain: "A row with only an id carries zero information — remove it. Don't paper over structural junk.",
      },
    ],
    hints: ["Keys → drop. Numerics → median-fill. Structural junk → remove.", "Never invent values for identifier columns.", "Median beats mean for filling — it resists outliers."],
  },

  i2l3: {
    kind: "clean",
    title: "Duplicates, text chaos & bad dates",
    brief: "Text chaos is 80% of cleaning. Call the right move for each.",
    dataset: "messy_sales",
    issues: [
      {
        situation: "The exact same order appears twice — every column identical.",
        options: [
          "Keep both (double revenue!)",
          "Remove duplicates — keep one copy",
          "Change the second row's id",
          "Sort them apart",
        ],
        correct: 1,
        explain: "Exact duplicates are pure inflation. Dedupe on the whole row first, then consider key-based dedupes.",
      },
      {
        situation: "region contains ' north ', 'North', 'NORTH'.",
        options: [
          "TRIM the spaces and standardise the case in one pass",
          "Delete the region column",
          "Create three new regions",
          "Leave it — filters still work",
        ],
        correct: 1,
        explain: "TRIM kills invisible whitespace that breaks matches; consistent case kills the rest. One pass, one clean column.",
      },
      {
        situation: "'2024-13-01' appears in order_date — month 13.",
        options: [
          "It's fine, Excel will figure it out",
          "Flag as INVALID — month 13 cannot exist; correct it at the source or null it",
          "Change it to January 2025 for all such rows",
          "Delete the whole date column",
        ],
        correct: 1,
        explain: "Impossible dates are errors, not creative data. Never auto-guess a correction — flag and fix deliberately.",
      },
    ],
    hints: ["TRIM + PROPER case solve most text chaos.", "Impossible values (month 13) are errors to flag, not values to keep.", "Dedupe before aggregating — always."],
  },

  i2l4: {
    kind: "clean",
    title: "Outlier verdicts",
    brief: "Two planted outliers and one contradiction. Give each a verdict and an action.",
    dataset: "messy_sales",
    issues: [
      {
        situation: "unit_price = -12.50 on one row.",
        options: [
          "Signal — a discount gone wild",
          "Error — negative prices are impossible; fix or remove",
          "Keep and mention in a footnote",
          "Set to the column average",
        ],
        correct: 1,
        explain: "Impossible by definition → error. Replace with the corrected source value or drop the row; never silently average it away.",
      },
      {
        situation: "One customer has 40 orders; everyone else has 1–6.",
        options: [
          "Delete the customer — statistically abnormal",
          "Verify first — could be a real wholesale account (signal); confirm with the business",
          "Cap their orders at 6",
          "Split them into 7 customers",
        ],
        correct: 1,
        explain: "An extreme that CAN exist in reality is signal — possibly your best customer. Statistical flags deserve business verification.",
      },
      {
        situation: "A completed order has revenue = 0 but units = 3 and a valid price.",
        options: [
          "It's a giveaway — keep as is",
          "Error — recompute revenue = units × unit_price (or pull the correct value)",
          "Set units to 0",
          "Delete the row",
        ],
        correct: 1,
        explain: "Internal contradiction → recompute from the components when the math is deterministic. Document every fix in the log.",
      },
    ],
    hints: ["Impossible → error. Unusual-but-possible → verify.", "Deterministic relationships (revenue = units × price) can be recomputed.", "Every fix goes in the cleaning log."],
  },

  i2l5: {
    kind: "quiz",
    title: "Tidy data rules",
    brief: "Before exporting anything, check you can spot untidy structure on sight.",
    questions: [
      {
        q: "The first rule of tidy data:",
        options: ["One variable per column", "One year per workbook", "One colour per row", "One sheet per employee"],
        correct: 0,
        explain: "One variable per column, one observation per row, one table per sheet — Hadley Wickham's rules that everything downstream relies on.",
      },
      {
        q: "Columns 'Jan', 'Feb', 'Mar' each holding sales violate tidy data because:",
        options: [
          "Months are VALUES — they belong in one 'month' column",
          "Nothing, that's the ideal layout",
          "Column names are too short",
          "Excel doesn't allow it",
        ],
        correct: 0,
        explain: "Spreading values across columns makes every formula harder. Melt them into month + value rows.",
      },
      {
        q: "A cleaning log exists so that:",
        options: [
          "Others (and future-you) can reproduce every decision",
          "The file gets heavier",
          "It looks professional",
          "Nobody ever asks questions",
        ],
        correct: 0,
        explain: "Reproducibility is the difference between analysis and improvisation. The Cleaner tool writes the log for you.",
      },
    ],
    hints: ["Variables in columns, observations in rows.", "If pivoting requires re-typing formulas, the layout wasn't tidy."],
  },

  i3l1: {
    kind: "quiz",
    title: "The chart decision tree",
    brief: "Four questions, four charts. Pick the honest encoding for each.",
    questions: [
      {
        q: "(a) Which of 5 channels has the best ROAS?",
        options: ["Bar chart, sorted descending", "Line chart", "Pie with 5 slices", "Scatter"],
        correct: 0,
        explain: "Few categories, one comparison → sorted bars. The best channel is literally the longest bar.",
      },
      {
        q: "(b) Signups per week across a year?",
        options: ["Line chart", "3D pie", "Table only", "Map"],
        correct: 0,
        explain: "Time series → line. Weekly granularity with 52 points reads perfectly.",
      },
      {
        q: "(c) Does ad spend relate to conversions?",
        options: ["Scatter plot", "Pie chart", "Stacked bar", "Gauge"],
        correct: 0,
        explain: "Two numeric variables and their relationship → scatter. Each dot is a channel-week.",
      },
      {
        q: "(d) What % of revenue comes from each of 4 categories?",
        options: [
          "Donut with ≤5 slices (or a 100% stacked bar)",
          "3D pie with exploded slices",
          "Radar chart",
          "Word cloud",
        ],
        correct: 0,
        explain: "Part-of-whole with FEW parts → donut/pie is acceptable; stacked bars compare better across time.",
      },
    ],
    hints: ["Comparison → bar · Trend → line · Relationship → scatter · Part-of-whole → pie/donut.", "If the encoding needs a legend-tour to decode, downgrade it."],
  },

  i3l2: {
    kind: "quiz",
    title: "Design: colour, order, labels",
    brief: "Your bar chart is technically correct and completely unreadable. Fix the design.",
    questions: [
      {
        q: "The most readable order for a categorical bar chart:",
        options: ["Sorted descending by value", "Alphabetical, always", "Random", "By the analyst's favourite"],
        correct: 0,
        explain: "Sorted descending turns a chart into a ranking — the reader's eye does the analysis instantly.",
      },
      {
        q: "The fastest way to mislead with a bar chart:",
        options: [
          "Truncate the y-axis so bars start at 90 instead of 0",
          "Use too few gridlines",
          "Write a long title",
          "Use the colour green",
        ],
        correct: 0,
        explain: "Bars encode by LENGTH — cutting the baseline exaggerates tiny differences into fake drama.",
      },
      {
        q: "Direct labels on bars are better than a legend because:",
        options: [
          "The reader never has to travel between the legend and the data",
          "Legends are illegal",
          "They use more ink",
          "They animate better",
        ],
        correct: 0,
        explain: "Every eye-travel you remove is comprehension you gain. Label the data itself.",
      },
    ],
    hints: ["Sort, don't alphabetise.", "Bar charts start at zero — always.", "Label directly where possible."],
  },

  i3l3: {
    kind: "quiz",
    title: "Dashboards users actually use",
    brief: "Before shipping Project 2, prove you know the 5s/30s/5min canon.",
    questions: [
      {
        q: "The 5-second layer of a dashboard shows:",
        options: ["The 3–5 headline KPIs", "Every row of data", "Raw exports", "Vacation photos"],
        correct: 0,
        explain: "Headline numbers first — value + comparison. Executives may never scroll further, by design.",
      },
      {
        q: "Filters and slicers belong:",
        options: ["Top or left, visibly labelled", "Hidden in a tooltip", "On page 40", "In the footer"],
        correct: 0,
        explain: "Interaction affordances must be VISIBLE — users can't use what they can't find.",
      },
      {
        q: "One KPI card should display:",
        options: [
          "The value + a comparison (vs target or vs last period)",
          "A paragraph of context",
          "12 decimal places",
          "A random number",
        ],
        correct: 0,
        explain: "'$48.2k · ▲ 6% vs last month' — a number without a comparison is trivia.",
      },
    ],
    hints: ["5 seconds = KPIs · 30 seconds = trends · 5 minutes = detail.", "Every number needs a reference point."],
  },

  i3l4: {
    kind: "quiz",
    title: "Insight → action",
    brief: "Dashboards inform; stories decide. Check your storytelling structure.",
    questions: [
      {
        q: "A real insight is:",
        options: [
          "A quantified change + its driver + a suggested action",
          "Any number on a dashboard",
          "A chart someone liked",
          "The data export itself",
        ],
        correct: 0,
        explain: "Number + cause + action. Missing one leg and it's an observation, not an insight.",
      },
      {
        q: "The executive summary goes:",
        options: ["First — BLUF (bottom line up front)", "Last, as a twist", "Nowhere", "In an appendix"],
        correct: 0,
        explain: "Executives read the first line and decide whether to read more. Respect their time; lead with the answer.",
      },
      {
        q: "'Revenue fell 12% in the South, driven by Electronics returns — recommend a supplier audit' is:",
        options: [
          "A proper insight → action arc",
          "Just a title",
          "Too long for anyone",
          "A pie chart in words",
        ],
        correct: 0,
        explain: "Quantified change (−12%), driver (returns), action (audit). That's the whole formula.",
      },
    ],
    hints: ["BLUF: the recommendation is the first sentence.", "Every insight ends with a verb."],
  },

  i4l1: {
    kind: "quiz",
    title: "How BI tools think",
    brief: "Power BI isn't a spreadsheet — it's a model with filter context. Prove you've made the mental switch.",
    questions: [
      {
        q: "In our store model (customers → orders → order_items → products), the FACT table is:",
        options: ["orders / order_items — the events being measured", "customers", "products", "the calendar"],
        correct: 0,
        explain: "Facts are the measurable events (orders, sales). Dimensions (customer, product, date) describe them.",
      },
      {
        q: "Dimension tables are:",
        options: [
          "Descriptive entities you slice by — customer, product, date",
          "Always numeric",
          "Random lookup junk",
          "The same as measures",
        ],
        correct: 0,
        explain: "Dimensions answer 'by what?' — every slicer and axis comes from one.",
      },
      {
        q: "When you click 'West' on a slicer, measures:",
        options: [
          "Recalculate within the filter context — every visual updates",
          "Do nothing",
          "Get deleted",
          "Change colour only",
        ],
        correct: 0,
        explain: "Filter context is THE core BI concept — you saw it live when building filtered bars in Dashboard Studio.",
      },
    ],
    hints: ["Facts = events with numbers. Dimensions = who/what/when.", "One filter click = a new context = recomputed measures."],
  },

  i4l2: {
    kind: "quiz",
    title: "Star schema & grain",
    brief: "Classify the store's tables like a modeller before building anything.",
    questions: [
      {
        q: "The orders table's grain is:",
        options: ["One row per order", "One row per customer", "One row per day", "One row per product"],
        correct: 0,
        explain: "State the grain of every table before joining — grain mismatches are the #1 cause of wrong totals.",
      },
      {
        q: "Which of these is a dimension?",
        options: ["products", "total_revenue", "SUM()", "a KPI"],
        correct: 0,
        explain: "products describes things you slice by. The rest are computations (measures).",
      },
      {
        q: "The star schema helps because:",
        options: [
          "Filtering/slicing stays fast and simple — dimensions radiate from the fact table",
          "It looks like a star",
          "More tables is always better",
          "It hides the data",
        ],
        correct: 0,
        explain: "One fact + dimensions = predictable joins, fast filters, and measures that stay correct.",
      },
    ],
    hints: ["Grain first, tables second.", "If a table answers 'by what?', it's a dimension."],
  },

  i4l3: {
    kind: "dax",
    title: "Your first three measures",
    brief: "The Dashboard Studio Sales model is live. Write the measures every BI report opens with.",
    daxTasks: [
      { prompt: "Total revenue measure.", solution: "SUM('Sales'[revenue])" },
      { prompt: "Number of orders (rows in the Sales table).", solution: "COUNTROWS('Sales')" },
      { prompt: "Average order value — use DIVIDE (it handles divide-by-zero).", solution: "DIVIDE(SUM('Sales'[revenue]), COUNTROWS('Sales'))" },
    ],
    hints: ["Measures aggregate COLUMNS: SUM('Table'[Column]).", "COUNTROWS counts a table, not a column.", "DIVIDE(numerator, denominator) is the safe division — never use / for measures."],
    functions: ["SUM", "COUNTROWS", "DIVIDE"],
  },

  i4l4: {
    kind: "quiz",
    title: "Filters, slicers & the 10-second test",
    brief: "Interactive design is what separates a report from a picture. Check the interactions.",
    questions: [
      {
        q: "A slicer differs from a hidden page filter because:",
        options: ["It's a visible control users can click", "It's faster", "It's prettier", "It deletes data"],
        correct: 0,
        explain: "Slicers hand control to the user — self-service is the point of BI.",
      },
      {
        q: "Cross-filtering means:",
        options: [
          "Clicking one visual filters the others on the page",
          "Sorting two visuals at once",
          "Nothing — it's a myth",
          "Only works in Excel",
        ],
        correct: 0,
        explain: "You tested it live in Dashboard Studio: click a bar, watch every KPI recalculate.",
      },
      {
        q: "The 10-second find test passes when:",
        options: [
          "An executive can find the headline number within 10 seconds",
          "The page loads in 10 seconds",
          "There are exactly 10 visuals",
          "The title is 10 words",
        ],
        correct: 0,
        explain: "Layout is a hierarchy: KPIs → trends → detail. The eye should land on the answer first.",
      },
    ],
    hints: ["Visible controls > hidden magic.", "Click-to-filter is the interaction model of every BI tool."],
  },

  i5l1: {
    kind: "excel",
    title: "The lookup family, applied",
    brief: "Build the 4-row region summary from the lesson — SUMIF and COUNTIF are the lookup workhorses of analysis.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "East region revenue.", cell: "M1", solution: "=SUMIF(D2:D199,\"East\",I2:I199)", hint: "SUMIF(D:D range, \"East\", I:I range)." },
      { prompt: "East region order count.", cell: "M2", solution: "=COUNTIF(D2:D199,\"East\")", hint: "COUNTIF with one range and the criteria." },
      { prompt: "East region AOV (average order value, 2 decimals).", cell: "M3", solution: "=ROUND(SUMIF(D2:D199,\"East\",I2:I199)/COUNTIF(D2:D199,\"East\"),2)", hint: "AOV = revenue ÷ orders — reuse your two answers: M1/M2 logic with full formulas." },
    ],
    hints: ["SUMIF + COUNTIF cover 90% of summary-table needs.", "AOV is always revenue ÷ orders.", "VLOOKUP/XLOOKUP find VALUES; SUMIF/COUNTIF build summaries."],
    functions: ["SUMIF", "COUNTIF", "ROUND"],
  },

  i5l2: {
    kind: "excel",
    title: "The IF family — build a scoring engine",
    brief: "Tier your orders like the lesson: A over $800, B over $400, else C — then size each tier.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Tier of the FIRST order (row 2): A if revenue>800, B if >400, else C.", cell: "M1", solution: "=IF(I2>800,\"A\",IF(I2>400,\"B\",\"C\"))", hint: "Nested IF: =IF(I2>800,\"A\",IF(I2>400,\"B\",\"C\"))." },
      { prompt: "How many tier-A orders exist (revenue > 800)?", cell: "M2", solution: "=COUNTIF(I2:I199,\">800\")", hint: "The A-tier IS revenue > 800 — count it directly." },
      { prompt: "South region Furniture revenue (two conditions — SUMIFS).", cell: "M3", solution: "=SUMIFS(I2:I199,D2:D199,\"South\",E2:E199,\"Furniture\")", hint: "SUMIFS(sum_range, crit_range1, crit1, crit_range2, crit2) — note the sum range comes FIRST." },
    ],
    hints: ["Nested IFs read inside-out; order the thresholds high→low.", "SUMIFS plural takes the sum range first — the classic gotcha.", "Criteria are strings even for numbers: \">800\"."],
    functions: ["IF", "COUNTIF", "SUMIFS"],
  },

  i5l3: {
    kind: "excel",
    title: "Pareto: the vital few products",
    brief: "80% of revenue usually comes from ~20% of products. Compute the shares that prove (or break) the rule here.",
    dataset: "clean_sales",
    tasks: [
      { prompt: "Total revenue across all orders.", cell: "M1", solution: "=SUM(I2:I199)", hint: "One SUM over the revenue column." },
      { prompt: "Revenue of 'Office Chair' (column F = product).", cell: "M2", solution: "=SUMIF(F2:F199,\"Office Chair\",I2:I199)", hint: "SUMIF(F2:F199,\"Office Chair\",I2:I199)." },
      { prompt: "Office Chair's % share of total revenue (0–100, 1 decimal).", cell: "M3", solution: "=ROUND(SUMIF(F2:F199,\"Office Chair\",I2:I199)/SUM(I2:I199)*100,1)", hint: "product revenue ÷ total revenue × 100 — reuse both formulas in one." },
    ],
    hints: ["Pareto = sort desc + cumulative % — this is its atomic unit.", "% share = part ÷ whole × 100.", "Keep the product name EXACT: \"Office Chair\"."],
    functions: ["SUM", "SUMIF", "ROUND"],
  },

  i5l4: {
    kind: "quiz",
    title: "Scenario & what-if models",
    brief: "You just built a 3-cell model where changing one input re-prices the future. Lock in the concepts.",
    questions: [
      {
        q: "Goal Seek answers which question?",
        options: [
          "What INPUT value reaches my target OUTPUT?",
          "What colour wins the dashboard?",
          "Who should be fired?",
          "When should I quit?",
        ],
        correct: 0,
        explain: "You used it in Excel Studio's Data tab: set revenue to a target, Goal Seek bisects the input that gets you there.",
      },
      {
        q: "A what-if model separates:",
        options: [
          "Inputs (growth %) from outputs (forecast revenue)",
          "Fonts from colours",
          "Sheets from cells",
          "Data from opinions",
        ],
        correct: 0,
        explain: "Inputs live in blue cells, outputs are formulas — change the input, the future recalculates.",
      },
      {
        q: "Changing growth from +5% to −10% should:",
        options: [
          "Instantly update outputs because formulas reference the input",
          "Require rebuilding the model",
          "Do nothing",
          "Break Excel",
        ],
        correct: 0,
        explain: "That instant response IS the model working — and why formulas must reference inputs, never hardcode them.",
      },
    ],
    hints: ["Inputs → blue cells. Outputs → formulas.", "Goal Seek = reverse-engineering the input."],
  },
};
