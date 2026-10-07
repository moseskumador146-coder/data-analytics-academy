"use client";

/* coach-help — Ask-the-coach Q&A knowledge base and "what real company work looks like"
   briefs for each tool. Written for absolute beginners: every answer is STRUCTURED —
   a short answer first, then the why, then exact numbered steps in THIS tool, a real
   example, and the trap to avoid. askCoach() also accepts live file context so answers
   can reference the exact file the learner has loaded. */

export interface AskContext {
  file?: string;
  rows?: number;
  cols?: number;
  topIssues?: string[]; // short titles from the Data Doctor scan
}

export interface AskEntry {
  kws: string[]; // lowercase keywords, any match triggers
  q: string;
  a: string; // markdown, structured
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

/* ---------- shared structure helpers ---------- */

/** Wrap a body into the standard structured answer layout. */
function structured(o: { short: string; why?: string; steps?: string[]; example?: string; watch?: string; next?: string }): string {
  const out: string[] = [];
  out.push(`**Short answer.** ${o.short}`);
  if (o.why) out.push(`**Why it matters.** ${o.why}`);
  if (o.steps?.length) {
    out.push("**How to do it here, step by step.**");
    o.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
  }
  if (o.example) out.push(`**Example.** ${o.example}`);
  if (o.watch) out.push(`> TIP: ${o.watch}`);
  if (o.next) out.push(`**Try next.** ${o.next}`);
  return out.join("\n\n");
}

/* ============================== EXCEL ============================== */

const EXCEL_ASK: AskEntry[] = [
  {
    kws: ["sum", "0", "zero", "wrong total", "not adding"],
    q: "Why does my SUM return 0?",
    a: structured({
      short: "SUM returns 0 when the cells it points at aren't really numbers — usually the range is wrong, or the 'numbers' are text wearing a number costume.",
      why: "Excel only adds true numeric values. Text like `$1,234`, `1,234 ` (trailing space) or `12%` looks right but adds nothing — so the total silently comes out as 0 and every chart built on it is wrong too.",
      steps: [
        "Check the range first: click the SUM cell and look at the highlighted box — does it actually cover every row? Whole-column style (`I:I`) avoids missed rows.",
        "Check the values: numbers align RIGHT, text aligns LEFT. If your 'numbers' sit on the left, they're text.",
        "Fix text-numbers: select the column → **Data ▸ Text to Columns ▸ Finish** (converts most), or use the Data Doctor's **Numbers stored as text → Fix now**.",
        "Re-check with `=COUNT(range)` — it counts numbers only; compare it against `=COUNTA(range)` which counts everything.",
      ],
      example: "`=SUM(I2:I341)` returns 0 → click I2: the value `$1,234.50` sits left-aligned. After Text to Columns, the cell holds the number 1234.5 and the SUM jumps to life.",
      watch: "Empty strings from formulas (`\"\"`) also break SUM quietly. COUNT will reveal them.",
      next: "Open the **Clean file** tab — it lists exactly which columns in YOUR file hold text-numbers, with the rows.",
    }),
  },
  {
    kws: ["vlookup", "xlookup", "lookup", "n/a", "#n/a"],
    q: "VLOOKUP vs XLOOKUP — and why #N/A?",
    a: structured({
      short: "VLOOKUP searches the first column of a range and returns a column counted from there; XLOOKUP is the modern replacement that searches any direction. #N/A just means 'not found' — and the cause is usually invisible spaces.",
      why: "Lookups power the most common real task there is: pull each order's price from a price list, each employee's department from HR. #N/A in a report reads as 'the analyst's data is broken' — so you need to diagnose it fast.",
      steps: [
        "VLOOKUP form: `=VLOOKUP(lookup_value, table_range, column_number, FALSE)` — the FALSE (exact match) is not optional in real work.",
        "XLOOKUP form: `=XLOOKUP(lookup_value, lookup_range, return_range, \"not found\")` — the 4th argument replaces ugly #N/A with a friendly message.",
        "If you get #N/A on a value you can SEE in the other table: run **Data ▸ Text tools ▸ Trim** on both columns, then try again — `'Office Chair '` ≠ `'Office Chair'`.",
        "For repeated enrichments, fill the formula down the column — same pattern analysts use for thousands of rows.",
      ],
      example: "`=XLOOKUP(\"Office Chair\", G2:G21, I2:I21, \"not found\")` returns 149 if G11 holds 'Office Chair', or the words 'not found' if the lookup misses.",
      watch: "VLOOKUP can't look left — that limitation alone is why XLOOKUP replaced it.",
      next: "Type a lookup against YOUR loaded file — pick a column, then XLOOKUP a value from another sheet.",
    }),
  },
  {
    kws: ["if", "condition", "flag", "logic", "ifs", "nested"],
    q: "How does IF work — can I nest conditions?",
    a: structured({
      short: "IF runs a test and returns one of two results. Nest it (or use IFS) for multiple levels — but fill-down a single IF per row first; that's the real-world pattern.",
      why: "IF is how analysis becomes a *decision*: High/Low risk, Above/Below target, Flag/OK. Managers don't read raw numbers — they read flags.",
      steps: [
        "Basic: `=IF(condition, value_if_true, value_if_false)` — e.g. `=IF(J2>1000, \"Big\", \"Small\")`.",
        "Several levels — nest: `=IF(J2>5000,\"XL\",IF(J2>1000,\"Big\",\"Small\"))` (read inside-out), or cleaner: `=IFS(J2>5000,\"XL\",J2>1000,\"Big\",TRUE,\"Small\")`.",
        "Write it in row 2, then **drag the fill handle** down — every row gets its own flag with shifted references.",
        "Test the edges: the row that's exactly 1000, an empty cell, a text cell.",
      ],
      example: "`=IF(J2>1000,\"Big\",\"Small\")` in row 2 → fill down 500 rows → the column becomes a category you can filter, count and chart.",
      watch: "Text results need quotes; numbers don't. `IF(A2>5, Yes, No)` fails — use `\"Yes\"`.",
      next: "Add a COUNTIF next to your flags: `=COUNTIF(K:K,\"Big\")` — instant summary.",
    }),
  },
  {
    kws: ["sumif", "sumifs", "countif", "countifs", "conditional sum", "averageif"],
    q: "How do I total only some rows (SUMIF/SUMIFS)?",
    a: structured({
      short: "SUMIF totals rows that match one condition; SUMIFS handles multiple conditions (sum range comes FIRST). COUNTIF/COUNTIFS/AVERAGEIF follow the same logic.",
      why: "'How much did the North region sell? How many orders over $500?' — this family of functions answers nearly every 'how much / how many for X' email you'll ever get. They're the workhorses of real spreadsheets.",
      steps: [
        "One condition: `=SUMIF(criteria_range, criteria, sum_range)` → `=SUMIF(F:F,\"North\",I:I)`.",
        "Multiple conditions: `=SUMIFS(sum_range, range1, crit1, range2, crit2, ...)` → `=SUMIFS(I:I, F:F,\"North\", E:E,\">500\")` — note the sum range moved to the front.",
        "Counts and averages: `=COUNTIF(I:I,\">500\")`, `=COUNTIFS(F:F,\"North\",I:I,\">500\")`, `=AVERAGEIF(F:F,\"West\",I:I)`.",
        "Criteria can point at cells: `=SUMIF(F:F, K1, I:I)` — change K1 and the total follows. That's how parameterised reports are built.",
      ],
      example: "Sales per region: list North/South/East/West in K1:K4, then `=SUMIF(F:F, K1, I:I)` in L1 and fill down — a summary table in 20 seconds.",
      watch: "Criteria for numbers-as-text (`\"123\"`) won't match true numbers 123 — clean the column first.",
      next: "Try **Consolidate** (Data tab) — it builds the whole per-group summary sheet for you.",
    }),
  },
  {
    kws: ["pivot", "pivotable", "pivot table", "summary"],
    q: "What is a PivotTable and when do I use one?",
    a: structured({
      short: "A PivotTable groups and summarises a table without formulas: drag a category to Rows, a number to Values, done. Use it to explore fast; use SUMIFS when the numbers must sit inside your own designed layout.",
      why: "Every reporting request starts exploratory — 'what have we got by region and month?' Pivots answer in seconds, and the same drag-drop pattern exists in Power BI (matrix visuals), so learning it here transfers directly.",
      steps: [
        "Make sure the data is one solid block: headers in row 1, no fully blank rows or columns (run the Clean file scan first).",
        "Insert tab ▸ **PivotTable**.",
        "Pick the row field (e.g. Region), the value field (e.g. Revenue) and the aggregate (SUM/COUNT/AVERAGE), optionally a column field.",
        "Excel writes a formatted summary sheet with a Grand Total row — read it, then chart the numbers if the story's good.",
      ],
      example: "Rows: Region · Values: SUM of Revenue → four rows + Grand Total: the entire 'revenue by region' answer without a single formula.",
      watch: "Pivot output is static — refresh/rebuild it after the data changes. Formulas update themselves.",
      next: "Compare with Consolidate (Data tab) — same aggregation, driven by a dialog instead of drags.",
    }),
  },
  {
    kws: ["clean", "messy", "duplicate", "trim", "text", "dirty"],
    q: "How do I clean messy data in Excel?",
    a: structured({
      short: "Follow the professional order: duplicates → text chaos → text-numbers → dates → blanks — and never touch the raw copy.",
      why: "Cleaning before analysis is why analysts' totals match and get believed. Every issue left in the file multiplies later: one duplicated row double-counts revenue in every chart built on top of it.",
      steps: [
        "Open the **Clean file** tab in the Live Coach — it scans YOUR loaded file and lists its actual problems with row numbers (every file is different).",
        "Work top-down, red first: **Remove Duplicates** (Data tab dialog), then **Trim/Proper** the text columns, then **text-numbers → numbers**.",
        "Standardise dates to one format (the doctor flags mixed formats and can fix them in one click).",
        "Handle blanks deliberately: fill from above, type N/A, or delete the rows — never leave them silently.",
        "Keep the raw sheet untouched; save the cleaned copy to your portfolio (that before/after is your cleaning log).",
      ],
      example: "A 160-row messy sales file typically shows: 8 duplicates, 20 blank cells, 30 `$`-text amounts, 3 date formats. The doctor lists each with counts — and ticks them off as you fix them.",
      watch: "Fixing 'symptoms' one cell at a time misses the pattern — always fix the whole column.",
      next: "Fix one issue class and watch the health score climb — that's the habit real data teams run.",
    }),
  },
  {
    kws: ["chart", "graph", "visual", "which chart"],
    q: "Which chart should I use?",
    a: structured({
      short: "Column/bar to compare categories, line to trend over time, pie sparingly for parts-of-a-whole, scatter for relationships. That sentence answers most interview chart questions too.",
      why: "The chart type IS the message: the same revenue data 'compares regions' as a column chart and 'shows recovery' as a line. Pick the chart by the question you're asked, not by what looks fancy.",
      steps: [
        "Select your category column + number column (Ctrl+Click to multi-select).",
        "Insert tab ▸ pick the chart: **Column** to compare (regions, products), **Line** for trends (months), **Pie** for shares of one whole (few slices only).",
        "Read the title as the question — rename it: 'Revenue by Region' beats 'Chart 1'.",
        "If a pie has more than ~5 slices, switch to a bar — thin slices can't be compared by eye.",
      ],
      example: "340 sales rows → Region + Revenue selected → column chart: East tallest, South shortest. Same data + Month + Revenue → line chart: steady climb since March.",
      watch: "3D effects and rainbow colors hide the data — flat bars with one accent color read best.",
      next: "Make the same comparison in Power BI Studio — cross-filtering turns the static chart interactive.",
    }),
  },
  {
    kws: ["filter", "hide", "subtotal", "hidden rows"],
    q: "Does SUM include hidden (filtered-out) rows?",
    a: structured({
      short: "Yes — SUM ignores nothing. For totals of only the visible rows, use SUBTOTAL(109, range).",
      why: "Filtered views are how analysts present slices ('North only'), and a total that doesn't match the visible rows destroys trust in the sheet instantly.",
      steps: [
        "Apply your filter (Data ▸ Filter, tick/untick values).",
        "In a cell above the data: `=SUBTOTAL(109, I2:I500)` — 109 means 'SUM of visible cells only'.",
        "Notice: rows hidden by an outline **group** are also excluded by SUBTOTAL — handy with Hide Detail views.",
        "Put it in the header area so the visible total is always on screen.",
      ],
      example: "Full SUM = 402,975. Filter to North → SUBTOTAL(109,…) shows 101,132: the number your manager actually expects to see.",
      watch: "SUBTOTAL(9,…) vs (109,…) differ on manually hidden rows — 109 is the safer choice.",
      next: "Try Data ▸ Subtotal — it inserts per-group subtotal rows with a Grand Total, finance-style.",
    }),
  },
  {
    kws: ["freeze", "header", "scroll"],
    q: "How do I keep headers visible while scrolling?",
    a: structured({
      short: "View ▸ Freeze Panes — Freeze Top Row for headers, or select B2 and Freeze Panes to lock both the header row and the first column.",
      why: "On a 340-row file, scrolled row 220 without frozen headers is just a wall of numbers — you can't tell what column you're even in. It's the first thing analysts do on any file taller than one screen.",
      steps: [
        "View tab ▸ **Freeze Panes** menu.",
        "Freeze Top Row → header row stays while you scroll down (this tool also auto-freezes it when you load a sample).",
        "Freeze First Column → row labels (e.g. Order ID) stay while you scroll right.",
        "Want both? Select cell **B2** first, then Freeze Panes — everything above and left of the selection locks.",
      ],
      example: "Load a sample, scroll to row 200: with Freeze Top Row you still see Order ID, Date, Revenue… above every value.",
      watch: "Freeze remembers only ONE anchor — re-freezing replaces the old freeze.",
      next: "Add an outline (Data ▸ Group) and Hide Detail — headers + collapsed groups = manager view.",
    }),
  },
  {
    kws: ["format", "currency", "percent", "date", "number format", "ctrl+1"],
    q: "How do number formats work?",
    a: structured({
      short: "Formats change appearance, never the stored value — Currency adds $, Percent multiplies the display by 100, Date renders serials as dates. Format per column, not per cell.",
      why: "Unformatted numbers make readers do unit-guessing ($? thousands? percent of what?). Consistent formats are the difference between a sheet that gets trusted and one that gets questioned in the meeting.",
      steps: [
        "Select the whole column (click the column letter) — column-level formatting keeps everything consistent.",
        "Home ▸ quick formats: $ for currency, % for shares, comma for thousands — or **Ctrl+1** for the full Format Cells dialog (decimals, font, fill, borders).",
        "Percent: the cell holds 0.25 and displays 25% — if you typed 25 expecting percent, divide by 100 or use the % button right after typing.",
        "Dates: real date values sort chronologically; text dates sort alphabetically — that's why the doctor flags mixed formats.",
      ],
      example: "Revenue 1234.5 → Currency → `$1,234.50` in every cell of the column; the stored value stays 1234.5 for all formulas.",
      watch: "If a format 'doesn't apply', the value is probably text (left-aligned) — clean it first (Text to Columns).",
      next: "Format-as-Table (Home) gives headers + banded rows in one click — the fastest professional polish.",
    }),
  },
  {
    kws: ["text to columns", "split", "delimiter", "separate"],
    q: "How do I split one column into two (Text to Columns)?",
    a: structured({
      short: "Data ▸ Text to Columns: pick the delimiter (comma, space, tab…), finish, and the column splits into real columns — 'Austin, TX' becomes 'Austin' | 'TX'.",
      why: "One column holding two facts can't be filtered, grouped or counted properly. City and State are separate questions to a manager — so they must be separate columns to Excel.",
      steps: [
        "Click any cell in the column to split.",
        "Data tab ▸ **Text to Columns**.",
        "Choose the separator (Comma for 'Austin, TX'; Space for 'Ava Nguyen'; Tab for pasted data) → Next → Finish.",
        "New columns are inserted to the right — nothing is overwritten in this tool.",
      ],
      example: "160 rows of 'Last, First' split on comma → 'Nguyen' | 'Ava' — now you can sort by surname or build an email convention with Flash Fill.",
      watch: "Values with the separator INSIDE quotes (addresses like '12, Elm St') can over-split — check a few rows after.",
      next: "Then run **Trim** on the new columns (split values often carry stray spaces).",
    }),
  },
  {
    kws: ["flash fill", "ctrl+e", "pattern"],
    q: "How does Flash Fill work?",
    a: structured({
      short: "Type what you want in the first empty cell next to your data, press Flash Fill (Ctrl+E), and Excel learns the pattern and fills the rest.",
      why: "Flash Fill is the closest thing to magic in Excel: first names from full names, initials from names, clean codes from messy IDs — no formulas needed. It's a genuine speed skill that impresses in real jobs.",
      steps: [
        "Have a source column (e.g. Full Name) and an empty target column next to it.",
        "In the target's first row, type the result you want for that row (e.g. 'Ava').",
        "Data tab ▸ **Flash Fill** — every other row fills by the learned pattern.",
        "Spot-check five filled cells; unusual rows (double surnames, middle initials) can break the pattern.",
      ],
      example: "'Ava Nguyen' → type 'Ava' → Flash Fill → 'Liam', 'Mia'… all first names. Type 'AN' instead → initials for everyone.",
      watch: "Flash Fill is a guess engine, not a rule engine — verify before you trust, or one wrong cell poisons a VLOOKUP later.",
      next: "Combine with Data Validation ▸ List to lock the filled column to approved values.",
    }),
  },
  {
    kws: ["validation", "dropdown", "restrict", "list"],
    q: "What is Data Validation for?",
    a: structured({
      short: "Data Validation is a bouncer: only whole numbers in a range, or values from an approved list, get accepted into the column. It prevents bad data instead of cleaning it later.",
      why: "Teams share sheets; the moment three people type free-text into a Region column you get 'north', 'North ' and 'NORTH'. Validation makes the correct entry the ONLY entry — prevention beats any cleaning session.",
      steps: [
        "Click a cell in the column to guard.",
        "Data tab ▸ **Data Validation**.",
        "Choose the rule: Whole number between 1–100, Decimal range, or List of values ('North, South, East, West').",
        "Apply, then try typing a breaking value — Excel refuses it with a Stop-style alert, exactly like the real product.",
        "Use **Circle Invalid Data** to flag existing cells that break the new rule (they get circled in red).",
      ],
      example: "Validation List on Region → typing 'Middle Earth' is rejected; the Extract sheet from Advanced Filter is a ready-made source for the list.",
      watch: "Validation guards new typing, not pastes — re-run Circle Invalid after big pastes.",
      next: "Build your allowed list with Data ▸ Advanced Filter (unique extract) — zero typing.",
    }),
  },
  {
    kws: ["consolidate", "aggregate", "summary per group"],
    q: "How do I summarise rows by category (Consolidate)?",
    a: structured({
      short: "Data ▸ Consolidate aggregates a numeric column per key column (SUM/COUNT/AVERAGE/MAX/MIN) and writes the summary to a new sheet, Grand Total included.",
      why: "'Total revenue per region' is the archetypal manager question. Consolidation is the no-formula route: it's the same math as SUMIF/PivotTable, driven by a dialog — and it writes an auditable summary sheet.",
      steps: [
        "Data tab ▸ **Consolidate**.",
        "Group by: the labels column (Region). Value: the number (Revenue). Function: SUM (or COUNT/AVERAGE/MAX/MIN).",
        "Confirm — a new **Consolidation** sheet appears: one row per group + Grand Total.",
        "Sanity-check one group against `=SUMIF(…)` — matching numbers = audit-proof summary.",
      ],
      example: "340 rows → Consolidate Region × Revenue SUM → 4 rows + Grand Total 402,975: the whole story on one small sheet.",
      watch: "Keys must match exactly — 'North ' with a trailing space becomes its own group. Run Trim first (the doctor can do it in one click).",
      next: "Chart the consolidation sheet (2 columns selected → Insert ▸ Column) — instant management visual.",
    }),
  },
  {
    kws: ["goal seek", "what if", "back solve", "target"],
    q: "How does Goal Seek (What-If) work?",
    a: structured({
      short: "Goal Seek back-solves an input: 'what must cell X be for this formula to equal 50,000?' — Data ▸ What-If Analysis ▸ Goal Seek.",
      why: "Managers ask backwards questions: 'what price gets us to target profit?' Goal Seek answers numerically in seconds — it's the simplest member of the what-if family (Data Table, Scenario Manager are its bigger siblings).",
      steps: [
        "Have a formula cell that depends on ONE input cell (e.g. K2 = `=J2*L2/100`).",
        "Data tab ▸ What-If Analysis ▸ **Goal Seek**.",
        "Set cell: K2. To value: 50000. By changing cell: J2. Run.",
        "Excel tests values until the formula hits the target and writes the solved input into the cell.",
      ],
      example: "K2 = units × price. Target revenue 50,000 with price 25 → Goal Seek sets units to 2,000. Change the target to 60,000 → units 2,400.",
      watch: "It OVERWRITES the input cell — Ctrl+Z restores the original if the answer surprises you.",
      next: "Try it on a profit formula — see how sensitive profit is to price. That's insight, not arithmetic.",
    }),
  },
];

/* ============================ POWER BI ============================ */

const PBI_ASK: AskEntry[] = [
  {
    kws: ["measure", "calculated column", "difference", "dax", "after cleaning"],
    q: "Measure vs calculated column — which do I add after cleaning?",
    a: structured({
      short: "Row-by-row helper → calculated column. Business KPI that reacts to filters → measure. That question alone decides it.",
      why: "After cleaning, the data model is where value is added — and this choice is the first one. Columns are computed once and stored per row (slicers, axes). Measures are computed live inside whatever filters the user has applied — one measure serves every visual correctly.",
      steps: [
        "Ask: do I need this value **per row** (label a row, use it as a category) or **as a number in a card/chart** (revenue, margin, AOV)?",
        "Per row → Modeling: create a calculated column, e.g. `Profit = Sales[Price] - Sales[Cost]`.",
        "KPI → **New Measure**: `Total Revenue := SUM(Sales[revenue])` — drag it into a Card; it re-aggregates for every slicer click.",
        "Learn the DAX layer in the Functions Lab — CALCULATE, SUMX, DIVIDE — then return here and build the KPIs.",
      ],
      example: "'Flag big orders' → column (`=IF(Sales[qty]>10,\"Big\",\"Small\")`). 'Average order value' → measure (`AVERAGE(Sales[revenue]) / COUNTROWS(Sales)`) — the Card updates when a slicer picks West.",
      watch: "Beginners over-create columns; every column bloats the model. If it can be a measure, make it a measure.",
      next: "Open the Clean file tab first — measures on dirty data are precise lies.",
    }),
  },
  {
    kws: ["calculate", "dax", "filter context"],
    q: "What does CALCULATE do in DAX?",
    a: structured({
      short: "CALCULATE is the one DAX function that changes filter context — it evaluates a measure *as if* extra filters were applied.",
      why: "Every 'share of total', 'vs last year', 'selected segment' KPI is CALCULATE underneath. It's the gate from beginner DAX to real DAX, and the single most-asked interview question.",
      steps: [
        "Base measure first: `Total Revenue := SUM(Sales[revenue])`.",
        "Override context: `West Revenue := CALCULATE([Total Revenue], Sales[Region] = \"West\")`.",
        "Remove filters for % of total: `Revenue % := DIVIDE([Total Revenue], CALCULATE([Total Revenue], ALL(Sales[Region])))`.",
        "Test in the Modeling ▸ New Measure dialog — it evaluates instantly against the connected dataset here.",
      ],
      example: "With a West slicer active, [Total Revenue] shows West only; [West Revenue] shows West too — but on the East page it STILL shows West. That's context override.",
      watch: "Filters flow: slicers first, then CALCULATE adds/overrides inside the formula. If a number looks too small, check for a filter chip.",
      next: "Try the % of total pattern with ALL — the classic.",
    }),
  },
  {
    kws: ["sumx", "iterat", "row context", "averagex"],
    q: "SUM vs SUMX — when do I need the X?",
    a: structured({
      short: "SUM adds one column. SUMX iterates row by row evaluating an expression — needed when the math doesn't exist as a column yet.",
      why: "`Revenue = qty × price` often isn't stored — the X family computes it on the fly: 'for each row, multiply, then add'. If you catch yourself wanting a helper column just to multiply, you wanted SUMX.",
      steps: [
        "Simple total: `Total Qty := SUM(Sales[qty])`.",
        "Row-wise math: `Revenue := SUMX(Sales, Sales[qty] * Sales[price])` — iterates, multiplies per row, sums the results.",
        "Same family: AVERAGEX, COUNTX, MINX, MAXX — all 'for each row…' iterations.",
        "Prefer SUMX over a stored column when the intermediate value has no business meaning on its own.",
      ],
      example: "Basket analysis: `SUMX(Sales, Sales[qty] * Sales[unit_price])` returns true revenue even though no revenue column exists in the model.",
      watch: "SUMX over huge tables is heavier than SUM — fine here, a real consideration on big data.",
      next: "Build [Avg Order Value] with SUMX + COUNTROWS and put it in a Card.",
    }),
  },
  {
    kws: ["visual", "chart type", "which"],
    q: "Which visual for which question?",
    a: structured({
      short: "Card = one KPI. Column/bar = compare categories. Line = trend. Pie = share of a whole (few slices). Scatter = relationship. Matrix = pivot-style detail. Waterfall = parts building to a total.",
      why: "Visual choice is the report's grammar: the same dataset 'compares', 'trends' or 'decomposes' depending on the visual. Executives read structure before they read numbers.",
      steps: [
        "Start every page with the trio: **Card** (headline number) + **Column** (breakdown) + **Line** (trend).",
        "Add **Slicer** for the dimension your audience drives (Region, Channel).",
        "Use **Matrix** for detail tables and **Waterfall** for contribution stories ('how segments build the total').",
        "Titles as questions ('Revenue by Region') — a report page reads like a conversation.",
      ],
      example: "Exec layout: top-left Card (Total Revenue), top-right Column (by Region), bottom Line (monthly), one Region slicer — 4 visuals, the whole Monday meeting.",
      watch: "More than 7 visuals per page and users stop reading — split into pages instead.",
      next: "Save the page and test cross-filtering by clicking a bar — that's the interaction payoff.",
    }),
  },
  {
    kws: ["filter", "cross", "interaction", "click"],
    q: "How does cross-filtering work?",
    a: structured({
      short: "Click a bar/slice/point and Power BI filters every other visual on the page to that selection — like all visuals silently agreeing on a WHERE clause. Clear it with the filter chip.",
      why: "Cross-filtering is what turns a report into a tool: 'show me only West' is one click, no rebuild. It's also the #1 cause of 'my numbers look small!' confusion for beginners.",
      steps: [
        "Click any bar/slice/point — every other visual on the page filters.",
        "A chip appears under the canvas showing the active cross-filter.",
        "Click the chip (or the same bar again) to clear it.",
        "Slicers do the same thing but stay visible for report users to drive.",
      ],
      example: "Click the West column → Card drops from 402,975 to 101,132, the line chart re-trends to West only, the matrix shows West rows.",
      watch: "Presenting and numbers look oddly small? Check for a leftover filter chip first — everyone falls for it once.",
      next: "Add a slicer for the dimension users will ask about most — self-service is the point.",
    }),
  },
  {
    kws: ["slicer"],
    q: "What's a slicer for?",
    a: structured({
      short: "A slicer is a visible filter the report USER operates — pick regions, dates, segments, and the whole page responds.",
      why: "Slicers turn 'a story I tell' into 'a tool they drive' — the entire point of self-service BI. Managers trust dashboards more when they can poke them.",
      steps: [
        "Home ▸ **Slicer** (or the Visualizations gallery).",
        "Drag the driver dimension into the field well (Region is the classic).",
        "Place it top-left or top-right — users look for controls at the edges.",
        "Test: click a few values and confirm every visual responds (then clear chips).",
      ],
      example: "Region slicer on the trade-meeting page: the sales director clicks 'North' live and the room sees only North numbers — no analyst intervention.",
      watch: "One slicer per dimension, and not five slicers per page — control clutter kills usability.",
      next: "Sync the story: does your headline Card also respond to the slicer? It should.",
    }),
  },
  {
    kws: ["page", "report structure", "layout", "design"],
    q: "How should a real report page be laid out?",
    a: structured({
      short: "Top-left the headline Card, top-right the biggest breakdown (column), bottom the trend (line) and one detail table — 4–7 visuals, question-titles, one slicer.",
      why: "The eye starts top-left and asks 'how are we doing?', then 'where?', then 'over time?'. A page laid out in that order answers the meeting's questions in the order they're asked.",
      steps: [
        "Card top-left — the headline number.",
        "Column/bar chart top-right — the biggest breakdown.",
        "Line chart bottom-left — the trend.",
        "Matrix or detail bottom-right — for the 'show me the rows' moment.",
        "One slicer, consistent colors, tidy layout (View ▸ Tidy) — then save to the portfolio.",
      ],
      example: "The 'exec weekly' page: Revenue Card, Revenue by Region column, Weekly trend line, Region slicer — four visuals, zero scroll.",
      watch: "Perfect symmetry isn't the goal — hierarchy is. The important visual should be the biggest.",
      next: "Run the Real work tab briefs — build the exact pages companies ask for.",
    }),
  },
  {
    kws: ["percent", "share", "total", "all", "divide"],
    q: "How do I compute % of total in DAX?",
    a: structured({
      short: "`Revenue % := DIVIDE([Total Revenue], CALCULATE([Total Revenue], ALL(Sales[Region])))` — the inner CALCULATE with ALL removes the region filter to get the grand total.",
      why: "Reading it aloud is the point: 'this revenue over total revenue *ignoring region*'. The ALL pattern (remove filters, then re-aggregate) powers every share/ratio KPI and is the classic interview question.",
      steps: [
        "Base measure: `Total Revenue := SUM(Sales[revenue])`.",
        "Denominator: `CALCULATE([Total Revenue], ALL(Sales[Region]))` — ALL removes the region filter wherever it came from (slicer, cross-filter…).",
        "Wrap in DIVIDE (handles zero safely): `Revenue % := DIVIDE([Total Revenue], CALCULATE([Total Revenue], ALL(Sales[Region])))`.",
        "Format the measure as percent and drop it beside revenue in a bar chart — bars same height, labels show share.",
      ],
      example: "West revenue 101,132 of 402,975 → 25.1% — correct even while a West slicer is active, because ALL ignores it.",
      watch: "ALL on the wrong column gives wrong totals — ALL removes filters from exactly the column you name.",
      next: "Try `ALLEXCEPT` for '% within group' — the natural next step.",
    }),
  },
  {
    kws: ["clean", "power query", "dirty data", "fix"],
    q: "How do I clean data in Power BI?",
    a: structured({
      short: "Cleaning happens in Power Query before visuals: remove duplicates, trim text, fix types, standardise dates. Here, the Clean file tab does it with you, step by step.",
      why: "Power BI aggregates mercilessly — one duplicated row silently inflates every total, one text-formatted price column empties every chart. Cleaning in the model is why enterprise reports reconcile with finance.",
      steps: [
        "Open the **Clean file** tab in the Live Coach — it scans the connected dataset and lists its actual problems with row references.",
        "Fix top-down: duplicates first (Remove Rows ▸ Remove Duplicates), then Trim/Format text, then Data Types (Decimal for money, Date for dates).",
        "One-click fixes apply Power Query-style steps here — 'Undo all' reverts to the raw source, exactly like deleting applied steps.",
        "Re-scan happens automatically — build visuals only when the health score is green.",
      ],
      example: "A messy 910-row hospital file loads → doctor flags mixed dates, blank cells, case chaos → apply the fixes → health 100 → NOW the Card and charts tell the truth.",
      watch: "If a column refuses to change type, there's hidden text in it — fix values before the type.",
      next: "Then Model view → confirm the grain, and the DAX layer in Functions Lab.",
    }),
  },
];

/* =============================== SQL =============================== */

const SQL_ASK: AskEntry[] = [
  {
    kws: ["join", "inner", "left", "two tables"],
    q: "JOIN types — INNER vs LEFT, when?",
    a: structured({
      short: "INNER keeps only rows matching in both tables. LEFT keeps every row of the left table, NULLs where no match — use LEFT when the question is 'which ones are missing?'.",
      why: "Real data lives in pieces: customers in one table, orders in another. JOINs reassemble it — and choosing the wrong type either loses customers silently (INNER too eager) or floods your report with NULLs (LEFT when you meant INNER).",
      steps: [
        "Start from the driving table: `FROM orders o` (one row per order).",
        "Match keys exactly: `JOIN customers c ON o.customer_id = c.id` — the ON columns are the whole relationship.",
        "INNER (default `JOIN`) → only orders that have a customer. LEFT → all orders, NULL customer where missing.",
        "Find the missing ones: `LEFT JOIN customers c … WHERE c.id IS NULL` — orders with no customer on file.",
      ],
      example: "`SELECT c.name, SUM(o.total_amount) FROM orders o JOIN customers c ON o.customer_id = c.id GROUP BY c.name;` — revenue per customer.",
      watch: "Join on the KEY only. Joining on name invites 'John Smith' matching 'John Smith ' with a space.",
      next: "Run the Exercises panel — #3 and #5 are pure JOIN training against the real tables here.",
    }),
  },
  {
    kws: ["group", "aggregate", "having", "count"],
    q: "GROUP BY rules — and HAVING vs WHERE?",
    a: structured({
      short: "Every SELECT column must be in GROUP BY or inside an aggregate. WHERE filters rows before grouping; HAVING filters groups after.",
      why: "Aggregation is SQL's core value: hundreds of rows become one line per group. The WHERE/HAVING split confuses everyone once — remember it as 'WHERE for rows, HAVING for groups'.",
      steps: [
        "Pick the grain: `GROUP BY region` → one row per region.",
        "Aggregate the numbers: `SUM(amount)`, `COUNT(*)`, `AVG(amount)`.",
        "Filter rows before grouping: `WHERE status = 'completed'`.",
        "Filter groups after: `HAVING SUM(amount) > 1000` — only big groups survive.",
        "Read queries as a sentence: SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.",
      ],
      example: "`SELECT region, SUM(total_amount) AS revenue FROM orders WHERE status='completed' GROUP BY region HAVING SUM(total_amount) > 10000 ORDER BY revenue DESC;`",
      watch: "`SELECT region, amount … GROUP BY region` errors — amount isn't grouped or aggregated. That error message is SQL's most common teaching moment.",
      next: "Chain a CTE on top: clean step → aggregate step. Readable queries win promotions.",
    }),
  },
  {
    kws: ["window", "over", "row_number", "rank", "lag", "partition"],
    q: "What are window functions (OVER / PARTITION BY)?",
    a: structured({
      short: "Window functions compute across related rows WITHOUT collapsing them — rank within group, running totals, previous-row comparisons.",
      why: "The classic interview question 'top customer per region' is unsolvable with plain GROUP BY (it collapses the rows you still need). Window functions keep every row while adding group intelligence beside it — they're the mark of a strong SQL writer.",
      steps: [
        "Rank within group: `ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC)` → 1,2,3… per region.",
        "Top-N per group: wrap in a CTE, then `WHERE rn = 1` (or ≤ 5).",
        "Running totals: `SUM(amount) OVER (ORDER BY order_date)`.",
        "Previous row: `LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)` → gaps between orders.",
        "RANK shares ties (1,1,3); DENSE_RANK doesn't skip (1,1,2).",
      ],
      example: "`WITH ranked AS (SELECT region, name, revenue, ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) rn FROM sales) SELECT * FROM ranked WHERE rn = 1;` — best store per region.",
      watch: "You can't use a window function in WHERE directly — compute it in a CTE/subquery first. That's why CTEs and windows are best friends.",
      next: "The SQL tool here runs window functions for real — try template 'Rank per group'.",
    }),
  },
  {
    kws: ["cte", "with", "subquery"],
    q: "Why use WITH (CTEs) instead of one giant query?",
    a: structured({
      short: "A CTE names a step. Real analysts chain 2–4 CTEs (clean → aggregate → rank) instead of nesting subqueries three levels deep.",
      why: "Queries are documentation: six months from now, you (or the auditor) must know what the number means. Named steps read like a recipe; nested subqueries read like archaeology.",
      steps: [
        "Name each transformation: `WITH monthly AS (SELECT …) SELECT * FROM monthly WHERE rev > 5000;`.",
        "Chain them: `WITH clean AS (…), by_region AS (SELECT region, SUM(…) FROM clean GROUP BY region) SELECT * FROM by_region …`.",
        "Debug by running each CTE alone — instant isolation of the broken step.",
        "Name CTEs after what they ARE, not what they do: `monthly_revenue`, not `step1`.",
      ],
      example: "Three CTEs: `cleaned` (deduped rows) → `region_totals` (SUM per region) → final `SELECT *, revenue*100.0/SUM(revenue) OVER () AS pct FROM region_totals`.",
      watch: "CTEs don't automatically make queries faster — they make them *correct and readable* first; optimize later.",
      next: "Rewrite your last nested query as CTEs and feel the difference in readability.",
    }),
  },
  {
    kws: ["union", "combine", "stack"],
    q: "UNION vs UNION ALL?",
    a: structured({
      short: "Both stack result sets with matching column counts. UNION ALL keeps everything (fast); UNION removes duplicate rows (slower).",
      why: "Monthly extracts, this-year + last-year, two regional systems — combining result sets is how 'one report from many sources' happens. Picking wrong either hides duplicates (ALL) or quietly burns performance (UNION).",
      steps: [
        "Match the shape: same number of columns, compatible types, in both branches.",
        "`SELECT … FROM jan UNION ALL SELECT … FROM feb;` — fast, honest stacking.",
        "Use plain UNION only when duplicates MUST vanish — it compares every row to every other row.",
        "Sort the combined result with a trailing ORDER BY (applies to the whole stack).",
      ],
      example: "Two 6-row months stacked → 12 rows with ALL, maybe 10 with UNION if two orders appeared in both extracts.",
      watch: "Column NAMES come from the first branch — alias them well there.",
      next: "Try exercise #16 in the Exercises panel — a real UNION against the tables here.",
    }),
  },
  {
    kws: ["null", "is null", "blank", "coalesce"],
    q: "How does NULL work — why does my filter miss rows?",
    a: structured({
      short: "NULL means unknown, not zero or empty string. `= NULL` is never true — use IS NULL / IS NOT NULL, and COALESCE(col, 0) to substitute defaults.",
      why: "NULLs are where junior SQL results silently go wrong: LEFT JOIN rows vanish after a careless WHERE, averages skip unknowns, and `WHERE region != 'West'` mysteriously drops rows whose region is NULL (unknown isn't 'not West').",
      steps: [
        "Find them: `WHERE col IS NULL` (never `= NULL`).",
        "Substitute: `COALESCE(col, 0)` for numbers, `COALESCE(col, 'Unknown')` for labels.",
        "Aggregates skip NULLs: AVG ignores them, COUNT(col) doesn't count them — decide if that's what you mean.",
        "After a LEFT JOIN, put `IS NULL` checks BEFORE other filters, or you'll delete exactly the rows the join kept.",
      ],
      example: "`SELECT COALESCE(discount, 0) AS discount FROM orders;` — every row gets a number, unknowns read as zero.",
      watch: "`WHERE col != 'West'` excludes NULL rows too — add `OR col IS NULL` if you want them.",
      next: "Import a messy sample as a table (e.g. hospital) and hunt its NULLs with IS NULL — real practice.",
    }),
  },
  {
    kws: ["date", "month", "year", "julianday", "substr"],
    q: "How do I filter or group by date?",
    a: structured({
      short: "Dates here are ISO text ('2025-06-01'), so text comparisons just work. Month key = SUBSTR(date, 1, 7) — the classic GROUP BY month trick.",
      why: "Trend questions ('are we improving month over month?') are date-grouping questions. The month-key trick turns any date column into a clean group label — and it works in every SQL dialect.",
      steps: [
        "Filter a range: `WHERE order_date >= '2025-01-01' AND order_date < '2025-04-01'` — ISO text sorts chronologically.",
        "Month key: `SUBSTR(order_date, 1, 7) AS month` → '2025-06'.",
        "Group by it: `SELECT SUBSTR(order_date,1,7) AS month, SUM(total_amount) AS revenue … GROUP BY month ORDER BY month;`.",
        "Day math: `JULIANDAY(a) - JULIANDAY(b)` gives days between — gaps, ages, recency.",
      ],
      example: "Monthly revenue trend: group by the 7-char month key, ORDER BY month → 12 tidy rows ready for a line chart.",
      watch: "Mixed date formats break the trick — the Data Doctor (Clean file tab) flags and standardises them first.",
      next: "Pair the month key with LAG() OVER to compute month-over-month change.",
    }),
  },
  {
    kws: ["order", "sort", "top", "limit"],
    q: "How do I get the top 5 / sort results?",
    a: structured({
      short: "`ORDER BY revenue DESC LIMIT 5` — sort first, cap second. Sort by your aggregate's alias.",
      why: "'Top 5 products, worst 3 regions, latest 10 orders' — ranking questions are half of ad-hoc analytics. LIMIT without ORDER BY gives you *any* 5 rows, which is not an answer, it's a coincidence.",
      steps: [
        "Aggregate, alias, then: `SELECT product, SUM(amount) AS revenue … GROUP BY product ORDER BY revenue DESC LIMIT 5;`.",
        "ASC is default (smallest first); DESC puts biggest/newest on top.",
        "Top-N per GROUP = window function: ROW_NUMBER in a CTE, then `WHERE rn <= 5`.",
        "Ties: RANK() keeps ties (two #1s, next is #3).",
      ],
      example: "ORDER BY total_revenue DESC LIMIT 5 — the exact 'top 5 customers' query behind a thousand Slack requests.",
      watch: "LIMIT without ORDER BY is random rows — always pair them.",
      next: "Exercise #2 in the panel is a straight top-N drill — 2 minutes, done.",
    }),
  },
  {
    kws: ["clean", "dirty", "fix data", "trim", "distinct"],
    q: "How do I clean data with SQL?",
    a: structured({
      short: "SELECT the clean version: TRIM, UPPER/LOWER, CAST for text-numbers, COALESCE for blanks, DISTINCT or ROW_NUMBER for duplicates — the Clean file tab writes these queries for YOUR table.",
      why: "In real warehouses you often can't UPDATE the source — analysts clean in the query layer (views/CTEs). Every cleaning idea you know from Excel has a SQL equivalent, and knowing both makes you bilingual.",
      steps: [
        "Open the **Clean file** tab — it profiles the open table and lists its actual problems with example rows.",
        "Copy the exact cleaning query it writes for each issue (TRIM, COLLATE NOCASE for case, CAST for text-numbers, DISTINCT/ROW_NUMBER for dupes).",
        "Run it — compare row counts before/after, like a cleaning log.",
        "Wrap the cleaned query in a CTE and build your report on top of it.",
      ],
      example: "Case chaos: `SELECT UPPER(SUBSTR(city,1,1))||LOWER(SUBSTR(city,2)) AS city_fix FROM customers;` — or group with `COLLATE NOCASE` to see the true counts.",
      watch: "DISTINCT * hides the shape of your duplication — ROW_NUMBER with PARTITION BY shows what's really repeated.",
      next: "Import a messy CSV file as a table (hospital, bank_transactions) and run the doctor's queries on it.",
    }),
  },
];

export const ASK_SUGGESTIONS: Record<string, string[]> = {
  excel: ["Why does my SUM return 0?", "How do I clean messy data?", "How do I split a column?", "What is Data Validation for?", "How does Goal Seek work?", "VLOOKUP vs XLOOKUP?"],
  dashboard: ["Measure vs calculated column?", "What does CALCULATE do?", "SUM vs SUMX?", "How do I clean data in Power BI?", "How should a page be laid out?", "% of total in DAX?"],
  sql: ["INNER vs LEFT JOIN?", "What are window functions?", "HAVING vs WHERE?", "How do I clean data with SQL?", "Why use CTEs?", "How does NULL work?"],
};

/** Score-based retrieval over the tool's bank, with live file context prepended. */
export function askCoach(tool: string, question: string, ctx?: AskContext): { q: string; a: string } | null {
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
  if (!best) return null;

  let a = best.entry.a;

  /* file context — make the answer specific to what the learner has loaded */
  const cleaningish = /clean|messy|dirty|duplicate|blank|trim|fix|error|wrong|0|text|format|date|case/i.test(question);
  if (ctx?.file && cleaningish) {
    const bits: string[] = [];
    bits.push(`You're working on **${ctx.file}** (${(ctx.rows ?? 0).toLocaleString()} rows × ${ctx.cols ?? 0} columns).`);
    if (ctx.topIssues?.length) bits.push(`Your file's current top issues: ${ctx.topIssues.slice(0, 3).join("; ")}. Fix those first — they're listed with exact rows in the Clean file tab.`);
    else bits.push("The Data Doctor scan currently reports this file clean — nice.");
    a = `**About your file.** ${bits.join(" ")}\n\n` + a;
  }
  return { q: best.entry.q, a };
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
        "Run the **Clean file** scan — confirm health 100 before any math",
        "Top area: =SUM(revenue column) — that's the headline",
        "=SUMIF(region column, each region) for every region; eyeball best/worst",
        "Sort products by revenue Z→A (or Data ▸ Sort with levels); top 5 = the table",
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
        "Run the **Clean file** doctor — it lists THIS file's issues with row numbers; fix top-down and note before/after counts (that's the log)",
        "Remove Duplicates via the dialog (choose key columns); note rows before/after",
        "Trim/Proper text columns; fix $-text amounts with the one-click numberize fix",
        "Build the monthly totals with SUMIFS on a month helper column (or Data ▸ Consolidate)",
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
        "Clean-file scan first — mixed case departments will split your groups (fix with Proper, one click)",
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
        "Check the **Clean file** tab — build only on a healthy model",
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
