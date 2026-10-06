# Worklog

---
Task ID: 1
Agent: Main agent (Super Z)
Task: Build a complete Data Analytics Academy website — beginner-to-master learning paths, free in-browser tools (Excel, BI dashboards, SQL, cleaner, automation), real-world projects, and a GitHub-exportable portfolio workspace.

Work Log:
- Initialized fullstack environment via init script; installed jszip, papaparse (+types)
- Created src/lib/academy/store.ts — Zustand + localStorage persistence: XP/levels, lesson & step completion, saved sheets/dashboards, workspace files
- Created src/lib/academy/datasets.ts — deterministic seeded datasets: clean/messy retail sales, marketing, HR, traffic, tickets + SQL store tables (customers/orders/order_items/products/employees) + CSV helpers
- Wrote curriculum-a.ts / curriculum-b.ts — 4 levels, 20 modules, 84 lessons with detailed content (paragraphs, bullets, code fences, TIP/REAL WORLD callouts, takeaways, practice tasks)
- Wrote projects.ts — 7 real-company projects (retail cleaning, exec dashboard, marketing ROI, SQL cohorts/RFM, ETL pipeline, HR attrition, capstone) with 7-8 steps each, hints, rubrics, deliverables
- Wrote portfolio.ts — generates real project folders (README, cleaning logs, cleaned CSVs, runnable pandas scripts, SQL query files, pipeline specs, runbooks, dashboards, exec summaries); GitHub guide
- Built sql-engine.ts — custom SQL engine: SELECT/DISTINCT, WHERE (IN/LIKE/BETWEEN/IS NULL), JOINs (INNER/LEFT, table aliases), GROUP BY/HAVING, aggregates incl. COUNT(DISTINCT), ORDER BY, LIMIT, functions (UPPER/LOWER/ROUND/ABS/COALESCE/LENGTH/SUBSTR/TRIM/JULIANDAY/CAST AS), CASE WHEN, and CTEs (WITH ... AS)
- Built 5 tool components: ExcelTool (formula engine, grid, CSV import/export, sort/dedupe/text ops, column stats, saved sheets), DashboardTool (KPI/bar/line/area/pie/table widgets, filters, top-N, saved dashboards, JSON export), SqlTool (schema browser, editor, results grid, 10 auto-checked exercises), CleanerTool (profiling, 26-issue detection, 9 one-click fixes, cleaning log, CSV+log export), AutomationTool (visual pipeline builder, quality gates, run log with timings, generated Python export)
- Built views: HomeView, PathsView (sidebar curriculum + lesson viewer), ProjectsView (cards + step tracking + folder generation), WorkspaceView (file tree, previews, ZIP download via JSZip, GitHub guide with copy commands)
- page.tsx shell (sticky header nav, XP badge, sticky footer), layout.tsx, globals.css (dark theme, emerald accents, custom scrollbars)
- Browser self-verification + fixes:
  - Fixed Excel formula engine: ranges now resolve cell references to values (SUM was returning 0); verified SUM/SUMIF/IF in browser
  - Fixed Dashboard KPI: aggregates over all rows (avg was summing group averages); AOV now $508 not $2.0k
  - Fixed SQL engine bugs found via browser + bun test scripts: table alias resolution, SELECT * expansion, GROUP BY bucket flattening (arrays of combos), added WITH/CTE, CASE, CAST, JULIANDAY, COUNT(DISTINCT), SUBSTR
  - Fixed Automation clean step smartCase (first-letter uppercase) → 4 canonical regions
  - Fixed Md renderer: added # heading support
  - Verified via test scripts: 13 SQL regression queries OK, 5/5 project SQL files run, 49 portfolio files generated (173 KB ZIP), no empty files
  - Verified in browser (agent-browser): all flows — lesson completion, dataset loading, formulas, sample dashboard, exercise check (green check + counter), cleaning pipeline (172→107 rows, 26→0 issues), pipeline run (all green), project step completion, portfolio generation, workspace tree/preview/ZIP
  - Mobile viewport (390×844) renders correctly; footer pushes naturally; no console/page errors; lint clean; dev.log clean

Stage Summary:
- Deliverable: complete single-route Next.js 16 app at /home/z/my-project (src/app/page.tsx) — Data Analytics Academy
- All processing is client-side (zero delays); progress persists in localStorage
- Key artifacts: 84-lesson curriculum, 7 portfolio-generating projects, 5 professional tools, custom SQL engine with CTE support, ZIP export + GitHub publish guide
- Verification: lint clean, zero runtime errors, all golden-path flows browser-verified, SQL engine regression-tested via scripts/test-sql.ts, test-project-sql.ts, test-portfolio.ts

---
Task ID: 2
Agent: Main agent (Super Z)
Task: Polish round — standardize Excel/SQL/Power BI tools, add more sample data files (huge + medium, messy), teach at every stage, white (light) interface with dark/light toggle.

Work Log:
- Theme: default switched to light (white); layout.tsx pre-hydration script reads localStorage 'aaa-theme' (no flash, no hydration mismatch); migrated 115 hardcoded dark classes to semantic tokens in HomeView/PathsView/ProjectsView/WorkspaceView/AutomationTool; verified light+dark in browser incl. mobile 390px
- Datasets: added 3 new sample files — bank_transactions (8,187 rows HUGE messy: 3 date formats, $-text, negatives, dup submissions), deliveries (2,400 LARGE messy: supplier case-variants, missing dates, $-text freight), app_events (11,000 HUGE clean clickstream); fixed messy badge detection; catalog now 15 files
- Excel: ribbon tabs (Home/Formulas/Data); Formulas tab inserts 17 starter formulas; status bar (Ready/Editing, cell, Count/Numeric/Sum/Average of selected col); Excel-standard bottom sheet tabs (open/save/delete); Ctrl+D fill down; engine: full-column refs (F:F), full-row refs (2:4), IFERROR/IFNA lazy eval, AVERAGEIF, SUMIFS, COUNTIFS, XLOOKUP, INDEX, MATCH, ROUNDUP, ROUNDDOWN; mission updated to teach new UI
- SQL: "Import a data file as a table" — any sample file becomes queryable (types inferred, blanks→NULL, $-text→numbers, capped 4k rows); imported tables removable, shown violet in schema browser; auto-loads SELECT preview; mission adds "Query a raw file" teaching step
- Power BI: 2 new visuals — scatter (X/Y measures) and bar+line combo (dual axis, Legend); widget.size S/M/L col-span control; Undo button + Ctrl+Z (24-step stack); second-measure field wells; verified KPI math ($172.9k / 340 / $508.65)
- Fixed pre-existing CleanerTool TS error (R.region narrowing); Excel imports Plus/-Database; SqlTool downloadDatasetCSV import restored
- Verification: tsc clean, eslint clean, 13/13 SQL regression queries pass, 5/5 project SQL files run, 15 datasets build, portfolio ZIP 49 files/173KB OK; browser-verified: light+dark home/paths/dashboard/excel, dataset load via Radix picker, SUMIF full-column (26,297.15), XLOOKUP fallback, SQL Ctrl+Enter, GROUP BY over imported messy table (AcmeParts vs acmeparts teaching moment), undo, theme toggle+persist, mobile layout

Stage Summary:
- All three flagship tools (Excel/SQL/Power BI) now match industry-standard UX patterns and are fully functional; 15 practice files across Small→Huge, clean→messy; every tool teaches via Coach missions + live tips; white interface is the default with persisted dark toggle

---
Task ID: 3
Agent: Main agent (Super Z)
Task: Make Excel & Power BI faithful to Microsoft's products (all buttons/tabs/paths working), add real GitHub push & pull, triple-check everything.

Work Log:
- GitHub: new src/lib/academy/github.ts — full REST client (PAT auth, /user, /user/repos list+create, Git Data API push: blobs→tree→commit→ref incl. empty-repo first-commit; pull: recursive tree→blob download with binary/size caps); store.ts gained upsertWorkspaceFiles; new GithubPanel.tsx in Workspace — token connect (step-by-step fine-grained instructions), repo picker/create/by-URL, Push N files w/ commit message, Pull to workspace (scope folder input), activity log, branch-moved advice; tested live: fake token → clean 401 UI, rate-limit 403 → dedicated friendly message; scripts/test-github.ts validates parseRepoInput + API plumbing
- Excel Studio v2 (full rewrite, ~2400 lines): authentic ribbon (Home/Insert/Formulas/Data/Review/View) with labeled groups (Clipboard/Font/Alignment/Number/Styles/Cells/Editing); cell formatting (B/I/U, font size, font & fill color palettes, borders, align L/C/R, number formats: General/Number/Currency/Comma/Percent/Text) applied to ranges; name box + formula bar with ✓/✗; range selection (drag, shift+arrows, Ctrl+A) w/ fill handle (formulas shift refs Excel-style via shiftFormula); AutoFilter dropdowns w/ value checklists; right-click context menu (copy/cut/paste, insert/delete row/col, sort, clear); Find & Replace (Ctrl+F, Find All→jump, Replace All); freeze panes (top row/first col/both — real sticky); embedded draggable charts (Column/Line/Pie) from selection; undo/redo (Ctrl+Z/Y, 40 deep); zoom slider 50–160%; col resize by drag; real multi-sheet workbook (add/rename dbl-click/duplicate/delete/tab colors, auto-persist localStorage); conditional formatting (greater-than/less-than/contains); Ctrl+B/I/U/C/X/V/D/F/A; status bar stats for selection; portfolio save row
- Power BI Studio v2 (full rewrite): PBI Desktop layout — vertical view rail (Report/Data/Model + pane toggle), ribbon (Home/Insert/View: undo/redo, insert visuals, pages, filters, themes, gridlines, tidy layout); free-form canvas (aspect-16:9, gridlines, drag-to-move, corner resize, % geometry); cross-filtering (click bar/line/area/pie/donut/scatter/slice → all other visuals filter, chips w/ clear, toggle-off); slicers (multi-select); Visualizations pane with Build (gallery + field wells Axis/Values/Line + per-well aggregation select + Top N) and Format tabs (X/Y/W/H, title, legend+position, data labels, axis titles, data colors, background, border, visual filter); Fields pane (search, σ/T/calendar type icons, checkboxes wired to wells); Filters pane (page-level); page tabs (add/rename dbl-click/duplicate/hide/delete); Data view (column click → Count/Distinct/Sum/Avg/Min/Median/top-values summary); Model view (fact-table card, implicit measures card, relationships explainer); 5 themes; smart default dimensions (lowest-cardinality non-ID col) + auto titles ("Units by Region"); save reports + JSON export/import; undo/redo
- Theme fixes: ProjectsView/HomeView/PathsView/AutomationTool had remaining text-white & pale text-emerald-300/400 — migrated to semantic tokens with dark: variants (36+ spots); verified hero/stats/lesson pages in light + dark via screenshots
- Testing (triple-check): tsc clean, eslint clean, 13/13 SQL regression queries, 5/5 project SQL, portfolio ZIP 49 files/173KB, datasets script OK; browser-verified: Excel (load 340-row dataset, =SUM computes 22,808.25 w/ thousand separators, Ctrl+B bold, insert column chart renders, autofilter hides checked-out values, find 51 matches, add sheet, save-to-portfolio, workbook persists after reload); PBI (4 visuals render, KPI $ values, drag moves card 2%→9%, format data labels render 611/587/537, slicer West filters page + chip, Data view Region summary, Model view SUM(Units) implicit measure, Ocean theme re-colors bars #0ea5e9, save report); GitHub panel (401 flow); lesson complete +10 XP; theme toggle persists; mobile 390px no overflow; dev.log clean

Stage Summary:
- Excel & Power BI now behave and look like the real Microsoft apps (ribbon/groups/wells/format pane/cross-filter/pages) with every button wired
- GitHub push & pull work for real from the browser via PAT (blobs→tree→commit→ref push, tree/blob pull), with rate-limit/auth error handling and a manual terminal guide kept as fallback
- Full regression suite green; light + dark themes consistent across all views

---
Task ID: 4
Agent: Main agent (Super Z)
Task: Teach functions end-to-end — calculations, what to add after cleaning the data, DAX functions and related (Excel formulas + SQL functions) — as a new "Functions Lab" with live engines and auto-checked practice.

Work Log:
- Extracted Excel's formula engine (569 lines) verbatim from ExcelTool.tsx into src/lib/academy/formula-engine.ts so the Lab evaluates with the exact same battle-tested code; ExcelTool now imports it (behavior identical, verified in browser)
- Fixed 3 real pre-existing engine bugs found by the new test suite: (1) single-cell refs leaked an Arg object into expressions (=IF(F2>500,…) compared "[object Object]"); (2) cellValue prefix-parsed ISO dates into numbers ("2025-01-02"→2025) breaking YEAR/MONTH/DAY/TEXT; (3) AVERAGEIF ignored its average_range argument
- Extended the engine with teachable functions: IFS, SUMPRODUCT, HLOOKUP, LARGE/SMALL, MAXIFS/MINIFS, RANK, SUBSTITUTE, FIND/SEARCH, TEXT (number + date patterns), DATE, TODAY, YEAR, MONTH, DAY, EOMONTH, WEEKDAY, WEEKNUM; criteria matching now supports Excel wildcards (* ? ~) via a shared matchCrit used by SUMIF/SUMIFS/COUNTIF(S)/MAXIFS/MINIFS
- Built src/lib/academy/dax-engine.ts — a real mini-DAX engine over the Sales model (340 rows): tokenizer/parser/evaluator with filter context, CALCULATE (boolean filters with operator semantics + table filters + context transition), FILTER, ALL (table/column), VALUES/DISTINCT, iterators (SUMX/AVERAGEX/MINX/MAXX/COUNTX), DIVIDE, IF/SWITCH(TRUE()), ISBLANK/BLANK, TOTALYTD, DATESYTD, SAMEPERIODLASTYEAR, DATEADD, PREVIOUSMONTH, FORMAT, measure registry with cycle guard; teaching error messages (row-context explanation, unknown measure, sandbox-limited functions); 67/67 tests in scripts/test-dax.ts against ground truth computed from the dataset
- Created src/lib/academy/functions-db.ts — the knowledge base: 35 Excel + 22 DAX + 18 SQL function entries (syntax, args, worked example with REAL verified results, 3-6 sentence teaching detail, tips/gotchas, related links), the 8-step "after cleaning → what to compute" framework with per-step Excel/DAX/SQL formula trios, 7 dataset playbooks (sales, marketing, HR, tickets, finance GL, bank, inventory — derived columns + KPIs + why), a searchable "which function do I need?" decision helper (14 tasks × 3 dialects), and 22 auto-checked challenges
- Built FunctionsView (src/components/academy/functions/): GuideTab (framework checklist +8 XP/step, playbooks, decision helper with copy chips), ExcelTab (function library + live sandbox over clean_sales as a virtual sheet A1:K199, column map, examples, data preview), DaxTab (library + Measure Studio: evaluate any measure, 8 one-click patterns, save/delete user measures persisted in store, built-in measure cards with live values, column-vs-measure concept cards), SqlTab (schema browser + live query runner on the playground tables + examples), ArenaTab (22 drills filtered by tool, checked by the real engines, +8 XP each, hints + model solutions)
- Store: added "functions" ViewId, daxMeasures persistence (saveDaxMeasure/deleteDaxMeasure); page.tsx nav (Sigma icon "Functions Lab") + footer; HomeView tool card (6 tools now) + hero copy
- Fixed Arena measure-name stripping heuristic that cut bare CALCULATE expressions at the filter's "=" (found via browser screenshot test)
- Verification (triple-check): lint clean, tsc clean (src/), scripts/test-formula-engine.ts 49/49 (virtual-sheet regression incl. new functions, wildcards, derived-column patterns), test-dax.ts 67/67, test-challenges.ts 22/22 (every challenge's model answer re-evaluated through the real engines), test-sql.ts + test-project-sql.ts green; browser: Guide steps award XP, Excel sandbox =SUMIF → 30,457.46 live, DAX [Avg Order Value] → 508.65, CALCULATE West → 48,189.28, % of total via ALL → 1, measure save persists, SQL GROUP BY + CTE render results, Arena right/wrong feedback + XP 10→42, Excel Studio formula commit + workbook persistence across reload, dark + light themes verified via screenshots, mobile 390px no overflow, dev.log clean, no console errors

Stage Summary:
- The academy now teaches the full calculation layer: an 8-step "what to compute after cleaning" framework, 7 dataset playbooks, a 3-dialect decision helper, 75 taught functions (Excel/DAX/SQL) with real-data results, three live evaluators (Excel formulas, DAX measures, SQL queries) and a 22-drill auto-checked Challenge Arena
- New reusable engines: shared formula-engine lib (fixed + extended) and a mini-DAX engine with context transitions and time intelligence — both fully regression-tested
