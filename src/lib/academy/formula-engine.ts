// Shared Excel-style formula engine — extracted verbatim from Excel Studio so the
// Functions Lab sandbox evaluates formulas with the exact same battle-tested engine.
export const COLS = 26;
const ROWS = 200;
const colName = (i: number) => String.fromCharCode(65 + i);
const colName2 = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`);
const refFor = (c: number, r: number) => `${colName(c)}${r + 1}`;
const parseRef = (ref: string): [number, number] | null => {
  const m = /^\$?([A-Z])\$?(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  return [m[1].toUpperCase().charCodeAt(0) - 65, parseInt(m[2], 10) - 1];
};

type Val = string | number;
type Arg = { kind: "value"; v: Val } | { kind: "range"; values: string[]; w: number; h: number };

class FormulaError extends Error {}

function evalSheetFormula(src: string, cells: Record<string, string>, stack: Set<string>): Val {
  let pos = 0;
  const ws = () => { while (pos < src.length && /\s/.test(src[pos])) pos++; };

  function parseExpr(): Val { return parseCompare(); }

  function parseCompare(): Val {
    let l = parseConcat();
    ws();
    const ops = ["<=", ">=", "<>", "=", "<", ">"];
    for (const op of ops) {
      if (src.startsWith(op, pos)) {
        pos += op.length;
        const r = parseConcat();
        const ln = typeof l === "number" ? l : parseFloat(String(l));
        const rn = typeof r === "number" ? r : parseFloat(String(r));
        const numeric = !isNaN(ln) && !isNaN(rn);
        switch (op) {
          case "=": return (numeric ? ln === rn : String(l) === String(r)) ? 1 : 0;
          case "<>": return (numeric ? ln !== rn : String(l) !== String(r)) ? 1 : 0;
          case "<": return numeric ? (ln < rn ? 1 : 0) : String(l) < String(r) ? 1 : 0;
          case ">": return numeric ? (ln > rn ? 1 : 0) : String(l) > String(r) ? 1 : 0;
          case "<=": return numeric ? (ln <= rn ? 1 : 0) : String(l) <= String(r) ? 1 : 0;
          case ">=": return numeric ? (ln >= rn ? 1 : 0) : String(l) >= String(r) ? 1 : 0;
        }
      }
    }
    return l;
  }

  function parseConcat(): Val {
    let l = parseAdd();
    for (;;) {
      ws();
      if (src[pos] === "&") {
        pos++;
        const r = parseAdd();
        l = `${fmtRaw(l)}${fmtRaw(r)}`;
      } else return l;
    }
  }

  function parseAdd(): Val {
    let l = parseMul();
    for (;;) {
      ws();
      if (src[pos] === "+") { pos++; l = num(l) + num(parseMul()); }
      else if (src[pos] === "-") { pos++; l = num(l) - num(parseMul()); }
      else return l;
    }
  }
  function parseMul(): Val {
    let l = parsePow();
    for (;;) {
      ws();
      if (src[pos] === "*") { pos++; l = num(l) * num(parsePow()); }
      else if (src[pos] === "/") {
        pos++;
        const d = num(parsePow());
        if (d === 0) throw new FormulaError("#DIV/0!");
        l = num(l) / d;
      } else return l;
    }
  }
  function parsePow(): Val {
    let l = parseUnary();
    for (;;) {
      ws();
      if (src[pos] === "^") { pos++; l = Math.pow(num(l), num(parseUnary())); }
      else return l;
    }
  }
  function parseUnary(): Val {
    ws();
    if (src[pos] === "-") { pos++; return -num(parseUnary()); }
    if (src[pos] === "+") { pos++; return num(parseUnary()); }
    return parsePrimary() as Val;
  }

  function parsePrimary(): Val | Arg {
    ws();
    if (src[pos] === "(") {
      pos++;
      const v = parseExpr();
      ws();
      if (src[pos] !== ")") throw new FormulaError("#SYNTAX!");
      pos++;
      return v;
    }
    if (src[pos] === '"') {
      let s = "";
      pos++;
      while (pos < src.length && src[pos] !== '"') s += src[pos++];
      pos++;
      return s;
    }
    const colRange = /^\$?([A-Za-z])\$?\s*:\s*\$?([A-Za-z])\$?(?!\d)/.exec(src.slice(pos));
    if (colRange) {
      const c1 = colRange[1].toUpperCase().charCodeAt(0) - 65;
      const c2 = colRange[2].toUpperCase().charCodeAt(0) - 65;
      pos += colRange[0].length;
      if (c1 >= COLS || c2 >= COLS) throw new FormulaError("#REF!");
      return rangeBox(refFor(Math.min(c1, c2), 0), refFor(Math.max(c1, c2), ROWS - 1), cells, stack);
    }
    const rowRange = /^\$?(\d+)\s*:\s*\$?(\d+)/.exec(src.slice(pos));
    if (rowRange) {
      const r1 = Math.max(0, Math.min(+rowRange[1], +rowRange[2]) - 1);
      const r2 = Math.min(ROWS - 1, Math.max(+rowRange[1], +rowRange[2]) - 1);
      pos += rowRange[0].length;
      return rangeBox(refFor(0, r1), refFor(COLS - 1, r2), cells, stack);
    }
    const numMatch = /^\d+(\.\d+)?/.exec(src.slice(pos));
    if (numMatch) { pos += numMatch[0].length; return parseFloat(numMatch[0]); }
    const fnMatch = /^([A-Z][A-Z0-9.]*)\(/i.exec(src.slice(pos));
    if (fnMatch) {
      const name = fnMatch[1].toUpperCase();
      pos += fnMatch[0].length;
      if (name === "IFERROR" || name === "IFNA") return parseIfError(name);
      const args: Arg[] = [];
      if (src[pos] === ")") pos++;
      else {
        for (;;) {
          args.push(parseArg());
          if (src[pos] === ",") { pos++; continue; }
          if (src[pos] === ")") { pos++; break; }
          throw new FormulaError("#SYNTAX!");
        }
      }
      return callFn(name, args);
    }
    const refMatch = /^\$?[A-Za-z]\$?\d+/.exec(src.slice(pos));
    if (refMatch) {
      const ref = refMatch[0].toUpperCase();
      pos += refMatch[0].length;
      ws();
      if (src[pos] === ":") {
        pos++;
        const ref2Match = /^\$?[A-Za-z]\$?\d+/.exec(src.slice(pos));
        if (!ref2Match) throw new FormulaError("#SYNTAX!");
        pos += ref2Match[0].length;
        return rangeBox(ref, ref2Match[0].toUpperCase(), cells, stack);
      }
      // return the VALUE directly — wrapping in an Arg here would leak an object
      // into scalar expressions (=F2>500 compared "[object Object]"). Ranges are
      // still Args; single-cell refs must behave like plain values.
      return cellValue(ref, cells, stack);
    }
    if (/^TRUE$/i.test(src.slice(pos, pos + 4))) { pos += 4; return 1; }
    if (/^FALSE$/i.test(src.slice(pos, pos + 5))) { pos += 5; return 0; }
    throw new FormulaError("#NAME?");
  }

  function parseArg(): Arg {
    ws();
    const colRange = /^\$?([A-Za-z])\$?\s*:\s*\$?([A-Za-z])\$?(?!\d)/.exec(src.slice(pos));
    if (colRange) {
      const c1 = colRange[1].toUpperCase().charCodeAt(0) - 65;
      const c2 = colRange[2].toUpperCase().charCodeAt(0) - 65;
      pos += colRange[0].length;
      if (c1 >= COLS || c2 >= COLS) throw new FormulaError("#REF!");
      return rangeBox(refFor(Math.min(c1, c2), 0), refFor(Math.max(c1, c2), ROWS - 1), cells, stack);
    }
    const rowRange = /^\$?(\d+)\s*:\s*\$?(\d+)/.exec(src.slice(pos));
    if (rowRange) {
      const r1 = Math.max(0, Math.min(+rowRange[1], +rowRange[2]) - 1);
      const r2 = Math.min(ROWS - 1, Math.max(+rowRange[1], +rowRange[2]) - 1);
      pos += rowRange[0].length;
      return rangeBox(refFor(0, r1), refFor(COLS - 1, r2), cells, stack);
    }
    const startRef = /^\$?[A-Za-z]\$?\d+/.exec(src.slice(pos));
    if (startRef) {
      const ref = startRef[0].toUpperCase();
      const after = src.slice(pos + startRef[0].length);
      if (/^\s*:/.test(after)) {
        const m2 = /^\s*:\s*\$?[A-Za-z]\$?\d+/.exec(after);
        if (m2) {
          const ref2 = /^\s*:\s*(\$?[A-Za-z]\$?\d+)/.exec(after)![1].toUpperCase();
          pos += startRef[0].length + /^\s*:\s*\$?[A-Za-z]\$?\d+/.exec(after)![0].length;
          return rangeBox(ref, ref2, cells, stack);
        }
      }
    }
    const v = parseExpr();
    return { kind: "value", v };
  }

  function argValue(a: Arg): Val {
    return a.kind === "value" ? a.v : a.values[0] ?? "";
  }
  function skipToCommaOrClose(): void {
    let depth = 0;
    while (pos < src.length) {
      const ch = src[pos];
      if (ch === "(") depth++;
      else if (ch === ")") { if (depth === 0) return; depth--; }
      else if (ch === "," && depth === 0) return;
      pos++;
    }
  }
  function parseIfError(name: "IFERROR" | "IFNA"): Val {
    ws();
    const start = pos;
    let main: Arg | null = null;
    let failed: unknown = null;
    try {
      main = parseArg();
    } catch (e) {
      failed = e;
      pos = start;
      skipToCommaOrClose();
    }
    const isNa = failed instanceof FormulaError && failed.message === "#N/A";
    if (failed && name === "IFNA" && !isNa) throw failed;
    if (main) {
      ws();
      if (src[pos] === ",") {
        pos++;
        try { parseArg(); } catch { skipToCommaOrClose(); }
      }
      ws();
      if (src[pos] === ")") pos++;
      return argValue(main);
    }
    ws();
    if (src[pos] !== ",") throw failed;
    pos++;
    const fb = parseArg();
    ws();
    if (src[pos] === ")") pos++;
    return argValue(fb);
  }

  const v = parseExpr();
  ws();
  if (pos < src.length) throw new FormulaError("#SYNTAX!");
  if (typeof v === "object" && v !== null && "kind" in v) throw new FormulaError("#VALUE!");
  return v as Val;
}

/** identical formatting rules to shared.tsx fmtNum (kept local to avoid a lib→component import) */
function fmtNum(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtRaw(v: Val): string {
  return typeof v === "number" ? fmtNum(v) : String(v);
}
function num(v: Val): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[$,%\s]/g, ""));
  if (isNaN(n)) throw new FormulaError("#VALUE!");
  return n;
}
function cellValue(ref: string, cells: Record<string, string>, stack: Set<string>): Val {
  if (stack.has(ref)) throw new FormulaError("#CYCLE!");
  const raw = cells[ref] ?? "";
  if (raw === "") return "";
  if (raw.startsWith("=")) {
    stack.add(ref);
    try {
      return evalSheetFormula(raw.slice(1), cells, stack);
    } finally {
      stack.delete(ref);
    }
  }
  // Only coerce PURE numeric literals ("1234", "-12.5", "1,234.50", "$89.00").
  // Prefix-parsing turned ISO dates into numbers ("2025-01-02" → 2025), which broke
  // YEAR/MONTH/DAY/TEXT and date-aware formulas. Everything else stays text.
  const t = raw.trim().replace(/^\$/, "");
  if (/^-?[\d,]*\.?\d+$/.test(t) && /\d/.test(t)) {
    const n = parseFloat(t.replace(/,/g, ""));
    if (!isNaN(n)) return n;
  }
  return raw;
}
function rangeBox(a: string, b: string, cells: Record<string, string>, stack: Set<string>): Arg {
  const [c1, r1] = parseRef(a)!;
  const [c2, r2] = parseRef(b)!;
  const [cMin, cMax] = [Math.min(c1, c2), Math.max(c1, c2)];
  const [rMin, rMax] = [Math.min(r1, r2), Math.max(r1, r2)];
  const values: string[] = [];
  for (let r = rMin; r <= rMax; r++)
    for (let c = cMin; c <= cMax; c++)
      values.push(String(cellValue(refFor(c, r), cells, stack) ?? ""));
  return { kind: "range", values, w: cMax - cMin + 1, h: rMax - rMin + 1 };
}

/* ---------- shared criteria matcher (same semantics as SUMIF/COUNTIF/SUMIFS) ---------- */
function wildToRx(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "~" && (s[i + 1] === "*" || s[i + 1] === "?")) { out += s[i + 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); i++; }
    else if (ch === "*") out += ".*";
    else if (ch === "?") out += ".";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return out;
}
function matchCrit(cell: string, critVal: Val): boolean {
  const crit = String(critVal ?? "");
  const m = /^(>=|<=|>|<|=|<>)(.*)$/.exec(crit);
  if (m) {
    const target = parseFloat(m[2].replace(/[$,\s]/g, ""));
    const value = parseFloat(String(cell).replace(/[$,\s]/g, ""));
    if (!isNaN(target) && !isNaN(value)) {
      switch (m[1]) {
        case ">": return value > target;
        case "<": return value < target;
        case ">=": return value >= target;
        case "<=": return value <= target;
        case "=": return value === target;
        case "<>": return value !== target;
      }
    }
    return m[1] === "=" ? String(cell) === m[2] : false;
  }
  if (/[*?]/.test(crit)) {
    try { return new RegExp(`^${wildToRx(crit.trim())}$`, "i").test(String(cell).trim()); } catch { /* fall through */ }
  }
  return String(cell).trim().toLowerCase() === crit.trim().toLowerCase();
}

/* ---------- date helpers (ISO-string dates; sandbox simplification vs Excel serials) ---------- */
function parseDateVal(s: string): Date | null {
  const t = String(s ?? "").trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(t);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t); // US mm/dd/yyyy
  if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  return null;
}
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function datePart(v: Val, part: "year" | "month" | "day"): number {
  const d = parseDateVal(String(v ?? ""));
  if (!d) throw new FormulaError("#VALUE!");
  return part === "year" ? d.getUTCFullYear() : part === "month" ? d.getUTCMonth() + 1 : d.getUTCDate();
}

/* ---------- TEXT() — supports the common Excel format codes used in teaching ---------- */
function excelText(v: Val, fmt: string): string {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""));
  const isNum = !isNaN(n) && String(v ?? "").trim() !== "";
  const f = fmt.trim();
  // date patterns first
  if (!isNum || /[y]{2,4}|[d]{1,2}|[m]{1,2}(?![s%])/.test(f) && parseDateVal(String(v)) && /[y]/.test(f)) {
    const d = parseDateVal(String(v));
    if (d) {
      const pad = (x: number, l = 2) => String(x).padStart(l, "0");
      const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let out = f
        .replace(/yyyy/gi, String(d.getUTCFullYear()))
        .replace(/yy/gi, pad(d.getUTCFullYear() % 100))
        .replace(/mmm/g, MONTHS[d.getUTCMonth()])
        .replace(/mm/g, pad(d.getUTCMonth() + 1))
        .replace(/m/g, String(d.getUTCMonth() + 1))
        .replace(/dd/gi, pad(d.getUTCDate()))
        .replace(/d/gi, String(d.getUTCDate()));
      return out;
    }
  }
  if (!isNum) return String(v ?? "");
  if (f.includes("%")) {
    const dec = (f.split(".")[1] || "").replace(/[^0#]/g, "").length;
    return `${(n * 100).toFixed(dec)}%`;
  }
  const decMatch = /\.(0+)/.exec(f);
  const dec = decMatch ? decMatch[1].length : /0/.test(f) ? 0 : 2;
  const useComma = f.includes(",") || f.includes("#,##");
  const fixed = n.toFixed(dec);
  const [int, frac] = fixed.split(".");
  const grouped = useComma ? (+int).toLocaleString("en-US", { maximumFractionDigits: 0 }) : int;
  const body = frac ? `${grouped}.${frac}` : grouped;
  if (f.includes("$")) return `$${body}`;
  return body;
}

function callFn(name: string, args: Arg[]): Val {
  const flat = (): string[] => {
    const out: string[] = [];
    for (const a of args) {
      if (a.kind === "range") out.push(...a.values);
      else out.push(String(a.v));
    }
    return out;
  };
  const numeric = (vals: string[]): number[] =>
    vals.map((v) => parseFloat(String(v ?? "").replace(/[$,\s]/g, ""))).filter((n) => !isNaN(n));
  const nonEmpty = (): string[] => flat().filter((v) => v !== "" && v !== "#CYCLE!");
  const scalar = (i: number): Val => (args[i]?.kind === "value" ? (args[i] as { v: Val }).v : num(args[i]?.values[0] ?? "0"));
  const text = (i: number): string => String(scalar(i) ?? "");

  switch (name) {
    case "SUM": return numeric(flat()).reduce((s, n) => s + n, 0);
    case "AVERAGE": {
      const n = numeric(flat());
      return n.length ? n.reduce((s, x) => s + x, 0) / n.length : 0;
    }
    case "MEDIAN": {
      const n = numeric(flat()).sort((a, b) => a - b);
      if (!n.length) return 0;
      const mid = Math.floor(n.length / 2);
      return n.length % 2 ? n[mid] : (n[mid - 1] + n[mid]) / 2;
    }
    case "STDEV": {
      const n = numeric(flat());
      if (n.length < 2) return 0;
      const mean = n.reduce((s, x) => s + x, 0) / n.length;
      return Math.sqrt(n.reduce((s, x) => s + (x - mean) ** 2, 0) / (n.length - 1));
    }
    case "VAR": {
      const n = numeric(flat());
      if (n.length < 2) return 0;
      const mean = n.reduce((s, x) => s + x, 0) / n.length;
      return n.reduce((s, x) => s + (x - mean) ** 2, 0) / (n.length - 1);
    }
    case "COUNT": return numeric(flat()).length;
    case "COUNTA": return nonEmpty().length;
    case "COUNTBLANK": {
      const a = args[0];
      if (!a) return 0;
      const vals = a.kind === "range" ? a.values : [String(a.v)];
      return vals.filter((v) => v === "").length;
    }
    case "MIN": { const n = numeric(flat()); return n.length ? Math.min(...n) : 0; }
    case "MAX": { const n = numeric(flat()); return n.length ? Math.max(...n) : 0; }
    case "ROUND": {
      const d = args.length > 1 ? num(scalar(1)) : 0;
      return +num(scalar(0)).toFixed(d);
    }
    case "INT": return Math.floor(num(scalar(0)));
    case "MOD": return num(scalar(0)) % num(scalar(1));
    case "SQRT": return Math.sqrt(Math.abs(num(scalar(0))));
    case "POWER": return Math.pow(num(scalar(0)), num(scalar(1)));
    case "ABS": return Math.abs(num(scalar(0)));
    case "CONCAT":
    case "CONCATENATE": {
      let s = "";
      for (const a of args) {
        if (a.kind === "range") s += a.values.filter((v) => v !== "").join("");
        else s += fmtRaw(a.v);
      }
      return s;
    }
    case "VLOOKUP": {
      const lookup = scalar(0);
      const rng = args[1];
      if (!rng || rng.kind !== "range") throw new FormulaError("#VALUE!");
      const colIdx = Math.round(num(scalar(2)));
      if (colIdx < 1 || colIdx > rng.w) throw new FormulaError("#REF!");
      const lk = typeof lookup === "number" ? lookup : String(lookup).trim().toLowerCase();
      for (let r = 0; r < rng.h; r++) {
        const key = rng.values[r * rng.w];
        const keyN = typeof lookup === "number" ? parseFloat(String(key).replace(/[$,\s]/g, "")) : NaN;
        const match = typeof lookup === "number"
          ? !isNaN(keyN) && keyN === lookup
          : String(key).trim().toLowerCase() === lk;
        if (match) {
          const out = rng.values[r * rng.w + (colIdx - 1)];
          const outN = parseFloat(String(out).replace(/[$,\s]/g, ""));
          return isNaN(outN) || out === "" ? out : outN;
        }
      }
      throw new FormulaError("#N/A");
    }
    case "IF": {
      const cond = scalar(0);
      const yes = args[1]?.kind === "value" ? args[1].v : args[1]?.values[0] ?? "";
      const no = args[2]?.kind === "value" ? args[2].v : args[2]?.values[0] ?? "";
      const truthy = typeof cond === "number" ? cond !== 0 : String(cond).toUpperCase() === "TRUE" || (String(cond) !== "" && String(cond) !== "FALSE");
      return truthy ? yes : no;
    }
    case "AND": return args.every((a) => (a.kind === "value" ? typeof a.v === "number" ? a.v !== 0 : String(a.v).toUpperCase() !== "FALSE" && a.v !== "" : a.values.some((x) => x !== ""))) ? 1 : 0;
    case "OR": return args.some((a) => (a.kind === "value" ? typeof a.v === "number" ? a.v !== 0 : String(a.v).toUpperCase() === "TRUE" : a.values.some((x) => x !== ""))) ? 1 : 0;
    case "NOT": return num(scalar(0)) === 0 ? 1 : 0;
    case "UPPER": return text(0).toUpperCase();
    case "LOWER": return text(0).toLowerCase();
    case "PROPER": return text(0).toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    case "TRIM": return text(0).trim();
    case "LEN": return text(0).length;
    case "LEFT": return text(0).slice(0, args.length > 1 ? Math.round(num(scalar(1))) : 1);
    case "RIGHT": { const n = args.length > 1 ? Math.round(num(scalar(1))) : 1; return text(0).slice(-n || undefined); }
    case "MID": return text(0).slice(Math.round(num(scalar(1))) - 1, Math.round(num(scalar(1))) - 1 + Math.round(num(scalar(2))));
    case "VALUE": return num(scalar(0));
    case "TEXTJOIN": {
      const sep = text(0);
      const parts: string[] = [];
      for (const a of args.slice(2)) {
        if (a.kind === "range") parts.push(...a.values.filter((v) => v !== ""));
        else if (String(a.v) !== "") parts.push(String(a.v));
      }
      return parts.join(sep);
    }
    case "SUMIF":
    case "AVERAGEIF":
    case "COUNTIF": {
      const rangeArg = args[0];
      const critArg = args[1];
      const crit = critArg.kind === "value" ? critArg.v : critArg.values[0] ?? "";
      const sumRange = (name === "SUMIF" || name === "AVERAGEIF") && args[2] ? args[2] : null;
      // delegate to the shared matcher (same operator + wildcard semantics as SUMIFS/MAXIFS)
      const test = (v: string): boolean => matchCrit(v, crit);
      if (name === "COUNTIF") {
        const vals = rangeArg.kind === "range" ? rangeArg.values : [String(rangeArg.v)];
        let c = 0;
        for (const v of vals) if (v !== "" && test(v)) c++;
        return c;
      }
      const vals = rangeArg.kind === "range" ? rangeArg.values : [String(rangeArg.v)];
      const sums = sumRange ? (sumRange.kind === "range" ? sumRange.values : [String(sumRange.v)]) : vals;
      let s = 0;
      let matched = 0;
      vals.forEach((v, i) => {
        if (v !== "" && test(v)) {
          const n = parseFloat(String(sums[i] ?? "").replace(/[$,\s]/g, ""));
          if (!isNaN(n)) { s += n; matched++; }
        }
      });
      return name === "AVERAGEIF" ? (matched ? s / matched : 0) : s;
    }
    case "SUMIFS":
    case "COUNTIFS": {
      const pairs: { vals: string[]; crit: string }[] = [];
      let sumVals: string[] = [];
      if (name === "SUMIFS") {
        const sr = args[0];
        sumVals = sr ? (sr.kind === "range" ? sr.values : [String(sr.v)]) : [];
        for (let i = 1; i + 1 < args.length; i += 2) {
          const r = args[i];
          const c = args[i + 1];
          pairs.push({ vals: r ? (r.kind === "range" ? r.values : [String(r.v)]) : [], crit: c ? (c.kind === "value" ? String(c.v) : String(c.values[0] ?? "")) : "" });
        }
      } else {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const r = args[i];
          const c = args[i + 1];
          pairs.push({ vals: r ? (r.kind === "range" ? r.values : [String(r.v)]) : [], crit: c ? (c.kind === "value" ? String(c.v) : String(c.values[0] ?? "")) : "" });
        }
      }
      const makeTest = (crit: string) => (v: string): boolean => matchCrit(v, crit);
      const n = sumVals.length || pairs[0]?.vals.length || 0;
      let out = 0;
      for (let i = 0; i < n; i++) {
        if (pairs.every((p) => { const v = p.vals[i] ?? ""; return v !== "" && makeTest(p.crit)(v); })) {
          if (name === "COUNTIFS") out++;
          else {
            const x = parseFloat(String(sumVals[i] ?? "").replace(/[$,\s]/g, ""));
            if (!isNaN(x)) out += x;
          }
        }
      }
      return out;
    }
    case "XLOOKUP": {
      const lookup = scalar(0);
      const lr = args[1];
      const rr = args[2];
      if (!lr || lr.kind !== "range" || !rr || rr.kind !== "range") throw new FormulaError("#VALUE!");
      const lk = typeof lookup === "number" ? lookup : String(lookup).trim().toLowerCase();
      for (let i = 0; i < lr.values.length; i++) {
        const key = lr.values[i];
        const keyN = typeof lookup === "number" ? parseFloat(String(key).replace(/[$,\s]/g, "")) : NaN;
        const match = typeof lookup === "number"
          ? !isNaN(keyN) && keyN === lookup
          : String(key).trim().toLowerCase() === lk;
        if (match) {
          const out = rr.values[i] ?? "";
          const outN = parseFloat(String(out).replace(/[$,\s]/g, ""));
          return isNaN(outN) || out === "" ? out : outN;
        }
      }
      if (args.length > 3) return scalar(3);
      throw new FormulaError("#N/A");
    }
    case "INDEX": {
      const rng = args[0];
      if (!rng || rng.kind !== "range") throw new FormulaError("#VALUE!");
      const row = Math.round(num(scalar(1)));
      const col = args.length > 2 ? Math.round(num(scalar(2))) : 1;
      if (row < 1 || row > rng.h || col < 1 || col > rng.w) throw new FormulaError("#REF!");
      const out = rng.values[(row - 1) * rng.w + (col - 1)] ?? "";
      const outN = parseFloat(String(out).replace(/[$,\s]/g, ""));
      return isNaN(outN) || out === "" ? out : outN;
    }
    case "MATCH": {
      const lookup = scalar(0);
      const rng = args[1];
      if (!rng || rng.kind !== "range") throw new FormulaError("#VALUE!");
      const type = args.length > 2 ? num(scalar(2)) : 1;
      const vals = rng.values;
      const lk = typeof lookup === "number" ? lookup : String(lookup).trim().toLowerCase();
      if (type === 0) {
        for (let i = 0; i < vals.length; i++) {
          const key = vals[i];
          const keyN = typeof lookup === "number" ? parseFloat(String(key).replace(/[$,\s]/g, "")) : NaN;
          const match = typeof lookup === "number" ? !isNaN(keyN) && keyN === lookup : String(key).trim().toLowerCase() === lk;
          if (match) return i + 1;
        }
        throw new FormulaError("#N/A");
      }
      if (type === 1) {
        let best = -1;
        for (let i = 0; i < vals.length; i++) {
          const v = parseFloat(String(vals[i]).replace(/[$,\s]/g, ""));
          if (!isNaN(v) && typeof lk === "number" && v <= lk) best = i; else break;
        }
        if (best < 0) throw new FormulaError("#N/A");
        return best + 1;
      }
      let best = -1;
      for (let i = 0; i < vals.length; i++) {
        const v = parseFloat(String(vals[i]).replace(/[$,\s]/g, ""));
        if (!isNaN(v) && typeof lk === "number" && v >= lk) best = i; else break;
      }
      if (best < 0) throw new FormulaError("#N/A");
      return best + 1;
    }
    case "ROUNDUP": { const d = args.length > 1 ? num(scalar(1)) : 0; const p = Math.pow(10, d); return Math.ceil(Math.abs(num(scalar(0))) * p) / p * Math.sign(num(scalar(0)) || 1); }
    case "ROUNDDOWN": { const d = args.length > 1 ? num(scalar(1)) : 0; const p = Math.pow(10, d); return (Math.floor(Math.abs(num(scalar(0))) * p) / p) * Math.sign(num(scalar(0)) || 1); }
    /* ---------- added for the Functions Lab: teachable date/text/array helpers ---------- */
    case "IFS": {
      // IFS(cond1, val1, cond2, val2, ...) — first TRUE wins, else #N/A
      for (let i = 0; i + 1 < args.length; i += 2) if (num(scalar(i)) !== 0) return scalar(i + 1);
      throw new FormulaError("#N/A");
    }
    case "SUMPRODUCT": {
      // SUMPRODUCT(range1, range2, ...) — pairwise products of equal-size ranges
      const ranges = args.map((a) => (a.kind === "range" ? a.values.map((v) => parseFloat(String(v).replace(/[$,\s]/g, "")) || 0) : [num(a.v)]));
      const len = Math.min(...ranges.map((r) => r.length));
      let s = 0;
      for (let i = 0; i < len; i++) s += ranges.reduce((p, r) => p * r[i], 1);
      return s;
    }
    case "HLOOKUP": {
      const lookup = scalar(0);
      const rng = args[1];
      if (!rng || rng.kind !== "range") throw new FormulaError("#VALUE!");
      const rowIdx = Math.round(num(scalar(2)));
      if (rowIdx < 1 || rowIdx > rng.h) throw new FormulaError("#REF!");
      const lk = typeof lookup === "number" ? lookup : String(lookup).trim().toLowerCase();
      for (let c = 0; c < rng.w; c++) {
        const key = rng.values[c];
        const match = typeof lookup === "number" ? parseFloat(String(key).replace(/[$,\s]/g, "")) === lookup : String(key).trim().toLowerCase() === lk;
        if (match) {
          const out = rng.values[(rowIdx - 1) * rng.w + c];
          const outN = parseFloat(String(out).replace(/[$,\s]/g, ""));
          return isNaN(outN) || out === "" ? out : outN;
        }
      }
      throw new FormulaError("#N/A");
    }
    case "LARGE": {
      const n = numeric(flat()).sort((a, b) => b - a);
      const k = Math.round(num(scalar(args.length > 1 ? 1 : 0)));
      if (args.length < 2) return n[0] ?? 0; // LARGE(range) treated as LARGE(range, 1)
      return n[k - 1] ?? (() => { throw new FormulaError("#NUM!"); })();
    }
    case "SMALL": {
      const n = numeric(flat()).sort((a, b) => a - b);
      const k = Math.round(num(scalar(args.length > 1 ? 1 : 0)));
      if (args.length < 2) return n[0] ?? 0;
      return n[k - 1] ?? (() => { throw new FormulaError("#NUM!"); })();
    }
    case "MAXIFS":
    case "MINIFS": {
      // MAXIFS(max_range, crit_range1, crit1, ...)
      const rng = args[0];
      if (!rng || rng.kind !== "range") throw new FormulaError("#VALUE!");
      const pool: number[] = [];
      for (let r = 0; r < rng.h; r++) {
        for (let c = 0; c < rng.w; c++) {
          let ok = true;
          for (let ci = 1; ci + 1 < args.length; ci += 2) {
            const critR = args[ci];
            if (!critR || critR.kind !== "range") { ok = false; break; }
            const cell = critR.values[r * critR.w + c] ?? "";
            if (!matchCrit(cell, scalar(ci + 1))) { ok = false; break; }
          }
          if (ok) {
            const v = parseFloat(String(rng.values[r * rng.w + c]).replace(/[$,\s]/g, ""));
            if (!isNaN(v)) pool.push(v);
          }
        }
      }
      if (!pool.length) return 0;
      return name === "MAXIFS" ? Math.max(...pool) : Math.min(...pool);
    }
    case "RANK": {
      const v = num(scalar(0));
      const n = numeric(flat()).sort((a, b) => b - a);
      const idx = n.findIndex((x) => x === v);
      return idx < 0 ? (() => { throw new FormulaError("#N/A"); })() : idx + 1;
    }
    case "SUBSTITUTE": {
      const s = text(0);
      const oldT = text(1);
      const newT = text(2);
      if (!oldT) return s;
      return s.split(oldT).join(newT);
    }
    case "FIND":
    case "SEARCH": {
      const needle = text(0).toLowerCase();
      const hay = text(1).toLowerCase();
      const start = args.length > 2 ? Math.max(1, Math.round(num(scalar(2)))) : 1;
      const idx = hay.indexOf(needle, start - 1);
      return idx < 0 ? (() => { throw new FormulaError("#VALUE!"); })() : idx + 1;
    }
    case "DATE": {
      const y = Math.round(num(scalar(0)));
      const m = Math.round(num(scalar(1)));
      const d = Math.round(num(scalar(2)));
      return isoOf(new Date(Date.UTC(y, m - 1, d)));
    }
    case "TODAY": return isoOf(new Date());
    case "YEAR": return datePart(scalar(0), "year");
    case "MONTH": return datePart(scalar(0), "month");
    case "DAY": return datePart(scalar(0), "day");
    case "WEEKDAY": {
      const d = parseDateVal(text(0));
      if (!d) throw new FormulaError("#VALUE!");
      return d.getUTCDay() + 1; // 1 = Sunday … 7 = Saturday (Excel default)
    }
    case "WEEKNUM": {
      const d = parseDateVal(text(0));
      if (!d) throw new FormulaError("#VALUE!");
      const start = Date.UTC(d.getUTCFullYear(), 0, 1);
      return Math.floor((d.getTime() - start) / 86400000 / 7) + 1;
    }
    case "EOMONTH": {
      const d = parseDateVal(text(0));
      if (!d) throw new FormulaError("#VALUE!");
      const add = args.length > 1 ? Math.round(num(scalar(1))) : 0;
      return isoOf(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + add + 1, 0)));
    }
    case "TEXT": return excelText(scalar(0), text(1));
    default: throw new FormulaError(`#${name}?`);
  }
}

export { ROWS, colName, colName2, refFor, parseRef, evalSheetFormula, FormulaError };
export type { Val, Arg };
