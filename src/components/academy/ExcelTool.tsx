"use client";

/* Excel Studio — spreadsheet with a real formula engine, CSV import/export,
   sort/dedupe/text ops/fill-down, stats panel, saved sheets and a live Coach.
   All client-side, instant. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolHeader, PANEL, PANEL_HEAD, fmtNum, DatasetPicker, downloadDatasetCSV } from "./shared";
import { Coach } from "./Coach";
import { useAcademy } from "@/lib/academy/store";
import { getDatasetById, downloadFile, type Row } from "@/lib/academy/datasets";
import Papa from "papaparse";
import {
  ArrowDownToLine, Download, Eraser, FileSpreadsheet, Plus, Save, Sigma, Trash2, Upload, Wand2,
} from "lucide-react";

/* ================= formula engine ================= */
const COLS = 26;
const ROWS = 200;
const colName = (i: number) => String.fromCharCode(65 + i);
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
    /* full-column refs: F:F · $F:$F  →  whole column range */
    const colRange = /^\$?([A-Za-z])\$?\s*:\s*\$?([A-Za-z])\$?(?!\d)/.exec(src.slice(pos));
    if (colRange) {
      const c1 = colRange[1].toUpperCase().charCodeAt(0) - 65;
      const c2 = colRange[2].toUpperCase().charCodeAt(0) - 65;
      pos += colRange[0].length;
      if (c1 >= COLS || c2 >= COLS) throw new FormulaError("#REF!");
      return rangeBox(refFor(Math.min(c1, c2), 0), refFor(Math.max(c1, c2), ROWS - 1), cells, stack);
    }
    /* full-row refs: 2:4 → whole-row range */
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
      return { kind: "value", v: cellValue(ref, cells, stack) };
    }
    if (/^TRUE$/i.test(src.slice(pos, pos + 4))) { pos += 4; return 1; }
    if (/^FALSE$/i.test(src.slice(pos, pos + 5))) { pos += 5; return 0; }
    throw new FormulaError("#NAME?");
  }

  function parseArg(): Arg {
    ws();
    /* full-column / full-row refs */
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

  /* IFERROR / IFNA need lazy evaluation: the fallback must only be parsed when
     the main argument actually throws. Implemented at the parser level. */
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
        try { parseArg(); } catch { /* fallback errored — main value still wins */ skipToCommaOrClose(); }
      }
      ws();
      if (src[pos] === ")") pos++;
      return argValue(main);
    }
    ws();
    if (src[pos] !== ",") throw failed; // no fallback → surface the error
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
  const n = parseFloat(raw);
  return isNaN(n) || !/^-?[\d.,$%eE+-]+$/.test(raw) || /[\d]([.,]\d+)*[.,]\D/.test(raw) ? raw : n;
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
      const sumRange = name === "SUMIF" && args[2] ? args[2] : null;
      const test = (v: string): boolean => {
        const cs = String(crit);
        const m = /^(>=|<=|>|<|=|<>)(.*)$/.exec(cs);
        if (m) {
          const target = parseFloat(m[2].replace(/[$,\s]/g, ""));
          const value = parseFloat(String(v).replace(/[$,\s]/g, ""));
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
          return m[1] === "=" ? String(v) === m[2] : false;
        }
        return String(v).trim().toLowerCase() === cs.trim().toLowerCase();
      };
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
      // SUMIFS(sum_range, crit_range1, crit1, ...) · COUNTIFS(crit_range1, crit1, ...)
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
      const makeTest = (crit: string) => (v: string): boolean => {
        const m = /^(>=|<=|>|<|=|<>)(.*)$/.exec(crit);
        if (m) {
          const target = parseFloat(m[2].replace(/[$,\s]/g, ""));
          const value = parseFloat(String(v).replace(/[$,\s]/g, ""));
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
          return m[1] === "=" ? String(v) === m[2] : false;
        }
        return String(v).trim().toLowerCase() === crit.trim().toLowerCase();
      };
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
      // XLOOKUP(lookup, lookup_range, return_range, [if_not_found])
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
    default: throw new FormulaError(`#${name}?`);
  }
}

function displayValue(ref: string, cells: Record<string, string>): string {
  const raw = cells[ref];
  if (raw === undefined || raw === "") return "";
  if (!raw.startsWith("=")) return raw;
  try {
    const v = evalSheetFormula(raw.slice(1), cells, new Set([ref]));
    if (typeof v === "number") {
      if (Number.isInteger(v)) return v.toLocaleString("en-US");
      return parseFloat(v.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 });
    }
    return v;
  } catch (e) {
    return e instanceof FormulaError ? e.message : "#ERROR!";
  }
}

function usedRange(cells: Record<string, string>): { rows: number; cols: number } {
  let maxR = 0, maxC = 0;
  for (const ref of Object.keys(cells)) {
    if (!cells[ref]) continue;
    const p = parseRef(ref);
    if (p) { maxR = Math.max(maxR, p[1]); maxC = Math.max(maxC, p[0]); }
  }
  return { rows: Math.min(maxR + 1, ROWS), cols: Math.min(maxC + 1, COLS) };
}

/* ================= component ================= */
const EXCEL_MISSION = [
  { id: "load", label: "Load a sample file", detail: "Use the **data picker** to load *Retail Sales 2025 (Clean)* — or the 8,000-row *Bank Transactions* for a big-file workout. Or import your own CSV from the Data tab." },
  { id: "formula", label: "Write your first formula", detail: "Open the **Formulas** ribbon tab and click **SUM** — it drops ~ =SUM(K2:K50) ~ into the active cell. Every formula starts with **=**." },
  { id: "stats", label: "Profile a column", detail: "Click a **column header** (like I) — the stats panel shows sum, mean, median and spread, and the **status bar** underneath tracks Count / Sum / Average live." },
  { id: "logic", label: "Use conditional logic", detail: "From the Formulas tab try ~ =SUMIF(D:D,\"North\",I:I) ~, ~ =COUNTIF(I:I,\">500\") ~ or ~ =IF(I2>1000,\"Big\",\"Small\") ~." },
  { id: "lookup", label: "Look up a value", detail: "VLOOKUP is the classic, XLOOKUP is the modern one: ~ =XLOOKUP(\"Office Chair\",F:F,I:I,\"nf\") ~ finds the product's revenue." },
  { id: "clean", label: "Clean the sheet", detail: "From the **Home** tab: sort A→Z, remove duplicate rows, fix text case with Trim / Upper / Lower / Title." },
  { id: "ship", label: "Save & export", detail: "Name the sheet and save it as a **sheet tab** (bottom of the grid), then **Export CSV** from the Data tab for your portfolio." },
];

export function ExcelTool() {
  const { sheets, saveSheet, deleteSheet } = useAcademy();
  const [cells, setCells] = React.useState<Record<string, string>>({});
  const [active, setActive] = React.useState("A1");
  const [editVal, setEditVal] = React.useState<string | null>(null);
  const [sheetName, setSheetName] = React.useState("");
  const [selectedCol, setSelectedCol] = React.useState(0);
  const [loadedInfo, setLoadedInfo] = React.useState<string | null>(null);
  const [ribbonTab, setRibbonTab] = React.useState<"home" | "formulas" | "data">("home");
  const gridRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);

  const { rows: usedR, cols: usedC } = usedRange(cells);
  const viewRows = Math.max(usedR + 8, 25);
  const viewCols = Math.max(usedC + 3, 10);

  const commit = () => {
    if (editVal === null) return;
    setCells((c) => {
      const next = { ...c };
      if (editVal === "") delete next[active];
      else next[active] = editVal;
      return next;
    });
    setEditVal(null);
  };

  const startEdit = (initial?: string) => {
    setEditVal(initial ?? cells[active] ?? "");
  };

  const onKey = (e: React.KeyboardEvent) => {
    const [c, r] = parseRef(active)!;
    if (editVal !== null) {
      if (e.key === "Enter") { e.preventDefault(); commit(); setActive(refFor(c, Math.min(r + 1, ROWS - 1))); }
      if (e.key === "Escape") setEditVal(null);
      if (e.key === "Tab") { e.preventDefault(); commit(); setActive(refFor(Math.min(c + 1, COLS - 1), r)); }
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); startEdit(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(refFor(c, Math.min(r + 1, ROWS - 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(refFor(c, Math.max(r - 1, 0))); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setActive(refFor(Math.min(c + 1, COLS - 1), r)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setActive(refFor(Math.max(c - 1, 0), r)); }
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      setCells((cc) => { const n = { ...cc }; delete n[active]; return n; });
    } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      fillDown();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      startEdit(e.key);
      e.preventDefault();
    }
  };

  const loadDataset = (id: string) => {
    const ds = getDatasetById(id);
    if (!ds) return;
    const next: Record<string, string> = {};
    ds.columns.slice(0, COLS).forEach((col, ci) => { next[refFor(ci, 0)] = col.name; });
    ds.rows.slice(0, ROWS - 1).forEach((row: Row, ri) => {
      ds.columns.slice(0, COLS).forEach((col, ci) => {
        const v = row[col.key];
        if (v !== undefined && v !== "") next[refFor(ci, ri + 1)] = String(v);
      });
    });
    setCells(next);
    setActive("A1");
    setSelectedCol(0);
    setLoadedInfo(
      ds.rows.length > ROWS - 1
        ? `${ds.name}: showing the first ${ROWS - 1} of ${ds.rows.length.toLocaleString()} rows (grid limit). Use the Cleaner or download the CSV for the full file.`
        : `${ds.name}: ${ds.rows.length.toLocaleString()} rows loaded.`
    );
  };

  const importCSV = (file: File) => {
    Papa.parse<Row>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (res) => {
        const next: Record<string, string> = {};
        res.data.slice(0, ROWS).forEach((row, ri) => {
          (row as unknown as string[]).slice(0, COLS).forEach((v, ci) => {
            if (v !== "") next[refFor(ci, ri)] = String(v);
          });
        });
        setCells(next);
        setActive("A1");
        setLoadedInfo(`Imported ${file.name}: ${Math.min(res.data.length, ROWS)} rows.`);
      },
    });
  };

  const exportCSV = () => {
    const { rows: R, cols: C } = usedRange(cells);
    const lines: string[] = [];
    for (let r = 0; r < R; r++) {
      const vals: string[] = [];
      for (let c = 0; c < C; c++) {
        const v = displayValue(refFor(c, r), cells);
        vals.push(/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
      }
      lines.push(vals.join(","));
    }
    downloadFile("spreadsheet_export.csv", lines.join("\n"), "text/csv");
  };

  const sortRows = (colIdx: number, dir: 1 | -1) => {
    const { rows: R, cols: C } = usedRange(cells);
    if (R < 2) return;
    const dataRows: string[][] = [];
    for (let r = 1; r < R; r++) {
      const row: string[] = [];
      for (let c = 0; c < C; c++) row.push(cells[refFor(c, r)] ?? "");
      dataRows.push(row);
    }
    dataRows.sort((a, b) => {
      const av = a[colIdx] ?? "", bv = b[colIdx] ?? "";
      const an = parseFloat(av.replace(/[$,\s]/g, "")), bn = parseFloat(bv.replace(/[$,\s]/g, ""));
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
      return av.localeCompare(bv) * dir;
    });
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) {
      const h = cells[refFor(c, 0)];
      if (h) next[refFor(c, 0)] = h;
    }
    dataRows.forEach((row, ri) => {
      row.forEach((v, ci) => { if (v !== "") next[refFor(ci, ri + 1)] = v; });
    });
    setCells(next);
  };

  const dedupeRows = () => {
    const { rows: R, cols: C } = usedRange(cells);
    const seen = new Set<string>();
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) { const h = cells[refFor(c, 0)]; if (h) next[refFor(c, 0)] = h; }
    let kept = 0, removed = 0;
    for (let r = 1; r < R; r++) {
      const key = Array.from({ length: C }, (_, c) => displayValue(refFor(c, r), cells)).join("\u0001");
      if (key.replace(/[\u0001]+$/g, "") === "") continue;
      if (seen.has(key)) { removed++; continue; }
      seen.add(key);
      for (let c = 0; c < C; c++) { const v = cells[refFor(c, r)]; if (v) next[refFor(c, kept + 1)] = v; }
      kept++;
    }
    setCells(next);
    if (removed > 0) gridRef.current?.focus();
  };

  const fillDown = () => {
    const [c, r] = parseRef(active)!;
    const src = cells[active] ?? "";
    if (!src || r < 1) return;
    const next = { ...cells };
    for (let rr = r + 1; rr < usedR; rr++) next[refFor(c, rr)] = src;
    setCells(next);
  };

  const colStats = React.useMemo(() => {
    const stats: { n: number; sum: number; mean: number; median: number; std: number; min: number; max: number } | null = (() => {
      const vals: number[] = [];
      for (let r = 0; r < usedR; r++) {
        const raw = displayValue(refFor(selectedCol, r), cells);
        const v = parseFloat(raw.replace(/[$,\s]/g, ""));
        if (!isNaN(v) && raw !== "") vals.push(v);
      }
      if (vals.length < 1) return null;
      const sorted = [...vals].sort((a, b) => a - b);
      const sum = vals.reduce((s, x) => s + x, 0);
      const mean = sum / vals.length;
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const std = sorted.length > 1 ? Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (vals.length - 1)) : 0;
      return { n: vals.length, sum, mean, median, std, min: sorted[0], max: sorted[sorted.length - 1] };
    })();
    return stats;
  }, [cells, selectedCol, usedR]);

  const transformCol = (mode: "trim" | "upper" | "lower" | "title") => {
    const next = { ...cells };
    for (let r = 0; r < usedR; r++) {
      const ref = refFor(selectedCol, r);
      const v = next[ref];
      if (v === undefined || v.startsWith("=")) continue;
      if (mode === "trim") next[ref] = v.trim();
      if (mode === "upper") next[ref] = v.toUpperCase();
      if (mode === "lower") next[ref] = v.toLowerCase();
      if (mode === "title") next[ref] = v.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
    setCells(next);
  };

  const activeRaw = cells[active] ?? "";
  const formulaCount = Object.values(cells).filter((v) => v.startsWith("=")).length;

  /* status bar: Excel-standard selection summary for the active column */
  const statusBar = React.useMemo(() => {
    let count = 0, numCount = 0, sum = 0;
    for (let r = 0; r < usedR; r++) {
      const raw = displayValue(refFor(selectedCol, r), cells);
      if (raw === "") continue;
      count++;
      const v = parseFloat(raw.replace(/[$,\s]/g, ""));
      if (!isNaN(v)) { numCount++; sum += v; }
    }
    return { count, numCount, sum, avg: numCount ? sum / numCount : 0 };
  }, [cells, selectedCol, usedR]);

  const insertFormula = (tpl: string) => {
    setEditVal(tpl);
  };

  const FORMULA_BUTTONS: { label: string; tpl: string; hint: string }[] = [
    { label: "SUM", tpl: "=SUM(K2:K50)", hint: "Add a range of numbers" },
    { label: "AVERAGE", tpl: "=AVERAGE(K2:K50)", hint: "Arithmetic mean" },
    { label: "COUNT", tpl: "=COUNT(K2:K50)", hint: "Count numeric cells" },
    { label: "COUNTA", tpl: "=COUNTA(A2:A50)", hint: "Count non-empty cells" },
    { label: "IF", tpl: '=IF(J2>1000,"Big","Small")', hint: "Conditional logic" },
    { label: "IFERROR", tpl: '=IFERROR(J2/K2,"n/a")', hint: "Trap errors with a fallback" },
    { label: "SUMIF", tpl: '=SUMIF(F:F,"North",K:K)', hint: "Conditional sum" },
    { label: "SUMIFS", tpl: '=SUMIFS(K:K,F:F,"North",E:E,"Retail")', hint: "Sum with multiple criteria" },
    { label: "COUNTIF", tpl: '=COUNTIF(J:J,">500")', hint: "Conditional count" },
    { label: "COUNTIFS", tpl: '=COUNTIFS(F:F,"North",J:J,">500")', hint: "Count with multiple criteria" },
    { label: "AVERAGEIF", tpl: '=AVERAGEIF(F:F,"West",K:K)', hint: "Conditional average" },
    { label: "VLOOKUP", tpl: '=VLOOKUP("Office Chair",G2:H21,2,FALSE)', hint: "Classic table lookup" },
    { label: "XLOOKUP", tpl: '=XLOOKUP("Office Chair",G2:G21,H2:H21,"not found")', hint: "Modern lookup — any direction" },
    { label: "INDEX", tpl: "=INDEX(H2:H21,3)", hint: "Value at position in a range" },
    { label: "MATCH", tpl: '=MATCH("Office Chair",G2:G21,0)', hint: "Position of a value (pairs with INDEX)" },
    { label: "ROUND", tpl: "=ROUND(J2/12,2)", hint: "Round to N decimals" },
    { label: "TEXT", tpl: '=TRIM(B2)&" "&C2', hint: "Combine + clean text" },
  ];

  /* dynamic coach tips */
  const tips: string[] = React.useMemo(() => {
    const t: string[] = [];
    if (usedR <= 1) {
      t.push("The sheet is empty. Load a sample file from the picker above — try **Retail Sales 2025 (Clean)** first.");
    } else {
      if (formulaCount === 0) t.push("You have data but no formulas yet. Click an empty cell under the last column and type ~ =SUM(K2:K50) ~ — then press Enter.");
      else if (formulaCount < 3) t.push(`Nice — ${formulaCount} formula${formulaCount > 1 ? "s" : ""} so far. Try dragging the logic down with **Fill down** or write ~ =IF(J2>500,\"High\",\"Low\") ~.`);
      if (colStats && colStats.n > 5) {
        const skew = Math.abs(colStats.mean - colStats.median) / Math.max(1, Math.abs(colStats.median));
        t.push(skew > 0.25
          ? `Column ${colName(selectedCol)} is skewed (mean ${fmtNum(colStats.mean)} vs median ${fmtNum(colStats.median)}). In reports, quote the **median**.`
          : `Column ${colName(selectedCol)} is fairly symmetric — the mean ${fmtNum(colStats.mean)} is a safe summary.`);
      }
      t.push("Press **Enter** to move down, **Tab** to move right, **F2-style** double-click to edit a cell. Formulas update instantly when you change inputs.");
    }
    return t.slice(0, 3);
  }, [usedR, formulaCount, colStats, selectedCol]);

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<FileSpreadsheet className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />}
        title="Excel Studio"
        subtitle="Full spreadsheet with a real formula engine — SUM to VLOOKUP, stats, sort, dedupe, CSV in/out"
        actions={
          <>
            <DatasetPicker onPick={loadDataset} />
            {loadedInfo && <span className="hidden max-w-[260px] truncate text-[11px] text-muted-foreground lg:inline" title={loadedInfo}>{loadedInfo}</span>}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
            <Button variant="outline" size="sm" className="border-border" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button variant="outline" size="sm" className="border-border" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
          </>
        }
      />

      {/* formula bar */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">{active}</div>
        <div className="flex h-9 flex-1 items-center rounded-lg border border-border bg-muted/50 px-3 font-mono text-sm text-foreground">
          <Sigma className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground/50"
            placeholder='Type a value or =SUM(A1:A50)  ·  =VLOOKUP("Office Chair",G2:H21,2)'
            value={editVal ?? activeRaw}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commit(); gridRef.current?.focus(); }
              if (e.key === "Escape") setEditVal(null);
            }}
            onFocus={() => { if (editVal === null) setEditVal(activeRaw); }}
          />
        </div>
      </div>

      {/* ribbon — Excel-standard tabbed toolbar */}
      <div className={`${PANEL} overflow-hidden`}>
        <div className="flex items-center gap-1 border-b border-border px-2 pt-1.5" role="tablist" aria-label="Excel ribbon tabs">
          {([["home", "Home"], ["formulas", "Formulas"], ["data", "Data"]] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={ribbonTab === id}
              onClick={() => setRibbonTab(id)}
              className={`rounded-t-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                ribbonTab === id
                  ? "border border-b-0 border-border bg-muted/60 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto pb-1 pr-1 text-[10.5px] text-muted-foreground">
            Column {colName(selectedCol)} selected · {usedR > 1 ? `${usedR - 1} data rows` : "empty sheet"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 text-xs">
          {ribbonTab === "home" && (
            <>
              <span className="px-1 text-muted-foreground">Sort col {colName(selectedCol)}:</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sortRows(selectedCol, 1)}>A→Z</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sortRows(selectedCol, -1)}>Z→A</Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={fillDown}><ArrowDownToLine className="mr-1 h-3 w-3" />Fill down</Button>
                  </TooltipTrigger>
                  <TooltipContent>Copies the active cell down to the end of the data (also Ctrl+D) — great for repeating a formula</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={dedupeRows}><Eraser className="mr-1 h-3 w-3" />Remove duplicate rows</Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <span className="px-1 text-muted-foreground">Text col {colName(selectedCol)}:</span>
              {(["trim", "upper", "lower", "title"] as const).map((m) => (
                <Button key={m} variant="ghost" size="sm" className="h-7 px-2 text-xs capitalize" onClick={() => transformCol(m)}><Wand2 className="mr-1 h-3 w-3" />{m}</Button>
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300" onClick={() => { setCells({}); setLoadedInfo(null); }}><Trash2 className="mr-1 h-3 w-3" />Clear sheet</Button>
            </>
          )}

          {ribbonTab === "formulas" && (
            <>
              <span className="px-1 text-muted-foreground">Click one, then edit the cell — it lands in {active}:</span>
              {FORMULA_BUTTONS.map((f) => (
                <TooltipProvider key={f.label} delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 font-mono text-[11px] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300" onClick={() => insertFormula(f.tpl)}>
                        {f.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{f.hint}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </>
          )}

          {ribbonTab === "data" && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Import CSV</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exportCSV}><Download className="mr-1 h-3 w-3" />Export CSV</Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <span className="px-1 text-muted-foreground">Download practice files:</span>
              {["messy_sales", "bank_transactions", "deliveries", "server_logs", "finance_gl", "inventory"].map((id) => (
                <button key={id} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => downloadDatasetCSV(id)}>
                  {getDatasetById(id)?.name.split(" (")[0] ?? id}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              <span className="flex items-center gap-1.5">
                <Input ref={nameRef} value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Sheet name" className="h-7 w-28 border-border bg-background/60 text-xs" />
                <Button variant="outline" size="sm" className="h-7 border-border px-2 text-xs" onClick={() => sheetName && saveSheet(sheetName, cells)}><Save className="h-3 w-3" /> Save</Button>
              </span>
            </>
          )}
        </div>
      </div>

      {/* grid + stats */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onKey}
            className={`${PANEL} overflow-auto outline-none scrollbar-thin`} style={{ maxHeight: "58vh" }}
          >
          <table className="border-collapse text-[13px]" style={{ minWidth: viewCols * 96 }}>
            <thead>
              <tr className="sticky top-0 z-10 bg-card">
                <th className="sticky left-0 z-20 w-10 border-b border-r border-border bg-card px-1 py-1.5 text-[10px] font-medium text-muted-foreground" />
                {Array.from({ length: viewCols }, (_, c) => (
                  <th
                    key={c}
                    onClick={() => setSelectedCol(c)}
                    className={`cursor-pointer border-b border-r border-border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      selectedCol === c
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {colName(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: viewRows }, (_, r) => (
                <tr key={r} className="group">
                  <td className={`sticky left-0 z-10 w-10 border-b border-r border-border bg-card px-1 py-1 text-center text-[10px] font-medium ${active.endsWith(String(r + 1)) ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>{r + 1}</td>
                  {Array.from({ length: viewCols }, (_, c) => {
                    const ref = refFor(c, r);
                    const isA = ref === active;
                    const raw = cells[ref];
                    const isFormula = !!raw?.startsWith("=");
                    const disp = displayValue(ref, cells);
                    const numeric = disp !== "" && !isNaN(parseFloat(disp.replace(/[$,\s]/g, "")));
                    return (
                      <td
                        key={c}
                        onClick={() => { if (editVal !== null && isA) return; commit(); setActive(ref); }}
                        onDoubleClick={() => { setActive(ref); startEdit(); }}
                        className={`relative h-[26px] max-w-[180px] cursor-cell overflow-hidden whitespace-nowrap border-b border-r border-border/60 px-2 py-0.5 text-right transition-colors ${
                          numeric ? "text-foreground" : "text-left text-foreground/85"
                        } ${isA ? "outline outline-2 -outline-offset-1 outline-emerald-500" : selectedCol === c ? "bg-emerald-500/[0.05]" : "hover:bg-muted/40"}`}
                        style={{ minWidth: 96 }}
                      >
                        {isA && editVal !== null ? (
                          <input
                            autoFocus
                            className="absolute inset-0 z-10 w-full bg-background px-2 font-mono text-[12px] text-foreground outline outline-2 -outline-offset-1 outline-emerald-500"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={commit}
                          />
                        ) : (
                          <span className={isFormula ? "italic" : ""}>{disp}</span>
                        )}
                        {isFormula && <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-sky-500/70" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* status bar — Excel-standard selection summary */}
          <div className={`${PANEL} mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-[11px] text-muted-foreground`}>
            <span className={editVal !== null ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}>{editVal !== null ? "Editing" : "Ready"}</span>
            <span className="h-3 w-px bg-border" />
            <span>Cell <b className="font-mono text-foreground">{active}</b></span>
            <span className="h-3 w-px bg-border" />
            <span>Count: <b className="font-mono text-foreground">{statusBar.count.toLocaleString()}</b></span>
            <span>Numeric: <b className="font-mono text-foreground">{statusBar.numCount.toLocaleString()}</b></span>
            <span>Sum: <b className="font-mono text-foreground">{fmtNum(statusBar.sum)}</b></span>
            <span>Average: <b className="font-mono text-foreground">{fmtNum(statusBar.avg)}</b></span>
            <span className="ml-auto hidden sm:inline">of column {colName(selectedCol)} · arrows move · Enter edits · Ctrl+D fills down</span>
          </div>

          {/* sheet tabs — Excel-standard bottom tabs */}
          <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => gridRef.current?.focus()}
              className={`flex shrink-0 items-center gap-1 rounded-t-lg border border-b-0 border-border px-3.5 py-1.5 text-xs font-semibold ${sheetName ? "bg-muted/50 text-muted-foreground" : "bg-card text-foreground"}`}
              title={sheetName ? "Unsaved working sheet" : "Active sheet"}
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              {sheetName || "Sheet1"}
            </button>
            {Object.values(sheets).map((s) => (
              <div key={s.name} className="group flex shrink-0 items-center gap-1 rounded-t-lg border border-b-0 border-border bg-card px-3 py-1.5 text-xs">
                <button className="font-medium text-foreground/85 hover:text-foreground" onClick={() => { setCells(s.cells); setSheetName(s.name); }} title="Open this saved sheet">
                  {s.name}
                </button>
                <button className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100" aria-label={`Delete ${s.name}`} onClick={() => deleteSheet(s.name)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const nm = sheetName || `Sheet${Object.keys(sheets).length + 1}`;
                saveSheet(nm, cells);
                setSheetName(nm);
              }}
              className="flex shrink-0 items-center gap-1 rounded-t-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              title="Save the current sheet as a tab (type a name in the Data tab first)"
            >
              <Plus className="h-3.5 w-3.5" /> Save sheet
            </button>
          </div>
        </div>

        {/* stats + help */}
        <div className="w-full shrink-0 space-y-3 lg:w-72">
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Column stats — {colName(selectedCol)}</span></div>
            <div className="p-3 text-[13px]">
              {colStats ? (
                <div className="space-y-1.5">
                  {[
                    ["Count", colStats.n], ["Sum", colStats.sum], ["Mean", colStats.mean],
                    ["Median", colStats.median], ["Std dev", colStats.std], ["Min", colStats.min], ["Max", colStats.max],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span className="text-muted-foreground">{k as string}</span>
                      <span className="font-mono text-foreground">{fmtNum(v as number)}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] leading-snug text-muted-foreground">If mean ≫ median the column is right-skewed — report the median.</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Select a column with numbers. Try loading sample data first.</p>
              )}
            </div>
          </div>
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formula cheat-sheet</span></div>
            <div className="space-y-1 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <p><span className="text-emerald-700 dark:text-emerald-300">=SUM(B2:B100)</span> · <span className="text-emerald-700 dark:text-emerald-300">=AVERAGE / MEDIAN / STDEV</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=SUMIF(E:E,"North",J:J)</span> · <span className="text-emerald-700 dark:text-emerald-300">=SUMIFS(J:J,E:E,"N",F:F,"W")</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=COUNTIF(E:E,"&gt;500")</span> · <span className="text-emerald-700 dark:text-emerald-300">=COUNTIFS(E:E,"N",J:J,"&gt;5")</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=VLOOKUP("Desk",G:J,4)</span> · <span className="text-emerald-700 dark:text-emerald-300">=XLOOKUP("Desk",G:G,J:J)</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=INDEX(J2:J21,3)</span> · <span className="text-emerald-700 dark:text-emerald-300">=MATCH("Desk",G2:G21,0)</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=IF(J2&gt;1000,"Big","Small")</span> · <span className="text-emerald-700 dark:text-emerald-300">=IFERROR(J2/K2,"n/a")</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=CONCAT(B2," ",C2)</span> · <span className="text-emerald-700 dark:text-emerald-300">=TEXTJOIN(", ",1,A2:A5)</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=ROUND / ROUNDUP / ROUNDDOWN / INT / MOD</span></p>
              <p><span className="text-emerald-700 dark:text-emerald-300">=LEFT / RIGHT / MID / LEN / TRIM / PROPER</span></p>
            </div>
          </div>
        </div>
      </div>

      <Coach view="excel" mission={EXCEL_MISSION} tips={tips} why="Excel is still the #1 tool analysts touch daily. Companies test formula fluency in interviews (SUMIFs, VLOOKUP, IF) because cleaned, well-structured sheets are how estimates, budgets and one-off analyses actually get done — before anything reaches Power BI." />
    </div>
  );
}
