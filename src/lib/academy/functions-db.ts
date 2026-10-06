// Functions Lab knowledge base — every function a working analyst reaches for,
// across Excel, DAX (Power BI) and SQL, with real results from this platform's
// sample data so learners can verify every example live in the sandbox.

export type Tool = "excel" | "dax" | "sql";

export interface FuncEntry {
  id: string;
  name: string;
  tool: Tool;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  syntax: string;
  summary: string;
  args?: { name: string; desc: string }[];
  example: string;
  exampleResult: string;
  detail: string; // markdown-lite teaching content
  tip?: string;
  gotcha?: string;
  related?: string[];
}

/* ============================================================================
   EXCEL — sandbox columns: A=order_id B=order_date C=customer D=region
   E=category F=product G=units H=unit_price I=revenue J=channel K=payment
   (clean retail sales, first 198 rows shown; full-column refs cover them all)
   ========================================================================== */
export const EXCEL_FUNCS: FuncEntry[] = [
  {
    id: "xl-sum", name: "SUM", tool: "excel", category: "Aggregate", level: "Beginner",
    syntax: "SUM(number1, [number2], …)",
    summary: "Adds numbers, cells or ranges together.",
    args: [{ name: "number1…", desc: "Numbers, cell references or ranges to add" }],
    example: "=SUM(I:I)",
    exampleResult: "98,363.56 — total revenue of the whole sheet",
    detail: "SUM is the first function every analyst learns and still the one you will type most. It adds every numeric value in the arguments and silently ignores text and blanks, which is why `SUM(I:I)` is safe even though the column has a text header. Use full-column references like `I:I` when your data grows, so new rows are picked up automatically. In a cleaned sales file, `SUM` over the revenue column is your headline number: total sales for the period.",
    tip: "Alt + = inserts SUM automatically above/beside the numbers you selected.",
    related: ["xl-sumif", "xl-sumifs", "xl-sumproduct"],
  },
  {
    id: "xl-average", name: "AVERAGE", tool: "excel", category: "Aggregate", level: "Beginner",
    syntax: "AVERAGE(number1, [number2], …)",
    summary: "Arithmetic mean of the numbers supplied.",
    example: "=AVERAGE(H2:H199)",
    exampleResult: "73.33 — mean unit price",
    detail: "AVERAGE adds the values then divides by how many numeric values it found, ignoring text and empty cells. That nuance matters after cleaning: blanks are excluded from the denominator, but zeros are not, so a column with real zeros gives a different mean than one with blanks standing for 'unknown'. Always pair AVERAGE with a count (COUNT) so you know how many values the mean is based on — a mean of 3 values is not a statistic, it is an anecdote.",
    gotcha: "Zeros count; blanks do not. Decide which one 'missing' means in your data before averaging.",
    related: ["xl-count", "xl-averageif", "xl-median"],
  },
  {
    id: "xl-count", name: "COUNT / COUNTA / COUNTBLANK", tool: "excel", category: "Aggregate", level: "Beginner",
    syntax: "COUNT(range) · COUNTA(range) · COUNTBLANK(range)",
    summary: "COUNT counts numbers, COUNTA counts non-empty cells, COUNTBLANK counts gaps.",
    example: "=COUNT(H2:H199)  ·  =COUNTBLANK(C2:C199)",
    exampleResult: "198 numbers · 0 blanks",
    detail: "These three counting functions are your fastest data-quality check. Run them on every key column right after loading a file: if `COUNT` on a supposedly numeric column is smaller than `COUNTA`, numbers got stored as text somewhere; if `COUNTBLANK` is non-zero on a required field like customer or date, you have missing data to fix or flag. In reporting, `COUNTA` on an ID column is the natural 'number of records' KPI.",
    tip: "COUNTIFS (below) is the conditional cousin — combine both for a quick completeness dashboard.",
    related: ["xl-countif", "xl-sum", "xl-average"],
  },
  {
    id: "xl-max", name: "MAX / MIN", tool: "excel", category: "Aggregate", level: "Beginner",
    syntax: "MAX(range) · MIN(range)",
    summary: "Largest and smallest numeric value in a range.",
    example: "=MAX(H2:H199)  ·  =MIN(G2:G199)",
    exampleResult: "416.5 highest unit price · 1 lowest units per line",
    detail: "MAX and MIN give instant sanity bounds on any numeric column. After cleaning a price or age column, check MAX first: a price of 41,650 or an age of 210 is a data-entry error that averages and sums will happily swallow. They also power simple business questions directly — biggest single order, cheapest product, most units on one line — without any chart at all.",
    related: ["xl-large", "xl-countif"],
  },
  {
    id: "xl-large", name: "LARGE / SMALL", tool: "excel", category: "Aggregate", level: "Intermediate",
    syntax: "LARGE(range, k) · SMALL(range, k)",
    summary: "The k-th largest (or smallest) value — top-N without sorting.",
    example: "=LARGE(H2:H199,3)",
    exampleResult: "229.99 — third-highest unit price",
    detail: "LARGE and SMALL answer 'what is the 3rd biggest order?' without rearranging your data, which keeps the sheet stable while you explore. Nest them for a quick Top-N list: `=LARGE(I:I, ROW()-1)` copied down gives a ranked series you can feed into a chart. They are also handy for outlier inspection — compare LARGE(k=1..5) against the mean to see how skewed your revenue really is.",
    related: ["xl-max", "xl-rank"],
  },
  {
    id: "xl-sumif", name: "SUMIF", tool: "excel", category: "Conditional aggregate", level: "Beginner",
    syntax: "SUMIF(range, criteria, [sum_range])",
    summary: "Adds only the numbers where a condition is met.",
    args: [
      { name: "range", desc: "Where to test the condition (e.g. D:D for region)" },
      { name: "criteria", desc: "\"West\", \">=1000\", \"Electronics\", \"Yara*\"" },
      { name: "sum_range", desc: "The numbers to add (defaults to range)" },
    ],
    example: '=SUMIF(D:D,"West",I:I)',
    exampleResult: "30,457.46 — West region revenue",
    detail: "SUMIF is how spreadsheet analysts slice revenue by one dimension: region, channel, category, month. The criteria argument understands text equality, comparisons (`\">1000\"`) and wildcards (`\"Yara*\"`). It is the single most-used formula in month-end reporting because it answers 'how much did X do?' in one cell, and unlike a pivot table it updates instantly when the data changes.",
    gotcha: "Text criteria is case-insensitive but must match exactly after trimming — \"South \" with a trailing space matches nothing. That is exactly the kind of dirt the Cleaner tool strips first.",
    related: ["xl-sumifs", "xl-countif", "xl-averageif"],
  },
  {
    id: "xl-sumifs", name: "SUMIFS", tool: "excel", category: "Conditional aggregate", level: "Intermediate",
    syntax: "SUMIFS(sum_range, crit_range1, crit1, [crit_range2, crit2], …)",
    summary: "Conditional sum with two or more conditions at once.",
    example: '=SUMIFS(I:I,D:D,"West",E:E,"Sports")',
    exampleResult: "1,262.63 — Sports revenue in the West only",
    detail: "SUMIFS extends SUMIF to any number of AND-ed conditions: West AND Sports, Online Store AND December, revenue above 1000 AND units above 8. Note the argument order flips versus SUMIF — the sum range comes first here. This is the workhorse behind multi-dimensional KPI cells like 'Revenue · West · Q4' on executive sheets, and it is the pattern you will reimplement a hundred times as CALCULATE in DAX and WHERE clauses in SQL.",
    tip: "All criteria ranges must be the same height as the sum range, or Excel returns #VALUE!.",
    related: ["xl-sumif", "xl-countifs", "dax-calculate"],
  },
  {
    id: "xl-averageif", name: "AVERAGEIF", tool: "excel", category: "Conditional aggregate", level: "Intermediate",
    syntax: "AVERAGEIF(range, criteria, [average_range])",
    summary: "Mean of the values where a condition is met.",
    example: '=AVERAGEIF(E:E,"Electronics",H:H)',
    exampleResult: "89.51 — average Electronics unit price",
    detail: "AVERAGEIF answers 'what is the typical value for this segment?', which is often the more honest number than the total: Electronics sells fewer, pricier units, and a SUM hides that while the AVERAGE reveals it. Compare AVERAGEIF across categories and you have a one-formula pricing report. As with AVERAGE, zeros count and blanks don't — know which your data uses for 'none'.",
    related: ["xl-average", "xl-sumif", "xl-countif"],
  },
  {
    id: "xl-countif", name: "COUNTIF", tool: "excel", category: "Conditional aggregate", level: "Beginner",
    syntax: "COUNTIF(range, criteria)",
    summary: "Counts cells that satisfy one condition.",
    example: '=COUNTIF(E:E,"Electronics")  ·  =COUNTIF(H:H,">100")',
    exampleResult: "39 Electronics orders · 46 orders priced above $100",
    detail: "COUNTIF is the fastest way to profile a column: how many of each region, how many rows above a threshold, how many customers contain 'Yara'. Analysts use it during cleaning to size each problem (how many rows say 'north' vs 'NORTH'?) and during reporting to build mini frequency tables by copying the formula down a list of unique values. Pair it with SUMPRODUCT or pivot tables when you need more than one condition.",
    tip: 'Wildcards: * matches any run of characters, ? exactly one — "Yara*" finds every Yara.',
    related: ["xl-countifs", "xl-sumif", "xl-count"],
  },
  {
    id: "xl-countifs", name: "COUNTIFS", tool: "excel", category: "Conditional aggregate", level: "Intermediate",
    syntax: "COUNTIFS(crit_range1, crit1, [crit_range2, crit2], …)",
    summary: "Counts rows meeting several conditions at once.",
    example: '=COUNTIFS(E:E,"Electronics",G:G,">=5")',
    exampleResult: "27 — Electronics lines with 5+ units",
    detail: "COUNTIFS builds a frequency table over combinations: how many Electronics lines shipped 5+ units, how many West orders used PayPal. It is the natural engine behind 'conversion funnel' style metrics — rows passing stage one, then stage one AND two — and it tolerates empty criteria ranges gracefully. If you find yourself nesting several COUNTIFS in one formula, that is the signal to move to a pivot table or a real measure.",
    related: ["xl-countif", "xl-sumifs"],
  },
  {
    id: "xl-sumproduct", name: "SUMPRODUCT", tool: "excel", category: "Aggregate", level: "Advanced",
    syntax: "SUMPRODUCT(array1, [array2], …)",
    summary: "Multiplies ranges pairwise, then sums the products.",
    example: "=SUMPRODUCT(G2:G199,H2:H199)",
    exampleResult: "98,363.56 — revenue rebuilt from units × price",
    detail: "SUMPRODUCT computes a weighted total in one step: units × price across every row, quantity × unit cost for inventory valuation, days-late × fee for penalty accruals. It is also a validation tool — SUMPRODUCT(units, price) should equal SUM(revenue) if the revenue column was derived correctly; any mismatch means someone hard-keyed a number. Classic analysts also abuse it as a conditional sum before SUMIFS existed, multiplying by boolean arrays.",
    gotcha: "Ranges must be the same size, and text values count as 0 — clean numeric columns first.",
    related: ["xl-sum", "xl-sumifs"],
  },
  {
    id: "xl-median", name: "MEDIAN", tool: "excel", category: "Aggregate", level: "Intermediate",
    syntax: "MEDIAN(number1, [number2], …)",
    summary: "The middle value — half the numbers sit above, half below.",
    example: "=MEDIAN(I2:I199)",
    exampleResult: "≈ mid-range order value, robust to one huge order",
    detail: "MEDIAN is the mean's outlier-proof sibling. Revenue data is almost always right-skewed — a handful of big orders pulls the mean up — so the median 'typical order' is the number to quote when one whale would otherwise flatter the business. Rule of thumb from practice: report the mean when the distribution is roughly symmetric, report the median when it is skewed, and say which one you used.",
    tip: "Compare MEDIAN to AVERAGE: a big gap is your skewness alarm.",
    related: ["xl-average", "xl-large"],
  },
  {
    id: "xl-round", name: "ROUND / ROUNDUP / ROUNDDOWN", tool: "excel", category: "Math", level: "Beginner",
    syntax: "ROUND(number, digits) · ROUNDUP(number, digits) · ROUNDDOWN(number, digits)",
    summary: "Round to a chosen number of decimal places.",
    example: "=ROUND(AVERAGE(H2:H199),0)",
    exampleResult: "73",
    detail: "ROUND changes the stored value to the precision you choose, while cell formatting only changes how it displays — confusing the two is how reports end up with columns that 'don't add up'. Use ROUND(…,0) for whole units, ROUND(…,2) for money, and ROUNDUP when you need to guarantee enough (like rounding staff coverage up). ROUNDDOWN pairs with INT for floor-style maths.",
    tip: "ROUND(x, -3) rounds to thousands — great for executive summaries ('≈ $98k').",
    related: ["xl-int", "xl-text"],
  },
  {
    id: "xl-int", name: "INT / MOD", tool: "excel", category: "Math", level: "Beginner",
    syntax: "INT(number) · MOD(number, divisor)",
    summary: "Integer part, and the remainder after division.",
    example: "=INT(7.9)  ·  =MOD(10,3)",
    exampleResult: "7 · 1",
    detail: "INT floors a number to a whole value and MOD returns what is left after division — together they drive the arithmetic of grouping: MOD(order_number, 2) splits work into two batches for A/B processing, INT((ROW()-2)/10) assigns every ten rows to a bucket. Date arithmetic uses them too: INT of an Excel date-time is the day, MOD is the time fraction.",
    related: ["xl-round"],
  },
  {
    id: "xl-abs", name: "ABS / SQRT / POWER", tool: "excel", category: "Math", level: "Beginner",
    syntax: "ABS(number) · SQRT(number) · POWER(number, exponent)",
    summary: "Absolute value, square root and exponentiation.",
    example: "=ABS(-1250)  ·  =SQRT(144)  ·  =POWER(1.05,10)",
    exampleResult: "1250 · 12 · 1.6289 (5% growth for 10 periods)",
    detail: "ABS strips the sign — essential after cleaning when refunds or corrections arrive as negatives and you want the magnitude of movement. SQRT and POWER cover the statistical and financial sides: POWER(1.05, 10) compounds a 5% growth rate across ten periods, which is exactly how a 'what if we grow 5% a year' conversation starts in a real meeting.",
    related: ["xl-round"],
  },
  {
    id: "xl-if", name: "IF", tool: "excel", category: "Logical", level: "Beginner",
    syntax: "IF(logical_test, value_if_true, value_if_false)",
    summary: "Returns one of two values depending on a condition.",
    example: '=IF(I2>500,"big","small")',
    exampleResult: '"big" or "small" for each row',
    detail: "IF turns a spreadsheet from a calculator into a decision engine: flag orders above a threshold, mark rows that need review, split customers into high/low value. Nested IFs handle multiple bands (`IF(x>1000,\"A\",IF(x>500,\"B\",\"C\"))`) but become unreadable past three levels — switch to IFS, or better, build the bands in a lookup table with VLOOKUP's approximate match. IF also returns numbers, so `IF(I2>H2,1,0)` creates a 0/1 flag column you can SUM to count matches.",
    tip: "A 0/1 flag column is often more useful than a text label — you can aggregate it.",
    related: ["xl-ifs", "xl-iferror", "xl-and"],
  },
  {
    id: "xl-ifs", name: "IFS", tool: "excel", category: "Logical", level: "Intermediate",
    syntax: "IFS(test1, value1, [test2, value2], …)",
    summary: "Checks conditions in order and returns the first match — no nesting.",
    example: '=IFS(H2>200,"A",H2>50,"B",TRUE,"C")',
    exampleResult: '"A", "B" or "C" price tier per row',
    detail: "IFS reads top to bottom and stops at the first TRUE condition, which mirrors how business rules are written: premium if over 200, standard if over 50, budget otherwise. The final `TRUE, \"C\"` pair acts as 'everything else' — without it, unmatched rows return the #N/A error. Use IFS for pricing tiers, performance bands and risk buckets; use a lookup table instead when the bands might change often.",
    tip: "Put the most specific condition first — IFS stops at the first match.",
    related: ["xl-if", "xl-vlookup"],
  },
  {
    id: "xl-and", name: "AND / OR / NOT", tool: "excel", category: "Logical", level: "Beginner",
    syntax: "AND(logical1, [logical2], …) · OR(…) · NOT(logical)",
    summary: "Combine several conditions into one TRUE/FALSE result.",
    example: '=AND(D2="West",I2>500)',
    exampleResult: "TRUE only for big West orders",
    detail: "AND returns TRUE only when every condition is true, OR when at least one is, NOT flips a result. They rarely appear alone — they live inside IF and COUNTIFS-style formulas to express 'West AND big' or 'cancelled OR returned'. A 0/1 version like `AND(D2=\"West\",I2>500)*1` gives you a filter flag column that SUM can total, which is how old-school analysts built dashboards before SUMIFS.",
    related: ["xl-if", "xl-countifs"],
  },
  {
    id: "xl-iferror", name: "IFERROR / IFNA", tool: "excel", category: "Logical", level: "Intermediate",
    syntax: "IFERROR(value, value_if_error) · IFNA(value, value_if_na)",
    summary: "Catch formula errors and replace them with something sensible.",
    example: '=IFERROR(1/0,"n/a")  ·  =IFNA(VLOOKUP(…),"not found")',
    exampleResult: '"n/a" instead of #DIV/0!',
    detail: "IFERROR wraps any formula and substitutes a fallback when it errors, which keeps reports from filling up with #DIV/0!, #N/A and #REF!. IFNA is the surgical version — it only catches #N/A, the 'not found' error of lookups, and lets genuine mistakes still scream at you. Best practice: fix the cause (divide by MAX(denominator,1), clean the lookup keys) and keep IFERROR as the visible safety net, not the hiding place.",
    gotcha: "IFERROR hides ALL errors including broken references — a formula that is silently wrong is worse than one that is loudly broken.",
    related: ["xl-if", "xl-vlookup", "xl-xlookup"],
  },
  {
    id: "xl-vlookup", name: "VLOOKUP", tool: "excel", category: "Lookup", level: "Beginner",
    syntax: "VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
    summary: "Find a row in another table by its first column and pull a value from it.",
    args: [
      { name: "lookup_value", desc: "What to search for (product name, customer id)" },
      { name: "table_array", desc: "The lookup table — key must be its FIRST column" },
      { name: "col_index_num", desc: "Which column of the table to return (1 = the key)" },
      { name: "range_lookup", desc: "FALSE = exact match (use this 95% of the time)" },
    ],
    example: '=VLOOKUP("Coffee Maker",F:H,3,FALSE)',
    exampleResult: "89 — the unit price of the first Coffee Maker row",
    detail: "VLOOKUP joins tables by hand: fetch each product's price, each employee's department, each region's target. The lookup key must sit in the first column of the table you point at, and FALSE (exact match) is what you want for real joins — TRUE does an approximate match meant for tax brackets and tiered tables. Its limits — key must be leftmost, column number counted by hand, breaks when columns are inserted — are exactly why XLOOKUP and INDEX/MATCH took over.",
    gotcha: "The #1 VLOOKUP failure is text that looks numeric ('1001' vs 1001) — align types before looking up.",
    related: ["xl-xlookup", "xl-index", "xl-ifna"],
  },
  {
    id: "xl-xlookup", name: "XLOOKUP", tool: "excel", category: "Lookup", level: "Intermediate",
    syntax: "XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])",
    summary: "Modern lookup: any direction, exact by default, built-in fallback.",
    example: '=XLOOKUP("Coffee Maker",F:F,H:H,"not found")',
    exampleResult: "89 — same join as VLOOKUP, but no column counting",
    detail: "XLOOKUP fixes every VLOOKUP pain: you point at the lookup column and the return column separately, so the key can sit anywhere, inserting columns breaks nothing, and exact match is the default. The fourth argument is a graceful not-found message, replacing the IFNA wrapper entirely. It can also search from the bottom (last price a customer paid) and return whole rows — the workhorse of modern Excel joins.",
    tip: "XLOOKUP is Excel 365/2021 — in older Excel use INDEX/MATCH, which works everywhere.",
    related: ["xl-vlookup", "xl-index", "xl-iferror"],
  },
  {
    id: "xl-index", name: "INDEX + MATCH", tool: "excel", category: "Lookup", level: "Advanced",
    syntax: "INDEX(return_range, MATCH(lookup_value, lookup_range, 0))",
    summary: "The two-part lookup: MATCH finds the position, INDEX returns the value.",
    example: '=INDEX(H:H,MATCH("Coffee Maker",F:F,0))',
    exampleResult: "89 — price found via position",
    detail: "MATCH returns where something is (position number), INDEX returns what is there — combined they outperform VLOOKUP on flexibility: look left, look up, two-way lookups with INDEX(range, MATCH(row), MATCH(col)), and no fragility when columns move. This pattern is also the conceptual bridge to DAX: MATCH is a filter over a column, INDEX is fetching the value that survives the filter. Learn it once and XLOOKUP, VLOOKUP and DAX all feel like variations.",
    tip: "Always pass 0 as MATCH's third argument — that's the exact-match switch.",
    related: ["xl-vlookup", "xl-xlookup", "xl-match"],
  },
  {
    id: "xl-match", name: "MATCH", tool: "excel", category: "Lookup", level: "Intermediate",
    syntax: "MATCH(lookup_value, lookup_array, [match_type])",
    summary: "Returns the position of a value in a range (1, 2, 3…).",
    example: '=MATCH("Desk Lamp",F:F,0)',
    exampleResult: "row position of the first Desk Lamp in column F",
    detail: "MATCH is the locator half of the lookup duo. With match_type 0 it finds the exact position of a value in a column — the number you then feed to INDEX, or use on its own to check membership ('does this SKU exist in the price list?'). Match types 1 and -1 do approximate matching on sorted data for tier tables. On its own, a MATCH that returns #N/A is also a cheap data-quality test for key consistency between two files.",
    related: ["xl-index", "xl-vlookup"],
  },
  {
    id: "xl-rank", name: "RANK", tool: "excel", category: "Lookup", level: "Intermediate",
    syntax: "RANK(number, ref, [order])",
    summary: "Where a value stands in a list — 1st, 2nd, 3rd…",
    example: '=RANK(I2,I$2:I$199)',
    exampleResult: "1 for the biggest order, 2 for the next…",
    detail: "RANK converts raw numbers into ordinal positions, which is what sales leaderboards, 'top products' tables and performance quartiles are made of. Lock the reference range with $ so every row competes in the same pool, and remember ties share the best rank and skip the next (two 2nd places, no 3rd). For a dense ranking without gaps, RANK plus COUNTIF of ties is the classic workaround.",
    related: ["xl-large", "xl-countif"],
  },
  {
    id: "xl-left", name: "LEFT / RIGHT / MID", tool: "excel", category: "Text", level: "Beginner",
    syntax: "LEFT(text, n) · RIGHT(text, n) · MID(text, start, n)",
    summary: "Cut characters from the start, end or middle of a text value.",
    example: "=LEFT(B2,4)  ·  =RIGHT(A2,4)",
    exampleResult: "\"2025\" from the date · the order number's digits",
    detail: "These three slice text into the pieces analysts actually need: the year prefix of an order id, the last digits of a SKU, the month code buried in a product code. They are central to cleaning — extracting country codes from phone numbers, store numbers from transaction ids. Combine with FIND to slice at a variable position, and with VALUE() when the extracted piece must become a number.",
    related: ["xl-len", "xl-find", "xl-value"],
  },
  {
    id: "xl-len", name: "LEN / TRIM", tool: "excel", category: "Text", level: "Beginner",
    syntax: "LEN(text) · TRIM(text)",
    summary: "Measure a string's length and strip stray spaces.",
    example: "=LEN(TRIM(C2))  ·  =TRIM(\"  AVA NGUYEN \")",
    exampleResult: "length of the cleaned name · \"AVA NGUYEN\"",
    detail: "LEN counts characters and TRIM removes leading, trailing and doubled spaces — run `LEN(TRIM(x))` on key columns during cleaning and any value whose length differs from its siblings is a suspect: invisible double spaces are the most common reason VLOOKUPs 'randomly' fail. TRIM also fixes the case-variant chaos (' AVA ' vs 'Ava') before you dedupe, which is why it appears in virtually every professional cleaning script.",
    tip: "TRIM does not remove non-breaking spaces (CHAR(160)) — SUBSTITUTE those first.",
    related: ["xl-substitute", "xl-proper", "xl-countif"],
  },
  {
    id: "xl-upper", name: "UPPER / LOWER / PROPER", tool: "excel", category: "Text", level: "Beginner",
    syntax: "UPPER(text) · LOWER(text) · PROPER(text)",
    summary: "Standardize capitalization across a column.",
    example: '=PROPER(" ava okafor ")',
    exampleResult: '"Ava Okafor"',
    detail: "Mixed casing is the most visible kind of dirty data: 'SOUTH', 'south' and 'South' are three different values to every formula even though they are one region in reality. Applying UPPER/LOWER/PROPER creates a canonical form so COUNTIF and VLOOKUP match everything, and it is step one of the standardize-casing fix in professional cleaning scripts. PROPER also capitalizes after spaces, which is why it is the go-to for names.",
    related: ["xl-trim", "xl-substitute"],
  },
  {
    id: "xl-substitute", name: "SUBSTITUTE", tool: "excel", category: "Text", level: "Intermediate",
    syntax: "SUBSTITUTE(text, old_text, new_text, [instance])",
    summary: "Replace every occurrence of one piece of text with another.",
    example: '=SUBSTITUTE(A2,"ORD","ORDER")',
    exampleResult: "\"ORDER-1149\" from \"ORD-1149\"",
    detail: "SUBSTITUTE is the cleaning scalpel: strip currency symbols (`SUBSTITUTE(H2,\"$\",\"\")`), remove thousands separators, normalize separators ('2025/01/04' → '2025-01-04'), or blank out noise characters entirely by replacing with \"\". It is what makes text-safe numbers parseable again — after substituting away the '$' and ',', wrap in VALUE() to get a true number. Chaining two SUBSTITUTEs handles the classic '$1,234.56' → 1234.56 conversion.",
    related: ["xl-value", "xl-trim", "xl-text"],
  },
  {
    id: "xl-find", name: "FIND / SEARCH", tool: "excel", category: "Text", level: "Intermediate",
    syntax: "FIND(find_text, within_text, [start]) · SEARCH(…)",
    summary: "Return the position where one text appears inside another.",
    example: '=SEARCH("-",A2)',
    exampleResult: "4 — position of the dash in ORD-1149",
    detail: "FIND and SEARCH return the character position of a substring, which is how you slice variable-length text: the region code before the dash, the surname after the space (`MID(C2,FIND(\" \",C2)+1,50)`). FIND is case-sensitive, SEARCH is not — SEARCH is usually what cleaning needs. Wrapping in IFERROR handles the #VALUE! you get when the needle is missing, turning 'not found' into a blank instead of an error.",
    related: ["xl-left", "xl-mid", "xl-iferror"],
  },
  {
    id: "xl-value", name: "VALUE", tool: "excel", category: "Text", level: "Intermediate",
    syntax: "VALUE(text)",
    summary: "Convert a number stored as text into a real number.",
    example: '=VALUE(SUBSTITUTE(H2,"$",""))',
    exampleResult: "89 from the text \"$89.00\"",
    detail: "Numbers trapped as text are the classic silent killer: they left-align, COUNT ignores them, SUM treats them as zero, and pivot totals come out wrong with no error anywhere. VALUE forces the conversion once the obstructing characters are gone — usually after SUBSTITUTE has stripped '$', ',' or spaces. Test a suspect column with `COUNT(range) < COUNTA(range)`: if true, some numbers are text and VALUE (or Data ▸ Text to Columns) is the cure.",
    related: ["xl-substitute", "xl-count", "xl-sum"],
  },
  {
    id: "xl-text", name: "TEXT", tool: "excel", category: "Text", level: "Intermediate",
    syntax: "TEXT(value, format_text)",
    summary: "Turn a number or date into formatted text, your way.",
    example: '=TEXT(AVERAGE(H2:H199),"0.00")  ·  =TEXT(B2,"yyyy/mm")',
    exampleResult: '"73.33" · "2025/01"',
    detail: "TEXT controls presentation inside the cell's value itself: currency, thousands, percentages, and custom date shapes like \"yyyy-mm\" or \"ddd, mmm d\". Its most powerful analytical use is creating period keys — TEXT(date,\"yyyy-mm\") gives a sortable month column you can COUNTIF or SUMIF across, no pivot needed. Remember the output is text: keep the raw numeric column for calculations and add the formatted one for labels and keys.",
    tip: 'TEXT(date,"yyyy-mm") is the fastest way to build a month key for monthly reporting.',
    related: ["xl-year", "xl-substitute", "xl-sumif"],
  },
  {
    id: "xl-year", name: "YEAR / MONTH / DAY", tool: "excel", category: "Date", level: "Beginner",
    syntax: "YEAR(date) · MONTH(date) · DAY(date)",
    summary: "Extract the calendar parts of a date.",
    example: "=YEAR(B2)  ·  =MONTH(B2)",
    exampleResult: "2025 · 1",
    detail: "Pulling year, month and day out of a date column is how raw transactions become analyzable periods: a Month column feeds the monthly trend, a Year column powers year-over-year comparisons, a Weekday column exposes the weekend effect. These functions only work on real dates — if the source arrived as text ('2025/01/04'), standardize the format first (SUBSTITUTE + DATE) or the results are errors. In BI tools this step becomes a proper date/calendar table.",
    related: ["xl-date", "xl-text", "xl-eomonth"],
  },
  {
    id: "xl-date", name: "DATE / TODAY", tool: "excel", category: "Date", level: "Beginner",
    syntax: "DATE(year, month, day) · TODAY()",
    summary: "Build a date from parts; get today's date.",
    example: "=DATE(2025,3,15)  ·  =TODAY()-B2",
    exampleResult: "2025-03-15 · days since the order",
    detail: "DATE assembles a genuine date from three numbers, making it the standardizer of last resort: when a file mixes '04/01/2025' and '2025-01-04', rebuilding with DATE(YEAR(x),MONTH(x),DAY(x)) guarantees one real date format. TODAY() anchors rolling logic — age of an invoice (`TODAY()-B2`), 'this month' flags, freshness thresholds — and recalculates every day, which is exactly what live dashboards need.",
    tip: "Date math is plain arithmetic: subtract two dates to get days, add 7 to a date for next week.",
    related: ["xl-year", "xl-eomonth", "xl-if"],
  },
  {
    id: "xl-eomonth", name: "EOMONTH / WEEKDAY / WEEKNUM", tool: "excel", category: "Date", level: "Intermediate",
    syntax: "EOMONTH(date, months) · WEEKDAY(date) · WEEKNUM(date)",
    summary: "Month-end dates, day-of-week numbers and week numbers.",
    example: '=EOMONTH(B2,0)  ·  =WEEKDAY(B2)',
    exampleResult: "last day of that month · 1=Sunday … 7=Saturday",
    detail: "EOMONTH jumps to a month end — the anchor for month-close reconciliations and 'days remaining in month' KPIs — and EOMONTH(d,-1) gives the previous month's end for comparisons. WEEKDAY maps a date to 1–7 so you can flag weekends (WEEKDAY>5 in the Sunday-start convention), which is how retailers separate weekday from weekend behaviour. WEEKNUM supports weekly cadence reporting when the business runs on week numbers, not months.",
    related: ["xl-year", "xl-date", "xl-text"],
  },
  {
    id: "xl-nested-lookups", name: "The derived-column toolkit", tool: "excel", category: "Workflow", level: "Intermediate",
    syntax: "=IF(I2<>G2*H2,\"check\",\"\")  ·  =I2*0.08",
    summary: "The formulas you add AFTER cleaning: checks, derivations and flags.",
    example: '=IF(ABS(I2-G2*H2)>0.01,"mismatch","ok")',
    exampleResult: '"ok" on every consistent row, "mismatch" on edited ones',
    detail: "Cleaning finished? Now the sheet earns its keep. The standard post-cleaning toolkit: (1) validation formulas like `IF(ABS(revenue-units*price)>0.01,\"mismatch\",\"\")` that catch rows where derived numbers disagree; (2) derived columns — revenue itself, price bands via IFS, month keys via TEXT, margin via (price-cost)/price; (3) flag columns, 0/1 IF results you can SUM to count exceptions. Build them as *new columns* next to the cleaned data, never by overwriting the source — that keeps your work auditable and re-runnable.",
    tip: "Name derived columns clearly: revenue_check, price_band, order_month, is_weekend.",
    related: ["xl-if", "xl-sumproduct", "xl-ifs"],
  },
];

/* ============================================================================
   DAX — the model is one 'Sales' table built from the clean retail dataset:
   order_id, order_date, customer, region, category, product, units,
   unit_price, revenue, channel, payment_method  (340 rows, year 2025)
   ========================================================================== */
export const DAX_FUNCS: FuncEntry[] = [
  {
    id: "dax-sum", name: "SUM", tool: "dax", category: "Aggregation", level: "Beginner",
    syntax: "SUM('Table'[Column])",
    summary: "Adds every value of one column in the current filter context.",
    args: [{ name: "'Table'[Column]", desc: "A single numeric column, e.g. 'Sales'[revenue]" }],
    example: "SUM('Sales'[revenue])",
    exampleResult: "172,940.84 — Total Sales for the whole model",
    detail: "SUM is the base of most measures: `Total Sales = SUM('Sales'[revenue])`. The crucial idea that separates DAX from Excel is **filter context** — the same measure shows 172,940.84 on the whole page but only the West's 48,189.28 in a West-sliced visual, because Power BI filters the table before SUM ever runs. You do not pass ranges like Excel; you name a column, and the report canvas decides which rows exist.",
    gotcha: "SUM takes a column, not an expression. For units × price on the fly you need the iterator SUMX.",
    related: ["dax-sumx", "dax-calculate", "dax-average"],
  },
  {
    id: "dax-average", name: "AVERAGE", tool: "dax", category: "Aggregation", level: "Beginner",
    syntax: "AVERAGE('Table'[Column])",
    summary: "Mean of one column, ignoring blanks.",
    example: "AVERAGE('Sales'[revenue])",
    exampleResult: "508.65 — average order-line revenue",
    detail: "AVERAGE over revenue gives the mean line value, and like every DAX aggregator it respects the filter context, so the same measure is the per-region mean in any sliced visual. Remember it averages *rows*: if one order has three lines, the order-level average is a different question — use AVERAGEX over DISTINCT orders for that. Blanks are excluded from both the sum and the count, which is why clean data matters before measures are built.",
    related: ["dax-averagex", "dax-sum", "dax-divide"],
  },
  {
    id: "dax-countrows", name: "COUNTROWS", tool: "dax", category: "Aggregation", level: "Beginner",
    syntax: "COUNTROWS('Table') or COUNTROWS(FILTER(…))",
    summary: "Counts the rows of a table — the DAX way to say 'how many'.",
    example: "COUNTROWS('Sales')",
    exampleResult: "340 — orders in the model",
    detail: "COUNTROWS is the number-one diagnostic function in DAX. Wrap it around any table expression to see how many rows survive: `COUNTROWS(FILTER('Sales', 'Sales'[revenue] > 1000))` tells you the big-order count (56 here), and `COUNTROWS(VALUES('Sales'[region]))` shows how many regions exist (4). When a measure returns something unexpected, temporarily rewriting it as COUNTROWS of the same table shows you whether the problem is the filter or the aggregation.",
    related: ["dax-filter", "dax-distinctcount", "dax-values"],
  },
  {
    id: "dax-distinctcount", name: "DISTINCTCOUNT", tool: "dax", category: "Aggregation", level: "Beginner",
    syntax: "DISTINCTCOUNT('Table'[Column])",
    summary: "Counts the unique values of a column.",
    example: "DISTINCTCOUNT('Sales'[customer])",
    exampleResult: "203 — unique customers",
    detail: "DISTINCTCOUNT turns raw rows into business entities: unique customers, unique products sold, unique days with activity. It is the difference between '340 lines sold' and '203 people bought' — and the ratio of those two is a repeat-purchase proxy executives love. Unlike Excel, where unique counts need contortions, in DAX it is one function that stays correct under every slicer because the filter context applies before counting.",
    related: ["dax-countrows", "dax-values"],
  },
  {
    id: "dax-sumx", name: "SUMX", tool: "dax", category: "Iterators", level: "Intermediate",
    syntax: "SUMX('Table', expression_per_row)",
    summary: "Evaluate an expression row by row, then sum the results.",
    args: [
      { name: "'Table'", desc: "Any table expression — FILTER, VALUES, or the table itself" },
      { name: "expression", desc: "Row-by-row calculation, e.g. 'Sales'[units] * 'Sales'[unit_price]" },
    ],
    example: "SUMX('Sales', 'Sales'[units] * 'Sales'[unit_price])",
    exampleResult: "172,940.84 — revenue recomputed line by line",
    detail: "The X-family (SUMX, AVERAGEX, MINX, MAXX, COUNTX) is DAX's answer to 'no column for that yet'. SUMX walks the table one row at a time, computes your expression with that row's values, and totals the results — so units × price works even if no revenue column exists. Inside the second argument you are in **row context**: bare column references are legal there, and that is the mental model — aggregators need one column, iterators give you per-row algebra first.",
    gotcha: "SUMX('Sales', 'Sales'[units] * 'Sales'[unit_price]) and SUM('Sales'[revenue]) should agree — when they don't, your data has dirty rows.",
    related: ["dax-averagex", "dax-filter", "dax-sum"],
  },
  {
    id: "dax-averagex", name: "AVERAGEX", tool: "dax", category: "Iterators", level: "Intermediate",
    syntax: "AVERAGEX('Table', expression_per_row)",
    summary: "Row-by-row expression, then average of the results.",
    example: "AVERAGEX(VALUES('Sales'[region]), CALCULATE(SUM('Sales'[revenue])))",
    exampleResult: "43,235.21 — average region revenue",
    detail: "AVERAGEX over VALUES of a dimension computes 'the average of the group totals' — average region, average product, average month. This pattern (iterator over VALUES + CALCULATE inside) is the heart of real DAX: VALUES hands the iterator one region at a time, CALCULATE performs the **context transition** that filters sales to just that region, and AVERAGEX averages the four totals. It answers questions a plain AVERAGE cannot even express.",
    tip: "If the per-row expression starts with CALCULATE, you are doing group-level analytics — the pro pattern.",
    related: ["dax-sumx", "dax-values", "dax-calculate"],
  },
  {
    id: "dax-calculate", name: "CALCULATE", tool: "dax", category: "Filter context", level: "Intermediate",
    syntax: "CALCULATE(expression, filter1, [filter2], …)",
    summary: "Evaluate an expression under modified filter context — the most important function in DAX.",
    args: [
      { name: "expression", desc: "Any measure or aggregation" },
      { name: "filter…", desc: "'Sales'[region] = \"West\", FILTER(…), ALL(…), date intel…" },
    ],
    example: "CALCULATE(SUM('Sales'[revenue]), 'Sales'[region] = \"West\")",
    exampleResult: "48,189.28 — West revenue, ignoring any visual filter",
    detail: "CALCULATE is the engine of DAX: it takes an expression, reshapes the filter context around it, and evaluates. `'Sales'[region] = \"West\"` inside CALCULATE is a shortcut for FILTER(ALL('Sales'[region]), region = \"West\") — it *overrides* whatever the visual says, which is how 'West share of total' and 'vs target' measures work. Multiple filters AND together; ALL and its cousins REMOVE filters; date-intelligence functions shift time. Master CALCULATE and every other DAX pattern becomes readable.",
    gotcha: "Filters inside CALCULATE replace (not intersect) filters on the same column unless you use KEEPFILTERS — a classic source of 'why is my number too small' surprises.",
    related: ["dax-filter", "dax-all", "dax-divide", "dax-totalytd"],
  },
  {
    id: "dax-filter", name: "FILTER", tool: "dax", category: "Filter context", level: "Intermediate",
    syntax: "FILTER('Table', condition_per_row)",
    summary: "Return only the rows of a table that satisfy a row-by-row condition.",
    example: "COUNTROWS(FILTER('Sales', 'Sales'[revenue] > 1000))",
    exampleResult: "56 — order lines of 1000 or more",
    detail: "FILTER is a table function: it evaluates the condition against each row and keeps the survivors. Used inside CALCULATE it defines complex conditions a boolean shortcut cannot express — comparing two columns (`'Sales'[units] * 'Sales'[unit_price] <> 'Sales'[revenue]`), or measures versus thresholds. Remember FILTER iterates rows of the table you give it: FILTER(ALL('Sales'), …) searches everything, FILTER('Sales', …) only what is already visible.",
    related: ["dax-calculate", "dax-sumx", "dax-countrows"],
  },
  {
    id: "dax-all", name: "ALL", tool: "dax", category: "Filter context", level: "Advanced",
    syntax: "ALL('Table') · ALL('Table'[Column])",
    summary: "Remove filters — the whole table, or everything except one column.",
    example: "DIVIDE([Total Sales], CALCULATE([Total Sales], ALL('Sales'[region])))",
    exampleResult: "0.2787 → 27.9% — West's share of all-region revenue",
    detail: "ALL deletes filter context, and '% of total' is its signature move: the denominator recalculates over ALL regions while the numerator keeps the slicer, so every row shows its true share. ALL('Table')[Column] removes filters only on that column, keeping others — inside a Region×Category matrix, ALL(region) keeps the category filter so shares sum to 100% per category. ALLSELECTED is its report-friendly sibling that respects the user's visual selections.",
    gotcha: "ALL inside CALCULATE *replaces* the context. If your % of total shows 100% everywhere, you removed filters from the numerator too.",
    related: ["dax-calculate", "dax-values", "dax-divide"],
  },
  {
    id: "dax-values", name: "VALUES / DISTINCT", tool: "dax", category: "Filter context", level: "Advanced",
    syntax: "VALUES('Table'[Column])",
    summary: "One-row-per-value table of what is currently visible.",
    example: "COUNTROWS(VALUES('Sales'[region]))",
    exampleResult: "4 — regions visible right now",
    detail: "VALUES returns the distinct values of a column *after* the current filters — a mini table you can iterate, count or feed to SUMX. It is the standard partner for iterators (AVERAGEX over VALUES(region) = average of visible region totals) and for 'is one value selected?' logic via HASONEVALUE/SELECTEDVALUE. DISTINCT is the same idea without the possible extra BLANK row that VALUES includes when referential integrity is imperfect.",
    related: ["dax-averagex", "dax-countrows", "dax-all"],
  },
  {
    id: "dax-divide", name: "DIVIDE", tool: "dax", category: "Math", level: "Beginner",
    syntax: "DIVIDE(numerator, denominator, [alternate_result])",
    summary: "Safe division — returns BLANK (or your fallback) instead of an error.",
    example: "DIVIDE([Total Sales], [Orders])",
    exampleResult: "508.65 — average order value",
    detail: "DIVIDE is how every ratio measure should be written: AOV, conversion rate, margin %, share of total. When the denominator is zero or BLANK — no orders in that segment, empty month — regular `/` errors or returns infinity, while DIVIDE quietly returns BLANK or your third argument, keeping the report clean. Every KPI in a professional Power BI model routes through DIVIDE for exactly this reason.",
    tip: "Third argument is the 'show this instead' — DIVIDE(x, y, 0) forces zeros into the visual.",
    related: ["dax-calculate", "dax-all", "dax-if"],
  },
  {
    id: "dax-if", name: "IF / SWITCH", tool: "dax", category: "Logical", level: "Intermediate",
    syntax: "IF(condition, then, else) · SWITCH(value, p1, r1, p2, r2, [else])",
    summary: "Branching logic inside measures and calculated columns.",
    example: "SWITCH(TRUE(), [Total Sales] > 1000000, \"big\", [Total Sales] > 100000, \"mid\", \"small\")",
    exampleResult: '"mid" — 172,940.84 falls in the 100k band',
    detail: "IF works as in Excel but usually wraps measures: IF([Orders] = 0, BLANK(), [Total Sales]/[Orders]). SWITCH(TRUE(), …) is the idiomatic multi-band form — readable chains of conditions like tier classification, traffic-light statuses, age buckets. SWITCH's plain form matches one value against candidates (SWITCH([Month], 1, \"Jan\", …)), which is also how many models build sort keys for custom month orders.",
    related: ["dax-divide", "dax-if", "dax-calculate"],
  },
  {
    id: "dax-isblank", name: "ISBLANK / BLANK", tool: "dax", category: "Logical", level: "Intermediate",
    syntax: "ISBLANK(value) · BLANK()",
    summary: "Test for, or produce, the DAX empty value.",
    example: "IF(ISBLANK([Last Month Sales]), \"no data\", FORMAT([Last Month Sales], \"0\"))",
    exampleResult: "Guards visuals against empty periods",
    detail: "BLANK is DAX's missing value, and it behaves politely in arithmetic (BLANK + 5 = 5) instead of poisoning results the way Excel's errors do. ISBLANK detects it — the standard guard for YoY measures in the first year of data, or for products with no sales this month. Returning BLANK from a measure (rather than 0) is often the right display choice: charts simply skip empty points instead of dropping to zero and faking a crash.",
    related: ["dax-if", "dax-divide", "dax-sameperiodlastyear"],
  },
  {
    id: "dax-totalytd", name: "TOTALYTD", tool: "dax", category: "Time intelligence", level: "Intermediate",
    syntax: "TOTALYTD(expression, date_column, [year_end_date])",
    summary: "Year-to-date version of any expression.",
    example: "TOTALYTD(SUM('Sales'[revenue]), 'Sales'[order_date])",
    exampleResult: "172,940.84 — everything from Jan 1 to the model's last date",
    detail: "TOTALYTD is the boardroom measure: 'YTD sales', 'YTD units', 'YTD margin'. It filters the dates to January 1 through the latest visible date of the same year, then evaluates your expression over just those rows. With a full year of 2025 data the YTD total equals the grand total; slice to September on a report page and the same measure instantly shows Jan–Sep. Variants TOTALQTD and TOTALMTD cover quarter and month cadences.",
    gotcha: "Time intelligence needs a date column with real dates — if rows are text, results come back BLANK.",
    related: ["dax-datesytd", "dax-calculate", "dax-sameperiodlastyear"],
  },
  {
    id: "dax-datesytd", name: "DATESYTD", tool: "dax", category: "Time intelligence", level: "Advanced",
    syntax: "DATESYTD(date_column)",
    summary: "Returns the year-to-date slice of dates as a table filter.",
    example: "COUNTROWS(DATESYTD('Sales'[order_date]))",
    exampleResult: "340 — active dates so far this year",
    detail: "DATESYTD produces the YTD date set as a table, which you pass to CALCULATE: `CALCULATE([Total Sales], DATESYTD('Sales'[order_date]))` is exactly what TOTALYTD does internally. The value of knowing the table form is composability — combine it with other filters, count the dates, or iterate over it. The family also includes DATESQTD, DATESMTD and the range-builder DATESINPERIOD for rolling windows.",
    related: ["dax-totalytd", "dax-calculate", "dax-dateadd"],
  },
  {
    id: "dax-sameperiodlastyear", name: "SAMEPERIODLASTYEAR", tool: "dax", category: "Time intelligence", level: "Intermediate",
    syntax: "SAMEPERIODLASTYEAR(date_column)",
    summary: "Shifts the visible dates back exactly one year — the YoY engine.",
    example: "CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Sales'[order_date]))",
    exampleResult: "(BLANK) — no 2024 rows exist in this model, the classic first-year result",
    detail: "Wrap any measure in CALCULATE + SAMEPERIODLASTYEAR and you have last year's number on the same date range; subtracting or dividing the pair gives YoY growth in absolute or percentage terms. This sandbox model only contains 2025, so the measure correctly returns BLANK — which is itself the lesson: time intelligence returns empty, not zero, when prior periods are absent, and IF(ISBLANK(…), \"—\", …) keeps the report tidy. DATEADD(date, -1, YEAR) is the generalized version for any offset.",
    related: ["dax-dateadd", "dax-calculate", "dax-isblank"],
  },
  {
    id: "dax-dateadd", name: "DATEADD", tool: "dax", category: "Time intelligence", level: "Advanced",
    syntax: "DATEADD(date_column, number_of_intervals, interval)",
    summary: "Move dates by N days, months, quarters or years.",
    example: "CALCULATE(SUM('Sales'[revenue]), DATEADD('Sales'[order_date], -1, MONTH))",
    exampleResult: "Previous-month revenue (BLANK here for January rows)",
    detail: "DATEADD is the general-purpose time shifter behind MoM, QoQ and multi-year comparisons: DATEADD(d, -1, MONTH) for last month, -1 QUARTER, -1 YEAR, +12 MONTH for next year's plan comparison. As a filter passed to CALCULATE it rewrites the visible period before the measure evaluates, so the shape of the visual — day, month, quarter — is preserved automatically. Rolling-window analysis pairs it with DATESINPERIOD instead, which takes an explicit width.",
    related: ["dax-sameperiodlastyear", "dax-calculate", "dax-previousmonth"],
  },
  {
    id: "dax-previousmonth", name: "PREVIOUSMONTH", tool: "dax", category: "Time intelligence", level: "Intermediate",
    syntax: "PREVIOUSMONTH(date_column)",
    summary: "Filters to the entire previous month.",
    example: "CALCULATE(SUM('Sales'[revenue]), PREVIOUSMONTH('Sales'[order_date]))",
    exampleResult: "13,068.02 — November revenue when viewing December",
    detail: "PREVIOUSMONTH ignores the day-level detail and hands CALCULATE the whole prior month, making month-over-month reporting one measure: `[Total Sales] - CALCULATE([Total Sales], PREVIOUSMONTH(…))` is the change, DIVIDE of the pair is the %. The family includes PREVIOUSQUARTER, PREVIOUSDAY and PARALLELPERIOD for cumulative comparisons. It shines on month-sliced report pages where every row is a month.",
    related: ["dax-dateadd", "dax-calculate", "dax-divide"],
  },
  {
    id: "dax-rankx", name: "RANKX", tool: "dax", category: "Table & ranking", level: "Advanced",
    syntax: "RANKX('Table'[Column], expression, [value], [order])",
    summary: "Rank entities against each other — leaderboards in a measure.",
    example: "RANKX(ALL('Sales'[product]), CALCULATE(SUM('Sales'[revenue])))",
    exampleResult: "1 for the top-selling product, per visual filter",
    detail: "RANKX answers 'where does this item stand?' by evaluating the expression for every value of a dimension and ranking the current one. The ALL around the column is what makes ranking honest — it lets RANKX see all products even when the visual shows one row. Typical output is a product leaderboard measure you drop next to names in a table. It is one of the trickier functions (context transition plus ALL) and a rite of passage for DAX learners.",
    related: ["dax-calculate", "dax-all", "dax-topn"],
  },
  {
    id: "dax-topn", name: "TOPN", tool: "dax", category: "Table & ranking", level: "Advanced",
    syntax: "TOPN(n, 'Table', order_expression, [order])",
    summary: "Return the top-N rows of a table by any expression.",
    example: "SUMX(TOPN(5, VALUES('Sales'[product]), CALCULATE(SUM('Sales'[revenue]))), CALCULATE(SUM('Sales'[revenue])))",
    exampleResult: "Revenue of just the 5 best-selling products",
    detail: "TOPN builds 'top 5 products, top 10 customers' logic inside measures: it returns a table of the best N rows according to your order expression, which you then aggregate with SUMX or count with COUNTROWS. Together with RANKX it covers leaderboard analytics; with FILTER it powers 'everything except the top 5' long-tail analysis. In the sandbox, try it conceptually — the Top-N control in the Dashboard Studio does the same job visually.",
    related: ["dax-rankx", "dax-sumx", "dax-filter"],
  },
  {
    id: "dax-format", name: "FORMAT", tool: "dax", category: "Text", level: "Intermediate",
    syntax: "FORMAT(value, format_string)",
    summary: "Render a number or date as display text.",
    example: "FORMAT(DIVIDE([Total Sales], [Orders]), \"#,##0.00\")",
    exampleResult: '"508.65"',
    detail: "FORMAT is DAX's TEXT(): it turns values into precisely formatted strings — thousands separators, fixed decimals, percentages, date patterns. Its proper home is titles, tooltips and concatenations ('Revenue: $172.9k'); for the measure values themselves prefer the model's formatting properties so visuals keep sorting numerically. Pair it with CONCATENATE (or the & operator) to build dynamic titles like \"West · Total: $48.2k\".",
    related: ["dax-if", "dax-divide"],
  },
  {
    id: "dax-calccol", name: "Calculated column vs Measure", tool: "dax", category: "Concepts", level: "Beginner",
    syntax: "Column: Margin = 'Sales'[price] - 'Sales'[cost] · Measure: Margin % = DIVIDE(SUMX(…), …)",
    summary: "The one decision beginners must get right: row-level column, or aggregate-level measure?",
    example: "Unit Margin (column) vs Total Margin % (measure)",
    exampleResult: "Column: one value per row · Measure: one value per visual cell",
    detail: "A **calculated column** is computed once per row at refresh time and stored — revenue = units × price, month = YEAR(date), price bands. Use it when the result belongs to the row and you will slice or filter by it. A **measure** is computed at query time inside whatever filter context the visual supplies — Total Sales, AOV, % of total. Use it for anything that must aggregate correctly under every slicer. The rule of thumb: 'can I put it on an axis or slicer?' → column; 'is it a KPI number?' → measure. Memory-wise, columns cost storage, measures cost CPU — both matter at scale.",
    gotcha: "A margin column averaged with AVERAGE gives a different (often wrong) answer than a properly weighted margin measure — the classic beginner bug.",
    related: ["dax-sum", "dax-calculate", "dax-sumx"],
  },
];

/* ============================================================================
   SQL — playground tables: customers(id,name,city,segment,signup_date),
   products(id,name,category,price), orders(id,customer_id,order_date,status,
   shipping), order_items(id,order_id,product_id,quantity,unit_price),
   employees(id,name,dept,salary,hire_date,manager_id)
   ========================================================================== */
export const SQL_FUNCS: FuncEntry[] = [
  {
    id: "sql-count", name: "COUNT", tool: "sql", category: "Aggregate", level: "Beginner",
    syntax: "COUNT(*) · COUNT(col) · COUNT(DISTINCT col)",
    summary: "Count rows, non-null values, or unique values.",
    example: "SELECT COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS buyers FROM orders",
    exampleResult: "230 orders · one row with both counts",
    detail: "COUNT is the first word of almost every analytical query. COUNT(*) counts rows regardless of content, COUNT(col) skips NULLs — the difference is itself a data-quality probe — and COUNT(DISTINCT col) collapses duplicates into unique entities ('how many different customers bought?'). In reports these become the numerator and denominator of every rate metric: repeat rate = buyers / distinct buyers, fill rate = non-null / total.",
    tip: "COUNT(DISTINCT customer_id) is SQL's DISTINCTCOUNT — the same KPI you build with DAX.",
    related: ["sql-sum", "sql-groupby", "sql-coalesce"],
  },
  {
    id: "sql-sum", name: "SUM / AVG / MIN / MAX", tool: "sql", category: "Aggregate", level: "Beginner",
    syntax: "SUM(col) · AVG(col) · MIN(col) · MAX(col)",
    summary: "The four core aggregations over numeric columns.",
    example: "SELECT SUM(quantity * unit_price) AS revenue, AVG(unit_price) AS avg_price FROM order_items",
    exampleResult: "One row: total order-line revenue and mean price",
    detail: "Aggregates collapse many rows into one answer, and multiplying inside them (quantity * unit_price) is how SQL builds derived metrics on the fly — no helper column needed. MIN and MAX on dates give the observation window (first order, last order), which frames every time-series you will draw. Remember aggregates ignore NULLs: AVG of a column with blanks is the mean of the *known* values, which may or may not be what the business means by 'average'.",
    related: ["sql-count", "sql-groupby", "sql-cast"],
  },
  {
    id: "sql-groupby", name: "GROUP BY", tool: "sql", category: "Aggregate", level: "Beginner",
    syntax: "SELECT dim, AGG(...) FROM t GROUP BY dim",
    summary: "Split rows into groups and aggregate each — SQL's slice-and-dice.",
    example: "SELECT status, COUNT(*) AS n FROM orders GROUP BY status",
    exampleResult: "One row per order status with its count",
    detail: "GROUP BY + aggregate is 70% of analytical SQL: revenue by region, orders by month, tickets by priority. Every selected column must be either in the GROUP BY or inside an aggregate — the database refuses to guess which row's value to show otherwise (a rule Excel never enforces and spreadsheets silently abuse). Add ORDER BY on the aggregate to rank groups instantly, and HAVING to filter the groups themselves ('categories with more than 100 sales').",
    tip: "GROUP BY a date-derived expression (strftime month) for instant monthly trends.",
    related: ["sql-having", "sql-count", "sql-case"],
  },
  {
    id: "sql-having", name: "HAVING", tool: "sql", category: "Aggregate", level: "Intermediate",
    syntax: "… GROUP BY dim HAVING AGG(...) condition",
    summary: "WHERE filters rows; HAVING filters groups after aggregation.",
    example: "SELECT product_id, SUM(quantity) AS sold FROM order_items GROUP BY product_id HAVING SUM(quantity) > 50",
    exampleResult: "Only the high-volume products",
    detail: "The two-stage filtering model confuses every beginner once: WHERE runs before grouping (row-level, cannot see aggregates), HAVING runs after (group-level, speaks fluent SUM/COUNT). Use HAVING for thresholds on totals — 'segments with at least 20 customers', 'months with revenue above target' — and keep WHERE for narrowing the base rows first, which also makes the query faster because it aggregates less data.",
    related: ["sql-groupby", "sql-where"],
  },
  {
    id: "sql-where", name: "WHERE operators", tool: "sql", category: "Filter", level: "Beginner",
    syntax: "WHERE col op value · IN · BETWEEN · LIKE · IS NULL",
    summary: "Keep only the rows that match a condition.",
    example: "SELECT * FROM orders WHERE status = 'completed' AND order_date BETWEEN '2025-01-01' AND '2025-06-30'",
    exampleResult: "Completed H1-2025 orders only",
    detail: "WHERE is row-level filtering with a rich operator set: comparisons, IN for lists, BETWEEN for inclusive ranges, LIKE with % wildcards for patterns ('K%z' finds the Ka…z names), and IS NULL — the only correct way to test for missing values, because `col = NULL` is never true in SQL. Combining with AND/OR and parentheses lets you express exactly the cohort the business means, and getting that cohort right is 80% of getting the metric right.",
    gotcha: "NULL comparisons silently filter everything out — always use IS NULL / IS NOT NULL.",
    related: ["sql-coalesce", "sql-groupby", "sql-case"],
  },
  {
    id: "sql-case", name: "CASE WHEN", tool: "sql", category: "Conditional", level: "Intermediate",
    syntax: "CASE WHEN cond THEN val [WHEN… THEN…] [ELSE val] END",
    summary: "If/else logic inside any SQL expression.",
    example: "SELECT name, CASE WHEN salary >= 80000 THEN 'senior' WHEN salary >= 50000 THEN 'mid' ELSE 'junior' END AS band FROM employees",
    exampleResult: "Each employee with a salary band label",
    detail: "CASE WHEN is SQL's IF/IFS/SWITCH, and it appears everywhere: banding values, pivoting rows into columns (SUM(CASE WHEN region='West' THEN revenue END)), building flags the rest of the query aggregates over. It evaluates conditions in order and takes the first match, exactly like IFS in Excel — write the most specific condition first and always provide an ELSE so nothing silently becomes NULL. Once you see the pivot pattern, you will recognize half of all dashboard SQL.",
    tip: "Aggregating a CASE flag (SUM(CASE WHEN… THEN 1 ELSE 0 END)) counts matches — SQL's COUNTIF.",
    related: ["sql-groupby", "sql-having"],
  },
  {
    id: "sql-join", name: "JOIN", tool: "sql", category: "Filter", level: "Intermediate",
    syntax: "FROM a INNER JOIN b ON a.key = b.key [LEFT JOIN …]",
    summary: "Combine tables through matching keys — the real lookup.",
    example: "SELECT c.name, o.id FROM customers c INNER JOIN orders o ON o.customer_id = c.id",
    exampleResult: "Every order with its customer name",
    detail: "JOIN is how normalized databases get reassembled for analysis: orders to customers, line items to products, employees to managers. INNER JOIN keeps only matches; LEFT JOIN keeps every row of the left table with NULLs where the right side is missing — and 'LEFT JOIN + IS NULL' is the canonical 'customers who never ordered' query. This is the production-grade version of VLOOKUP: typed keys, many-to-many capable, and set-based instead of row-by-row.",
    gotcha: "Join keys with case or whitespace mismatches match nothing — UPPER(TRIM(…)) both sides when in doubt.",
    related: ["sql-where", "sql-groupby", "sql-coalesce"],
  },
  {
    id: "sql-coalesce", name: "COALESCE", tool: "sql", category: "Conditional", level: "Beginner",
    syntax: "COALESCE(expr1, expr2, …)",
    summary: "Return the first non-NULL value — the NULL vaccine.",
    example: "SELECT COALESCE(discount, 0) AS discount FROM orders",
    exampleResult: "0 wherever discount is missing",
    detail: "COALESCE replaces NULLs with sensible defaults before they can poison arithmetic: any SUM or AVG silently skips NULLs, but a NULL inside a *calculation* (price * NULL) NULLs the whole row's result. Give every nullable column a fallback at the start of the query and the rest of the SQL behaves predictably. It is also the standard tool for layered lookups — preferred value, else fallback, else 'unknown'.",
    related: ["sql-where", "sql-sum", "sql-case"],
  },
  {
    id: "sql-upper", name: "UPPER / LOWER / TRIM / LENGTH", tool: "sql", category: "String", level: "Beginner",
    syntax: "UPPER(col) · LOWER(col) · TRIM(col) · LENGTH(col)",
    summary: "Standardize case and whitespace, measure text.",
    example: "SELECT DISTINCT UPPER(TRIM(city)) AS city_clean FROM customers",
    exampleResult: "One canonical spelling per city",
    detail: "The cleaning quartet: UPPER/LOWER normalize case for consistent grouping and joins, TRIM strips stray spaces that make ' North' ≠ 'North', and LENGTH exposes anomalies — a LENGTH(city) of 0 or 30 flags empties and paste errors. These functions are the first pass of any SQL data-quality script, and DISTINCT over the cleaned column is the quickest way to eyeball what your categories really are.",
    related: ["sql-substr", "sql-replace", "sql-join"],
  },
  {
    id: "sql-substr", name: "SUBSTR", tool: "sql", category: "String", level: "Intermediate",
    syntax: "SUBSTR(col, start, length)",
    summary: "Extract part of a string by position (1-based).",
    example: "SELECT SUBSTR(signup_date, 1, 7) AS month FROM customers",
    exampleResult: "\"2025-03\" — year-month slice of a date",
    detail: "SUBSTR slices fixed-position text: year-month from an ISO date, order prefixes from transaction ids, category codes from SKUs. The classic analyst move is grouping by the slice — GROUP BY SUBSTR(order_date,1,7) is a monthly trend in one line. Position indexing is 1-based in most engines (SQLite, Postgres), and SUBSTR pairs with INSTR for variable positions defined by a delimiter.",
    related: ["sql-upper", "sql-groupby"],
  },
  {
    id: "sql-replace", name: "REPLACE", tool: "sql", category: "String", level: "Intermediate",
    syntax: "REPLACE(col, find, replace_with)",
    summary: "Swap every occurrence of a substring — SQL's SUBSTITUTE.",
    example: "SELECT REPLACE(name, '\"', '') FROM products",
    exampleResult: "Product names without stray quotes",
    detail: "REPLACE cleans characters en masse: strip currency symbols before CAST, normalize separators ('2025/01/04' → '2025-01-04'), remove quotes and padding characters that break downstream parsing. It updates every occurrence at once, and chaining two REPLACEs handles '$1,234.56' → '1234.56' → CAST to 1234.56. In SQLite it lives inside your SELECT; the cleaned value can be aliased and aggregated in the same query.",
    related: ["sql-cast", "sql-upper"],
  },
  {
    id: "sql-cast", name: "CAST", tool: "sql", category: "Numeric", level: "Intermediate",
    syntax: "CAST(col AS type)",
    summary: "Convert a value's type — text to number, number to text.",
    example: "SELECT CAST(REPLACE(price_text, '$', '') AS REAL) FROM staging",
    exampleResult: "Real numeric prices from text with $",
    detail: "CAST is the gate between storage and analysis: numbers stored as text (the curse of CSV imports) must be CAST before arithmetic, dates stored as strings must be CAST or date-parsed before date functions work. The typical cleaning pipeline is REPLACE the noise, then CAST the remainder, then validate with a COUNT of NULLs or failures. ROUND(CAST(…), 2) finishes by taming floating-point display.",
    related: ["sql-replace", "sql-round", "sql-sum"],
  },
  {
    id: "sql-round", name: "ROUND / ABS", tool: "sql", category: "Numeric", level: "Beginner",
    syntax: "ROUND(number, decimals) · ABS(number)",
    summary: "Round to N decimals; strip the sign.",
    example: "SELECT ROUND(AVG(unit_price), 2) FROM order_items",
    exampleResult: "Mean price at 2 decimals",
    detail: "ROUND keeps query output presentable — unrounded AVGs with fifteen decimals do not survive a stakeholder meeting — and ABS handles the negatives that refunds and corrections introduce. In KPI queries, ROUND the final display value but perform thresholds and comparisons on the raw numbers; rounding too early silently shifts classifications at the boundary ('4.999 rounds to 5 but is not ≥ 5').",
    related: ["sql-cast", "sql-sum"],
  },
  {
    id: "sql-julianday", name: "JULIANDAY (date math)", tool: "sql", category: "Date", level: "Advanced",
    syntax: "JULIANDAY(date) — days since a fixed epoch; subtract two for day counts",
    summary: "Turn dates into numbers so you can do arithmetic on them.",
    example: "SELECT AVG(JULIANDAY('2025-01-15') - JULIANDAY(signup_date)) AS avg_days FROM customers",
    exampleResult: "Average account age in days",
    detail: "SQLite stores dates as text, so date arithmetic runs through JULIANDAY, which converts any date to a floating day-number: differences become day counts, AVG gives average duration, adding N simulates lead times. strftime('%m', date) extracts parts for grouping ('%Y-%m' for months), and together they cover the SQL date toolkit this playground supports — the same jobs as DATEDIFF and DATEADD in bigger engines.",
    tip: "JULIANDAY('now') gives today — handy for 'days since last order' queries.",
    related: ["sql-substr", "sql-groupby"],
  },
  {
    id: "sql-window", name: "Window functions", tool: "sql", category: "Window", level: "Advanced",
    syntax: "ROW_NUMBER() OVER (PARTITION BY x ORDER BY y) · RANK() · LAG(col) OVER (…)",
    summary: "Rank, number and compare rows *within* groups — without collapsing them.",
    example: "SELECT name, dept, RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS r FROM employees",
    exampleResult: "Each employee plus their salary rank inside their department",
    detail: "Window functions are the mark of an advanced SQL analyst: unlike GROUP BY they keep every row while adding group-level intelligence. ROW_NUMBER enumerates ('latest order per customer' via QUALIFY/subquery on rn = 1), RANK/DENSE_RANK build leaderboards with defined tie behavior, LAG/LEAD fetch the previous/next row for period-over-period deltas, and SUM(col) OVER (PARTITION BY month ORDER BY day) produces running totals. The concept maps directly to RANKX and time intelligence in DAX — same questions, different syntax.",
    gotcha: "The SQL playground engine covers the core set — run window functions in a real database (or the included cheat-sheet examples) to see them live.",
    related: ["sql-groupby", "sql-case"],
  },
  {
    id: "sql-cte", name: "CTEs (WITH … AS)", tool: "sql", category: "Structure", level: "Intermediate",
    syntax: "WITH step1 AS (SELECT …), step2 AS (SELECT … FROM step1) SELECT * FROM step2",
    summary: "Named sub-queries that let you build analysis like recipes: step by step.",
    example: "WITH revenue AS (SELECT product_id, SUM(quantity * unit_price) AS r FROM order_items GROUP BY product_id) SELECT p.name, r.r FROM revenue r JOIN products p ON p.id = r.product_id ORDER BY r.r DESC",
    exampleResult: "Products ranked by revenue, built in two readable steps",
    detail: "A CTE (Common Table Expression) gives an intermediate result a name, so complex analysis reads like a story: stage the cleaned data, aggregate it, then join and rank. Every professional analytics query over ten lines uses them, both for readability and because each step can be tested alone — exactly the discipline you practiced in the cleaning projects. The playground engine fully supports CTEs, including chaining several.",
    tip: "Name CTEs for what they contain (clean_orders, monthly_revenue) — your future self is the audience.",
    related: ["sql-groupby", "sql-join"],
  },
];

/* ============================================================================
   "After cleaning → what to compute?" — the decision framework, playbooks
   and the which-function-do-I-need helper.
   ========================================================================== */
export interface GuideStep {
  id: string;
  title: string;
  body: string;      // markdown-lite
  formulas?: { label: string; excel?: string; dax?: string; sql?: string }[];
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "g1", title: "Confirm the grain — what is one row?",
    body: "Before any calculation, state what a single row represents: one order line? one transaction? one employee? Everything downstream depends on it. Our clean sales file has grain = **one order line** (order_id + product), which is why SUM(revenue) gives line revenue, not order revenue. Choosing the wrong grain is the #1 cause of inflated KPIs — counting 340 lines as 340 orders, when they may repeat customers or products. Write the grain down in your project README; your future self and every reviewer will rely on it.",
    formulas: [
      { label: "Rows vs real orders", excel: "=COUNTA(A:A)-1  vs  =SUMPRODUCT(1/COUNTIF(A2:A199,A2:A199))", dax: "Orders = COUNTROWS('Sales')", sql: "SELECT COUNT(DISTINCT order_id) FROM order_items" },
    ],
  },
  {
    id: "g2", title: "Profile every column — types, ranges, gaps",
    body: "Walk the columns one by one and classify: **dimensions** you will slice by (region, category, channel, date) and **facts** you will add up (units, unit_price, revenue). Check each: numeric columns really numeric? dates in one format? any blanks where the business needs values? any case-variant duplicates ('SOUTH'/'south')? This is exactly what the Data Cleaner profiles for you — 26 issue types with one-click fixes. You cannot decide *what to compute* until you know *what you have*.",
  },
  {
    id: "g3", title: "Derive row-level columns — the unit economics",
    body: "Now add the columns that make each row smarter. The classics, in the order real analysts add them: **revenue** (units × price — if missing, derive and validate it), **cost & margin** when a cost file exists, **period keys** (year, month, weekday) from dates, **bands** (price tiers, order sizes), **flags** (is_weekend, is_first_order). Derived columns are row-level by definition — one value per row — which in Power BI makes them calculated columns, not measures.",
    formulas: [
      { label: "Revenue check", excel: "=IF(ABS(I2-G2*H2)>0.01,\"mismatch\",\"ok\")", dax: "Revenue Check = IF(ABS('Sales'[revenue] - 'Sales'[units]*'Sales'[unit_price]) > 0.01, \"mismatch\", \"ok\")", sql: "SELECT * FROM order_items WHERE ABS(quantity*unit_price - line_total) > 0.01" },
      { label: "Month key", excel: "=TEXT(B2,\"yyyy-mm\")", dax: "Order Month = FORMAT('Sales'[order_date], \"yyyy-mm\")", sql: "SELECT SUBSTR(order_date,1,7) AS ym, SUM(quantity*unit_price) FROM order_items GROUP BY ym" },
    ],
  },
  {
    id: "g4", title: "Build the core measures — totals and counts",
    body: "With clean rows and derived columns, define the small set of aggregate KPIs every stakeholder asks first: **Total Revenue** (SUM), **Orders** (distinct order ids, not rows!), **Units**, **Unique Customers** (DISTINCTCOUNT), **Average Order Value** (revenue ÷ orders). In Power BI these become measures so they stay correct under every slicer; in Excel they are SUM/SUMIFS cells; in SQL they are GROUP BY queries. Keep the names boring and exact — 'Total Sales' means one thing everywhere.",
    formulas: [
      { label: "Core five", dax: "Total Sales = SUM('Sales'[revenue])\nOrders = DISTINCTCOUNT('Sales'[order_id])\nCustomers = DISTINCTCOUNT('Sales'[customer])\nAOV = DIVIDE([Total Sales], [Orders])\nUnits = SUM('Sales'[units])", excel: '=SUM(I:I)  ·  =SUMPRODUCT(1/COUNTIF(A2:A199,A2:A199))  ·  =SUM(G:G)', sql: "SELECT SUM(revenue), COUNT(DISTINCT order_id), COUNT(DISTINCT customer) FROM sales" },
    ],
  },
  {
    id: "g5", title: "Add the ratios — margins, shares, rates",
    body: "Raw totals flatter; ratios decide. Compute **margin %** (revenue − cost) ÷ revenue, **share of total** (segment ÷ grand total — ALL() in DAX), **repeat rate** (customers with 2+ orders ÷ all customers), **attachment rate** (orders with 2+ lines ÷ orders). Every ratio must use safe division: DIVIDE in DAX, IFERROR in Excel, NULLIF/COALESCE in SQL. Ratios are where two cleaned columns start producing insight neither could give alone.",
    formulas: [
      { label: "Share of total", dax: "West Share % = DIVIDE(CALCULATE([Total Sales], 'Sales'[region]=\"West\"), CALCULATE([Total Sales], ALL('Sales'[region])))", excel: '=SUMIF(D:D,"West",I:I)/SUM(I:I)', sql: "SELECT SUM(CASE WHEN region='West' THEN revenue END)/SUM(revenue) FROM sales" },
    ],
  },
  {
    id: "g6", title: "Layer time intelligence — YoY, MoM, YTD",
    body: "Businesses think in periods: this month vs last, this year vs last, year-to-date. Build them once as measures: **YTD** via TOTALYTD, **prior month** via PREVIOUSMONTH, **same period last year** via SAMEPERIODLASTYEAR, and growth as DIVIDE(current − prior, prior). Time intelligence needs real dates and, in production Power BI, a dedicated calendar table. Expect BLANK for the first year of history — that is correct behaviour, not a bug; guard it with IF(ISBLANK(…), \"—\", …).",
    formulas: [
      { label: "YoY growth %", dax: "YoY % = VAR cur = [Total Sales] VAR prev = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Sales'[order_date])) RETURN DIVIDE(cur - prev, prev)", sql: "SELECT a.ym, a.rev, b.rev FROM monthly a LEFT JOIN monthly b ON a.ym = b.ym || '-prev'" },
    ],
  },
  {
    id: "g7", title: "Classify and flag — thresholds into rules",
    body: "Numbers become operational when thresholds turn them into labels: **ABC product classes** (A = top 80% of revenue), **customer tiers** (high/medium/low value), **risk flags** (orders late, accounts stale, stock below reorder point). These are IFS/SWITCH/CASE constructs that create dimensions you can filter entire reports by. A flag column like is_high_value (0/1) is doubly useful — it filters AND it aggregates (SUM of flags = count of high-value customers).",
    formulas: [
      { label: "Customer tier", excel: '=IFS(L2>=5000,"high",L2>=1000,"mid",TRUE,"low")', dax: "Tier = SWITCH(TRUE(), [Cust Sales] >= 5000, \"high\", [Cust Sales] >= 1000, \"mid\", \"low\")", sql: "CASE WHEN total >= 5000 THEN 'high' WHEN total >= 1000 THEN 'mid' ELSE 'low' END" },
    ],
  },
  {
    id: "g8", title: "Validate, document, ship",
    body: "Before anything ships: **reconcile** (SUM of derived revenue vs source total — SUMPRODUCT catches the drift), **sanity-bound** (MAX/MIN within business limits), **explain** (every derived column and measure documented in the README with its formula and why it exists). This is the difference between a report and a professional deliverable — and it is exactly what the Projects workspace generates for you: cleaning logs, README, reproducible scripts, and a GitHub-ready folder. Calculations nobody can re-trace are liabilities; documented ones are assets.",
  },
];

export interface Playbook {
  datasetId: string;
  title: string;
  grain: string;
  dims: string[];
  facts: string[];
  derived: { name: string; why: string; excel?: string; dax?: string; sql?: string }[];
  kpis: { name: string; formula: string; why: string }[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    datasetId: "clean_sales", title: "Retail sales / orders", grain: "one order line",
    dims: ["region", "category", "product", "channel", "payment_method", "order_date"],
    facts: ["units", "unit_price", "revenue"],
    derived: [
      { name: "order_month", why: "monthly trends and seasonality", excel: "=TEXT(B2,\"yyyy-mm\")", dax: "FORMAT('Sales'[order_date], \"yyyy-mm\")", sql: "SUBSTR(order_date,1,7)" },
      { name: "revenue_check", why: "catch rows where revenue ≠ units × price", excel: "=IF(ABS(I2-G2*H2)>0.01,\"mismatch\",\"\")", dax: "IF(ABS('Sales'[revenue]-'Sales'[units]*'Sales'[unit_price])>0.01,\"mismatch\",\"ok\")", sql: "WHERE ABS(quantity*unit_price-line_total)>0.01" },
      { name: "price_band", why: "budget / mid / premium segmentation", excel: "=IFS(H2>200,\"premium\",H2>50,\"mid\",TRUE,\"budget\")", dax: "SWITCH(TRUE(), 'Sales'[unit_price]>200,\"premium\", 'Sales'[unit_price]>50,\"mid\", \"budget\")", sql: "CASE WHEN unit_price>200 THEN 'premium' WHEN unit_price>50 THEN 'mid' ELSE 'budget' END" },
      { name: "is_big_order", why: "0/1 flag, SUM it to count big orders", excel: "=IF(I2>=1000,1,0)", dax: "IF([Line Revenue]>=1000,1,0)", sql: "CASE WHEN quantity*unit_price>=1000 THEN 1 ELSE 0 END" },
    ],
    kpis: [
      { name: "Total revenue", formula: "SUM(revenue)", why: "the headline number every stakeholder opens with" },
      { name: "Orders (distinct)", formula: "COUNT(DISTINCT order_id) / DISTINCTCOUNT", why: "line count overstates real order volume" },
      { name: "AOV", formula: "revenue ÷ orders", why: "pricing and bundling health in one number" },
      { name: "Unique customers", formula: "DISTINCTCOUNT(customer)", why: "market reach; pairs with repeat rate" },
      { name: "Revenue per region / category", formula: "SUMIF / CALCULATE / GROUP BY", why: "where the money actually comes from" },
      { name: "MoM growth", formula: "DIVIDE(cur - prev, prev)", why: "momentum — the number leadership steers by" },
    ],
  },
  {
    datasetId: "marketing", title: "Marketing campaigns", grain: "one campaign per channel/week",
    dims: ["channel", "campaign", "week"],
    facts: ["spend", "clicks", "conversions"],
    derived: [
      { name: "cpc", why: "cost per click — channel efficiency", excel: "=IFERROR(spend/clicks,\"\")", dax: "DIVIDE(SUM(spend), SUM(clicks))", sql: "SUM(spend)*1.0/SUM(clicks)" },
      { name: "conversion_rate", why: "the funnel's core ratio", excel: "=IFERROR(conversions/clicks,0)", dax: "DIVIDE([Conversions], [Clicks])", sql: "SUM(conversions)*1.0/SUM(clicks)" },
      { name: "cpa", why: "cost per acquisition vs your margin per sale", excel: "=IFERROR(spend/conversions,\"\")", dax: "DIVIDE([Spend], [Conversions])", sql: "SUM(spend)*1.0/SUM(conversions)" },
    ],
    kpis: [
      { name: "ROAS", formula: "attributed revenue ÷ spend", why: "does a channel pay for itself" },
      { name: "CPC / CPA", formula: "spend ÷ clicks / conversions", why: "efficiency by channel, week over week" },
      { name: "Conversion rate", formula: "conversions ÷ clicks", why: "creative and targeting quality" },
      { name: "Spend share", formula: "channel spend ÷ total spend", why: "budget concentration risk" },
    ],
  },
  {
    datasetId: "hr_employees", title: "HR / employees", grain: "one employee",
    dims: ["dept", "city", "hire_date"],
    facts: ["salary"],
    derived: [
      { name: "tenure_years", why: "experience, retention cohorts", excel: "=YEAR(TODAY())-YEAR(hire_date)", dax: "DATEDIFF('HR'[hire_date], TODAY(), YEAR)", sql: "CAST((JULIANDAY('now')-JULIANDAY(hire_date))/365 AS INT)" },
      { name: "salary_band", why: "equity and comp-band analysis", excel: "=IFS(salary>=80000,\"senior\",salary>=50000,\"mid\",TRUE,\"junior\")", dax: "SWITCH(TRUE(), 'HR'[salary]>=80000,\"senior\", 'HR'[salary]>=50000,\"mid\", \"junior\")", sql: "CASE WHEN salary>=80000 THEN 'senior' WHEN salary>=50000 THEN 'mid' ELSE 'junior' END" },
      { name: "dept_avg_gap", why: "is this salary above or below dept mean", excel: "=salary-AVERAGEIF(dept,dept,salary)", dax: "'HR'[salary] - CALCULATE(AVERAGE('HR'[salary]), ALLEXCEPT('HR','HR'[dept]))", sql: "salary - AVG(salary) OVER (PARTITION BY dept)" },
    ],
    kpis: [
      { name: "Headcount by dept", formula: "COUNT by dept", why: "structure and cost distribution" },
      { name: "Avg salary / median salary", formula: "AVG & MEDIAN", why: "quote the median — salary data is skewed" },
      { name: "Gender/diversity pay gap", formula: "group averages ratio", why: "compliance and equity KPI" },
      { name: "Tenure profile", formula: "AVG tenure by dept", why: "retention risk and experience depth" },
    ],
  },
  {
    datasetId: "tickets", title: "Support tickets", grain: "one ticket",
    dims: ["priority", "status", "queue", "opened_date"],
    facts: ["resolution_hours", "reopens"],
    derived: [
      { name: "is_sla_breach", why: "0/1 flag for missed SLA — SUM counts breaches", excel: "=IF(resolution_hours>sla,1,0)", dax: "IF('T'[resolution_hours] > RELATED('SLA'[hours]), 1, 0)", sql: "CASE WHEN resolution_hours > 24 THEN 1 ELSE 0 END" },
      { name: "open_age", why: "aging backlog exposure", excel: "=TODAY()-opened_date", dax: "DATEDIFF('T'[opened_date], TODAY(), DAY)", sql: "JULIANDAY('now') - JULIANDAY(opened_date)" },
    ],
    kpis: [
      { name: "First-response / resolution time", formula: "AVG / MEDIAN resolution_hours", why: "the service metric customers feel" },
      { name: "SLA compliance %", formula: "1 - breaches ÷ tickets", why: "contractual, sometimes financial" },
      { name: "Backlog & aging", formula: "COUNT open, AVG open_age", why: "capacity planning input" },
      { name: "Reopen rate", formula: "reopened ÷ resolved", why: "quality of fixes, not just speed" },
    ],
  },
  {
    datasetId: "finance_gl", title: "Finance GL / transactions", grain: "one journal line",
    dims: ["account", "cost_center", "period"],
    facts: ["debit", "credit"],
    derived: [
      { name: "net_amount", why: "signed movement per line", excel: "=debit-credit", dax: "'GL'[debit] - 'GL'[credit]", sql: "debit - credit" },
      { name: "balance_check", why: "debits must equal credits — run daily", excel: "=IF(SUM(debit)<>SUM(credit),\"OUT OF BALANCE\",\"ok\")", dax: "IF(SUM('GL'[debit])<>SUM('GL'[credit]),\"OOB\",\"ok\")", sql: "HAVING SUM(debit)<>SUM(credit)" },
    ],
    kpis: [
      { name: "Trial balance", formula: "SUM by account", why: "the fundamental integrity report" },
      { name: "Month-over-month variance", formula: "net by account, MoM", why: "what changed and why — the audit conversation" },
      { name: "Cost-center burn", formula: "SUM by cost_center, cum YTD", why: "budget consumption pace" },
    ],
  },
  {
    datasetId: "bank_transactions", title: "Bank transactions (messy!)", grain: "one transaction",
    dims: ["account", "merchant", "category", "date"],
    facts: ["amount (signed)"],
    derived: [
      { name: "is_outflow", why: "separate spending from income", excel: "=IF(amount<0,1,0)", dax: "IF('BT'[amount]<0,1,0)", sql: "CASE WHEN amount<0 THEN 1 ELSE 0 END" },
      { name: "abs_amount", why: "magnitude regardless of direction", excel: "=ABS(amount)", dax: "ABS('BT'[amount])", sql: "ABS(amount)" },
      { name: "merchant_clean", why: "trim+upper before grouping merchants", excel: "=PROPER(TRIM(merchant))", dax: "Text.Trim / Text.Upper in Power Query", sql: "UPPER(TRIM(merchant))" },
    ],
    kpis: [
      { name: "Net cash flow", formula: "SUM(amount) by month", why: "the survival number" },
      { name: "Top outflow categories", formula: "SUM(abs) by category", why: "where money actually goes" },
      { name: "Duplicate submissions", formula: "COUNT of same (date, amount, merchant)", why: "double-charges hide in messy files" },
    ],
  },
  {
    datasetId: "inventory", title: "Inventory / stock", grain: "one SKU per location",
    dims: ["sku", "location", "supplier"],
    facts: ["on_hand", "reorder_point", "unit_cost"],
    derived: [
      { name: "stock_value", why: "money on the shelf", excel: "=on_hand*unit_cost", dax: "SUMX('Inv','Inv'[on_hand]*'Inv'[unit_cost])", sql: "SUM(on_hand*unit_cost)" },
      { name: "needs_reorder", why: "0/1 flag driving the action list", excel: "=IF(on_hand<=reorder_point,1,0)", dax: "IF('Inv'[on_hand]<='Inv'[reorder_point],1,0)", sql: "CASE WHEN on_hand<=reorder_point THEN 1 ELSE 0 END" },
      { name: "days_of_cover", why: "stock ÷ average daily demand", excel: "=on_hand/avg_daily", dax: "DIVIDE([On Hand], [Avg Daily Demand])", sql: "on_hand * 1.0 / avg_daily" },
    ],
    kpis: [
      { name: "Inventory value", formula: "SUM(on_hand × cost)", why: "working capital parked in stock" },
      { name: "Stock-out risk list", formula: "COUNT needs_reorder by supplier", why: "the operational to-do list" },
      { name: "Turnover", formula: "COGS ÷ average stock value", why: "is stock moving or rotting" },
    ],
  },
];

export interface Decision {
  q: string;
  excel: string;
  dax: string;
  sql: string;
  note: string;
}

export const DECISIONS: Decision[] = [
  { q: "Add up a column", excel: "=SUM(I:I)", dax: "Total = SUM('Sales'[revenue])", sql: "SELECT SUM(revenue) FROM sales", note: "The base case — SUM everywhere." },
  { q: "Add up only for one segment", excel: '=SUMIF(D:D,"West",I:I)', dax: 'CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region]="West")', sql: "SELECT SUM(revenue) FROM sales WHERE region='West'", note: "SUMIF ≈ CALCULATE ≈ WHERE — the same thought in three dialects." },
  { q: "Count rows vs count unique things", excel: "=COUNTA(A2:A199) · unique: =SUMPRODUCT(1/COUNTIF(range,range))", dax: "COUNTROWS('Sales') · DISTINCTCOUNT('Sales'[customer])", sql: "COUNT(*) · COUNT(DISTINCT customer_id)", note: "Rows ≠ entities. Distinct counts answer 'how many people/products'." },
  { q: "Average per category", excel: '=AVERAGEIF(E:E,"Electronics",H:H)', dax: "AVERAGEX(VALUES('Sales'[category]), CALCULATE(AVERAGE('Sales'[unit_price])))", sql: "SELECT category, AVG(unit_price) FROM sales GROUP BY category", note: "GROUP BY is the honest way in SQL; AVERAGEX+VALUES is the DAX idiom." },
  { q: "Bring a value from another table", excel: "=XLOOKUP(key, keys, values, \"nf\") or INDEX/MATCH", dax: "RELATED('Dim'[attr]) in a row context", sql: "JOIN dim ON fact.key = dim.key", note: "Spreadsheets look up cell by cell; databases join in sets." },
  { q: "Safe division (avoid #DIV/0! and infinity)", excel: '=IFERROR(a/b,0)', dax: "DIVIDE(a, b, 0)", sql: "a / NULLIF(b, 0)", note: "Every rate KPI should divide defensively. Always." },
  { q: "Classify rows into bands", excel: '=IFS(x>1000,"A",x>500,"B",TRUE,"C")', dax: 'SWITCH(TRUE(), [x]>1000, "A", [x]>500, "B", "C")', sql: "CASE WHEN x>1000 THEN 'A' WHEN x>500 THEN 'B' ELSE 'C' END", note: "First match wins in all three — order conditions most-specific first." },
  { q: "Month / year from a date", excel: '=MONTH(B2) · key: =TEXT(B2,"yyyy-mm")', dax: "MONTH('Sales'[order_date]) · FORMAT(date, \"yyyy-mm\")", sql: "SUBSTR(date,1,7) · strftime('%m', date)", note: "Period keys are how transactions become trends." },
  { q: "Year-over-year growth", excel: "=(this/last)-1 with last from a lookup or prior column", dax: "DIVIDE([Total], CALCULATE([Total], SAMEPERIODLASTYEAR(date))) - 1", sql: "self-JOIIN this year to last year on the period key", note: "DAX is purpose-built here; SQL uses a self-join on the period key." },
  { q: "Running total", excel: "=SUM($I$2:I2) copied down", dax: "SUMX(FILTER(ALL(dates), dates <= MAX(dates)), [Total])", sql: "SUM(revenue) OVER (ORDER BY date)", note: "Excel anchors the start with $; SQL windows walk the order by." },
  { q: "Top 5 products", excel: "LARGE(range,1..5) + INDEX/MATCH for names", dax: "TOPN(5, VALUES('Sales'[product]), [Total Sales])", sql: "…GROUP BY product ORDER BY SUM(revenue) DESC LIMIT 5", note: "Top-N is a ranking question — pick the tool that returns it in one step." },
  { q: "Count rows meeting several conditions", excel: '=COUNTIFS(E:E,"Electronics",G:G,">=5")', dax: "CALCULATE(COUNTROWS('Sales'), 'Sales'[category]=\"Electronics\", 'Sales'[units]>=5)", sql: "SELECT COUNT(*) FROM sales WHERE category='Electronics' AND units>=5", note: "AND-ed conditions: the COUNTIFS → CALCULATE → WHERE triangle again." },
  { q: "Numbers stored as text ('$', spaces)", excel: '=VALUE(SUBSTITUTE(SUBSTITUTE(H2,"$",""),",",""))', dax: "fixed upstream — Power Query Transform ▸ Type", sql: "CAST(REPLACE(REPLACE(col,'$',''),',','') AS REAL)", note: "Clean first, then compute — aggregating text-typed numbers gives 0s." },
  { q: "Flag rows for review (0/1)", excel: "=IF(condition,1,0) — then SUM the flag", dax: "IF(condition,1,0) as a calculated column", sql: "CASE WHEN condition THEN 1 ELSE 0 END", note: "Flags filter and count at once — the analyst's favourite trick." },
];

/* ============================================================================
   Challenge Arena — auto-checked practice across the three dialects.
   Excel answers are evaluated with the real formula engine on the sandbox
   sheet; DAX with the DAX engine on the Sales model; SQL with the SQL engine
   on the playground tables. `check.kind` picks the evaluator.
   ========================================================================== */
export interface Challenge {
  id: string;
  tool: Tool | "concept";
  level: "Beginner" | "Intermediate" | "Advanced";
  prompt: string;          // business question
  hint: string;
  solution: string;        // model answer shown after solving
  check:
    | { kind: "formula"; expected: number | string; tol?: number }
    | { kind: "dax"; expected: number | string | null; tol?: number }
    | { kind: "sql"; sql: string; expected: string | number }  // expected = first cell of solution query
    | { kind: "choice"; options: string[]; answer: number };
}

export const CHALLENGES: Challenge[] = [
  {
    id: "c1", tool: "excel", level: "Beginner",
    prompt: "What is the TOTAL revenue across the whole sheet? (Revenue is column I.)",
    hint: "SUM over the full column: =SUM(I:I)",
    solution: "=SUM(I:I)",
    check: { kind: "formula", expected: 98363.56 },
  },
  {
    id: "c2", tool: "excel", level: "Beginner",
    prompt: "How much revenue came from the South region?",
    hint: 'SUMIF with a criteria: =SUMIF(D:D,"South",I:I)',
    solution: '=SUMIF(D:D,"South",I:I)',
    check: { kind: "formula", expected: 22748.45 },
  },
  {
    id: "c3", tool: "excel", level: "Beginner",
    prompt: "How many order lines contain the word \"Chair\" in the product name (column F)?",
    hint: "COUNTIF supports wildcards: =COUNTIF(F:F,\"*Chair*\")",
    solution: '=COUNTIF(F:F,"*Chair*")',
    check: { kind: "formula", expected: 10 },
  },
  {
    id: "c4", tool: "excel", level: "Intermediate",
    prompt: "Revenue from Electronics in the North region only — one formula, two conditions.",
    hint: 'SUMIFS: sum range first, then pairs — =SUMIFS(I:I,D:D,"North",E:E,"Electronics")',
    solution: '=SUMIFS(I:I,D:D,"North",E:E,"Electronics")',
    check: { kind: "formula", expected: 10860.28 },
  },
  {
    id: "c5", tool: "excel", level: "Intermediate",
    prompt: "What is the AVERAGE unit price (H) of Sports products?",
    hint: '=AVERAGEIF(E:E,"Sports",H:H)',
    solution: '=AVERAGEIF(E:E,"Sports",H:H)',
    check: { kind: "formula", expected: 24.84, tol: 0.02 },
  },
  {
    id: "c6", tool: "excel", level: "Intermediate",
    prompt: "Add a validation in one cell: does units × price (SUMPRODUCT of G and H) equal total revenue (SUM of I)? Give the absolute difference.",
    hint: "=ABS(SUMPRODUCT(G2:G199,H2:H199)-SUM(I2:I199)) — 0 means the derived column is consistent",
    solution: "=ABS(SUMPRODUCT(G2:G199,H2:H199)-SUM(I2:I199))",
    check: { kind: "formula", expected: 0, tol: 0.01 },
  },
  {
    id: "c7", tool: "excel", level: "Advanced",
    prompt: "How many orders (rows) have revenue ≥ $1,000 AND 8 or more units?",
    hint: '=COUNTIFS(I:I,">=1000",G:G,">=8")',
    solution: '=COUNTIFS(I:I,">=1000",G:G,">=8")',
    check: { kind: "formula", expected: 26 },
  },
  {
    id: "c8", tool: "dax", level: "Beginner",
    prompt: "Write a measure for total revenue of the Sales table.",
    hint: "SUM('Sales'[revenue])",
    solution: "Total Sales = SUM('Sales'[revenue])",
    check: { kind: "dax", expected: 172940.84 },
  },
  {
    id: "c9", tool: "dax", level: "Beginner",
    prompt: "How many unique customers bought something?",
    hint: "DISTINCTCOUNT('Sales'[customer])",
    solution: "Unique Customers = DISTINCTCOUNT('Sales'[customer])",
    check: { kind: "dax", expected: 203 },
  },
  {
    id: "c10", tool: "dax", level: "Intermediate",
    prompt: "Revenue for the East region only, using CALCULATE.",
    hint: 'CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "East")',
    solution: 'East Sales = CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "East")',
    check: { kind: "dax", expected: 33408.15 },
  },
  {
    id: "c11", tool: "dax", level: "Intermediate",
    prompt: "Build Average Order Value as a measure (revenue ÷ number of rows).",
    hint: "DIVIDE([Total Sales], [Orders]) — both builtin measures exist here",
    solution: "AOV = DIVIDE([Total Sales], [Orders])",
    check: { kind: "dax", expected: 508.65 },
  },
  {
    id: "c12", tool: "dax", level: "Advanced",
    prompt: "What share of total revenue comes from orders of 10+ units? (% as a decimal, e.g. 0.25)",
    hint: "DIVIDE( CALCULATE(SUM(rev), units>=10), CALCULATE(SUM(rev), ALL('Sales')) )",
    solution: "Big-line share = DIVIDE( CALCULATE(SUM('Sales'[revenue]), 'Sales'[units] >= 10), CALCULATE(SUM('Sales'[revenue]), ALL('Sales')) )",
    check: { kind: "dax", expected: 0.3727, tol: 0.005 },
  },
  {
    id: "c13", tool: "dax", level: "Advanced",
    prompt: "Year-to-date revenue with TOTALYTD.",
    hint: "TOTALYTD(SUM('Sales'[revenue]), 'Sales'[order_date])",
    solution: "Sales YTD = TOTALYTD(SUM('Sales'[revenue]), 'Sales'[order_date])",
    check: { kind: "dax", expected: 172940.84 },
  },
  {
    id: "c14", tool: "sql", level: "Beginner",
    prompt: "How many completed orders are there? (orders table, status = 'completed')",
    hint: "SELECT COUNT(*) FROM orders WHERE status = 'completed'",
    solution: "SELECT COUNT(*) AS completed_orders FROM orders WHERE status = 'completed'",
    check: { kind: "sql", sql: "SELECT COUNT(*) FROM orders WHERE status = 'completed'", expected: 119 },
  },
  {
    id: "c15", tool: "sql", level: "Beginner",
    prompt: "What is the average salary across all employees?",
    hint: "SELECT AVG(salary) FROM employees — ROUND it to 2 decimals",
    solution: "SELECT ROUND(AVG(salary), 2) AS avg_salary FROM employees",
    check: { kind: "sql", sql: "SELECT AVG(salary) FROM employees", expected: 101718.75 },
  },
  {
    id: "c16", tool: "sql", level: "Intermediate",
    prompt: "Revenue per product category (order_items × products), highest first. Which category is #1? (type just its name)",
    hint: "WITH r AS (SELECT p.category, SUM(quantity*unit_price) rev FROM order_items i JOIN products p ON p.id=i.product_id GROUP BY p.category) SELECT category FROM r ORDER BY rev DESC LIMIT 1",
    solution: "WITH r AS (SELECT p.category, SUM(i.quantity*i.unit_price) AS rev FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category) SELECT category FROM r ORDER BY rev DESC LIMIT 1",
    check: { kind: "sql", sql: "WITH r AS (SELECT p.category, SUM(i.quantity*i.unit_price) AS rev FROM order_items i JOIN products p ON p.id=i.product_id GROUP BY p.category) SELECT category FROM r ORDER BY rev DESC LIMIT 1", expected: "Furniture" },
  },
  {
    id: "c17", tool: "sql", level: "Intermediate",
    prompt: "How many distinct cities do our customers live in?",
    hint: "SELECT COUNT(DISTINCT city) FROM customers",
    solution: "SELECT COUNT(DISTINCT city) AS cities FROM customers",
    check: { kind: "sql", sql: "SELECT COUNT(DISTINCT city) FROM customers", expected: 8 },
  },
  {
    id: "c18", tool: "sql", level: "Advanced",
    prompt: "Which department's payroll is the largest? (type just the department name)",
    hint: "SELECT dept FROM employees GROUP BY dept ORDER BY SUM(salary) DESC LIMIT 1",
    solution: "SELECT dept, SUM(salary) AS payroll FROM employees GROUP BY dept ORDER BY payroll DESC LIMIT 1",
    check: { kind: "sql", sql: "SELECT dept FROM employees GROUP BY dept ORDER BY SUM(salary) DESC LIMIT 1", expected: "Marketing" },
  },
  {
    id: "c19", tool: "concept", level: "Intermediate",
    prompt: "Your cleaned sales file has 340 rows but 312 distinct order ids. What best explains it?",
    hint: "Grain! One order can contain several product lines.",
    solution: "The grain is one order LINE — multi-line orders repeat the order id, so orders ≠ rows.",
    check: { kind: "choice", options: ["Data corruption — the file is dirty", "The grain is one order line; multi-line orders repeat the order id", "COUNT is broken in spreadsheets", "There must be 28 duplicate rows to delete"], answer: 1 },
  },
  {
    id: "c20", tool: "concept", level: "Intermediate",
    prompt: "Which calculation belongs in a Power BI MEASURE rather than a calculated column?",
    hint: "Measures aggregate under filter context; columns belong to rows.",
    solution: "Anything aggregate-level that must respond to slicers — AOV, % of total, YoY growth.",
    check: { kind: "choice", options: ["Revenue = units × price for each row", "A month key like yyyy-mm for slicing", "Average Order Value that must react to every slicer", "A price band label per product"], answer: 2 },
  },
  {
    id: "c21", tool: "concept", level: "Beginner",
    prompt: "After cleaning, which formula safely computes profit margin % when cost could be 0?",
    hint: "Think about defensive division in each dialect.",
    solution: "Excel: =IFERROR((rev-cost)/rev,0) · DAX: DIVIDE(rev-cost, rev) · SQL: (rev-cost)/NULLIF(rev,0)",
    check: { kind: "choice", options: ["=(rev-cost)/rev — it's fine", "=IFERROR((rev-cost)/rev,0)", "=(rev-cost)*rev", "=rev/(cost-rev)"], answer: 1 },
  },
  {
    id: "c22", tool: "concept", level: "Beginner",
    prompt: "SUM over a revenue column returns 0 although numbers are visibly there. Most likely cause?",
    hint: "What does COUNT tell you vs COUNTA?",
    solution: "Numbers are stored as text — clean with VALUE/CAST after stripping $ and commas.",
    check: { kind: "choice", options: ["The numbers are negative", "Numbers are stored as text (left-aligned) — VALUE/CAST fixes it", "SUM only works on rows, not columns", "The file is too large"], answer: 1 },
  },
];
