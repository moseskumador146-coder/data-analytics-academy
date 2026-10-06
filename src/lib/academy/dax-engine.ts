// Mini DAX engine — evaluates real measure syntax against the in-browser 'Sales' model.
// Powers the Functions Lab DAX Studio: learners write CALCULATE, FILTER, ALL, SUMX,
// DIVIDE, IF/SWITCH and time-intelligence measures and see the numbers instantly.
//
// Supported (teaching subset of DAX):
//   Aggregation   SUM, AVERAGE, MIN, MAX, COUNT, COUNTBLANK, COUNTROWS, DISTINCTCOUNT
//   Iterators     SUMX, AVERAGEX, MINX, MAXX, COUNTX
//   Filter        CALCULATE, FILTER, ALL, ALLSELECTED (as ALL), VALUES, DISTINCT, KEEPFILTERS(no-op wrapper)
//   Logical       IF, SWITCH (incl. SWITCH(TRUE(),…)), AND, OR, NOT, ISBLANK, BLANK, TRUE, FALSE
//   Math          DIVIDE, ROUND, ROUNDUP, ROUNDDOWN, ABS, INT, MIN(scalar), MAX(scalar), SQRT, POWER
//   Time intel    TOTALYTD, SAMEPERIODLASTYEAR, DATEADD, PREVIOUSMONTH, DATESYTD, EOMONTH, EDATE, YEAR, MONTH, DAY
//   Text          FORMAT, CONCATENATE
//
// Simplifications (documented in the UI): dates are ISO strings; the model has one
// 'Sales' table (no relationships); RANKX/TOPN are taught in the library but not
// evaluated here; date intelligence is anchored on the model's max date.

import type { Row } from "./datasets";

export class DaxError extends Error {}

type Val = number | string | null;

/* ---------------- tokenizer ---------------- */
type Tok = { t: "num"; v: number } | { t: "str"; v: string } | { t: "ident"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "'") {
      // quoted table name: 'Sales'
      const end = src.indexOf("'", i + 1);
      if (end < 0) throw new DaxError("Unclosed ' quote around a table name — table names look like 'Sales'.");
      toks.push({ t: "ident", v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (ch === "[") {
      // bracketed column or measure: [Region] or [Total Sales]
      const end = src.indexOf("]", i + 1);
      if (end < 0) throw new DaxError("Unclosed ] — bracketed names look like [Total Sales] or 'Sales'[Region].");
      toks.push({ t: "ident", v: `\x01${src.slice(i + 1, end)}` }); // \x01 marks bracketed
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const m = /^[0-9]*\.?[0-9]+/.exec(src.slice(i))!;
      toks.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw new DaxError('Unclosed " — DAX strings use double quotes like "West".');
      toks.push({ t: "str", v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))!;
      toks.push({ t: "ident", v: m[0] });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") { toks.push({ t: "op", v: two }); i += 2; continue; }
    if (two === "&&" || two === "||") { toks.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/^()<>=,;%".includes(ch)) {
      if (ch === "%" && /[0-9]/.test(src[i - 1] ?? "") && /[0-9(]/.test(src[i + 1] ?? "")) {
        toks.push({ t: "op", v: "%" });
        i++;
        continue;
      }
      toks.push({ t: "op", v: ch });
      i++;
      continue;
    }
    throw new DaxError(`Unexpected character "${ch}" — check for typos in your measure.`);
  }
  return toks;
}

/* ---------------- AST ---------------- */
type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "blank" }
  | { k: "bool"; v: boolean }
  | { k: "measure"; name: string }
  | { k: "col"; table: string | null; name: string }
  | { k: "func"; name: string; args: Node[] }
  | { k: "bin"; op: string; l: Node; r: Node }
  | { k: "un"; op: string; e: Node };

function parse(src: string): Node {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === "op" && (peek() as { v: string }).v === v;
  const eatOp = (v: string) => { if (isOp(v)) { pos++; return true; } return false; };
  const expectOp = (v: string) => { if (!eatOp(v)) throw new DaxError(`Expected "${v}" — check your syntax.`); };

  function parseExpr(): Node { return parseOr(); }
  function parseOr(): Node {
    let l = parseAnd();
    while (isOp("||")) { pos++; l = { k: "bin", op: "||", l, r: parseAnd() }; }
    return l;
  }
  function parseAnd(): Node {
    let l = parseNot();
    while (isOp("&&")) { pos++; l = { k: "bin", op: "&&", l, r: parseNot() }; }
    return l;
  }
  function parseNot(): Node {
    const id = peek();
    if (id?.t === "ident" && id.v.toUpperCase() === "NOT") {
      pos++;
      return { k: "un", op: "NOT", e: parseNot() };
    }
    return parseCompare();
  }
  function parseCompare(): Node {
    let l = parseAdd();
    for (const op of ["=", "<>", "<=", ">=", "<", ">"]) {
      if (isOp(op)) { pos++; return { k: "bin", op, l, r: parseAdd() }; }
    }
    return l;
  }
  function parseAdd(): Node {
    let l = parseMul();
    for (;;) {
      if (isOp("+")) { pos++; l = { k: "bin", op: "+", l, r: parseMul() }; }
      else if (isOp("-")) { pos++; l = { k: "bin", op: "-", l, r: parseMul() }; }
      else return l;
    }
  }
  function parseMul(): Node {
    let l = parseUnary();
    for (;;) {
      if (isOp("*")) { pos++; l = { k: "bin", op: "*", l, r: parseUnary() }; }
      else if (isOp("/")) { pos++; l = { k: "bin", op: "/", l, r: parseUnary() }; }
      else if (isOp("%")) { pos++; l = { k: "bin", op: "%", l, r: parseUnary() }; }
      else return l;
    }
  }
  function parseUnary(): Node {
    if (isOp("-")) { pos++; return { k: "un", op: "-", e: parseUnary() }; }
    if (isOp("+")) { pos++; return parseUnary(); }
    return parsePrimary();
  }
  function parsePrimary(): Node {
    const tk = peek();
    if (!tk) throw new DaxError("Measure ends unexpectedly — the expression looks incomplete.");
    if (tk.t === "num") { pos++; return { k: "num", v: tk.v }; }
    if (tk.t === "str") { pos++; return { k: "str", v: tk.v }; }
    if (tk.t === "ident") {
      pos++;
      if (tk.v.startsWith("\x01")) {
        // bare [Name] — a measure reference (eval resolves unknown ones as teaching errors)
        return { k: "measure", name: tk.v.slice(1) };
      }
      const nxt = peek();
      if (nxt?.t === "ident" && nxt.v.startsWith("\x01")) {
        // 'Sales'[Col] or Sales[Col] — table-qualified column
        pos++;
        return { k: "col", table: tk.v, name: nxt.v.slice(1) };
      }
      if (isOp("(")) {
        pos++;
        const args: Node[] = [];
        if (!isOp(")")) {
          for (;;) {
            args.push(parseExpr());
            if (eatOp(",")) continue;
            expectOp(")");
            break;
          }
        } else pos++;
        return { k: "func", name: tk.v.toUpperCase(), args };
      }
      const up = tk.v.toUpperCase();
      if (up === "TRUE") return { k: "bool", v: true };
      if (up === "FALSE") return { k: "bool", v: false };
      if (up === "BLANK") return { k: "blank" };
      return { k: "col", table: null, name: tk.v };
    }
    if (tk.t === "op" && tk.v === "(") {
      pos++;
      const e = parseExpr();
      expectOp(")");
      return e;
    }
    const rawTok = peek() as unknown;
    const shown = typeof rawTok === "object" && rawTok !== null && "v" in rawTok ? String((rawTok as { v: unknown }).v) : String(tk.t);
    throw new DaxError(`Unexpected "${shown}" in the measure.`);
  }

  const node = parseExpr();
  if (pos < toks.length) throw new DaxError(`Extra input after the measure — unexpected "${String((peek() as { v?: string }).v ?? peek())}".`);
  return node;
}

/* ---------------- helpers ---------------- */
const num = (v: Val): number => {
  if (v === null) return 0; // BLANK coerces to 0 in DAX arithmetic
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  if (isNaN(n)) throw new DaxError(`"${v}" is text — this spot needs a number.`);
  return n;
};
const isNumStr = (v: Val): v is number | null => {
  if (v === null) return true;
  if (typeof v === "number") return true;
  if (/^\d{4}-\d{2}/.test(v)) return false; // ISO dates compare as strings
  return !isNaN(parseFloat(v.replace(/[$,\s]/g, "")));
};
const truthy = (v: Val): boolean => {
  if (v === null) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.toUpperCase() === "TRUE" ? true : v.toUpperCase() === "FALSE" ? false : v !== "";
  return false;
};
const eqVal = (a: Val, b: Val): boolean => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (isNumStr(a) && isNumStr(b)) return num(a) === num(b);
  return String(a).toLowerCase() === String(b).toLowerCase();
};
/** operator-aware comparison used by CALCULATE boolean filters (dates compare as strings) */
function cmpVals(a: Val, b: Val, op: string): boolean {
  if (op === "=") return eqVal(a, b);
  if (op === "<>") return !eqVal(a, b);
  if (a === null || b === null) return false;
  const numeric = isNumStr(a) && isNumStr(b);
  const l = numeric ? num(a) : String(a);
  const r = numeric ? num(b) : String(b);
  switch (op) {
    case "<": return l < r;
    case ">": return l > r;
    case "<=": return l <= r;
    default: return l >= r;
  }
}
function shiftISO(iso: string, n: number, unit: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) throw new DaxError(`"${iso}" isn't a date the sandbox can shift.`);
  if (unit.startsWith("YEAR")) d.setUTCFullYear(d.getUTCFullYear() + n);
  else if (unit.startsWith("QUARTER")) d.setUTCMonth(d.getUTCMonth() + n * 3);
  else if (unit.startsWith("MONTH")) d.setUTCMonth(d.getUTCMonth() + n);
  else d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface DaxEngine {
  evaluate: (formula: string) => { value: Val; display: string };
  register: (name: string, formula: string) => void;
  remove: (name: string) => void;
  listMeasures: () => { name: string; formula: string }[];
}

export function createDaxEngine(table: string, rows: Row[], builtinMeasures: { name: string; formula: string }[]): DaxEngine {
  const measures = new Map<string, string>();
  for (const m of builtinMeasures) measures.set(m.name.toLowerCase(), m.formula);
  const evaluating = new Set<string>(); // cycle guard

  const cols = rows.length ? Object.keys(rows[0]) : [];
  const numericCols = new Set<string>();
  for (const c of cols) {
    const sample = rows.slice(0, 50).map((r) => r[c]).filter((v) => v !== null && v !== "");
    if (sample.length && sample.every((v) => typeof v === "number" || !isNaN(parseFloat(String(v).replace(/[$,\s]/g, ""))))) numericCols.add(c);
  }

  function assertTable(name: string | null) {
    if (name && name.toLowerCase() !== table.toLowerCase())
      throw new DaxError(`The model has one table called '${table}' — "${name}" doesn't exist. (Relationships are not modeled in this sandbox.)`);
  }

  /* ---- table expressions ---- */
  function evalTable(node: Node, filterRows: Row[]): Row[] {
    switch (node.k) {
      case "col": {
        assertTable(node.table);
        // a bare reference to the table itself (COUNTROWS('Sales'), FILTER('Sales',…), ALL('Sales'))
        if (!node.table && node.name.toLowerCase() === table.toLowerCase()) return filterRows;
        // a bare column used as a table = the distinct values currently visible (like VALUES)
        const vals = new Set<string>();
        for (const r of filterRows) vals.add(String(r[node.name] ?? ""));
        return [...vals].map((v) => ({ [node.name]: v === "" ? null : (numericCols.has(node.name) ? parseFloat(v) : v) }));
      }
      case "func": {
        const A = node.args;
        switch (node.name) {
          case "ALL": {
            if (!A.length) return rows;
            const first = A[0];
            if (first.k === "col") {
              assertTable(first.table);
              // ALL('Sales') — the whole table, unfiltered
              if (!first.table && first.name.toLowerCase() === table.toLowerCase()) return rows;
              if (A.length === 1) {
                // ALL('Sales'[Col]) — remove filters on that column only
                if (!filterRows.length) return rows;
                return rows.filter((br) => {
                  const key = (r: Row) => cols.filter((c) => c !== first.name).map((c) => String(r[c] ?? "")).join("\u0001");
                  const visible = new Set(filterRows.map(key));
                  return visible.has(key(br));
                });
              }
              // ALL('T'[c1], 'T'[c2]) — same idea across listed columns
              const drop = new Set(A.map((a) => (a.k === "col" ? a.name : "")).filter(Boolean));
              if (!filterRows.length) return rows;
              const key = (r: Row) => cols.filter((c) => !drop.has(c)).map((c) => String(r[c] ?? "")).join("\u0001");
              const visible = new Set(filterRows.map(key));
              return rows.filter((br) => visible.has(key(br)));
            }
            if (first.k === "func" && first.name === "VALUES") return rows; // ALL(VALUES(col)) ≈ ALL
            return rows; // ALL('Sales') — everything (non-column arg falls back to the full table)
          }
          case "ALLSELECTED":
            return evalTable(A[0], filterRows);
          case "FILTER": {
            const base = evalTable(A[0], filterRows);
            const cond = A[1];
            return base.filter((row) => truthy(evalScalar(cond, row, filterRows)));
          }
          case "VALUES":
          case "DISTINCT": {
            const colNode = A[0];
            if (colNode.k !== "col") throw new DaxError(`${node.name} needs a column like 'Sales'[Region].`);
            assertTable(colNode.table);
            const seen = new Set<string>();
            const out: Row[] = [];
            for (const r of filterRows) {
              const key = String(r[colNode.name] ?? "\u0002");
              if (!seen.has(key)) { seen.add(key); out.push({ [colNode.name]: r[colNode.name] }); }
            }
            return out;
          }
          case "DATESYTD": {
            const col = requireDateCol(A[0]);
            const max = maxDate(col, rows);
            if (!max) return [];
            const yr = max.slice(0, 4);
            return rows.filter((r) => String(r[col] ?? "") <= max && String(r[col] ?? "").startsWith(yr));
          }
          case "SAMEPERIODLASTYEAR": {
            const col = requireDateCol(A[0]);
            const target = new Set<string>();
            for (const r of filterRows) {
              const d = String(r[col] ?? "");
              if (/^\d{4}-\d{2}-\d{2}$/.test(d)) target.add(shiftISO(d, -1, "YEAR"));
            }
            return rows.filter((r) => target.has(String(r[col] ?? "")));
          }
          case "DATEADD": {
            const col = requireDateCol(A[0]);
            const n = Math.round(num(evalScalar(A[1], null, filterRows) as Val));
            const unitNode = A[2];
            const unit = (unitNode.k === "col" && !unitNode.table ? unitNode.name : String(evalScalar(unitNode, null, filterRows) as Val)).toUpperCase();
            const target = new Set<string>();
            for (const r of filterRows) {
              const d = String(r[col] ?? "");
              if (/^\d{4}-\d{2}-\d{2}$/.test(d)) target.add(shiftISO(d, n, unit.toUpperCase()));
            }
            return rows.filter((r) => target.has(String(r[col] ?? "")));
          }
          case "PREVIOUSMONTH": {
            const col = requireDateCol(A[0]);
            const max = maxDate(col, filterRows.length ? filterRows : rows);
            if (!max) return [];
            const prev = shiftISO(`${max.slice(0, 7)}-01`, -1, "MONTH");
            const prefix = prev.slice(0, 7);
            return rows.filter((r) => String(r[col] ?? "").startsWith(prefix));
          }
          default:
            throw new DaxError(`${node.name} can't be used here — it doesn't return a table. Tables come from FILTER, ALL, VALUES or date functions.`);
        }
      }
      case "measure": {
        // measure returning a table is not supported
        throw new DaxError(`[${node.name}] is a measure (a single value), not a table.`);
      }
      default:
        throw new DaxError("This expression doesn't produce a table where one is required.");
    }
  }

  function requireDateCol(node: Node): string {
    if (node.k !== "col") throw new DaxError("Date functions need a date column, like 'Sales'[order_date].");
    assertTable(node.table);
    if (!/date/.test(node.name)) {
      // still allow it if values look like dates
      const sample = rows[0]?.[node.name];
      if (typeof sample === "string" && !/^\d{4}-/.test(sample)) throw new DaxError(`'Sales'[${node.name}] doesn't look like a date column — try 'Sales'[order_date].`);
    }
    return node.name;
  }
  function maxDate(col: string, pool: Row[]): string | null {
    let max: string | null = null;
    for (const r of pool) {
      const d = String(r[col] ?? "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!max || d > max)) max = d;
    }
    return max;
  }

  /* ---- scalar expressions ---- */
  function evalScalar(node: Node, rowCtx: Row | null, filterRows: Row[]): Val {
    switch (node.k) {
      case "num": return node.v;
      case "str": return node.v;
      case "bool": return node.v ? 1 : 0;
      case "blank": return null;
      case "measure": {
        const key = node.name.toLowerCase();
        const src = measures.get(key);
        if (!src) {
          const colHit = cols.find((c) => c.toLowerCase() === key);
          if (colHit) throw new DaxError(`[${node.name}] is a column, not a measure. Wrap it in an aggregator: SUM('Sales'[${node.name}]).`);
          throw new DaxError(`There's no measure called [${node.name}]. Define it first (or check the spelling).`);
        }
        if (evaluating.has(key)) throw new DaxError(`Measure [${node.name}] refers to itself — measures can't be circular.`);
        evaluating.add(key);
        try {
          const inner = parse(src);
          return evalScalar(inner, null, filterRows);
        } finally {
          evaluating.delete(key);
        }
      }
      case "col": {
        assertTable(node.table);
        if (rowCtx) {
          if (!(node.name in rowCtx)) {
            const guess = cols.find((c) => c.toLowerCase() === node.name.toLowerCase());
            if (guess) return rowCtx[guess] as Val;
            throw new DaxError(`Column [${node.name}] doesn't exist. Columns: ${cols.slice(0, 8).join(", ")}…`);
          }
          return rowCtx[node.name] as Val;
        }
        throw new DaxError(
          `'Sales'[${node.name}] can't be used as a bare column here — outside a row context a column is a *set of values*. Wrap it in SUM('Sales'[${node.name}]), COUNTROWS(VALUES('Sales'[${node.name}])), or use it inside an iterator like SUMX.`
        );
      }
      case "un": {
        if (node.op === "NOT") return truthy(evalScalar(node.e, rowCtx, filterRows)) ? 0 : 1;
        const v = evalScalar(node.e, rowCtx, filterRows);
        return v === null ? null : -num(v);
      }
      case "bin": {
        const op = node.op;
        if (op === "&&") return truthy(evalScalar(node.l, rowCtx, filterRows)) && truthy(evalScalar(node.r, rowCtx, filterRows)) ? 1 : 0;
        if (op === "||") return truthy(evalScalar(node.l, rowCtx, filterRows)) || truthy(evalScalar(node.r, rowCtx, filterRows)) ? 1 : 0;
        const l = evalScalar(node.l, rowCtx, filterRows);
        const r = evalScalar(node.r, rowCtx, filterRows);
        switch (op) {
          case "+": return (l === null && r === null) ? null : (l === null ? 0 : num(l)) + (r === null ? 0 : num(r));
          case "-": return (l === null && r === null) ? null : (l === null ? 0 : num(l)) - (r === null ? 0 : num(r));
          case "*": return (l === null || r === null) ? null : num(l) * num(r);
          case "%": return num(l) % num(r);
          case "/": {
            const d = num(r);
            return d === 0 ? null : num(l === null ? 0 : l) / d;
          }
          case "=": return eqVal(l, r) ? 1 : 0;
          case "<>": return !eqVal(l, r) ? 1 : 0;
          case "<": case ">": case "<=": case ">=": {
            const a = isNumStr(l) && isNumStr(r) ? num(l) : String(l ?? "");
            const b = isNumStr(l) && isNumStr(r) ? num(r) : String(r ?? "");
            switch (op) {
              case "<": return a < b ? 1 : 0;
              case ">": return a > b ? 1 : 0;
              case "<=": return a <= b ? 1 : 0;
              default: return a >= b ? 1 : 0;
            }
          }
          default: throw new DaxError(`Unsupported operator "${op}".`);
        }
      }
      case "func": {
        const A = node.args;
        const sc = (i: number): Val => (A[i] ? evalScalar(A[i], rowCtx, filterRows) : null);
        switch (node.name) {
          case "TRUE": return 1;
          case "FALSE": return 0;
          case "BLANK": return null;
        }
        const colOf = (i: number): { col: string } => {
          const n = A[i];
          if (n?.k !== "col") throw new DaxError("Expected a column reference like 'Sales'[revenue] here.");
          assertTable(n.table);
          return { col: n.name };
        };
        const aggOver = (colName: string, pool: Row[]): number[] => {
          const out: number[] = [];
          for (const r of pool) {
            const v = r[colName];
            if (v === null || v === undefined || v === "") continue;
            const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""));
            if (!isNaN(n)) out.push(n);
          }
          return out;
        };
        const needCol = (name: string): string => {
          const hit = cols.find((c) => c.toLowerCase() === name.toLowerCase());
          if (!hit) throw new DaxError(`Column [${name}] doesn't exist in 'Sales'. Columns: ${cols.join(", ")}.`);
          return hit;
        };

        switch (node.name) {
          /* ---------- aggregators ---------- */
          case "SUM": { const { col } = colOf(0); const a = aggOver(needCol(col), filterRows); return a.length ? a.reduce((s, x) => s + x, 0) : null; }
          case "AVERAGE": { const { col } = colOf(0); const a = aggOver(needCol(col), filterRows); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; }
          case "MIN": {
            if (A.length === 2 && A.every((a) => a.k !== "col")) return Math.min(num(sc(0)), num(sc(1)));
            const { col } = colOf(0); const a = aggOver(needCol(col), filterRows); return a.length ? Math.min(...a) : null;
          }
          case "MAX": {
            if (A.length === 2 && A.every((a) => a.k !== "col")) return Math.max(num(sc(0)), num(sc(1)));
            const { col } = colOf(0); const a = aggOver(needCol(col), filterRows); return a.length ? Math.max(...a) : null;
          }
          case "COUNT": { const { col } = colOf(0); return filterRows.filter((r) => r[needCol(col)] !== null && r[needCol(col)] !== "").length; }
          case "COUNTBLANK": { const { col } = colOf(0); return filterRows.filter((r) => r[needCol(col)] === null || r[needCol(col)] === "").length; }
          case "COUNTROWS": {
            const pool = evalTable(A[0], filterRows);
            return pool.length;
          }
          case "DISTINCTCOUNT": {
            const { col } = colOf(0);
            const s = new Set<string>();
            for (const r of filterRows) { const v = r[needCol(col)]; if (v !== null && v !== undefined && v !== "") s.add(String(v)); }
            return s.size;
          }

          /* ---------- iterators ---------- */
          case "SUMX": case "AVERAGEX": case "MINX": case "MAXX": case "COUNTX": {
            const pool = evalTable(A[0], filterRows);
            const vals: number[] = [];
            for (const row of pool) {
              const v = evalScalar(A[1], row, filterRows);
              if (v === null || v === "") continue;
              const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""));
              if (!isNaN(n)) vals.push(n);
            }
            if (!vals.length) return node.name === "SUMX" || node.name === "COUNTX" ? 0 : null;
            switch (node.name) {
              case "SUMX": return vals.reduce((s, x) => s + x, 0);
              case "AVERAGEX": return vals.reduce((s, x) => s + x, 0) / vals.length;
              case "MINX": return Math.min(...vals);
              case "MAXX": return Math.max(...vals);
              default: return vals.length;
            }
          }

          /* ---------- CALCULATE ---------- */
          case "CALCULATE": case "KEEPFILTERS": {
            // context transition: a row context (e.g. inside AVERAGEX over VALUES) becomes a filter
            let ctx = filterRows;
            if (rowCtx) {
              const keys = Object.keys(rowCtx).filter((k) => rowCtx[k] !== undefined);
              ctx = ctx.filter((r) => keys.every((k) => eqVal(r[k] as Val, rowCtx[k] as Val)));
            }
            for (let i = 1; i < A.length; i++) {
              const f = A[i];
              if (f.k === "bin" && ["=", "<>", "<", ">", "<=", ">="].includes(f.op)) {
                // boolean filter: 'Sales'[col] OP value — operator must be honored
                const colNode = f.l.k === "col" ? f.l : f.r.k === "col" ? f.r : null;
                if (colNode) {
                  assertTable(colNode.table);
                  const other = colNode === f.l ? f.r : f.l;
                  const val = evalScalar(other, null, ctx);
                  ctx = ctx.filter((r) => cmpVals(r[colNode.name] as Val, val, f.op));
                } else {
                  ctx = ctx.filter((r) => truthy(evalScalar(f, r, ctx)));
                }
              } else if (f.k === "un" && f.op === "NOT") {
                const inner = f.e;
                if (inner.k === "bin" && inner.l.k === "col") {
                  assertTable((inner.l as { table: string | null }).table);
                  const colName = (inner.l as { name: string }).name;
                  const val = evalScalar(inner.r, null, ctx);
                  ctx = ctx.filter((r) => !cmpVals(r[colName] as Val, val, (inner as { op: string }).op));
                }
              } else if (f.k === "bin" && (f.op === "&&" || f.op === "||")) {
                // compound predicate — evaluate row by row
                ctx = ctx.filter((r) => truthy(evalScalar(f, r, ctx)));
              } else {
                // table-returning filter (FILTER / ALL / date intel / VALUES)
                ctx = evalTable(f, ctx);
              }
            }
            return evalScalar(A[0], null, ctx);
          }

          /* ---------- logical ---------- */
          case "IF": return truthy(sc(0)) ? sc(1) : (A.length > 2 ? sc(2) : null);
          case "SWITCH": {
            const first = A[0];
            const isTrueForm = first.k === "func" && first.name === "TRUE";
            const subject = isTrueForm ? null : sc(0);
            let i = 1; // pairs always start at 1 — A[0] is the value or the TRUE() literal
            for (; i + 1 < A.length; i += 2) {
              const cond = isTrueForm ? truthy(evalScalar(A[i], rowCtx, filterRows)) : eqVal(subject, evalScalar(A[i], rowCtx, filterRows));
              if (cond) return evalScalar(A[i + 1], rowCtx, filterRows);
            }
            return i < A.length ? evalScalar(A[i], rowCtx, filterRows) : null;
          }
          case "AND": return truthy(sc(0)) && truthy(sc(1)) ? 1 : 0;
          case "OR": return truthy(sc(0)) || truthy(sc(1)) ? 1 : 0;
          case "ISBLANK": return sc(0) === null ? 1 : 0;

          /* ---------- math ---------- */
          case "DIVIDE": {
            const d = num(sc(1));
            if (d === 0 || isNaN(d)) return A.length > 2 ? sc(2) : null;
            return num(sc(0) === null ? 0 : sc(0)) / d;
          }
          case "ROUND": { const d = A.length > 1 ? Math.round(num(sc(1))) : 0; return +num(sc(0)).toFixed(d); }
          case "ROUNDUP": { const d = A.length > 1 ? Math.round(num(sc(1))) : 0; const p = Math.pow(10, d); return Math.ceil(Math.abs(num(sc(0))) * p) / p * Math.sign(num(sc(0)) || 1); }
          case "ROUNDDOWN": { const d = A.length > 1 ? Math.round(num(sc(1))) : 0; const p = Math.pow(10, d); return (Math.floor(Math.abs(num(sc(0))) * p) / p) * Math.sign(num(sc(0)) || 1); }
          case "ABS": return Math.abs(num(sc(0)));
          case "INT": return Math.floor(num(sc(0)));
          case "SQRT": return Math.sqrt(Math.abs(num(sc(0))));
          case "POWER": return Math.pow(num(sc(0)), num(sc(1)));

          /* ---------- time intelligence (scalar shortcuts) ---------- */
          case "TOTALYTD": {
            const col = requireDateCol(A[1]);
            const ytd = evalTable({ k: "func", name: "DATESYTD", args: [A[1]] }, filterRows);
            void col;
            return evalScalar(A[0], null, ytd);
          }
          case "EOMONTH": {
            const d = String(sc(0) ?? "");
            if (!/^\d{4}-\d{2}/.test(d)) throw new DaxError("EOMONTH needs a date like 'Sales'[order_date].");
            const add = A.length > 1 ? Math.round(num(sc(1))) : 0;
            const base = new Date(`${d.slice(0, 7)}-01T00:00:00Z`);
            base.setUTCMonth(base.getUTCMonth() + add + 1, 0);
            return base.toISOString().slice(0, 10);
          }
          case "EDATE": {
            const d = String(sc(0) ?? "");
            if (!/^\d{4}-\d{2}/.test(d)) throw new DaxError("EDATE needs a date like 'Sales'[order_date].");
            const add = Math.round(num(sc(1)));
            const base = new Date(`${d.slice(0, 10)}T00:00:00Z`);
            base.setUTCMonth(base.getUTCMonth() + add);
            return base.toISOString().slice(0, 10);
          }
          case "YEAR": {
            const d = String(sc(0) ?? "");
            if (!/^\d{4}-/.test(d)) throw new DaxError("YEAR needs a date value.");
            return parseInt(d.slice(0, 4), 10);
          }
          case "MONTH": {
            const d = String(sc(0) ?? "");
            if (!/^\d{4}-\d{2}/.test(d)) throw new DaxError("MONTH needs a date value.");
            return parseInt(d.slice(5, 7), 10);
          }
          case "DAY": {
            const d = String(sc(0) ?? "");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new DaxError("DAY needs a date value.");
            return parseInt(d.slice(8, 10), 10);
          }

          /* ---------- text ---------- */
          case "CONCATENATE": return `${sc(0) ?? ""}${sc(1) ?? ""}`;
          case "FORMAT": {
            const v = sc(0);
            const f = String(sc(1) ?? "");
            if (v === null) return "";
            const n = typeof v === "number" ? v : parseFloat(String(v));
            if (isNaN(n)) return String(v);
            if (f.includes("%")) {
              const dec = (f.split(".")[1] || "").replace(/[^0#]/g, "").length;
              return `${(n * 100).toFixed(dec)}%`;
            }
            const decMatch = /\.(0+)/.exec(f);
            const dec = decMatch ? decMatch[1].length : 0;
            const grouped = f.includes(",") || f.includes("#,##");
            return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: grouped });
          }

          default:
            throw new DaxError(
              `${node.name} isn't available in this sandbox yet. Great functions to try: SUM, AVERAGE, COUNTROWS, DISTINCTCOUNT, SUMX, AVERAGEX, CALCULATE, FILTER, ALL, VALUES, DIVIDE, IF, SWITCH, TOTALYTD, SAMEPERIODLASTYEAR, DATEADD, PREVIOUSMONTH, FORMAT.`
            );
        }
      }
    }
  }

  function formatVal(v: Val): string {
    if (v === null) return "(BLANK)";
    if (typeof v === "number") {
      if (Number.isInteger(v)) return v.toLocaleString("en-US");
      return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return v;
  }

  const engine: DaxEngine = {
    evaluate(formula: string) {
      const src = formula.trim().replace(/^=/, "").replace(/;\s*$/, "");
      if (!src) throw new DaxError("Type a measure first, e.g. SUM('Sales'[revenue]).");
      // validate column references early for a friendlier error
      const node = parse(src);
      const value = evalScalar(node, null, rows);
      return { value, display: formatVal(value) };
    },
    register(name, formula) { measures.set(name.toLowerCase(), formula.trim().replace(/^=/, "")); },
    remove(name) { measures.delete(name.toLowerCase()); },
    listMeasures() {
      return builtinMeasures
        .map((m) => ({ name: m.name, formula: m.formula }))
        .concat([...measures.keys()].filter((k) => !builtinMeasures.some((b) => b.name.toLowerCase() === k)).map((k) => ({ name: k, formula: measures.get(k)! })));
    },
  };
  return engine;
}

/** formatted value used across the UI (money-aware columns get $ in the studio) */
export function daxDisplay(v: Val): string {
  if (v === null) return "(BLANK)";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("en-US");
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return v;
}
