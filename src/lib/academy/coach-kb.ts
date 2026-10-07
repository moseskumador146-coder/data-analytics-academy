"use client";

/* coach-kb — the teaching brain of the live coach.
   explainAction() turns every real action the learner performs into
   "what you did / why it matters / watch out / try next", written for
   absolute beginners and framed around real company work. */

import type { CoachAction, CoachTool } from "./coach-bus";

export interface ActionExplain {
  did: string;
  why: string;
  watch?: string;
  next?: string;
}

type KB = Record<string, ActionExplain>;

const shortRef = (d?: string) => (d && d.length > 42 ? d.slice(0, 42) + "…" : d || "");

/* ============================== EXCEL ============================== */

const EXCEL_KB: KB = {
  "excel.data": {
    did: "You loaded a dataset into the worksheet.",
    why: "Analysts almost never type data by hand — they pull exports (sales systems, banks, HR tools) into a grid first. This is the exact starting point of every real task: *here is the raw extract, tell us something true about it.*",
    watch: "Check row 1: those are your column headers. Every formula you write later will point at these columns, so make sure you know what each one means.",
    next: "Click a few cells in each column to feel the data — how many rows, what the text columns contain, where the numbers are.",
  },
  "excel.edit": {
    did: `You typed a value into a cell (${shortRef("")}).`,
    why: "Typing raw values is for **inputs** — the data itself. Everything that *derives* from data (totals, flags, categories) should be a formula instead, so it updates when the data changes. Companies audit spreadsheets, and formulas are how they trace your logic.",
    watch: "If you typed a number and it sits on the left of the cell, Excel treated it as text — that breaks SUM later. Numbers always right-align by default.",
    next: "Press Enter to commit the value and move down. Use Tab to move right.",
  },
  "excel.formula": {
    did: "You wrote a formula.",
    why: "This is the moment a spreadsheet stops being a table and starts being a **model**. Formulas are how analysts answer questions: totals for budgets, IF for risk flags, SUMIF for one region's revenue, VLOOKUP/XLOOKUP to enrich one table with another's columns.",
    watch: "Three classic errors: **#REF!** means a referenced cell was deleted, **#VALUE!** means you did math on text, and a wrong total often means the range missed rows. Read the result and ask: *is this number plausible?*",
    next: "Grab the small **fill handle** at the corner of the cell and drag down — Excel copies the formula and shifts the references, exactly how analysts apply a calculation to 10,000 rows.",
  },
  "excel.autosum": {
    did: "You used AutoSum.",
    why: "AutoSum guesses the range above your cell and writes the SUM for you — it is the fastest way to total a column in a report. Real finance teams live on totals rows at the top or bottom of every table.",
    watch: "AutoSum is a guess. If it stops one row early or includes a text cell, the total is silently wrong. Always eyeball the highlighted range before pressing Enter.",
    next: "Try AVERAGE and COUNT on the same column from the AutoSum menu — the trio *total, average, count* answers half of all manager questions.",
  },
  "excel.format": {
    did: "You formatted cells.",
    why: "Formatting is communication. Bold headers, fills on totals, and consistent fonts let a manager read your sheet in seconds instead of asking you questions. In real work, a well-formatted sheet gets *trusted*; a messy one gets re-done by someone else.",
    watch: "Formatting should never change meaning. If a number looks right only because of formatting, the underlying value may still be wrong.",
    next: "Bold the header row, then give your totals row a light fill — that two-second habit is what separates a draft from a deliverable.",
  },
  "excel.numfmt": {
    did: "You changed the number format.",
    why: "Number formats are how analysts speak: currency for money, thousands separators for big counts, percentages for shares, dates as real dates. A column of unformatted numbers forces every reader to guess the units — and executives don't guess.",
    watch: "Formats change the *appearance*, not the stored value. 12,345.67 shown as 12K still IS 12,345.67 in every formula.",
    next: "Format money columns as Currency and any share column as Percent — do it once per column, not per cell.",
  },
  "excel.sort": {
    did: "You sorted the data.",
    why: "Sorting is the cheapest insight there is: sort revenue descending and your best customers float to the top — the first thing every manager looks at. Analysts sort before every review so the story is visible without explanation.",
    watch: "If you got the dialog about expanding the selection, always choose **Expand** — sorting one column alone tears rows apart and mismatches names with numbers.",
    next: "Sort by your main number column, largest first, then read the top 5 rows out loud — that is 80% of an early analysis.",
  },
  "excel.filter": {
    did: "You used AutoFilter to show or hide rows.",
    why: "Filtering answers *show me only…* questions in seconds: one region, one product, one month. It is non-destructive — rows are hidden, not deleted — which is exactly why analysts prefer it over deleting data.",
    watch: "Hidden rows still count in SUM! If you need totals of only the visible rows, that is SUBTOTAL(109, range) — a real Excel trick worth knowing.",
    next: "Filter to one region, then SUM the visible revenue — that is a one-region report in under a minute.",
  },
  "excel.clean": {
    did: "You cleaned the data (duplicates / text casing).",
    why: "This is the step companies pay for. Duplicate rows inflate revenue; 'north' vs 'North' splits one region into two in every summary. Cleaning first means every number downstream is defensible in a meeting.",
    watch: "Before removing duplicates, keep a copy of the raw sheet — real analysts never destroy the only copy of source data.",
    next: "Use Remove Dupes, then Trim/Proper on text columns, then re-check your totals changed the way you expected.",
  },
  "excel.chart": {
    did: "You inserted a chart.",
    why: "Charts are how findings travel. A bar chart of revenue by region lets a busy manager absorb in 3 seconds what a table communicates in 3 minutes. 'One chart per question' is the analyst's rule.",
    watch: "Pick the chart for the job: **column** for comparing categories, **line** for change over time, **pie** only for parts of one whole (and only a few slices).",
    next: "Select your category column *and* the number column (Ctrl+click to select two ranges), then insert the chart — charts built from a clean two-column selection almost always look right.",
  },
  "excel.freeze": {
    did: "You froze rows or columns.",
    why: "With 5,000 rows, scrolling loses the headers and every column becomes a guess. Freezing keeps headers visible — the same reason real reports repeat headers on every printed page.",
    watch: "Freeze works from the *selected* cell upward/leftward in the custom option — simplest is View ▸ Freeze ▸ Top Row.",
    next: "Freeze the top row now, then scroll — you should always know which column is which.",
  },
  "excel.merge": {
    did: "You merged cells.",
    why: "Merging makes report titles and section banners — genuinely useful at the top of a deliverable.",
    watch: "Never merge inside a data table: merged cells break sorting, filtering and formulas that reference those cells. Companies' data teams ask for merged-cell-free tables.",
    next: "Use merge for a title banner only; keep the data grid as a clean rectangle of cells.",
  },
  "excel.table": {
    did: "You formatted the range as a Table.",
    why: "Real Excel analysts convert ranges to Tables: they auto-expand (new rows join formulas and charts automatically), get filter buttons for free, and make formulas readable (Table[Revenue] instead of H2:H5000).",
    watch: "Tables change how ranges look in formulas — that is a feature, not a bug: SUM(Sales[Amount]) is self-documenting.",
    next: "Add a new row under the table and watch it join automatically — this is why teams prefer Tables for growing data.",
  },
  "excel.style": {
    did: "You applied a cell style / conditional formatting.",
    why: "Conditional formatting makes problems jump out: red for negative margins, green for targets hit. Managers scan for color before they read numbers, so color steers the meeting.",
    watch: "Too much color hides the signal. Pick one rule that matters (e.g. values below target) rather than painting every cell.",
    next: "Add 'highlight cells less than 0' on a profit column — red flags are the fastest way to look senior in a review.",
  },
  "excel.sheet": {
    did: "You managed the workbook's sheets.",
    why: "Real workbooks are organized: **raw** data stays on one untouched sheet, cleaning on another, analysis and charts on a third. That separation is what lets a colleague (or auditor) retrace your work.",
    watch: "Rename sheets to what they hold ('Raw', 'Clean', 'Report') — 'Sheet1' workbooks are the #1 sign of beginner work in interviews.",
    next: "Rename the current sheet, add a second one, and move your summary there — a 3-sheet layout is the professional minimum.",
  },
  "excel.find": {
    did: "You used Find & Replace.",
    why: "Find & Replace is a cleaning power tool: fix 'Nort' → 'North' everywhere at once, or replace all 'USD ' prefixes to make a text column numeric. Doing it by hand, cell by cell, is how typos survive.",
    watch: "Replace affects *every* match — 'Replace All' on a short string like 'May' can hit 'Mayor'. Use Find All first to see the blast radius.",
    next: "Try Find All on a value you expect often, then Replace All on a consistent misspelling.",
  },
  "excel.pastespecial": {
    did: "You used Paste Special.",
    why: "Paste Special ▸ **Values** freezes formula results into plain numbers — essential when sending a snapshot to someone who shouldn't see (or break) your formulas. Transpose flips rows to columns in one move.",
    watch: "After pasting values, the cells no longer update when the source changes — that is the point, but remember the two are now disconnected.",
    next: "Copy a formula column, then Paste Special ▸ Values onto itself to snapshot the results.",
  },
  "excel.pivot": {
    did: "You inserted a PivotTable.",
    why: "The PivotTable is the single most important summary tool in Excel: drag a text field to Rows, a number to Values, and you have a grouped report in seconds — revenue by region, headcount by department, tickets by priority. Interviewers test it because companies run on it.",
    watch: "PivotTables read from a clean rectangular range with unique headers. Blank headers or merged cells will break the pivot before it starts.",
    next: "Drag one category to **Rows**, one number to **Values** (Sum), then a second category to **Columns** — that 2-way summary is the classic analyst move.",
  },
  "excel.comment": {
    did: "You added a comment/note to a cell.",
    why: "Comments are how analysts leave breadcrumbs: why this number, where this assumption came from, 'checked against system X on date Y'. In real teams the comment thread *is* the review process.",
    watch: "Notes are for facts ('source: finance export'), comments are for discussion — keep assumptions written down either way.",
    next: "Comment your most important number with where it came from — future-you will thank present-you.",
  },
  "excel.save": {
    did: "You saved/exported your work.",
    why: "Deliverables ship. A CSV export feeds Power BI, databases or a teammate's Python; a saved sheet in your portfolio becomes proof of skill you can show in interviews. 'It worked on my screen' is not a deliverable.",
    watch: "CSV keeps values and formulas' results, not the formulas — export a workbook JSON too if you want the full model back.",
    next: "Save a copy to your portfolio after each meaningful milestone, not just at the end.",
  },
  "excel.undo": {
    did: "You used undo/redo.",
    why: "Professionals experiment fearlessly *because* Ctrl+Z exists. Trying a formula, hating it, undoing, trying another — that loop is exactly how senior analysts work.",
    watch: "Undo history resets when the workbook closes — save a version before big surgery.",
    next: "Nothing to do here — the safety net is on. Try the bolder version of whatever you were afraid to attempt.",
  },
  "excel.clearfmt": {
    did: "You cleared formatting.",
    why: "Starting from a clean grid prevents inherited colors and formats from confusing the next person — data teams do this before every serious rebuild.",
    next: "Re-apply just the essentials: bold headers, one number format per column.",
  },
};

/* ============================ POWER BI ============================ */

const PBI_KB: KB = {
  "pbi.data": {
    did: "You connected the report to a dataset.",
    why: "In real Power BI this is 'Get Data': you connect to the warehouse, CRM or a file, and the model loads it. Everything downstream — visuals, filters, measures — is only as good as this table.",
    watch: "Before building anything, confirm the **grain**: one row = one transaction? one event? Everything you aggregate depends on this being true.",
    next: "Open the Data pane and click through the fields — know which are text (dimensions) and which are numbers (measures).",
  },
  "pbi.visual": {
    did: "You added a visual to the report page.",
    why: "Each visual answers one question. Cards answer 'how much, in one number', bar charts answer 'which is biggest', lines answer 'what trend'. A real dashboard is 4–8 visuals that together answer the manager's questions without narration.",
    watch: "A visual with no fields is an empty box — assign fields in the Visualizations pane to bring it to life.",
    next: "Start with a Card for the headline number (total revenue), then a bar chart for the breakdown — that pair is the backbone of every exec page.",
  },
  "pbi.field": {
    did: "You assigned a field to a visual.",
    why: "Fields are the questions you ask the data: put a category on the axis and a number in values, and Power BI aggregates *for you* — no formulas needed to start. This instant aggregation is why BI teams love the tool.",
    watch: "Text fields land on the axis, numbers in values, automatically. If a number landed on an axis or a category landed in values, the chart will look wrong — check the wells.",
    next: "Click a different field in the Data pane and watch the visual re-aggregate live — that experimentation loop is how analysts find the story.",
  },
  "pbi.agg": {
    did: "You changed the aggregation (Sum / Average / Count…).",
    why: "The same field tells different true stories depending on aggregation: Sum of order value = revenue, Average = typical basket, Count = volume. Choosing deliberately is the difference between a chart and a wrong chart.",
    watch: "Summing an *average-like* column (ratings, ages, percentages) is almost always wrong — use Average or Count there.",
    next: "Flip your value between Sum and Average and ask: which question does each version answer?",
  },
  "pbi.format": {
    did: "You changed a visual's formatting.",
    why: "Formatting is the polish that makes a dashboard feel finished: clear titles, readable labels, sensible colors. Real report standards fix titles like 'Revenue by Region' — never 'Sum of Amount'.",
    watch: "Resist decorating: every color and label should carry information, or remove it.",
    next: "Title every visual with its question ('Revenue by Region') — reviewers notice titles before they notice anything else.",
  },
  "pbi.filter": {
    did: "You set a filter on a visual.",
    why: "Filters scope a visual without rebuilding it: top 10 products, last 90 days, one segment. Analysts use visual filters to keep a page focused while the full data stays in the model.",
    watch: "Visual filters apply to that visual only — page filters (Filters pane) apply to everything on the page. Know which one you set.",
    next: "Set a Top-N filter (top 5) on your bar chart — 'top 5 by revenue' is the single most requested chart in business.",
  },
  "pbi.crossfilter": {
    did: "You clicked a data point and cross-filtered the page.",
    why: "This is the magic moment of BI: visuals talk to each other. Click the West bar and every other chart recalculates for West — that interactive drilling is what makes dashboards meetings' favorite tool.",
    watch: "A cross-filter stays until you clear it (the chip above the canvas). If numbers look surprising, check for an active filter chip first.",
    next: "Click a slice of the pie, read the effect on the bar chart, then clear the chip and compare — that two-second check is a habit worth building.",
  },
  "pbi.slicer": {
    did: "You used a slicer.",
    why: "Slicers hand control to the report *user*: let the sales director pick their region themselves instead of you emailing five versions. Self-service is the whole point of BI tools.",
    watch: "A slicer filters the whole page — if visuals look empty, the slicer's selection may be excluding everything.",
    next: "Add a slicer on Region, select two values, and watch the whole page adjust together.",
  },
  "pbi.page": {
    did: "You managed report pages.",
    why: "Real reports are organized like a story: page 1 the executive summary (4–6 visuals), page 2 the detail table, page 3 the deep dive. Named pages ('Overview', 'Detail') guide the reader.",
    watch: "Hidden pages still exist — used deliberately for drill-through details, confusing when accidental.",
    next: "Rename the current page 'Overview' and start a second page for details — page names are the report's table of contents.",
  },
  "pbi.measure": {
    did: "You wrote a DAX measure.",
    why: "Measures are the model's brain: Revenue := SUM(Sales[Amount]), Margin % := DIVIDE(Profit, Revenue). Unlike a calculated column they compute at query time inside the *current filter context* — so the same measure correctly serves every visual, slicer and page. This is the skill that separates report builders from report *authors*.",
    watch: "A measure lives in filter context: the value in the West bar is the measure evaluated with West applied. If a total looks odd, think 'what filters are active here?' — that one question solves most DAX mysteries.",
    next: "Create 'Avg Order Value := AVERAGEX(Sales, Sales[Amount] * Sales[Price])' style measures for your key numbers and use them in a Card.",
  },
  "pbi.dataview": {
    did: "You inspected the data / model.",
    why: "Data view is where analysts sanity-check the load: does the column contain what we think, how many distinct regions, any NULLs? Model view is where relationships live — the plumbing that lets one table filter another.",
    watch: "A relationship pointing the wrong direction silently blanks out visuals. In this sandbox the model is one flat table — the simplest, most common real-world shape.",
    next: "In Data view, click a text column and read the distinct count in the summary bar — it catches category explosions (500 'regions') instantly.",
  },
  "pbi.save": {
    did: "You saved/exported the report.",
    why: "Reports ship to colleagues, and the .pbix (here: JSON) is the artifact your team iterates on. Saved reports in your portfolio become interview proof: 'here is a dashboard I built'.",
    next: "Save after every milestone — real BI developers version their work constantly.",
  },
  "pbi.focus": {
    did: "You focused a visual.",
    why: "Focus mode zooms one visual full-screen for meetings and deep reads — exactly what a presenter does when someone asks 'wait, show me just that chart'.",
    next: "Press Esc or the back button to return to the canvas.",
  },
  "pbi.drag": {
    did: "You moved/resized a visual.",
    why: "Layout is storytelling: the headline KPI top-left (eye starts there), the biggest driver next to it, detail below. Real report standards define this grid — tidy pages read as credible.",
    watch: "Overlapping visuals confuse readers and yourself later; align edges to the gridlines.",
    next: "Put your Card top-left, bars to its right, trend line below — the classic exec layout.",
  },
  "pbi.remove": {
    did: "You removed a visual.",
    why: "Deleting a weak visual improves the report. Real dashboards earn their space — if a visual answers no question, it costs attention.",
    next: "Undo (Ctrl+Z) is there if you removed the wrong one.",
  },
  "pbi.theme": {
    did: "You applied a report theme.",
    why: "Themes enforce brand colors across every visual at once — in companies, the 'corporate theme' is why all official reports look identical. One click here is what design teams used to do manually for hours.",
    next: "Notice every visual re-colored instantly — that consistency is the point of themes.",
  },
};

/* =============================== SQL =============================== */

const SQL_KB: KB = {
  "sql.run.select": {
    did: "You ran a SELECT query.",
    why: "SELECT is the question you ask the database; the result grid is the database's literal answer. Every analysis starts here: look at the raw rows before you summarize them — never trust a summary of data you haven't seen.",
    watch: "SELECT * is for exploring. Real analysts name the columns they need — fewer columns = faster queries and results anyone can read.",
    next: "Add a LIMIT while exploring, then replace * with 3–4 columns you actually care about.",
  },
  "sql.run.where": {
    did: "You filtered rows with WHERE.",
    why: "WHERE is how analysts slice reality: one region, one month, orders above a threshold. It runs *before* aggregation, so it decides which rows even enter your totals — get WHERE wrong and every number after it is wrong.",
    watch: "Text needs quotes ('completed'), numbers don't (500). And NULL needs IS NULL — WHERE amount = NULL matches nothing, ever.",
    next: "Combine two conditions with AND, then ask the same question with OR and feel the difference.",
  },
  "sql.run.join": {
    did: "You joined two tables.",
    why: "Companies store data in pieces — customers in one table, orders in another — precisely to avoid duplication. JOIN glues them back together on the shared key (customer_id), and suddenly you can answer 'revenue per customer *name*' instead of per ID.",
    watch: "Watch the join key: joining on the wrong column produces nonsense without errors. And duplicates on either side multiply rows — if your total jumps oddly, count rows before and after the JOIN.",
    next: "JOIN orders to customers, then GROUP BY the customer's city — that is a real deliverable-shaped query.",
  },
  "sql.run.group": {
    did: "You aggregated with GROUP BY.",
    why: "GROUP BY is the workhorse of business SQL: it collapses thousands of rows into one row per group — revenue per region, orders per month, tickets per agent. Every KPI table in every company is a GROUP BY at heart.",
    watch: "Golden rule: every column in SELECT must be either in GROUP BY or inside an aggregate (SUM/COUNT/AVG…). Anything else is undefined in real databases.",
    next: "Add ORDER BY your-aggregate DESC to see the biggest groups first, then HAVING COUNT(*) > 5 to keep only meaningful groups.",
  },
  "sql.run.order": {
    did: "You sorted results with ORDER BY.",
    why: "Databases return rows in no meaningful order unless you say so. ORDER BY amount DESC puts the biggest customer first — the difference between a dataset and an answer.",
    watch: "Sort by the *aggregate* alias ('ORDER BY total_revenue DESC'), not by a column you didn't select.",
    next: "Add LIMIT 5 after your DESC sort — 'top 5' queries are the most requested one-liners in business.",
  },
  "sql.run.cte": {
    did: "You used a CTE (WITH … AS).",
    why: "CTEs name a subquery so the main query stays readable: WITH monthly AS (…), then SELECT from it. Analysts chain two or three CTEs to build complex logic step by step — this is how professionals write SQL that teammates can maintain.",
    watch: "Each CTE can use the ones before it, not after. If a CTE errors, run its inner SELECT alone to debug.",
    next: "Write a CTE that aggregates per month, then a main query that ranks months — two small steps beat one giant query.",
  },
  "sql.run.window": {
    did: "You used a window function (OVER …).",
    why: "Window functions are the senior-analyst move: they calculate *across related rows without collapsing them* — rank each customer within their region, each month's sales next to the previous month (LAG), running totals. GROUP BY destroys rows; OVER keeps every row and adds context beside it.",
    watch: "PARTITION BY defines the groups, ORDER BY inside OVER defines the sequence — mixing up the OVER's ORDER BY with the query's final ORDER BY is the classic first-week mistake.",
    next: "Try ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC) and filter your eyes to the top row of each region — that is 'best customer per region', a famous interview question.",
  },
  "sql.run.union": {
    did: "You combined two result sets with UNION.",
    why: "UNION stacks results that belong in one report but live in different queries — this year's rows and last year's, two regional tables. UNION ALL keeps duplicates and is faster; plain UNION de-duplicates.",
    watch: "Both SELECTs must return the same number of columns, in compatible types — column names come from the first SELECT.",
    next: "UNION ALL two months of a table, then GROUP BY the month column to compare them in one result.",
  },
  "sql.run.error": {
    did: "The query failed with an error.",
    why: "Good news: SQL fails *loudly*. The error message points at the problem — a misspelled table, a missing comma, a wrong keyword. Reading errors calmly is a core analyst skill; the database is trying to help you.",
    watch: "Fix order: 1) table/column spelled right? 2) every comma and quote balanced? 3) keywords in order (SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT).",
    next: "Simplify: run just 'SELECT * FROM your_table LIMIT 5', then add one clause back at a time until it breaks — the break is your bug.",
  },
  "sql.exercise": {
    did: "You checked an exercise answer.",
    why: "The exercises are deliberately shaped like real requests — 'top 5', 'last 90 days', 'per region' — so passing them means you can handle a manager's actual email. Muscle memory here is what makes SQL feel like typing, not translating.",
    watch: "If your result shape looks right but the check fails, compare column names and sort order — checkers read the result exactly like a manager would.",
    next: "Re-solve the failed one without the hint — the second attempt is where the syntax sticks.",
  },
  "sql.preview": {
    did: "You previewed a table.",
    why: "Professionals always preview before querying: what columns exist, what the values look like, is the date a real date or text pretending to be one. Thirty seconds here saves thirty minutes of confusion.",
    next: "Note the column names and types in the schema browser — your queries must match them exactly.",
  },
  "sql.import": {
    did: "You imported a data file as a SQL table.",
    why: "This mirrors real ETL: a CSV lands in your inbox (messy included), you load it into the database, and now SQL power applies to it. Blanks become NULL and $-text becomes numbers — the same conversions real loaders do.",
    watch: "Messy files make messy queries: GROUP BY a casing-inconsistent column and you'll see the problem with your own eyes — that's the lesson.",
    next: "Run SELECT * LIMIT 5 on the imported table, then GROUP BY its category column and meet the mess.",
  },
  "sql.template": {
    did: "You opened a query template.",
    why: "Templates are the standard patterns of the trade — top-N, per-group totals, joins. Analysts keep a personal snippet file exactly like this; nobody memorizes everything, everyone reuses.",
    next: "Run the template as-is, then change one thing (the column, the filter) — modification is how patterns become knowledge.",
  },
  "sql.export": {
    did: "You exported the query results.",
    why: "The result of a query is a deliverable: it becomes the CSV in someone's email, the feed for Power BI, or the input to the next step. The query text itself is the documentation of where the numbers came from.",
    next: "Save your query text next to the CSV — in real work the query IS the audit trail.",
  },
};

export function explainAction(tool: CoachTool, a: CoachAction): ActionExplain {
  const kb = tool === "excel" ? EXCEL_KB : tool === "dashboard" ? PBI_KB : SQL_KB;
  const base = kb[a.kind] ?? {
    did: a.label,
    why: "Every action you take is building the same muscle: turning raw data into something a decision-maker can trust. Keep going — the coach will narrate as you work.",
    next: "Not sure what to do next? Open the **Guide** tab and follow the session step by step.",
  };
  // enrich with the action's own detail where useful
  let did = base.did;
  if (a.kind === "excel.formula" && a.detail) did = `You wrote \`${shortRef(a.detail)}\`.`;
  else if (a.kind === "excel.edit" && a.detail) did = `You typed \`${shortRef(a.detail)}\` into a cell.`;
  else if (a.kind === "pbi.visual" && a.detail) did = `You added a **${a.detail}** visual.`;
  else if (a.kind === "pbi.field" && a.detail) did = `You assigned **${a.detail}** to a field well.`;
  else if (a.kind === "pbi.measure" && a.detail) did = `You defined the measure \`${shortRef(a.detail)}\`.`;
  else if (a.kind === "sql.run" && a.detail) did = `You ran: \`${shortRef(a.detail)}\``;
  else if (a.kind === "excel.data" && a.detail) did = `You loaded **${a.detail}** into the sheet.`;
  else if (a.kind === "pbi.data" && a.detail) did = `You connected **${a.detail}** to the report.`;
  return { ...base, did };
}

/* ===================== GUIDED SESSIONS (auto-checked) ===================== */

export interface GuideStep {
  id: string;
  title: string;
  /** how to do it, beginner-friendly markdown */
  how: string;
  /** why this step matters in real work */
  why: string;
  /** event kinds that complete this step automatically; "*" suffix = prefix match */
  watch: string[];
}

export interface GuideSession {
  id: string;
  title: string;
  goal: string;
  steps: GuideStep[];
}

export const GUIDE_SESSIONS: Record<CoachTool, GuideSession> = {
  excel: {
    id: "excel-first",
    title: "Your first analyst worksheet",
    goal: "Load data, compute, format and deliver — the exact loop companies pay for, coached step by step.",
    steps: [
      {
        id: "load",
        title: "Load a dataset",
        how: "Data tab ▸ **Get Data** (or File ▸ Open) and pick **Retail Sales 2025 (Clean)**. Any sample works.",
        why: "Every real task begins with an extract landing on your desk. Loading it is step one of the analyst loop.",
        watch: ["excel.data"],
      },
      {
        id: "look",
        title: "Look before you compute",
        how: "Click through 5–10 cells. Use **Freeze Top Row** (View tab) so headers stay visible while you scroll.",
        why: "Analysts explore before they summarize — knowing the columns prevents every later mistake.",
        watch: ["excel.freeze", "excel.edit", "excel.data"],
      },
      {
        id: "formula",
        title: "Write your first real formula",
        how: "Click an empty cell under the last column and type `=SUM(I2:I50)` (adjust the column letter to your numbers). Press Enter.",
        why: "A total is the first question every manager asks. Formulas update when data changes — typed numbers never do.",
        watch: ["excel.formula", "excel.autosum"],
      },
      {
        id: "conditional",
        title: "Ask a smarter question — SUMIF",
        how: "In another cell: `=SUMIF(F:F,\"North\",I:I)` — total revenue for one region. Swap 'North' for any value in your data.",
        why: "'How much came from X?' is the most common business question. SUMIF is its answer.",
        watch: ["excel.formula", "excel.autosum"],
      },
      {
        id: "format",
        title: "Make it readable",
        how: "Select the header row → **Bold**. Select a money column → number format **Currency**.",
        why: "Formatted sheets get trusted and used; raw grids get questioned and redone.",
        watch: ["excel.format", "excel.numfmt", "excel.table"],
      },
      {
        id: "sort",
        title: "Sort to find the story",
        how: "Click any cell in your number column → Data tab ▸ **Sort Z→A** to bring the biggest values to the top.",
        why: "Sorted data shows its story without a single formula — the cheapest insight available.",
        watch: ["excel.sort"],
      },
      {
        id: "deliver",
        title: "Deliver it",
        how: "Data tab ▸ **Save** to your portfolio (or File ▸ Save As CSV). Name it like a real file: *sales_summary_2025.csv*.",
        why: "Work that isn't saved and named properly doesn't exist. Deliverables end the loop.",
        watch: ["excel.save"],
      },
    ],
  },
  dashboard: {
    id: "pbi-first",
    title: "From raw data to a working dashboard",
    goal: "Build a page a manager would actually use: headline number, breakdown, trend, and interactivity.",
    steps: [
      {
        id: "data",
        title: "Connect data",
        how: "Home ▸ **Get Data** and load **Retail Sales 2025 (Clean)**.",
        why: "The model comes first: no data, no dashboard. This mirrors 'Get Data' in the real Power BI Desktop.",
        watch: ["pbi.data", "pbi.visual"],
      },
      {
        id: "kpi",
        title: "Add the headline number (Card)",
        how: "Home ▸ **Card**. In Visualizations, drag your revenue/amount field into **Fields**, set aggregation **Sum**.",
        why: "Executives read one number first. The Card is that number.",
        watch: ["pbi.visual", "pbi.field"],
      },
      {
        id: "breakdown",
        title: "Add the breakdown (Column chart)",
        how: "Home ▸ **Column chart**. Put a category (Region) on **X-axis**, the number on **Y-axis**.",
        why: "'Which is biggest?' is the next question every manager asks after the total.",
        watch: ["pbi.visual", "pbi.field"],
      },
      {
        id: "trend",
        title: "Add the trend (Line chart)",
        how: "Add a **Line chart**: a date column on X-axis, the number on Y-axis.",
        why: "Trends answer 'better or worse?' — the question behind nearly every KPI review.",
        watch: ["pbi.visual", "pbi.field"],
      },
      {
        id: "format",
        title: "Title everything properly",
        how: "Select each visual ▸ Format tab ▸ **Title** on, e.g. 'Revenue by Region'.",
        why: "A dashboard with clear titles explains itself in meetings — that's the standard real reports are held to.",
        watch: ["pbi.format"],
      },
      {
        id: "interact",
        title: "Feel the interactivity",
        how: "Click a bar (or a slicer value) and watch every other visual recalculate. Clear with the filter chip.",
        why: "Cross-filtering is why BI beats static reports: the meeting can ask 'just the West?' and get it instantly.",
        watch: ["pbi.crossfilter", "pbi.slicer"],
      },
      {
        id: "ship",
        title: "Save your report",
        how: "Home ▸ **Save** to your Academy portfolio, and export the JSON.",
        why: "Shipped work is portfolio evidence — this file is interview proof of a built dashboard.",
        watch: ["pbi.save"],
      },
    ],
  },
  sql: {
    id: "sql-first",
    title: "From zero to your first analysis",
    goal: "Go from empty editor to a joined, grouped, sorted analysis — the exact shape of a real work request.",
    steps: [
      {
        id: "preview",
        title: "Preview a table",
        how: "In the schema browser click **customers** ▸ Preview 10 rows. Read the columns.",
        why: "Never query blind: preview first, write second.",
        watch: ["sql.preview", "sql.run.select"],
      },
      {
        id: "select",
        title: "Your first SELECT",
        how: "`SELECT name, city FROM customers LIMIT 10;` — run it.",
        why: "SELECT * FROM is how every SQL career starts. Name columns to keep results readable.",
        watch: ["sql.run.select"],
      },
      {
        id: "where",
        title: "Filter with WHERE",
        how: "`SELECT * FROM orders WHERE status = 'completed' LIMIT 10;`",
        why: "WHERE slices reality — 'completed only', 'this month', 'over $500'.",
        watch: ["sql.run.where"],
      },
      {
        id: "group",
        title: "Aggregate with GROUP BY",
        how: "`SELECT status, COUNT(*) AS n, SUM(total_amount) AS revenue FROM orders GROUP BY status ORDER BY revenue DESC;`",
        why: "GROUP BY turns raw rows into a management report — the core of business SQL.",
        watch: ["sql.run.group"],
      },
      {
        id: "join",
        title: "JOIN two tables",
        how: "`SELECT c.name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.id LIMIT 10;`",
        why: "Real questions need real tables joined: orders have IDs, people have names.",
        watch: ["sql.run.join"],
      },
      {
        id: "window",
        title: "Rank with a window function",
        how: "`SELECT name, city, ROW_NUMBER() OVER (PARTITION BY city ORDER BY name) AS rn FROM customers LIMIT 15;`",
        why: "Window functions rank and compare *without collapsing rows* — the senior-analyst tool.",
        watch: ["sql.run.window"],
      },
      {
        id: "ex",
        title: "Prove it in the exercises",
        how: "Open **Exercises** and check off #1 and #4 (instant feedback).",
        why: "The exercises mirror real work requests — passing them means you're ready for the real inbox.",
        watch: ["sql.exercise"],
      },
    ],
  },
};

/** Does this event kind complete this guide step? Supports "prefix*" patterns. */
export function stepWatched(step: GuideStep, kind: string): boolean {
  return step.watch.some((w) => (w.endsWith("*") ? kind.startsWith(w.slice(0, -1)) : w === kind));
}
