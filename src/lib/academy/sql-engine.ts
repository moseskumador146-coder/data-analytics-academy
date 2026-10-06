// Mini SQL engine — supports SELECT / aggregates / JOIN / WHERE / GROUP BY / HAVING /
// ORDER BY / LIMIT / DISTINCT over in-memory tables. Zero dependencies, instant.

import type { Row } from "./datasets";

/* ---------- types ---------- */
type Tok =
  | { t: "ident"; v: string; q?: string }
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "op"; v: string }
  | { t: "kw"; v: string };

interface ColRef {
  type: "col";
  table?: string;
  name: string;
}
interface NumLit {
  type: "num";
  v: number;
}
interface StrLit {
  type: "str";
  v: string;
}
interface Star {
  type: "star";
  table?: string;
}
interface Bin {
  type: "bin";
  op: string;
  l: Expr;
  r: Expr;
}
interface Func {
  type: "func";
  name: string;
  args: Expr[];
}
interface Agg {
  type: "agg";
  name: string;
  arg: Expr | Star;
  distinct?: boolean;
}
interface InE {
  type: "in";
  e: Expr;
  list: Expr[];
  not: boolean;
}
interface LikeE {
  type: "like";
  e: Expr;
  pattern: string;
  not: boolean;
}
interface NullE {
  type: "isnull";
  e: Expr;
  not: boolean;
}
interface BetweenE {
  type: "between";
  e: Expr;
  lo: Expr;
  hi: Expr;
  not: boolean;
}
interface CaseE {
  type: "case";
  whens: { cond: Expr; val: Expr }[];
  else: Expr | null;
}
type Expr = ColRef | NumLit | StrLit | Star | Bin | Func | Agg | InE | LikeE | NullE | BetweenE | CaseE;

interface SelectItem {
  expr: Expr;
  alias?: string;
}
interface Join {
  table: string;
  alias?: string;
  on: Expr;
  kind: "inner" | "left";
}
interface Query {
  ctes: { name: string; query: Query }[];
  distinct: boolean;
  items: SelectItem[];
  from: string;
  fromAlias?: string;
  joins: Join[];
  where?: Expr;
  groupBy: Expr[];
  having?: Expr;
  orderBy: { expr: Expr; dir: 1 | -1 }[];
  limit?: number;
}

/* ---------- lexer ---------- */
const KW = new Set([
  "SELECT","FROM","WHERE","GROUP","BY","HAVING","ORDER","LIMIT","JOIN","INNER","LEFT","ON","AS","AND","OR","NOT","IN","LIKE","IS","NULL","BETWEEN","DISTINCT","ASC","DESC","COUNT","SUM","AVG","MIN","MAX","UPPER","LOWER","ROUND","ABS","COALESCE","LENGTH","WITH","SUBSTR","SUBSTRING","TRIM","CAST","CASE","WHEN","THEN","ELSE","END","JULIANDAY","INT","INTEGER","REAL","TEXT","DATE","FLOAT","NUMERIC","VARCHAR",
]);

function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const up = word.toUpperCase();
      if (KW.has(up)) toks.push({ t: "kw", v: up });
      else if (word.includes(".")) {
        const [t, n] = word.split(".");
        toks.push({ t: "ident", v: n, q: t });
      } else toks.push({ t: "ident", v: word });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && src[j + 1] === c) { s += c; j += 2; }
        else s += src[j++];
      }
      toks.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "!=", "<>"].includes(two)) { toks.push({ t: "op", v: two === "<>" ? "!=" : two }); i += 2; continue; }
    if ("=<>+-*/(),;".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`Unexpected character '${c}' at position ${i}`);
  }
  return toks;
}

/* ---------- parser ---------- */
class Parser {
  pos = 0;
  constructor(private toks: Tok[]) {}
  peek(): Tok | undefined { return this.toks[this.pos]; }
  next(): Tok { const t = this.toks[this.pos++]; if (!t) throw new Error("Unexpected end of query"); return t; }
  isKw(v: string): boolean { const t = this.peek(); return !!t && t.t === "kw" && t.v === v; }
  eatKw(v: string): boolean { if (this.isKw(v)) { this.pos++; return true; } return false; }
  expectKw(v: string) { if (!this.eatKw(v)) throw new Error(`Expected ${v}`); }
  isOp(v: string): boolean { const t = this.peek(); return !!t && t.t === "op" && t.v === v; }
  eatOp(v: string): boolean { if (this.isOp(v)) { this.pos++; return true; } return false; }

  parseQuery(strict = true): Query {
    const ctes: { name: string; query: Query }[] = [];
    if (this.eatKw("WITH")) {
      do {
        const nameTok = this.next();
        if (nameTok.t !== "ident") throw new Error("Expected CTE name after WITH");
        this.expectKw("AS");
        if (!this.eatOp("(")) throw new Error("Expected ( after AS in CTE");
        const body = this.parseQuery(false);
        if (!this.eatOp(")")) throw new Error("Expected ) to close CTE body");
        ctes.push({ name: nameTok.v, query: body });
      } while (this.eatOp(","));
    }
    this.expectKw("SELECT");
    const distinct = this.eatKw("DISTINCT");
    const items: SelectItem[] = [];
    do {
      const expr = this.parseExpr();
      let alias: string | undefined;
      if (this.eatKw("AS")) {
        const t = this.next();
        alias = t.t === "ident" || t.t === "str" ? t.v : t.v;
      } else {
        const t = this.peek();
        if (t && t.t === "ident") alias = t.v; // bare alias
        if (alias) this.pos++;
      }
      items.push({ expr, alias });
    } while (this.eatOp(","));

    this.expectKw("FROM");
    const fromT = this.next();
    if (fromT.t !== "ident") throw new Error("Expected table name after FROM");
    const from = fromT.v;
    const fromAlias = this.peek() && this.peek()!.t === "ident" && !this.isKwAny() ? (this.next() as { v: string }).v : undefined;

    const joins: Join[] = [];
    for (;;) {
      let kind: "inner" | "left" | null = null;
      if (this.eatKw("INNER")) { this.expectKw("JOIN"); kind = "inner"; }
      else if (this.eatKw("LEFT")) { this.expectKw("JOIN"); kind = "left"; }
      else if (this.eatKw("JOIN")) kind = "inner";
      if (!kind) break;
      const t = this.next();
      if (t.t !== "ident") throw new Error("Expected table name after JOIN");
      const alias = this.peek() && this.peek()!.t === "ident" && !this.isKwAny() ? (this.next() as { v: string }).v : undefined;
      this.expectKw("ON");
      const on = this.parseExpr();
      joins.push({ table: t.v, alias, on, kind });
    }

    let where: Expr | undefined;
    if (this.eatKw("WHERE")) where = this.parseExpr();

    const groupBy: Expr[] = [];
    if (this.eatKw("GROUP")) {
      this.expectKw("BY");
      do { groupBy.push(this.parseExpr()); } while (this.eatOp(","));
    }
    let having: Expr | undefined;
    if (this.eatKw("HAVING")) having = this.parseExpr();

    const orderBy: { expr: Expr; dir: 1 | -1 }[] = [];
    if (this.eatKw("ORDER")) {
      this.expectKw("BY");
      do {
        const e = this.parseExpr();
        let dir: 1 | -1 = 1;
        if (this.eatKw("DESC")) dir = -1;
        else this.eatKw("ASC");
        orderBy.push({ expr: e, dir });
      } while (this.eatOp(","));
    }
    let limit: number | undefined;
    if (this.eatKw("LIMIT")) {
      const t = this.next();
      if (t.t !== "num") throw new Error("LIMIT expects a number");
      limit = t.v;
    }
    this.eatOp(";");
    if (strict && this.pos < this.toks.length) throw new Error(`Unexpected token after end of query`);
    return { ctes, distinct, items, from, fromAlias, joins, where, groupBy, having, orderBy, limit };
  }

  isKwAny(): boolean { const t = this.peek(); return !!t && t.t === "kw"; }

  parseExpr(): Expr { return this.parseOr(); }
  parseOr(): Expr {
    let l = this.parseAnd();
    while (this.eatKw("OR")) l = { type: "bin", op: "OR", l, r: this.parseAnd() };
    return l;
  }
  parseAnd(): Expr {
    let l = this.parseNot();
    while (this.eatKw("AND")) l = { type: "bin", op: "AND", l, r: this.parseNot() };
    return l;
  }
  parseNot(): Expr {
    if (this.eatKw("NOT")) {
      const e = this.parseNot();
      if (e.type === "in") return { ...e, not: !e.not };
      if (e.type === "like") return { ...e, not: !e.not };
      if (e.type === "isnull") return { ...e, not: !e.not };
      if (e.type === "between") return { ...e, not: !e.not };
      throw new Error("NOT only supported before IN/LIKE/IS NULL/BETWEEN");
    }
    return this.parseCmp();
  }
  parseCmp(): Expr {
    const l = this.parseAdd();
    const t = this.peek();
    if (t && t.t === "op" && ["=", "!=", ">", "<", ">=", "<="].includes(t.v)) {
      this.pos++;
      return { type: "bin", op: t.v, l, r: this.parseAdd() };
    }
    if (this.isKw("IN")) {
      this.pos++;
      if (!this.eatOp("(")) throw new Error("Expected ( after IN");
      const list: Expr[] = [];
      do { list.push(this.parseExpr()); } while (this.eatOp(","));
      if (!this.eatOp(")")) throw new Error("Expected ) after IN list");
      return { type: "in", e: l, list, not: false };
    }
    if (this.isKw("LIKE")) {
      this.pos++;
      const p = this.next();
      if (p.t !== "str") throw new Error("LIKE expects a string pattern");
      return { type: "like", e: l, pattern: p.v, not: false };
    }
    if (this.isKw("IS")) {
      this.pos++;
      const not = this.eatKw("NOT");
      this.expectKw("NULL");
      return { type: "isnull", e: l, not };
    }
    if (this.isKw("BETWEEN")) {
      this.pos++;
      const lo = this.parseAdd();
      this.expectKw("AND");
      const hi = this.parseAdd();
      return { type: "between", e: l, lo, hi, not: false };
    }
    return l;
  }
  parseAdd(): Expr {
    let l = this.parseMul();
    for (;;) {
      if (this.isOp("+") || this.isOp("-")) {
        const op = (this.next() as { v: string }).v;
        l = { type: "bin", op, l, r: this.parseMul() };
      } else return l;
    }
  }
  parseMul(): Expr {
    let l = this.parseUnary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = (this.next() as { v: string }).v;
        l = { type: "bin", op, l, r: this.parseUnary() };
      } else return l;
    }
  }
  parseUnary(): Expr {
    if (this.isOp("-")) { this.pos++; return { type: "bin", op: "*", l: { type: "num", v: -1 }, r: this.parseUnary() }; }
    return this.parsePrimary();
  }
  parsePrimary(): Expr {
    const t = this.next();
    if (t.t === "num") return { type: "num", v: t.v };
    if (t.t === "str") return { type: "str", v: t.v };
    if (t.t === "op" && t.v === "*") return { type: "star" };
    if (t.t === "kw") {
      if (["COUNT","SUM","AVG","MIN","MAX"].includes(t.v)) {
        if (!this.eatOp("(")) throw new Error(`Expected ( after ${t.v}`);
        const distinct = this.eatKw("DISTINCT");
        if (this.isOp("*")) { this.pos++; if (!this.eatOp(")")) throw new Error("Expected )"); return { type: "agg", name: t.v, arg: { type: "star" }, distinct: false }; }
        const arg = this.parseExpr();
        if (!this.eatOp(")")) throw new Error("Expected )");
        return { type: "agg", name: t.v, arg, distinct };
      }
      if (["UPPER","LOWER","ROUND","ABS","COALESCE","LENGTH","SUBSTR","SUBSTRING","TRIM"].includes(t.v)) {
        if (!this.eatOp("(")) throw new Error(`Expected ( after ${t.v}`);
        const args: Expr[] = [];
        do { args.push(this.parseExpr()); } while (this.eatOp(","));
        if (!this.eatOp(")")) throw new Error("Expected )");
        return { type: "func", name: t.v, args };
      }
      if (t.v === "CAST") {
        if (!this.eatOp("(")) throw new Error("Expected ( after CAST");
        const e = this.parseExpr();
        this.expectKw("AS");
        const typeTok = this.next();
        if (this.isOp("(")) { while (!this.isOp(")") && this.pos < this.toks.length) this.pos++; this.pos++; }
        if (!this.eatOp(")")) throw new Error("Expected ) after CAST type");
        return { type: "func", name: `CAST_${typeTok.v.toUpperCase()}`, args: [e] };
      }
      if (t.v === "CASE") {
        const whens: { cond: Expr; val: Expr }[] = [];
        let elseVal: Expr | null = null;
        while (this.eatKw("WHEN")) {
          const cond = this.parseExpr();
          this.expectKw("THEN");
          whens.push({ cond, val: this.parseExpr() });
        }
        if (!whens.length) throw new Error("CASE requires at least one WHEN");
        if (this.eatKw("ELSE")) elseVal = this.parseExpr();
        this.expectKw("END");
        return { type: "case", whens, else: elseVal };
      }
      if (t.v === "JULIANDAY") {
        if (!this.eatOp("(")) throw new Error("Expected ( after JULIANDAY");
        const arg = this.parseExpr();
        if (!this.eatOp(")")) throw new Error("Expected )");
        return { type: "func", name: "JULIANDAY", args: [arg] };
      }
      if (t.v === "NULL") return { type: "str", v: "" };
      throw new Error(`Unexpected keyword ${t.v}`);
    }
    if (t.t === "op" && t.v === "(") {
      const e = this.parseExpr();
      if (!this.eatOp(")")) throw new Error("Expected )");
      return e;
    }
    if (t.t === "ident") {
      // generic function call: any ident followed by ( — e.g. substr(x, 1, 7)
      if (this.isOp("(")) {
        this.pos++;
        const args: Expr[] = [];
        if (this.isOp(")")) this.pos++;
        else {
          do { args.push(this.parseExpr()); } while (this.eatOp(","));
          if (!this.eatOp(")")) throw new Error("Expected )");
        }
        return { type: "func", name: t.v.toUpperCase(), args };
      }
      return { type: "col", name: t.v, table: t.q };
    }
    throw new Error(`Unexpected token`);
  }
}

/* ---------- evaluation ---------- */
type Env = {
  get(table: string | undefined, name: string): { found: boolean; value: CellVal };
};
type CellVal = string | number | null;
function num(v: CellVal): number {
  if (v === null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
}
function truthy(v: CellVal): boolean {
  if (v === null) return false;
  if (typeof v === "number") return v !== 0;
  return v !== "" && v !== "false";
}
function likeMatch(val: CellVal, pattern: string): boolean {
  const s = String(val ?? "").toLowerCase();
  const p = pattern.toLowerCase();
  const rx = new RegExp("^" + p.split("%").map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  return rx.test(s);
}

function evalExpr(e: Expr, env: Env, group?: Row[]): CellVal {
  switch (e.type) {
    case "num": return e.v;
    case "str": return e.v;
    case "star": return 1;
    case "col": {
      const { found, value } = env.get(e.table, e.name);
      return found ? value : null;
    }
    case "bin": {
      if (e.op === "AND") return truthy(evalExpr(e.l, env, group)) && truthy(evalExpr(e.r, env, group)) ? 1 : 0;
      if (e.op === "OR") return truthy(evalExpr(e.l, env, group)) || truthy(evalExpr(e.r, env, group)) ? 1 : 0;
      const l = evalExpr(e.l, env, group);
      const r = evalExpr(e.r, env, group);
      switch (e.op) {
        case "+": return num(l) + num(r);
        case "-": return num(l) - num(r);
        case "*": return num(l) * num(r);
        case "/": return num(r) === 0 ? null : num(l) / num(r);
        case "=": return l === r ? 1 : 0;
        case "!=": return l !== r ? 1 : 0;
        case ">": return num(l) > num(r) ? 1 : 0;
        case "<": return num(l) < num(r) ? 1 : 0;
        case ">=": return num(l) >= num(r) ? 1 : 0;
        case "<=": return num(l) <= num(r) ? 1 : 0;
        default: throw new Error(`Unknown operator ${e.op}`);
      }
    }
    case "func": {
      const a = e.args.map((x) => evalExpr(x, env, group));
      switch (e.name) {
        case "UPPER": return String(a[0] ?? "").toUpperCase();
        case "LOWER": return String(a[0] ?? "").toLowerCase();
        case "ABS": return Math.abs(num(a[0]));
        case "ROUND": return +num(a[0]).toFixed(a[1] !== undefined ? num(a[1]) : 0);
        case "LENGTH": return String(a[0] ?? "").length;
        case "COALESCE": return a.find((x) => x !== null && x !== "") ?? null;
        case "SUBSTR":
        case "SUBSTRING": {
          const s = String(a[0] ?? "");
          const start = num(a[1]);
          const len = a[2] !== undefined ? num(a[2]) : undefined;
          const from = start > 0 ? start - 1 : Math.max(0, s.length + start);
          return len !== undefined ? s.slice(from, from + len) : s.slice(from);
        }
        case "TRIM": return String(a[0] ?? "").trim();
        case "JULIANDAY": {
          const s = String(a[0] ?? "");
          const ms = Date.parse(s.length === 10 ? `${s}T00:00:00Z` : s);
          return isNaN(ms) ? null : Math.round(ms / 86400000);
        }
        case "CAST_INT":
        case "CAST_INTEGER": {
          const n = parseInt(String(a[0] ?? ""), 10);
          return isNaN(n) ? null : n;
        }
        case "CAST_REAL":
        case "CAST_FLOAT":
        case "CAST_NUMERIC": {
          const n = parseFloat(String(a[0] ?? "").replace(/[,$]/g, ""));
          return isNaN(n) ? null : n;
        }
        case "CAST_TEXT":
        case "CAST_VARCHAR": return a[0] === null ? null : String(a[0]);
        case "CAST_DATE": return a[0];
        case "CAST": return a[0];
        default: throw new Error(`Unknown function ${e.name}`);
      }
    }
    case "agg": {
      if (!group) throw new Error(`${e.name}() used outside GROUP BY context`);
      const vals: CellVal[] = [];
      for (const row of group) {
        if (e.arg.type === "star") { vals.push(1); continue; }
        const v = evalExpr(e.arg, env, undefined);
        if (v !== null && v !== "") vals.push(v);
      }
      switch (e.name) {
        case "COUNT": {
          if (e.arg.type === "star") return group.length;
          return e.distinct ? new Set(vals).size : vals.length;
        }
        case "SUM": return vals.reduce((s, v) => s + num(v), 0);
        case "AVG": return vals.length ? vals.reduce((s, v) => s + num(v), 0) / vals.length : null;
        case "MIN": return vals.length ? vals.reduce((m, v) => (num(v) < num(m) ? v : m)) : null;
        case "MAX": return vals.length ? vals.reduce((m, v) => (num(v) > num(m) ? v : m)) : null;
        default: throw new Error(`Unknown aggregate ${e.name}`);
      }
    }
    case "case": {
      for (const w of e.whens) {
        if (truthy(evalExpr(w.cond, env, group))) return evalExpr(w.val, env, group);
      }
      return e.else ? evalExpr(e.else, env, group) : null;
    }
    case "in": {
      const v = evalExpr(e.e, env, group);
      const hit = e.list.some((x) => evalExpr(x, env, group) === v);
      return (e.not ? !hit : hit) ? 1 : 0;
    }
    case "like": {
      const v = evalExpr(e.e, env, group);
      const hit = likeMatch(v, e.pattern);
      return (e.not ? !hit : hit) ? 1 : 0;
    }
    case "isnull": {
      const v = evalExpr(e.e, env, group);
      const isN = v === null || v === "";
      return (e.not ? !isN : isN) ? 1 : 0;
    }
    case "between": {
      const v = num(evalExpr(e.e, env, group));
      const lo = num(evalExpr(e.lo, env, group));
      const hi = num(evalExpr(e.hi, env, group));
      const hit = v >= lo && v <= hi;
      return (e.not ? !hit : hit) ? 1 : 0;
    }
  }
}

/* ---------- executor ---------- */
export interface SqlResult {
  columns: string[];
  rows: CellVal[][];
  ms: number;
}

function makeEnv(rows: { tables: string[]; row: Row }[]): Env {
  return {
    get(table, name) {
      const nl = name.toLowerCase();
      for (const r of rows) {
        if (table && !r.tables.includes(table)) continue;
        for (const k of Object.keys(r.row)) {
          if (k.toLowerCase() === nl) return { found: true, value: r.row[k] as CellVal };
        }
      }
      return { found: false, value: null };
    },
  };
}

function labelOf(e: Expr, alias?: string): string {
  if (alias) return alias;
  if (e.type === "col") return e.name;
  if (e.type === "agg") {
    const inner = e.arg.type === "star" ? "*" : (e.arg as ColRef).name ?? "expr";
    return `${e.name}(${inner})`;
  }
  if (e.type === "func") return `${e.name.toLowerCase()}(...)`;
  if (e.type === "bin") return "expr";
  if (e.type === "num") return String(e.v);
  if (e.type === "str") return e.v;
  return "expr";
}

export function runSql(sql: string, tables: Record<string, { rows: Row[] }>): SqlResult {
  const t0 = performance.now();
  const q = new Parser(lex(sql)).parseQuery();

  // Materialize CTEs in order — each can reference previous ones.
  const scope: Record<string, { rows: Row[] }> = { ...tables };
  for (const cte of q.ctes) {
    const res = execQuery(cte.query, scope);
    scope[cte.name] = {
      rows: res.rows.map((vals) =>
        Object.fromEntries(res.columns.map((c, i) => [c, vals[i]])) as Row
      ),
    };
  }
  const result = execQuery(q, scope);
  return { ...result, ms: +(performance.now() - t0).toFixed(1) };
}

function execQuery(q: Query, tables: Record<string, { rows: Row[] }>): SqlResult {
  const fromTable = tables[q.from];
  if (!fromTable) throw new Error(`Table '${q.from}' does not exist`);

  type Tagged = { tables: string[]; row: Row };
  let working: Tagged[][] = fromTable.rows.map((row) => [
    { tables: [q.from, q.fromAlias].filter(Boolean) as string[], row },
  ]);

  for (const j of q.joins) {
    const jt = tables[j.table];
    if (!jt) throw new Error(`Table '${j.table}' does not exist`);
    const out: Tagged[][] = [];
    for (const left of working) {
      let matched = false;
      for (const r of jt.rows) {
        const combined = [...left, { tables: [j.table, j.alias].filter(Boolean) as string[], row: r }];
        const env = makeEnv(combined);
        if (truthy(evalExpr(j.on, env))) {
          out.push(combined);
          matched = true;
        }
      }
      if (!matched && j.kind === "left") out.push([...left, { tables: [j.table, j.alias].filter(Boolean) as string[], row: {} }]);
    }
    working = out;
  }

  if (q.where) {
    working = working.filter((combo) => truthy(evalExpr(q.where!, makeEnv(combo))));
  }

  const hasAgg = (e: Expr): boolean => {
    switch (e.type) {
      case "agg": return true;
      case "bin": return hasAgg(e.l) || hasAgg(e.r);
      case "func": return e.args.some(hasAgg);
      case "in": return hasAgg(e.e) || e.list.some(hasAgg);
      case "like": return hasAgg(e.e);
      case "isnull": return hasAgg(e.e);
      case "between": return hasAgg(e.e) || hasAgg(e.lo) || hasAgg(e.hi);
      default: return false;
    }
  };
  const grouped = q.groupBy.length > 0 || q.items.some((it) => hasAgg(it.expr)) || (q.having && hasAgg(q.having));

  // Expand bare SELECT * into all columns of the source
  if (q.items.length === 1 && q.items[0].expr.type === "star") {
    const colSet: string[] = [];
    for (const combo of working.slice(0, 1))
      for (const t of combo)
        for (const k of Object.keys(t.row))
          if (!colSet.some((c) => c.toLowerCase() === k.toLowerCase())) colSet.push(k);
    if (colSet.length)
      q.items = colSet.map((k) => ({ expr: { type: "col", name: k } as Expr }));
  }

  interface OutRow { vals: CellVal[]; labels: string[]; src: Tagged[] }
  let outRows: OutRow[] = [];

  if (grouped) {
    // A bucket = one group = a list of combos (Tagged[]), so the map value is Tagged[][].
    const buckets = new Map<string, Tagged[][]>();
    if (q.groupBy.length === 0) {
      buckets.set("*", working);
    } else {
      for (const combo of working) {
        const env = makeEnv(combo);
        const key = q.groupBy.map((g) => String(evalExpr(g, env))).join("\u0001");
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(combo);
      }
    }
    for (const [, combos] of buckets) {
      const group: Tagged[] = combos.flat();
      if (q.having) {
        if (!truthy(evalExpr(q.having, makeEnv(group), group))) continue;
      }
      const env = makeEnv(group);
      const vals = q.items.map((it) => evalExpr(it.expr, env, group));
      const labels = q.items.map((it) => labelOf(it.expr, it.alias));
      outRows.push({ vals, labels, src: group });
    }
  } else {
    for (const combo of working) {
      const env = makeEnv(combo);
      const vals = q.items.map((it) => evalExpr(it.expr, env));
      const labels = q.items.map((it) => labelOf(it.expr, it.alias));
      outRows.push({ vals, labels, src: combo });
    }
  }

  if (q.distinct) {
    const seen = new Set<string>();
    outRows = outRows.filter((r) => {
      const k = r.vals.map((v) => String(v)).join("\u0001");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  let columns = outRows[0]?.labels ?? q.items.map((it) => labelOf(it.expr, it.alias));
  // de-dup column names
  const seenCols = new Map<string, number>();
  columns = columns.map((c) => {
    const n = seenCols.get(c) ?? 0;
    seenCols.set(c, n + 1);
    return n === 0 ? c : `${c}_${n + 1}`;
  });

  if (q.orderBy.length) {
    const aliasIdx = (name: string) => columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
    outRows.sort((a, b) => {
      for (const ob of q.orderBy) {
        let va: CellVal, vb: CellVal;
        if (ob.expr.type === "col") {
          const idx = aliasIdx(ob.expr.name);
          if (idx >= 0) { va = a.vals[idx]; vb = b.vals[idx]; }
          else {
            va = evalExpr(ob.expr, makeEnv(a.src));
            vb = evalExpr(ob.expr, makeEnv(b.src));
          }
        } else {
          va = evalExpr(ob.expr, makeEnv(a.src), grouped ? a.src : undefined);
          vb = evalExpr(ob.expr, makeEnv(b.src), grouped ? b.src : undefined);
        }
        const na = typeof va === "number" || va === null ? num(va) : NaN;
        const nb = typeof vb === "number" || vb === null ? num(vb) : NaN;
        let cmp: number;
        if (!isNaN(na) && !isNaN(nb)) cmp = na - nb;
        else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
        if (cmp !== 0) return cmp * ob.dir;
      }
      return 0;
    });
  }

  if (q.limit !== undefined) outRows = outRows.slice(0, q.limit);

  return {
    columns,
    rows: outRows.map((r) => r.vals.map((v) => (v === undefined ? null : v))),
    ms: 0,
  }
}
