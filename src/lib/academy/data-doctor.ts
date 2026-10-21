"use client";

/* data-doctor — the file-aware cleaning brain of the Live Coach.
   Every file is unique: the doctor profiles the ACTUAL rows loaded in the tool
   and reports THAT file's real problems — with exact columns, row numbers,
   example values, why each problem breaks analysis, and the exact fix steps
   for the tool you're in. It re-profiles on every edit, so it knows when an
   issue is fixed (and celebrates) and alerts you when something is left. */

export type IssueSeverity = "high" | "medium" | "low";

export interface DoctorSnapshot {
  /** where the data lives — drives the fix instructions language */
  source: "excel" | "dashboard" | "sql";
  file: string; // file / sheet / table name
  headers: string[];
  rows: Record<string, string>[]; // header-keyed string rows
}

export interface DataIssue {
  id: string; // stable id: `${type}:${colKey or table}`
  type:
    | "blank_cells"
    | "duplicate_rows"
    | "whitespace"
    | "text_numbers"
    | "mixed_dates"
    | "case_inconsistent"
    | "variant_values"
    | "negatives"
    | "outliers"
    | "empty_rows"
    | "header_names";
  severity: IssueSeverity;
  title: string;
  col?: string; // column key / header name
  count: number; // how many cells/rows affected
  total?: number; // context total (rows in file / rows in col)
  examples: { row: number; value: string }[]; // 1-based data-row indexes (excluding header)
  why: string; // why this breaks real analysis
  fixExcel: string; // exact steps in Excel Studio
  fixDashboard: string; // exact steps in Power BI Studio (Power Query style)
  fixSql: string; // exact cleaning SQL for this column
}

export interface DoctorReport {
  file: string;
  rows: number;
  cols: number;
  issues: DataIssue[];
  score: number; // 0–100 data health
  scannedCells: number;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const CURRENCY_TEXT = /^\(?\$|^\$|,\d{3}|%$|\s\d+$/; // $1,234 / 1,234 / 50% / "12 "
const NUM_RE = /^-?\$?[\d,]+(\.\d+)?%?$/;

function parseNumeric(raw: string): number | null {
  if (raw === "") return null;
  const m = NUM_RE.exec(raw.trim());
  if (!m) return null;
  let s = raw.trim().replace(/[$,%\s]/g, "");
  if (/^\(.*\)$/.test(raw)) s = `-${s}`;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  if (/%$/.test(raw.trim())) return n / 100;
  return n;
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

const DATE_PATTERNS: { re: RegExp; name: string }[] = [
  { re: /^\d{4}-\d{2}-\d{2}/, name: "2025-01-31 (ISO)" },
  { re: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, name: "31/01/2025 (slashes)" },
  { re: /^\d{1,2}-\d{1,2}-\d{4}$/, name: "31-01-2025 (dashes)" },
  { re: /^\d{1,2}-[A-Za-z]{3,9}-\d{4}$/, name: "19-Mar-2025 (dashes + month)" },
  { re: /^[A-Za-z]{3,9} \d{1,2},? \d{4}$/, name: "Jan 31, 2025 (month name)" },
  { re: /^\d{1,2} [A-Za-z]{3,9} \d{4}$/, name: "31 Jan 2025 (day first)" },
  { re: /^\d{8}$/, name: "20250131 (compact)" },
];

function dateKind(v: string): string | null {
  const s = v.trim();
  for (const p of DATE_PATTERNS) if (p.re.test(s)) return p.name;
  return null;
}

function normKey(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Levenshtein-lite: near-identical keys like "mktg" vs "marketing" are matched
    by prefix/containment; that's the 90% case in real dirty files. */
function variantsOf(a: string, b: string): boolean {
  const x = normKey(a);
  const y = normKey(b);
  if (!x || !y || x === y) return false;
  if (x.startsWith(y) || y.startsWith(x)) {
    // guard short false positives ("n" vs "north") — require length ≥ 3
    return Math.min(x.length, y.length) >= 3;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* the profiler                                                        */
/* ------------------------------------------------------------------ */

const MAX_EXAMPLES = 3;
function cap<T>(arr: T[], n = MAX_EXAMPLES): T[] {
  return arr.length <= n ? arr : arr.slice(0, n);
}

export function profileSnapshot(snap: DoctorSnapshot): DoctorReport {
  const { headers, rows } = snap;
  const issues: DataIssue[] = [];
  const totalCells = Math.max(1, headers.length * Math.max(0, rows.length));

  /* ---------- header names (Excel/PBI only — snake_case is standard in SQL) ---------- */
  if (snap.source !== "sql") {
    const badHeaders = headers.filter((h) => {
      const t = h.trim();
      if (!t) return true;
      if (t !== h) return true;
      if (/[_.]/.test(h)) return true;
      if (h === h.toLowerCase() && /[a-z]/.test(h)) return true;
      return false;
    });
    if (badHeaders.length) {
      issues.push({
        id: "header_names",
        type: "header_names",
        severity: "low",
        title: `Column header${badHeaders.length > 1 ? "s" : ""} not report-ready`,
        count: badHeaders.length,
        examples: cap(badHeaders.map((h) => ({ row: 1, value: h }))),
        why: "Headers become field names in every chart, pivot and export. 'unit price' with a space or 'order_id' with an underscore reads badly and breaks lookups that expect exact names.",
        fixExcel: "Click each header cell and retype it cleanly: Title Case, spaces instead of underscores, no trailing spaces (e.g. Unit Price).",
        fixDashboard: "In Power Query ▸ Transform: double-click each column header to rename it (Title Case, no underscores), or use Transform ▸ Format ▸ Capitalize Each Word.",
        fixSql: `SELECT "${badHeaders[0]}" AS ${'"' + badHeaders[0].trim().replace(/[_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + '"'} FROM ${snap.file}; — in a view: CREATE VIEW clean AS SELECT … AS NewName, …`,
      });
    }
  }

  /* ---------- per-column checks ---------- */
  const dupValueCols: DataIssue[] = [];
  for (let ci = 0; ci < headers.length; ci++) {
    const col = headers[ci];
    const colKey = col;
    const values = rows.map((r) => String(r[colKey] ?? ""));
    const nonEmpty = values.filter((v) => v.trim() !== "");
    const n = values.length;

    /* blank cells */
    const blankRows = values.map((v, i) => (v.trim() === "" ? i : -1)).filter((i) => i >= 0);
    if (blankRows.length > 0 && blankRows.length < n) {
      issues.push({
        id: `blank_cells:${colKey}`,
        type: "blank_cells",
        severity: "high",
        title: `Blank cells in ${col}`,
        col: colKey,
        count: blankRows.length,
        total: n,
        examples: cap(blankRows.map((i) => ({ row: i + 1, value: "(empty)" }))),
        why: `${fmtInt(blankRows.length)} of ${fmtInt(n)} rows have no ${col}. Averages silently skip them, totals look smaller than reality, and any lookup on ${col} returns #N/A for those rows.`,
        fixExcel: `Fill them properly: select the ${col} column range, then Find & Replace to put a real value — or fill down from the cell above (select the blanks, Ctrl+D). If a blank is genuinely unknown, type N/A so it's honest.`,
        fixDashboard: `In Power Query: select the ${col} column ▸ Transform ▸ Fill ▸ Down (carries the value above into blanks), or Replace Values with a default like 0 / "Unknown".`,
        fixSql: `SELECT CASE WHEN TRIM(COALESCE(${col},''))='' THEN 'Unknown' ELSE ${col} END AS ${col} FROM ${snap.file}; — or UPDATE ${snap.file} SET ${col}='Unknown' WHERE TRIM(COALESCE(${col},''))='';`,
      });
    }

    /* whitespace problems */
    const wsRows = values
      .map((v, i) => (v !== "" && (v !== v.trim() || / {2,}/.test(v)) ? i : -1))
      .filter((i) => i >= 0);
    if (wsRows.length > 0) {
      issues.push({
        id: `whitespace:${colKey}`,
        type: "whitespace",
        col: colKey,
        severity: "medium",
        title: `Extra spaces in ${col}`,
        count: wsRows.length,
        total: n,
        examples: cap(
          wsRows.map((i) => ({
            row: i + 1,
            value: `"${values[i].length > 24 ? values[i].slice(0, 24) + "…" : values[i]}"`,
          }))
        ),
        why: 'Invisible spaces make two equal values unequal: "North " and "North" become separate groups in every chart, filter and SUMIF — totals split for no visible reason.',
        fixExcel: `Select the ${col} column (click the column letter), Data ▸ Text tools ▸ Trim — it strips leading/trailing and collapses double spaces in one pass.`,
        fixDashboard: `In Power Query: select ${col} ▸ Transform ▸ Format ▸ Trim, then Format ▸ Clean (removes stray characters). Two clicks, whole column.`,
        fixSql: `SELECT TRIM(REPLACE(${col}, '  ', ' ')) AS ${col}_clean FROM ${snap.file}; — in SQLite you can UPDATE ${snap.file} SET ${col}=TRIM(${col});`,
      });
    }

    /* numbers stored as text */
    const textNumRows = values
      .map((v, i) => (v !== "" && CURRENCY_TEXT.test(v.trim()) ? i : -1))
      .filter((i) => i >= 0);
    if (textNumRows.length > 0) {
      issues.push({
        id: `text_numbers:${colKey}`,
        type: "text_numbers",
        col: colKey,
        severity: "high",
        title: `Numbers stored as text in ${col}`,
        count: textNumRows.length,
        total: n,
        examples: cap(textNumRows.map((i) => ({ row: i + 1, value: values[i] }))),
        why: `Values like "$1,234" or "1,234" look fine but are TEXT — SUM/AVERAGE return 0 for them, charts show gaps, and pivots refuse to aggregate. This is the #1 reason totals come out wrong.`,
        fixExcel: `Select the ${col} column ▸ Data ▸ Text to Columns ▸ Finish (that alone converts most), or use the Data tab's '$-text → number' tool. Then format as Currency: Home ▸ $ button.`,
        fixDashboard: `In Power Query: select ${col} ▸ Transform ▸ Data Type ▸ Currency/Decimal Number. If it errors, first Replace Values to remove '$' and ',' — then set the type.`,
        fixSql: `SELECT CAST(REPLACE(REPLACE(${col}, '$', ''), ',', '') AS REAL) AS ${col}_num FROM ${snap.file}; — commas and dollar signs must go before the CAST.`,
      });
    }

    /* mixed date formats */
    const kinds = new Map<string, number>();
    const dateRows: [number, string][] = [];
    values.forEach((v, i) => {
      if (v === "") return;
      const k = dateKind(v);
      if (k) {
        kinds.set(k, (kinds.get(k) ?? 0) + 1);
        dateRows.push([i, v]);
      }
    });
    if (kinds.size > 1) {
      const parts = [...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} × ${fmtInt(c)}`);
      issues.push({
        id: `mixed_dates:${colKey}`,
        type: "mixed_dates",
        col: colKey,
        severity: "high",
        title: `${col} mixes ${kinds.size} date formats`,
        count: dateRows.length,
        total: n,
        examples: cap(dateRows.map(([i, v]) => ({ row: i + 1, value: v }))),
        why: `This column holds: ${parts.join(" · ")}. Text dates sort alphabetically (so "02/01/2025" comes after "31/12/2024"!), month-over-month charts break, and date filters miss rows. Every date must be one format.`,
        fixExcel: `Standardize to ISO: use Find & Replace on the minority format (e.g. find "2024/01/31"-style → replace with dashes), or re-enter with =DATEVALUE(). Then Data ▸ Sort A→Z to confirm true date order.`,
        fixDashboard: `In Power Query: Add Column ▸ Example/Custom to rebuild ${col} as one ISO format (YYYY-MM-DD), then set the column Data Type ▸ Date.`,
        fixSql: `ISO 'YYYY-MM-DD' sorts correctly as text. Convert the minority: SELECT CASE WHEN ${col} LIKE '__/__/____' THEN SUBSTR(${col},7,4)||'-'||SUBSTR(${col},4,2)||'-'||SUBSTR(${col},1,2) ELSE ${col} END FROM ${snap.file};`,
      });
    }

    /* case inconsistency (text columns only) */
    const distinctVals = new Map<string, number>();
    nonEmpty.forEach((v) => distinctVals.set(v, (distinctVals.get(v) ?? 0) + 1));
    const distinctCount = distinctVals.size;
    const looksCategorical = distinctCount > 1 && distinctCount <= Math.max(30, nonEmpty.length * 0.6);
    if (looksCategorical) {
      const byLower = new Map<string, { count: number; forms: string[] }>();
      nonEmpty.forEach((v) => {
        const k = v.toLowerCase();
        const e = byLower.get(k) ?? { count: 0, forms: [] };
        e.count++;
        if (!e.forms.includes(v)) e.forms.push(v);
        byLower.set(k, e);
      });
      const inconsistent = [...byLower.values()].filter((e) => e.forms.length > 1);
      if (inconsistent.length > 0) {
        const affected = inconsistent.reduce((s, e) => s + e.count, 0);
        issues.push({
          id: `case_inconsistent:${colKey}`,
          type: "case_inconsistent",
          col: colKey,
          severity: "high",
          title: `${col} has mixed capitalisation`,
          count: affected,
          total: n,
          examples: cap(inconsistent.map((e) => ({ row: 0, value: e.forms.map((f) => `"${f}"`).join(" vs ") }))),
          why: `"${inconsistent[0].forms.join('" and "')}" are the same thing to a human but different to Excel: SUMIF/pivot/chart treat them as separate groups, so the same category appears twice in your report.`,
          fixExcel: `Click the ${col} column letter, then Data ▸ Text tools ▸ Proper (Title Case) — or Upper if the standard is ALL CAPS. One click, whole column.`,
          fixDashboard: `In Power Query: select ${col} ▸ Transform ▸ Format ▸ Capitalize Each Word (or lowercase) — then Remove Duplicates on the column to merge the groups.`,
          fixSql: `SELECT UPPER(SUBSTR(${col},1,1))||LOWER(SUBSTR(${col},2)) AS ${col}_fix, COUNT(*) FROM ${snap.file} GROUP BY UPPER(${col}) COLLATE NOCASE; — group with COLLATE NOCASE until fixed.`,
        });
      }

      /* near-variant spellings */
      if (inconsistent.length === 0) {
        const keys = [...distinctVals.keys()];
        const seen = new Set<string>();
        const variantPairs: string[][] = [];
        for (const a of keys) {
          if (seen.has(a)) continue;
          for (const b of keys) {
            if (a === b || seen.has(b)) continue;
            if (variantsOf(a, b)) {
              variantPairs.push([a, b]);
              seen.add(b);
            }
          }
        }
        if (variantPairs.length > 0) {
          issues.push({
            id: `variant_values:${colKey}`,
            type: "variant_values",
            col: colKey,
            severity: "medium",
            title: `${col} has look-alike spellings`,
            count: variantPairs.length,
            examples: cap(variantPairs.map(([a, b]) => ({ row: 0, value: `"${a}" vs "${b}"` }))),
            why: `These two spellings are probably the same thing typed differently — they'll show up as two bars in your chart and two lines in your pivot. Confirm the real name, then standardise.`,
            fixExcel: `Decide the correct spelling, then Find & Replace (Ctrl+H): find the wrong one, replace with the right one, Replace All on the ${col} column.`,
            fixDashboard: `In Power Query: select ${col} ▸ Home ▸ Replace Values — replace the variant with the standard spelling.`,
            fixSql: `UPDATE ${snap.file} SET ${col}='${variantPairs[0][0]}' WHERE ${col}='${variantPairs[0][1]}'; — then GROUP BY ${col} to confirm one group.`,
          });
        }
      }
    }

    /* negatives in count/qty-like columns */
    const numVals = values.map((v) => parseNumeric(v));
    const numericish = numVals.filter((x) => x !== null).length;
    const nameLower = col.toLowerCase();
    const expectPositive = /qty|quantity|units|count|price|revenue|amount|salary|age|volume/.test(nameLower);
    if (expectPositive && numericish > n * 0.6) {
      const negRows = numVals.map((v, i) => (v !== null && v < 0 ? i : -1)).filter((i) => i >= 0);
      if (negRows.length > 0) {
        issues.push({
          id: `negatives:${colKey}`,
          type: "negatives",
          col: colKey,
          severity: "medium",
          title: `Impossible negative values in ${col}`,
          count: negRows.length,
          total: n,
          examples: cap(negRows.map((i) => ({ row: i + 1, value: values[i] }))),
          why: `${col} should never be negative (you can't sell -3 chairs). Negatives drag totals down, skew averages, and usually mean a data-entry error or a returns row mislabelled.`,
          fixExcel: `Home ▸ Conditional Formatting ▸ highlight the negatives to inspect them; correct genuine typos, or keep real returns in a separate Refunds column.`,
          fixDashboard: `In Power Query: filter or replace the negative values in ${col}, or add a custom column ABS([${col}]) if the magnitude is right and only the sign is wrong.`,
          fixSql: `SELECT * FROM ${snap.file} WHERE ${col} < 0; — inspect them, then UPDATE … SET ${col}=ABS(${col}) or delete the bad rows.`,
        });
      }

      /* outliers via IQR */
      const sorted = numVals.filter((x): x is number => x !== null).sort((a, b) => a - b);
      if (sorted.length >= 12) {
        const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
        const q1 = q(0.25);
        const q3 = q(0.75);
        const iqr = q3 - q1;
        const lo = q1 - 3 * iqr;
        const hi = q3 + 3 * iqr;
        if (iqr > 0) {
          const outRows = numVals.map((v, i) => (v !== null && (v < lo || v > hi) ? i : -1)).filter((i) => i >= 0);
          if (outRows.length > 0 && outRows.length < sorted.length * 0.15) {
            issues.push({
              id: `outliers:${colKey}`,
              type: "outliers",
              col: colKey,
              severity: "low",
              title: `Possible outliers in ${col}`,
              count: outRows.length,
              total: n,
              examples: cap(outRows.map((i) => ({ row: i + 1, value: values[i] }))),
              why: `A handful of extreme values sit far outside the normal range (typical ${col} runs ${fmtInt(Math.round(q1))}–${fmtInt(Math.round(q3))}, these go beyond ${fmtInt(Math.round(hi))}). They can be genuine VIP sales or typos — either way they move averages a lot.`,
              fixExcel: `Sort ${col} Z→A and eyeball the top values. Genuine? Keep (quote the median too). Typos? Correct them. Use MEDIAN beside AVERAGE — the median ignores outliers.`,
              fixDashboard: `In Power Query: sort ${col} descending and inspect the top rows. Keep real ones; fix typos. In visuals, a Top N filter can tame extreme values for the summary page.`,
              fixSql: `SELECT * FROM ${snap.file} WHERE ${col} > ${Math.round(hi)} ORDER BY ${col} DESC; — look, then decide keep vs fix.`,
            });
          }
        }
      }
    }

    /* duplicate values in ID-like columns — only true key columns (order_id, Appt ID,
       invoice_no…) — a plain "Order Date" must NOT be flagged */
    {
      const segs = nameLower.split(/[^a-z0-9]+/).filter(Boolean);
      const isIdCol =
        segs.includes("id") || segs.includes("code") || segs.includes("ref") || segs.includes("key") ||
        segs.includes("no") || segs.includes("number") || segs.includes("invoice") || segs.includes("ticket");
      if (isIdCol && distinctCount > 0 && nonEmpty.length > 0) {
        const dupVals = [...distinctVals.entries()].filter(([, c]) => c > 1);
        if (dupVals.length > 0) {
          issues.push({
            id: `dup_ids:${colKey}`,
            type: "duplicate_rows",
            col: colKey,
            severity: "high",
            title: `Repeated IDs in ${col}`,
            count: dupVals.reduce((s, [, c]) => s + c - 1, 0),
            total: nonEmpty.length,
            examples: cap(dupVals.map(([v, c]) => ({ row: 0, value: `"${v}" appears ${c}×` }))),
            why: `An ID column should be unique — duplicates usually mean the same order was entered twice, which double-counts revenue everywhere. (If multiple rows per ID is genuinely correct, tell the coach and skip this.)`,
            fixExcel: `Data ▸ Remove Duplicates ▸ tick ${col} (plus the columns that define uniqueness) → it keeps the first and removes the rest. Note the before/after row counts.`,
            fixDashboard: `In Power Query: Home ▸ Remove Rows ▸ Remove Duplicates on the ID column (right-click header ▸ Remove Duplicates).`,
            fixSql: `SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY ${col} ORDER BY rowid) rn FROM ${snap.file}) WHERE rn=1; — keeps one row per ID.`,
          });
        }
      }
    }

    void dupValueCols;
  }

  /* ---------- whole-row duplicate check ---------- */
  const rowMap = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const key = headers.map((h) => String(r[h] ?? "").trim().toLowerCase()).join("\u0001");
    rowMap.set(key, [...(rowMap.get(key) ?? []), i]);
  });
  const dupGroups = [...rowMap.values()].filter((g) => g.length > 1);
  if (dupGroups.length > 0) {
    const dupCount = dupGroups.reduce((s, g) => s + g.length - 1, 0);
    issues.push({
      id: "duplicate_rows",
      type: "duplicate_rows",
      severity: "high",
      title: "Duplicate rows (entire row repeated)",
      count: dupCount,
      total: rows.length,
      examples: cap(
        dupGroups.flatMap((g) =>
          g.slice(1).map((i) => ({
            row: i + 1,
            value: headers.slice(0, 3).map((h) => String(r0v(rows[i], h))).join(" · "),
          }))
        )
      ),
      why: `These rows appear more than once — every duplicate counts revenue twice and inflates every number. In a real finance review, "do your totals reconcile?" starts here.`,
      fixExcel: `Data ▸ Remove Duplicates with all columns ticked → Excel keeps the first copy of each. Write down rows before/after — that's your cleaning log.`,
      fixDashboard: `In Power Query: Home ▸ Remove Rows ▸ Remove Duplicates (with all columns selected). Watch the row count drop.`,
      fixSql: `SELECT DISTINCT * FROM ${snap.file}; — see the clean count; or use ROW_NUMBER() OVER (PARTITION BY every-column) = 1 to keep rows.`,
    });
  }

  /* ---------- fully empty rows ---------- */
  const emptyRows = rows
    .map((r, i) => (headers.every((h) => String(r[h] ?? "").trim() === "") ? i : -1))
    .filter((i) => i >= 0);
  if (emptyRows.length > 0) {
    issues.push({
      id: "empty_rows",
      type: "empty_rows",
      severity: "medium",
      title: "Completely empty rows",
      count: emptyRows.length,
      examples: cap(emptyRows.map((i) => ({ row: i + 1, value: "(blank row)" }))),
      why: "Empty rows inside the data break ranges: SUM stops at the gap, charts split, and Remove Duplicates misses what's below the gap. Delete them so the table is one solid block.",
      fixExcel: `Right-click the row number ▸ Delete (or select several with Ctrl+Click). Then re-check that totals now cover every row.`,
      fixDashboard: `In Power Query: Home ▸ Remove Rows ▸ Remove Blank Rows.`,
      fixSql: `DELETE FROM ${snap.file} WHERE ${(headers[0] || "col1")} IS NULL OR TRIM(COALESCE(${headers[0] || "col1"},''))='';`,
    });
  }

  /* ---------- health score ---------- */
  const weight: Record<IssueSeverity, number> = { high: 4, medium: 2, low: 1 };
  const penalty = issues.reduce((s, i) => s + weight[i.severity] * Math.min(1, i.count / Math.max(20, i.total ?? totalCells / headers.length)), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - (penalty / (totalCells / 60 + 6)) * 100)));

  return {
    file: snap.file,
    rows: rows.length,
    cols: headers.length,
    issues: issues.sort((a, b) => {
      const w: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };
      return w[a.severity] - w[b.severity] || b.count - a.count;
    }),
    score,
    scannedCells: totalCells,
  };
}

function r0v(r: Record<string, string>, k: string): string {
  const v = String(r[k] ?? "");
  return v.length > 16 ? v.slice(0, 16) + "…" : v;
}

/* ------------------------------------------------------------------ */
/* fix appliers — one-click fixes that really mutate the rows          */
/* ------------------------------------------------------------------ */

export type FixId = "trim" | "proper" | "upper" | "lower" | "numberize" | "fill_down" | "dedupe" | "drop_empty" | "iso_dates";

export const FIX_LABELS: Record<FixId, string> = {
  trim: "Trim extra spaces",
  proper: "Capitalise (Title Case)",
  upper: "UPPERCASE",
  lower: "lowercase",
  numberize: "Convert $-text to numbers",
  fill_down: "Fill blanks from cell above",
  dedupe: "Remove duplicate rows",
  drop_empty: "Delete empty rows",
  iso_dates: "Standardise dates to ISO",
};

/** Return the fixed copy of rows (pure — tools decide how to persist). */
export function applyFix(rows: Record<string, string>[], headers: string[], col: string | null, fix: FixId): Record<string, string>[] {
  let out = rows.map((r) => ({ ...r }));
  const target = col;

  if (fix === "dedupe") {
    const seen = new Set<string>();
    out = out.filter((r) => {
      const k = headers.map((h) => String(r[h] ?? "").trim().toLowerCase()).join("\u0001");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return out;
  }

  if (fix === "drop_empty") {
    return out.filter((r) => headers.some((h) => String(r[h] ?? "").trim() !== ""));
  }

  for (const r of out) {
    if (fix === "fill_down") {
      for (const h of target ? [target] : headers) {
        if (String(r[h] ?? "").trim() === "") {
          // fill later in a second pass (needs previous row) — handled below
        }
      }
    }
  }

  if (fix === "fill_down") {
    for (const h of target ? [target] : headers) {
      let last = "";
      for (const r of out) {
        const cur = String(r[h] ?? "").trim();
        if (cur !== "") last = cur;
        else if (last !== "") r[h] = last;
      }
    }
    return out;
  }

  for (const h of target ? [target] : headers) {
    for (const r of out) {
      const v = String(r[h] ?? "");
      if (v.trim() === "") continue;
      switch (fix) {
        case "trim":
          r[h] = v.replace(/\s+/g, " ").trim();
          break;
        case "proper":
          r[h] = v.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          break;
        case "upper":
          r[h] = v.toUpperCase();
          break;
        case "lower":
          r[h] = v.toLowerCase();
          break;
        case "numberize": {
          if (CURRENCY_TEXT.test(v.trim())) {
            let s = v.trim().replace(/[$,%\s]/g, "").replace(/,/g, "");
            if (/^\(.*\)$/.test(v.trim())) s = "-" + s.replace(/[()]/g, "");
            if (s !== "" && !Number.isNaN(parseFloat(s))) r[h] = s;
          }
          break;
        }
        case "iso_dates": {
          const kind = dateKind(v);
          if (!kind || kind.startsWith("2025-01-31")) break;
          let m: RegExpExecArray | null;
          if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim()))) {
            r[h] = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
          } else if ((m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v.trim()))) {
            r[h] = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
          } else if ((m = /^(\d{1,2})-([A-Za-z]{3,9})-(\d{4})$/.exec(v.trim()))) {
            const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const mi = months.indexOf(m[2].slice(0, 3).toLowerCase());
            if (mi >= 0) r[h] = `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
          } else if ((m = /^([A-Za-z]{3,9}) (\d{1,2}),? (\d{4})$/.exec(v.trim()))) {
            const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const mi = months.indexOf(m[1].slice(0, 3).toLowerCase());
            if (mi >= 0) r[h] = `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
          } else if ((m = /^(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})$/.exec(v.trim()))) {
            const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const mi = months.indexOf(m[2].slice(0, 3).toLowerCase());
            if (mi >= 0) r[h] = `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
          }
          break;
        }
      }
    }
  }
  return out;
}
