"use client";

/* Excel Studio — a faithful Microsoft-Excel-style spreadsheet that runs entirely in
   the browser: real formula engine (SUM → XLOOKUP), full ribbon (Home / Insert /
   Formulas / Data / Review / View), cell formatting (bold/italic/underline, font &
   fill colors, number formats, alignment), name box + formula bar, range selection
   with fill handle, AutoFilter, right-click context menu, Find & Replace, freeze
   panes, embedded charts, undo/redo, zoom, a real multi-sheet workbook and CSV
   import/export. Everything is instant and client-side. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToolHeader, PANEL, PANEL_HEAD, fmtNum, DatasetPicker, downloadDatasetCSV } from "./shared";
import { Coach } from "./Coach";
import { useAcademy } from "@/lib/academy/store";
import { getDatasetById, downloadFile, type Row } from "@/lib/academy/datasets";
import Papa from "papaparse";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell as RCell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from "recharts";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownWideNarrow, ArrowUpNarrowWide,
  Baseline, Bold, ChartColumn, ChartLine, ChartPie, Check, ChevronDown, Clipboard,
  Copy, Download, Eraser, FileSpreadsheet, Filter, Grid2x2, Highlighter, Italic, ListFilter,
  PaintBucket, Percent, Plus, Redo2, Search, Save, Sigma, Scissors, Trash2,
  Underline, Undo2, Upload, Wand2, X, DollarSign, Hash, Snowflake, PanelTop, PanelLeft,
  PanelTopOpen, SpellCheck2, ZoomIn, ZoomOut, RotateCcw,
} from "lucide-react";

/* ==================================================================
   formula engine (kept battle-tested from v1)
   ================================================================== */
const COLS = 26;
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
      return { kind: "value", v: cellValue(ref, cells, stack) };
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

/* ==================================================================
   display + number formats + styles
   ================================================================== */
export type NumFmt = "general" | "number" | "currency" | "percent" | "comma" | "text";

export interface CellStyle {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  sz?: number;
  fc?: string;
  bg?: string;
  al?: "l" | "c" | "r";
  nf?: NumFmt;
  bd?: boolean;
}

interface XSheet {
  id: string;
  name: string;
  color?: string;
  cells: Record<string, string>;
  styles: Record<string, CellStyle>;
  colW: Record<number, number>;
  freeze: "none" | "top" | "first" | "both";
  cfRules: CfRule[];
}

interface CfRule {
  col: number;
  op: "gt" | "lt" | "contains";
  val: string;
  bg: string;
}

interface Sel { a: [number, number]; b: [number, number] }
interface NormSel { c1: number; c2: number; r1: number; r2: number }
interface ClipCell { v: string; s?: CellStyle }
interface Clip { rows: ClipCell[][]; w: number; h: number; cut?: { sheetId: string; refs: string[] } }
interface ChartBox {
  id: string;
  kind: "col" | "line" | "pie";
  title: string;
  labels: string[];
  series: { name: string; values: number[] }[];
  x: number;
  y: number;
}

const FONT_COLORS = ["#111827", "#6b7280", "#dc2626", "#ea580c", "#d97706", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];
const FILL_COLORS = ["", "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa", "#e5e7eb", "#a7f3d0", "#fde68a"];
const TAB_COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6", "#ec4899"];
const CF_COLORS = ["#fde047", "#86efac", "#fca5a5", "#93c5fd"];

function newSheet(name: string): XSheet {
  return { id: `sh_${Math.random().toString(36).slice(2, 9)}`, name, cells: {}, styles: {}, colW: {}, freeze: "none", cfRules: [] };
}

function normSel(sel: Sel): NormSel {
  return {
    c1: Math.min(sel.a[0], sel.b[0]),
    c2: Math.max(sel.a[0], sel.b[0]),
    r1: Math.min(sel.a[1], sel.b[1]),
    r2: Math.max(sel.a[1], sel.b[1]),
  };
}

function fmtCellDisplay(v: string, nf: NumFmt | undefined): string {
  if (!nf || nf === "general" || v === "" || v.startsWith("#")) return v;
  const isNum = v !== "" && !isNaN(parseFloat(v.replace(/[$,\s]/g, "")));
  const n = isNum ? parseFloat(v.replace(/[$,\s]/g, "")) : null;
  if (n === null) return v;
  switch (nf) {
    case "number": return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "currency": return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "comma": return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    case "percent": return `${(n * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
    case "text": return v;
    default: return v;
  }
}

function displayValue(ref: string, cells: Record<string, string>, styles: Record<string, CellStyle>): string {
  const raw = cells[ref];
  if (raw === undefined || raw === "") return "";
  if (!raw.startsWith("=")) return fmtCellDisplay(raw, styles[ref]?.nf);
  try {
    const v = evalSheetFormula(raw.slice(1), cells, new Set([ref]));
    if (typeof v === "number") {
      const nf = styles[ref]?.nf;
      if (nf) return fmtCellDisplay(String(v), nf);
      if (Number.isInteger(v)) return v.toLocaleString("en-US");
      return parseFloat(v.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 });
    }
    return v;
  } catch (e) {
    return e instanceof FormulaError ? e.message : "#ERROR!";
  }
}

/** display of a literal (non-formula) value honoring general integer formatting */
function displayGeneral(raw: string): string {
  if (raw === "") return "";
  if (/^-?\d{1,10}$/.test(raw)) return parseFloat(raw).toLocaleString("en-US");
  return raw;
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

/** shift relative A1 refs by (dc, dr) — for copy/fill of formulas. Ignores text inside quotes. */
function shiftFormula(src: string, dc: number, dr: number): string {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"') { inStr = !inStr; out += ch; i++; continue; }
    if (!inStr) {
      const m = /^(\$?)([A-Z])(\$?)(\d+)(?![A-Z0-9])/i.exec(src.slice(i));
      if (m && (i === 0 || /[^A-Za-z0-9$_]/.test(src[i - 1]))) {
        let c = m[2].toUpperCase().charCodeAt(0) - 65;
        let r = parseInt(m[4], 10) - 1;
        if (!m[1]) c += dc;
        if (!m[3]) r += dr;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) {
          out += "#REF!";
        } else {
          out += `${m[1]}${colName(c)}${m[3]}${r + 1}`;
        }
        i += m[0].length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/* workbook persistence */
const WB_KEY = "aaa-excel-wb-v1";

function loadWorkbook(): { sheets: XSheet[]; activeId: string } | null {
  try {
    const raw = localStorage.getItem(WB_KEY);
    if (!raw) return null;
    const wb = JSON.parse(raw) as { sheets: XSheet[]; activeId: string };
    if (!wb.sheets?.length) return null;
    return wb;
  } catch { return null; }
}

/* ================= component ================= */
const EXCEL_MISSION = [
  { id: "load", label: "Load a sample file", detail: "Use the **data picker** to load *Retail Sales 2025 (Clean)* — or the 8,000-row *Bank Transactions* for a big-file workout. Or import your own CSV from the Data tab." },
  { id: "formula", label: "Write your first formula", detail: "Open the **Formulas** ribbon tab and click **SUM** — it drops ~ =SUM(K2:K50) ~ into the active cell. Every formula starts with **=**." },
  { id: "format", label: "Format like a pro", detail: "On the **Home** tab make the headers **bold**, give them a fill color, and apply a **currency number format** to the revenue column. Real Excel, real ribbon." },
  { id: "stats", label: "Profile a column", detail: "Click a **column header** (like I) — the stats panel shows sum, mean, median and spread, and the **status bar** underneath tracks Count / Sum / Average of your selection live." },
  { id: "logic", label: "Use conditional logic", detail: "From the Formulas tab try ~ =SUMIF(D:D,\"North\",I:I) ~, ~ =COUNTIF(I:I,\">500\") ~ or ~ =IF(I2>1000,\"Big\",\"Small\") ~. Drag the **fill handle** to copy it down." },
  { id: "filter", label: "Filter & chart", detail: "Turn on **AutoFilter** (Data tab), filter one region, then select two columns and use **Insert → charts** to embed a real chart right on the sheet." },
  { id: "ship", label: "Save & export", detail: "Rename the sheet tab (double-click it), then **Export CSV** from the Data tab for your portfolio. Your workbook auto-saves in this browser." },
];

export function ExcelTool() {
  const { sheets: savedSheets, saveSheet, deleteSheet } = useAcademy();
  /* workbook state */
  const [sheets, setSheets] = React.useState<XSheet[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");
  const [loaded, setLoaded] = React.useState(false);

  /* selection & editing */
  const [sel, setSel] = React.useState<Sel>({ a: [0, 0], b: [0, 0] });
  const [editVal, setEditVal] = React.useState<string | null>(null);
  const [nameBoxVal, setNameBoxVal] = React.useState<string | null>(null);

  /* chrome */
  const [ribbonTab, setRibbonTab] = React.useState<"home" | "insert" | "formulas" | "data" | "review" | "view">("home");
  const [ribbonOpen, setRibbonOpen] = React.useState(true);
  const [zoom, setZoom] = React.useState(100);
  const [gridlines, setGridlines] = React.useState(true);

  /* interactions */
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);
  const [findDlg, setFindDlg] = React.useState<{ find: string; replace: string; results: string[] } | null>(null);
  const [filterCol, setFilterCol] = React.useState<number | null>(null);
  const [hidden, setHidden] = React.useState<Record<number, Set<string>>>({});
  const [colorMenu, setColorMenu] = React.useState<"fc" | "bg" | null>(null);
  const [cfMenu, setCfMenu] = React.useState(false);
  const [freezeMenu, setFreezeMenu] = React.useState(false);
  const [autosumMenu, setAutosumMenu] = React.useState(false);
  const [afOn, setAfOn] = React.useState(true);
  const [charts, setCharts] = React.useState<ChartBox[]>([]);
  const [sheetMenu, setSheetMenu] = React.useState<string | null>(null);
  const [clipboard, setClipboard] = React.useState<Clip | null>(null);
  const undoRef = React.useRef<string[]>([]);
  const redoRef = React.useRef<string[]>([]);
  const [undoDepth, setUndoDepth] = React.useState(0);
  const [redoDepth, setRedoDepth] = React.useState(0);
  const dragRef = React.useRef<{ kind: "cell" | "col" | "row" | "fill"; start: [number, number] } | null>(null);
  const resizeRef = React.useRef<{ col: number; startX: number; startW: number } | null>(null);
  const [resizing, setResizing] = React.useState<number | null>(null);

  const gridRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const sheet = sheets.find((s) => s.id === activeId) ?? sheets[0];
  const cells = sheet?.cells ?? {};
  const styles = sheet?.styles ?? {};
  const active = refFor(sel.a[0], sel.a[1]);
  const nSel = normSel(sel);

  /* ---------- boot: restore workbook or start fresh ---------- */
  React.useEffect(() => {
    const wb = loadWorkbook();
    if (wb && wb.sheets.length) {
      setSheets(wb.sheets);
      setActiveId(wb.sheets.some((s) => s.id === wb.activeId) ? wb.activeId : wb.sheets[0].id);
    } else {
      const s = newSheet("Sheet1");
      setSheets([s]);
      setActiveId(s.id);
    }
    setLoaded(true);
  }, []);

  /* ---------- persist workbook ---------- */
  React.useEffect(() => {
    if (!loaded || !sheets.length) return;
    try { localStorage.setItem(WB_KEY, JSON.stringify({ sheets, activeId })); } catch { /* full */ }
  }, [sheets, activeId, loaded]);

  /* ---------- undo / redo ---------- */
  const pushUndo = React.useCallback(() => {
    if (!sheet) return;
    undoRef.current.push(JSON.stringify({ sheets, activeId }));
    if (undoRef.current.length > 40) undoRef.current.shift();
    redoRef.current = [];
    setUndoDepth(undoRef.current.length);
    setRedoDepth(0);
  }, [sheets, activeId, sheet]);

  const undo = React.useCallback(() => {
    const snap = undoRef.current.pop();
    if (!snap) return;
    const cur = JSON.stringify({ sheets, activeId });
    redoRef.current.push(cur);
    const wb = JSON.parse(snap) as { sheets: XSheet[]; activeId: string };
    setSheets(wb.sheets);
    setActiveId(wb.sheets.some((s) => s.id === wb.activeId) ? wb.activeId : wb.sheets[0].id);
    setUndoDepth(undoRef.current.length);
    setRedoDepth(redoRef.current.length);
  }, [sheets, activeId]);

  const redo = React.useCallback(() => {
    const snap = redoRef.current.pop();
    if (!snap) return;
    undoRef.current.push(JSON.stringify({ sheets, activeId }));
    const wb = JSON.parse(snap) as { sheets: XSheet[]; activeId: string };
    setSheets(wb.sheets);
    setActiveId(wb.sheets.some((s) => s.id === wb.activeId) ? wb.activeId : wb.sheets[0].id);
    setUndoDepth(undoRef.current.length);
    setRedoDepth(redoRef.current.length);
  }, [sheets, activeId]);

  /* ---------- sheet mutation helpers ---------- */
  const updateSheet = (id: string, patch: Partial<XSheet> | ((s: XSheet) => Partial<XSheet>)) => {
    setSheets((ss) => ss.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s)));
  };
  const setCells = (fn: (c: Record<string, string>) => Record<string, string>) => {
    if (!sheet) return;
    updateSheet(sheet.id, (s) => ({ cells: fn(s.cells) }));
  };
  const setStyles = (fn: (st: Record<string, CellStyle>) => Record<string, CellStyle>) => {
    if (!sheet) return;
    updateSheet(sheet.id, (s) => ({ styles: fn(s.styles) }));
  };

  /* ---------- editing ---------- */
  const commit = (move: "down" | "right" | "none" = "none") => {
    if (editVal === null) return;
    pushUndo();
    setCells((c) => {
      const next = { ...c };
      if (editVal === "") delete next[active];
      else next[active] = editVal;
      return next;
    });
    setEditVal(null);
    const [c, r] = parseRef(active)!;
    if (move === "down") setSel({ a: [c, Math.min(r + 1, ROWS - 1)], b: [c, Math.min(r + 1, ROWS - 1)] });
    if (move === "right") setSel({ a: [Math.min(c + 1, COLS - 1), r], b: [Math.min(c + 1, COLS - 1), r] });
    gridRef.current?.focus();
  };

  const startEdit = (initial?: string) => setEditVal(initial ?? cells[active] ?? "");

  /* ---------- selection helpers ---------- */
  const selectCell = (c: number, r: number, extend = false) => {
    if (extend) setSel((s) => ({ a: s.a, b: [c, r] }));
    else setSel({ a: [c, r], b: [c, r] });
  };
  const selectAll = () => setSel({ a: [0, 0], b: [COLS - 1, ROWS - 1] });

  /* ---------- clipboard ---------- */
  const clipFromSel = (): Clip => {
    const { c1, c2, r1, r2 } = nSel;
    const rows: ClipCell[][] = [];
    for (let r = r1; r <= r2; r++) {
      const row: ClipCell[] = [];
      for (let c = c1; c <= c2; c++) {
        const ref = refFor(c, r);
        row.push({ v: cells[ref] ?? "", s: styles[ref] });
      }
      rows.push(row);
    }
    return { rows, w: c2 - c1 + 1, h: r2 - r1 + 1 };
  };

  const copySel = (cut = false) => {
    const clip = clipFromSel();
    if (cut) clip.cut = { sheetId: sheet.id, refs: rectRefs(nSel) };
    setClipboard(clip);
    if (cut) {
      pushUndo();
      setCells((c) => { const n = { ...c }; for (const ref of clip.cut!.refs) delete n[ref]; return n; });
    }
    gridRef.current?.focus();
  };

  const pasteAt = () => {
    if (!clipboard) return;
    const { c1, r1 } = nSel;
    pushUndo();
    setCells((c) => {
      const next = { ...c };
      if (clipboard.cut) for (const ref of clipboard.cut.refs) delete next[ref];
      for (let dr = 0; dr < clipboard.h; dr++)
        for (let dc = 0; dc < clipboard.w; dc++) {
          const src = clipboard.rows[dr][dc];
          const ref = refFor(c1 + dc, r1 + dr);
          if (src.v === "") delete next[ref];
          else next[ref] = src.v.startsWith("=") ? `=${shiftFormula(src.v.slice(1), dc, dr)}` : src.v;
        }
      return next;
    });
    setStyles((st) => {
      const next = { ...st };
      if (clipboard.cut) for (const ref of clipboard.cut.refs) delete next[ref];
      for (let dr = 0; dr < clipboard.h; dr++)
        for (let dc = 0; dc < clipboard.w; dc++) {
          const src = clipboard.rows[dr][dc];
          const ref = refFor(c1 + dc, r1 + dr);
          if (src.s) next[ref] = src.s;
          else delete next[ref];
        }
      return next;
    });
    if (clipboard.cut) setClipboard(null);
    gridRef.current?.focus();
  };

  function rectRefs({ c1, c2, r1, r2 }: NormSel): string[] {
    const refs: string[] = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) refs.push(refFor(c, r));
    return refs;
  }

  /* ---------- fill handle ---------- */
  const fillFrom = (srcRef: string, targets: { c: number; r: number }[]) => {
    const src = cells[srcRef] ?? "";
    const srcStyle = styles[srcRef];
    if (!src && !srcStyle) return;
    pushUndo();
    setCells((c) => {
      const next = { ...c };
      for (const t of targets) {
        const ref = refFor(t.c, t.r);
        if (src === "") delete next[ref];
        else next[ref] = src.startsWith("=") ? `=${shiftFormula(src.slice(1), t.c - parseRef(srcRef)![0], t.r - parseRef(srcRef)![1])}` : src;
      }
      return next;
    });
    if (srcStyle) {
      setStyles((st) => {
        const next = { ...st };
        for (const t of targets) next[refFor(t.c, t.r)] = srcStyle;
        return next;
      });
    }
  };

  const fillDownSelection = () => {
    if (nSel.r2 <= nSel.r1) { fillFrom(active, Array.from({ length: Math.max(0, usedR - 1 - nSel.r1) }, (_, i) => ({ c: nSel.c1, r: nSel.r1 + 1 + i }))); return; }
    pushUndo();
    setCells((c) => {
      const next = { ...c };
      for (let cc = nSel.c1; cc <= nSel.c2; cc++) {
        const src = c[refFor(cc, nSel.r1)] ?? "";
        for (let rr = nSel.r1 + 1; rr <= nSel.r2; rr++) {
          const ref = refFor(cc, rr);
          if (src === "") delete next[ref];
          else next[ref] = src.startsWith("=") ? `=${shiftFormula(src.slice(1), 0, rr - nSel.r1)}` : src;
        }
      }
      return next;
    });
    gridRef.current?.focus();
  };

  /* ---------- keyboard ---------- */
  const onKey = (e: React.KeyboardEvent) => {
    const [c, r] = sel.a;
    const mod = e.ctrlKey || e.metaKey;
    if (editVal !== null) {
      if (e.key === "Enter") { e.preventDefault(); commit("down"); }
      else if (e.key === "Escape") { setEditVal(null); gridRef.current?.focus(); }
      else if (e.key === "Tab") { e.preventDefault(); commit("right"); }
      return;
    }
    if (findDlg) return;
    if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); copySel(false); return; }
    if (mod && e.key.toLowerCase() === "x") { e.preventDefault(); copySel(true); return; }
    if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); pasteAt(); return; }
    if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); toggleStyle("b"); return; }
    if (mod && e.key.toLowerCase() === "i") { e.preventDefault(); toggleStyle("i"); return; }
    if (mod && e.key.toLowerCase() === "u") { e.preventDefault(); toggleStyle("u"); return; }
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); fillDownSelection(); return; }
    if (mod && e.key.toLowerCase() === "f") { e.preventDefault(); setFindDlg({ find: "", replace: "", results: [] }); return; }
    if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); selectAll(); return; }
    const move = (nc: number, nr: number, extend = false) => {
      e.preventDefault();
      setSel((s) => (extend ? { a: s.a, b: [Math.max(0, Math.min(COLS - 1, nc)), Math.max(0, Math.min(ROWS - 1, nr))] } : { a: [Math.max(0, Math.min(COLS - 1, nc)), Math.max(0, Math.min(ROWS - 1, nr))], b: [Math.max(0, Math.min(COLS - 1, nc)), Math.max(0, Math.min(ROWS - 1, nr))] }));
    };
    if (e.key === "ArrowDown") move(c, r + (e.shiftKey ? nSel.r2 - nSel.r1 + 1 : 1), e.shiftKey);
    else if (e.key === "ArrowUp") move(c, r - (e.shiftKey ? nSel.r2 - nSel.r1 + 1 : 1), e.shiftKey);
    else if (e.key === "ArrowRight") move(c + (e.shiftKey ? nSel.c2 - nSel.c1 + 1 : 1), r, e.shiftKey);
    else if (e.key === "ArrowLeft") move(c - (e.shiftKey ? nSel.c2 - nSel.c1 + 1 : 1), r, e.shiftKey);
    else if (e.key === "PageDown") move(c, Math.min(r + 20, ROWS - 1));
    else if (e.key === "PageUp") move(c, Math.max(r - 20, 0));
    else if (e.key === "Home") move(0, r);
    if (e.key === "Enter") { e.preventDefault(); move(c, Math.min(r + 1, ROWS - 1)); }
    else if (e.key === "F2") { e.preventDefault(); startEdit(); }
    else if (e.key === "Tab") { move(Math.min(c + 1, COLS - 1), r); }
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      pushUndo();
      setCells((cc) => {
        const n = { ...cc };
        for (const ref of rectRefs(nSel)) delete n[ref];
        return n;
      });
    } else if (e.key.length === 1 && !mod) {
      startEdit(e.key);
      e.preventDefault();
    }
  };

  /* ---------- style ops ---------- */
  const applyStyleToSel = (patch: CellStyle | ((cur: CellStyle | undefined) => CellStyle)) => {
    pushUndo();
    setStyles((st) => {
      const next = { ...st };
      for (const ref of rectRefs(nSel)) {
        const cur = next[ref];
        const p = typeof patch === "function" ? patch(cur) : patch;
        next[ref] = { ...cur, ...p };
        for (const k of Object.keys(next[ref]) as (keyof CellStyle)[]) if (next[ref][k] === undefined) delete next[ref][k];
        if (!Object.keys(next[ref]).length) delete next[ref];
      }
      return next;
    });
    gridRef.current?.focus();
  };

  const toggleStyle = (k: "b" | "i" | "u") => {
    const cur = styles[active]?.[k] ?? false;
    applyStyleToSel({ [k]: !cur } as CellStyle);
  };

  const clearFormatSel = () => {
    pushUndo();
    setStyles((st) => {
      const next = { ...st };
      for (const ref of rectRefs(nSel)) delete next[ref];
      return next;
    });
    gridRef.current?.focus();
  };

  /* ---------- row/col insert & delete ---------- */
  const shiftRows = (atRow: number, delta: 1 | -1) => {
    pushUndo();
    setCells((c) => {
      const next: Record<string, string> = {};
      for (const [ref, v] of Object.entries(c)) {
        const p = parseRef(ref);
        if (!p) continue;
        const [cc, rr] = p;
        if (delta === 1 && rr >= atRow) next[refFor(cc, Math.min(rr + 1, ROWS - 1))] = v;
        else if (delta === -1 && rr > atRow) next[refFor(cc, rr - 1)] = v;
        else if (delta === -1 && rr === atRow) continue;
        else next[ref] = v;
      }
      return next;
    });
    setStyles((st) => {
      const next: Record<string, CellStyle> = {};
      for (const [ref, v] of Object.entries(st)) {
        const p = parseRef(ref);
        if (!p) continue;
        const [cc, rr] = p;
        if (delta === 1 && rr >= atRow) next[refFor(cc, Math.min(rr + 1, ROWS - 1))] = v;
        else if (delta === -1 && rr > atRow) next[refFor(cc, rr - 1)] = v;
        else if (delta === -1 && rr === atRow) continue;
        else next[ref] = v;
      }
      return next;
    });
  };

  const shiftCols = (atCol: number, delta: 1 | -1) => {
    pushUndo();
    setCells((c) => {
      const next: Record<string, string> = {};
      for (const [ref, v] of Object.entries(c)) {
        const p = parseRef(ref);
        if (!p) continue;
        const [cc, rr] = p;
        if (delta === 1 && cc >= atCol) next[refFor(Math.min(cc + 1, COLS - 1), rr)] = v;
        else if (delta === -1 && cc > atCol) next[refFor(cc - 1, rr)] = v;
        else if (delta === -1 && cc === atCol) continue;
        else next[ref] = v;
      }
      return next;
    });
    setStyles((st) => {
      const next: Record<string, CellStyle> = {};
      for (const [ref, v] of Object.entries(st)) {
        const p = parseRef(ref);
        if (!p) continue;
        const [cc, rr] = p;
        if (delta === 1 && cc >= atCol) next[refFor(Math.min(cc + 1, COLS - 1), rr)] = v;
        else if (delta === -1 && cc > atCol) next[refFor(cc - 1, rr)] = v;
        else if (delta === -1 && cc === atCol) continue;
        else next[ref] = v;
      }
      return next;
    });
  };

  /* ---------- sort / dedupe / transforms (v1 logic, range-aware) ---------- */
  const sortRows = (colIdx: number, dir: 1 | -1) => {
    const { rows: R, cols: C } = usedRange(cells);
    if (R < 2) return;
    pushUndo();
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
    setCells(() => next);
  };

  const dedupeRows = () => {
    const { rows: R, cols: C } = usedRange(cells);
    pushUndo();
    const seen = new Set<string>();
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) { const h = cells[refFor(c, 0)]; if (h) next[refFor(c, 0)] = h; }
    let kept = 0;
    for (let r = 1; r < R; r++) {
      const key = Array.from({ length: C }, (_, c) => displayValue(refFor(c, r), cells, styles)).join("\u0001");
      if (key.replace(/[\u0001]+$/g, "") === "") continue;
      if (seen.has(key)) continue;
      seen.add(key);
      for (let c = 0; c < C; c++) { const v = cells[refFor(c, r)]; if (v) next[refFor(c, kept + 1)] = v; }
      kept++;
    }
    setCells(() => next);
    gridRef.current?.focus();
  };

  const selectedColIdx = sel.a[0];

  const transformCol = (mode: "trim" | "upper" | "lower" | "title") => {
    pushUndo();
    const col = selectedColIdx;
    setCells((c) => {
      const next = { ...c };
      for (let r = 0; r < usedR; r++) {
        const ref = refFor(col, r);
        const v = next[ref];
        if (v === undefined || v.startsWith("=")) continue;
        if (mode === "trim") next[ref] = v.trim();
        if (mode === "upper") next[ref] = v.toUpperCase();
        if (mode === "lower") next[ref] = v.toLowerCase();
        if (mode === "title") next[ref] = v.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
      }
      return next;
    });
    gridRef.current?.focus();
  };

  /* ---------- autofilter ---------- */
  const distinctValues = (col: number): string[] => {
    const vals = new Set<string>();
    for (let r = 1; r < usedR; r++) {
      const d = displayValue(refFor(col, r), cells, styles);
      if (d !== "") vals.add(d);
      if (vals.size > 300) break;
    }
    return [...vals].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 200);
  };

  const rowHidden = (r: number): boolean => {
    for (const [colStr, excl] of Object.entries(hidden)) {
      const col = +colStr;
      if (!excl.size) continue;
      const v = displayValue(refFor(col, r), cells, styles);
      if (excl.has(v)) return true; // value unchecked in its column filter → hide the row
    }
    return false;
  };

  const toggleFilterColValue = (col: number, v: string) => {
    setHidden((h) => {
      const cur = new Set(h[col] ?? []);
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      return { ...h, [col]: cur };
    });
  };

  const autoFilterOn = afOn;

  /* ---------- freeze panes ---------- */
  const setFreeze = (f: XSheet["freeze"]) => {
    updateSheet(sheet.id, { freeze: f });
    setFreezeMenu(false);
  };

  /* ---------- data load / import / export ---------- */
  const [loadedInfo, setLoadedInfo] = React.useState<string | null>(null);

  const loadDataset = (id: string) => {
    const ds = getDatasetById(id);
    if (!ds) return;
    pushUndo();
    const next: Record<string, string> = {};
    ds.columns.slice(0, COLS).forEach((col, ci) => { next[refFor(ci, 0)] = col.name; });
    ds.rows.slice(0, ROWS - 1).forEach((row: Row, ri) => {
      ds.columns.slice(0, COLS).forEach((col, ci) => {
        const v = row[col.key];
        if (v !== undefined && v !== "") next[refFor(ci, ri + 1)] = String(v);
      });
    });
    // style header row like real Excel reports
    const st: Record<string, CellStyle> = {};
    ds.columns.slice(0, COLS).forEach((_, ci) => { st[refFor(ci, 0)] = { b: true, bg: "#e5e7eb" }; });
    updateSheet(sheet.id, { cells: next, styles: st, freeze: "top" });
    setHidden({});
    setSel({ a: [0, 0], b: [0, 0] });
    setLoadedInfo(
      ds.rows.length > ROWS - 1
        ? `${ds.name}: showing the first ${ROWS - 1} of ${ds.rows.length.toLocaleString()} rows (grid limit). Use the Cleaner or download the CSV for the full file.`
        : `${ds.name}: ${ds.rows.length.toLocaleString()} rows loaded.`
    );
    gridRef.current?.focus();
  };

  const importCSV = (file: File) => {
    Papa.parse<Row>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (res) => {
        pushUndo();
        const next: Record<string, string> = {};
        res.data.slice(0, ROWS).forEach((row, ri) => {
          (row as unknown as string[]).slice(0, COLS).forEach((v, ci) => {
            if (v !== "") next[refFor(ci, ri)] = String(v);
          });
        });
        setCells(() => next);
        setHidden({});
        setSel({ a: [0, 0], b: [0, 0] });
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
        const v = displayValue(refFor(c, r), cells, styles);
        vals.push(/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
      }
      lines.push(vals.join(","));
    }
    downloadFile(`${sheet.name || "spreadsheet"}_export.csv`, lines.join("\n"), "text/csv");
  };

  /* ---------- charts ---------- */
  const insertChart = (kind: ChartBox["kind"]) => {
    const { c1, c2, r1, r2 } = nSel;
    let labCol = c1;
    let firstDataRow = r1;
    let labels: string[] = [];
    const series: { name: string; values: number[] }[] = [];
    if (r2 - r1 >= 1 && c2 - c1 >= 1) {
      labels = [];
      for (let r = r1 + 1; r <= r2; r++) labels.push(displayValue(refFor(c1, r), cells, styles) || `${r}`);
      firstDataRow = r1 + 1;
      labCol = c1;
      for (let c = c1 + 1; c <= c2; c++) {
        const vals: number[] = [];
        for (let r = firstDataRow; r <= r2; r++) {
          const v = parseFloat(String(displayValue(refFor(c, r), cells, styles)).replace(/[$,\s]/g, ""));
          vals.push(isNaN(v) ? 0 : v);
        }
        series.push({ name: cells[refFor(c, r1)] || colName(c), values: vals });
      }
    } else {
      // single column selected: label = row number
      for (let r = r1; r <= r2; r++) labels.push(displayValue(refFor(labCol, r), cells, styles) || `${r + 1}`);
      const vals: number[] = [];
      for (let r = r1; r <= r2; r++) {
        const v = parseFloat(String(displayValue(refFor(labCol, r), cells, styles)).replace(/[$,\s]/g, ""));
        vals.push(isNaN(v) ? 0 : v);
      }
      series.push({ name: `Column ${colName(labCol)}`, values: vals });
      if (series[0].values.every((v) => v === 0)) { series.pop(); }
    }
    if (!series.length) { setLoadedInfo("Select a range with labels in the first column and numbers beside them (or a single numeric column) to chart it."); return; }
    const id = `ch_${Math.random().toString(36).slice(2, 7)}`;
    const title = cells[refFor(c1 + 1, r1)] ? `${cells[refFor(c1 + 1, r1)]} by ${cells[refFor(c1, r1)] || "row"}` : `${sheet.name} chart`;
    setCharts((cs) => [...cs, { id, kind, title, labels, series, x: 40 + (cs.length % 4) * 28, y: 30 + (cs.length % 3) * 24 }]);
    gridRef.current?.focus();
  };

  /* ---------- find & replace ---------- */
  const findAll = () => {
    if (!findDlg || !findDlg.find) return;
    const q = findDlg.find.toLowerCase();
    const results: string[] = [];
    for (const [ref, raw] of Object.entries(cells)) {
      if (displayValue(ref, cells, styles).toLowerCase().includes(q)) results.push(ref);
    }
    setFindDlg({ ...findDlg, results });
  };

  const replaceAll = () => {
    if (!findDlg || !findDlg.find) return;
    pushUndo();
    let count = 0;
    setCells((c) => {
      const next = { ...c };
      for (const [ref, raw] of Object.entries(c)) {
        if (raw.toLowerCase().includes(findDlg.find.toLowerCase())) {
          next[ref] = raw.split(findDlg.find).join(findDlg.replace);
          count++;
        }
      }
      return next;
    });
    setLoadedInfo(`Replaced ${count} occurrence${count === 1 ? "" : "s"} of "${findDlg.find}".`);
    setFindDlg(null);
  };

  const gotoRef = (ref: string) => {
    const p = parseRef(ref);
    if (p) {
      setSel({ a: p, b: p });
      setFindDlg(null);
      gridRef.current?.focus();
    }
  };

  /* ---------- conditional formatting ---------- */
  const addCfRule = (op: CfRule["op"], val: string, bg: string) => {
    if (val === "") return;
    pushUndo();
    updateSheet(sheet.id, (s) => ({ cfRules: [...s.cfRules.slice(-3), { col: selectedColIdx, op, val, bg }] }));
    setCfMenu(false);
  };

  const cfBgFor = (ref: string, r: number, c: number): string | undefined => {
    for (const rule of sheet.cfRules) {
      if (rule.col !== c || r === 0) continue;
      const raw = displayValue(ref, cells, styles);
      const n = parseFloat(raw.replace(/[$,\s]/g, ""));
      const t = parseFloat(rule.val.replace(/[$,\s]/g, ""));
      if (rule.op === "gt" && !isNaN(n) && !isNaN(t) && n > t) return rule.bg;
      if (rule.op === "lt" && !isNaN(n) && !isNaN(t) && n < t) return rule.bg;
      if (rule.op === "contains" && raw.toLowerCase().includes(rule.val.toLowerCase())) return rule.bg;
    }
    return undefined;
  };

  /* ---------- autosum ---------- */
  const autoSum = (fn: "SUM" | "AVERAGE" | "COUNT" | "MAX" | "MIN") => {
    const [c, r] = sel.a;
    let start = r - 1;
    while (start >= 0 && (cells[refFor(c, start)] ?? "") !== "") start--;
    start++;
    if (start > r - 1) { setLoadedInfo("AutoSum needs numbers directly above the active cell."); return; }
    setEditVal(`=${fn}(${refFor(c, start)}:${refFor(c, r - 1)})`);
    setAutosumMenu(false);
  };

  /* ---------- sheets (workbook) ---------- */
  const addSheet = () => {
    const s = newSheet(`Sheet${sheets.length + 1}`);
    setSheets((ss) => [...ss, s]);
    setActiveId(s.id);
    setSel({ a: [0, 0], b: [0, 0] });
    setHidden({});
  };
  const duplicateSheet = (id: string) => {
    const src = sheets.find((s) => s.id === id);
    if (!src) return;
    const copy = { ...src, id: `sh_${Math.random().toString(36).slice(2, 9)}`, name: `${src.name} (copy)` };
    setSheets((ss) => [...ss, copy]);
    setActiveId(copy.id);
  };
  const deleteSheetById = (id: string) => {
    if (sheets.length <= 1) return;
    const rest = sheets.filter((s) => s.id !== id);
    setSheets(rest);
    if (activeId === id) setActiveId(rest[0].id);
  };
  const renameSheet = (id: string) => {
    const s = sheets.find((x) => x.id === id);
    if (!s) return;
    const nm = window.prompt("Rename sheet", s.name);
    if (nm?.trim()) updateSheet(id, { name: nm.trim().slice(0, 40) });
    setSheetMenu(null);
  };

  /* ---------- derived ---------- */
  const { rows: usedR, cols: usedC } = usedRange(cells);
  const viewRows = Math.max(usedR + 8, 30);
  const viewCols = Math.max(usedC + 3, 12);
  const formulaCount = Object.values(cells).filter((v) => v.startsWith("=")).length;
  const activeRaw = cells[active] ?? "";
  const activeStyle = styles[active];

  const selStats = React.useMemo(() => {
    let count = 0, numCount = 0, sum = 0;
    for (let r = nSel.r1; r <= nSel.r2; r++) {
      if (rowHidden(r)) continue;
      for (let c = nSel.c1; c <= nSel.c2; c++) {
        const raw = displayValue(refFor(c, r), cells, styles);
        if (raw === "" || raw.startsWith("#")) continue;
        count++;
        const v = parseFloat(raw.replace(/[$,\s]/g, ""));
        if (!isNaN(v)) { numCount++; sum += v; }
      }
    }
    return { count, numCount, sum, avg: numCount ? sum / numCount : 0 };
  }, [cells, styles, sel, hidden, sheets]);

  const colStats = React.useMemo(() => {
    const vals: number[] = [];
    for (let r = 0; r < usedR; r++) {
      const raw = displayValue(refFor(selectedColIdx, r), cells, styles);
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
  }, [cells, styles, selectedColIdx, usedR, sheets]);

  /* ---------- mouse: grid drag, fill handle, col resize ---------- */
  const onGridMouseMove = (e: React.MouseEvent) => {
    if (resizeRef.current) {
      const w = Math.max(48, resizeRef.current.startW + e.clientX - resizeRef.current.startX);
      setResizing(w);
      return;
    }
  };
  const onGridMouseUp = () => {
    if (resizeRef.current && resizing !== null) {
      const col = resizeRef.current.col;
      const w = resizing;
      updateSheet(sheet.id, (s) => ({ colW: { ...s.colW, [col]: w } }));
    }
    resizeRef.current = null;
    setResizing(null);
    dragRef.current = null;
  };

  const FORMULA_BUTTONS: { label: string; tpl: string; hint: string }[] = [
    { label: "SUM", tpl: "=SUM(K2:K50)", hint: "Add a range of numbers" },
    { label: "AVERAGE", tpl: "=AVERAGE(K2:K50)", hint: "Arithmetic mean" },
    { label: "MEDIAN", tpl: "=MEDIAN(K2:K50)", hint: "Middle value (robust to outliers)" },
    { label: "COUNT", tpl: "=COUNT(K2:K50)", hint: "Count numeric cells" },
    { label: "COUNTA", tpl: "=COUNTA(A2:A50)", hint: "Count non-empty cells" },
    { label: "IF", tpl: '=IF(J2>1000,"Big","Small")', hint: "Conditional logic" },
    { label: "IFERROR", tpl: '=IFERROR(J2/K2,"n/a")', hint: "Trap errors with a fallback" },
    { label: "SUMIF", tpl: '=SUMIF(F:F,"North",I:I)', hint: "Conditional sum" },
    { label: "SUMIFS", tpl: '=SUMIFS(I:I,F:F,"North",E:E,"Retail")', hint: "Sum with multiple criteria" },
    { label: "COUNTIF", tpl: '=COUNTIF(I:I,">500")', hint: "Conditional count" },
    { label: "COUNTIFS", tpl: '=COUNTIFS(F:F,"North",I:I,">500")', hint: "Count with multiple criteria" },
    { label: "AVERAGEIF", tpl: '=AVERAGEIF(F:F,"West",I:I)', hint: "Conditional average" },
    { label: "VLOOKUP", tpl: '=VLOOKUP("Office Chair",G2:H21,2,FALSE)', hint: "Classic table lookup" },
    { label: "XLOOKUP", tpl: '=XLOOKUP("Office Chair",G2:G21,I2:I21,"not found")', hint: "Modern lookup — any direction" },
    { label: "INDEX", tpl: "=INDEX(I2:I21,3)", hint: "Value at position in a range" },
    { label: "MATCH", tpl: '=MATCH("Office Chair",G2:G21,0)', hint: "Position of a value (pairs with INDEX)" },
    { label: "ROUND", tpl: "=ROUND(J2/12,2)", hint: "Round to N decimals" },
    { label: "TEXTJOIN", tpl: '=TEXTJOIN(" ",1,B2,C2)', hint: "Join values with a separator" },
  ];

  /* dynamic coach tips */
  const tips: string[] = React.useMemo(() => {
    const t: string[] = [];
    if (usedR <= 1) {
      t.push("The sheet is empty. Load a sample file from the picker above — try **Retail Sales 2025 (Clean)** first.");
    } else {
      if (formulaCount === 0) t.push("You have data but no formulas yet. Click an empty cell under the last column and type ~ =SUM(I2:I50) ~ — then press Enter.");
      else if (formulaCount < 3) t.push(`Nice — ${formulaCount} formula${formulaCount > 1 ? "s" : ""} so far. Grab the small **fill handle** at the corner of the selection and drag down to copy the formula with shifted references.`);
      if (colStats && colStats.n > 5) {
        const skew = Math.abs(colStats.mean - colStats.median) / Math.max(1, Math.abs(colStats.median));
        t.push(skew > 0.25
          ? `Column ${colName(selectedColIdx)} is skewed (mean ${fmtNum(colStats.mean)} vs median ${fmtNum(colStats.median)}). In reports, quote the **median**.`
          : `Column ${colName(selectedColIdx)} is fairly symmetric — the mean ${fmtNum(colStats.mean)} is a safe summary.`);
      }
      t.push("Real Excel moves: **Ctrl+B** bold, **Ctrl+C / Ctrl+V** copy-paste, drag the fill handle, right-click for the context menu, **Ctrl+Z** to undo.");
    }
    return t.slice(0, 3);
  }, [usedR, formulaCount, colStats, selectedColIdx]);

  if (!loaded || !sheet) return <div className={`${PANEL} h-64 animate-pulse`} />;

  const frozenTop = sheet.freeze === "top" || sheet.freeze === "both";
  const frozenFirst = sheet.freeze === "first" || sheet.freeze === "both";
  const frozenTopPx = 27; // header row height

  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-4" onMouseDown={() => { setCtxMenu(null); setColorMenu(null); setCfMenu(false); setFreezeMenu(false); setAutosumMenu(false); setSheetMenu(null); }}>
      <ToolHeader
        icon={<FileSpreadsheet className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />}
        title="Excel Studio"
        subtitle="The real Excel experience in your browser — ribbon, formatting, formulas, filters, charts, sheets"
        actions={
          <>
            <DatasetPicker onPick={loadDataset} />
            {loadedInfo && <span className="hidden max-w-[260px] truncate text-[11px] text-muted-foreground lg:inline" title={loadedInfo}>{loadedInfo}</span>}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
          </>
        }
      />

      {/* ============ formula bar ============ */}
      <div className={`${PANEL} flex items-stretch gap-0 overflow-visible`}>
        <input
          className="w-24 shrink-0 rounded-l-xl border-r border-border bg-muted/50 px-3 text-center font-mono text-[13px] font-bold text-emerald-700 outline-none dark:text-emerald-300"
          value={nameBoxVal ?? active}
          onChange={(e) => setNameBoxVal(e.target.value)}
          onBlur={() => setNameBoxVal(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nameBoxVal) {
              const p = parseRef(nameBoxVal.trim());
              if (p) { setSel({ a: p, b: p }); setNameBoxVal(null); gridRef.current?.focus(); }
              else setNameBoxVal(null);
            }
            if (e.key === "Escape") setNameBoxVal(null);
          }}
          aria-label="Name box — type a cell reference and press Enter"
        />
        <div className="flex shrink-0 items-center border-r border-border px-2.5 font-serif text-[13px] italic text-muted-foreground" title="Insert function">fx</div>
        <div className="flex min-w-0 flex-1 items-center gap-1 px-2">
          <input
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
            placeholder="Type a value or =SUM(I2:I50) · =XLOOKUP(“Office Chair”,G:G,I:I)"
            value={editVal ?? activeRaw}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit("down");
              if (e.key === "Escape") { setEditVal(null); gridRef.current?.focus(); }
            }}
            onFocus={() => { if (editVal === null) setEditVal(activeRaw || ""); }}
            aria-label="Formula bar"
          />
          {editVal !== null && (
            <>
              <button className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300" title="Enter ✓" onClick={() => commit()}><Check className="h-4 w-4" /></button>
              <button className="rounded p-1 text-red-500 hover:bg-red-500/10" title="Cancel ✗" onClick={() => { setEditVal(null); gridRef.current?.focus(); }}><X className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>

      {/* ============ ribbon ============ */}
      <div className={`${PANEL} overflow-visible`}>
        <div className="flex items-center gap-0.5 border-b border-border px-2 pt-1" role="tablist" aria-label="Excel ribbon tabs">
          {([
            ["home", "Home"], ["insert", "Insert"], ["formulas", "Formulas"],
            ["data", "Data"], ["review", "Review"], ["view", "View"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={ribbonTab === id}
              onClick={() => { setRibbonTab(id); setRibbonOpen(true); }}
              className={`rounded-t-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                ribbonTab === id
                  ? "border border-b-0 border-border bg-muted/60 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {label}
            </button>
          ))}
          <button className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-muted" title={ribbonOpen ? "Collapse the ribbon" : "Expand the ribbon"} onClick={() => setRibbonOpen((o) => !o)}>
            {ribbonOpen ? <PanelTopOpen className="h-3.5 w-3.5" /> : <PanelTop className="h-3.5 w-3.5" />}
          </button>
        </div>

        {ribbonOpen && (
          <div className="flex flex-wrap items-stretch gap-0 px-1.5 py-1.5 text-xs">
            <Group label="Clipboard">
              <RibbonBtn title="Copy (Ctrl+C)" onClick={() => copySel(false)}><Copy className="h-4 w-4" /></RibbonBtn>
              <RibbonBtn title="Cut (Ctrl+X)" onClick={() => copySel(true)}><Scissors className="h-4 w-4" /></RibbonBtn>
              <RibbonBtn title="Paste (Ctrl+V)" onClick={pasteAt} disabled={!clipboard}><Clipboard className="h-4 w-4" /></RibbonBtn>
            </Group>

            {ribbonTab === "home" && (
              <>
                <Group label="Undo">
                  <RibbonBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={!undoDepth}><Undo2 className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoDepth}><Redo2 className="h-4 w-4" /></RibbonBtn>
                </Group>
                <Group label="Font">
                  <RibbonBtn title="Bold (Ctrl+B)" active={!!activeStyle?.b} onClick={() => toggleStyle("b")}><Bold className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Italic (Ctrl+I)" active={!!activeStyle?.i} onClick={() => toggleStyle("i")}><Italic className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Underline (Ctrl+U)" active={!!activeStyle?.u} onClick={() => toggleStyle("u")}><Underline className="h-4 w-4" /></RibbonBtn>
                  <select
                    className="h-7 rounded-md border border-border bg-card px-1 text-[11px]"
                    value={activeStyle?.sz ?? 13}
                    onChange={(e) => applyStyleToSel({ sz: +e.target.value })}
                    title="Font size"
                    aria-label="Font size"
                  >
                    {[10, 11, 12, 13, 16, 18, 24].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ColorBtn
                    icon={<Baseline className="h-4 w-4" />}
                    title="Font color"
                    swatch={activeStyle?.fc ?? "#111827"}
                    open={colorMenu === "fc"}
                    onToggle={() => setColorMenu(colorMenu === "fc" ? null : "fc")}
                    onPick={(c) => { applyStyleToSel({ fc: c }); setColorMenu(null); }}
                    colors={FONT_COLORS}
                    noneLabel="Automatic"
                  />
                  <ColorBtn
                    icon={<PaintBucket className="h-4 w-4" />}
                    title="Fill color"
                    swatch={activeStyle?.bg || ""}
                    open={colorMenu === "bg"}
                    onToggle={() => setColorMenu(colorMenu === "bg" ? null : "bg")}
                    onPick={(c) => { applyStyleToSel({ bg: c || undefined }); setColorMenu(null); }}
                    colors={FILL_COLORS}
                    noneLabel="No fill"
                  />
                  <RibbonBtn title="Borders on/off for the selection" active={!!activeStyle?.bd} onClick={() => applyStyleToSel({ bd: !activeStyle?.bd })}><Grid2x2 className="h-4 w-4" /></RibbonBtn>
                </Group>
                <Group label="Alignment">
                  <RibbonBtn title="Align left" active={activeStyle?.al === "l"} onClick={() => applyStyleToSel({ al: "l" })}><AlignLeft className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Align center" active={activeStyle?.al === "c"} onClick={() => applyStyleToSel({ al: "c" })}><AlignCenter className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Align right" active={activeStyle?.al === "r"} onClick={() => applyStyleToSel({ al: "r" })}><AlignRight className="h-4 w-4" /></RibbonBtn>
                </Group>
                <Group label="Number">
                  <select
                    className="h-7 w-28 rounded-md border border-border bg-card px-1 text-[11px]"
                    value={activeStyle?.nf ?? "general"}
                    onChange={(e) => applyStyleToSel({ nf: e.target.value as NumFmt })}
                    title="Number format"
                    aria-label="Number format"
                  >
                    <option value="general">General</option>
                    <option value="number">Number (1,234.00)</option>
                    <option value="currency">Currency ($1,234.00)</option>
                    <option value="comma">Comma (1,234)</option>
                    <option value="percent">Percent (50%)</option>
                    <option value="text">Text</option>
                  </select>
                  <RibbonBtn title="Quick currency" onClick={() => applyStyleToSel({ nf: "currency" })}><DollarSign className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Quick percent" onClick={() => applyStyleToSel({ nf: "percent" })}><Percent className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Quick comma" onClick={() => applyStyleToSel({ nf: "comma" })}><Hash className="h-4 w-4" /></RibbonBtn>
                </Group>
                <Group label="Styles">
                  <div className="relative">
                    <RibbonBtn title="Conditional formatting — highlight what matters" active={cfMenu} onClick={() => setCfMenu((v) => !v)}><Highlighter className="h-4 w-4" /></RibbonBtn>
                    {cfMenu && (
                      <Menu>
                        <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Highlight cells in column {colName(selectedColIdx)}</p>
                        <MenuItem onClick={() => { const v = window.prompt("Highlight cells GREATER than…", "1000"); if (v) addCfRule("gt", v, CF_COLORS[0]); }}>Greater than…</MenuItem>
                        <MenuItem onClick={() => { const v = window.prompt("Highlight cells LESS than…", "100"); if (v) addCfRule("lt", v, CF_COLORS[2]); }}>Less than…</MenuItem>
                        <MenuItem onClick={() => { const v = window.prompt("Highlight cells containing text…", "refund"); if (v) addCfRule("contains", v, CF_COLORS[1]); }}>Text contains…</MenuItem>
                        {sheet.cfRules.length > 0 && (
                          <>
                            <div className="my-1 h-px bg-border" />
                            <MenuItem onClick={() => { pushUndo(); updateSheet(sheet.id, { cfRules: [] }); setCfMenu(false); }}><RotateCcw className="mr-1.5 inline h-3 w-3" /> Clear all rules ({sheet.cfRules.length})</MenuItem>
                          </>
                        )}
                      </Menu>
                    )}
                  </div>
                  <RibbonBtn title="Clear formatting in selection" onClick={clearFormatSel}><Eraser className="h-4 w-4" /></RibbonBtn>
                </Group>
                <Group label="Cells">
                  <RibbonBtn title="Insert row above selection" onClick={() => shiftRows(nSel.r1, 1)}><Plus className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Row</span></RibbonBtn>
                  <RibbonBtn title="Insert column left of selection" onClick={() => shiftCols(nSel.c1, 1)}><Plus className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Col</span></RibbonBtn>
                  <RibbonBtn title="Delete selected row" onClick={() => shiftRows(nSel.r1, -1)}><Trash2 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Row</span></RibbonBtn>
                  <RibbonBtn title="Delete selected column" onClick={() => shiftCols(nSel.c1, -1)}><Trash2 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Col</span></RibbonBtn>
                </Group>
                <Group label="Editing">
                  <RibbonBtn title="Sort A→Z by selected column" onClick={() => sortRows(selectedColIdx, 1)}><ArrowUpNarrowWide className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Sort Z→A by selected column" onClick={() => sortRows(selectedColIdx, -1)}><ArrowDownWideNarrow className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Remove duplicate rows" onClick={dedupeRows}><Wand2 className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Find & Replace (Ctrl+F)" onClick={() => setFindDlg({ find: "", replace: "", results: [] })}><Search className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Clear the whole sheet" onClick={() => { pushUndo(); updateSheet(sheet.id, { cells: {}, styles: {} }); setHidden({}); setCharts([]); setLoadedInfo(null); }}><Trash2 className="h-4 w-4" /></RibbonBtn>
                </Group>
              </>
            )}

            {ribbonTab === "insert" && (
              <Group label="Charts — select your data first">
                <RibbonBtn title="Insert a column chart from the selection" onClick={() => insertChart("col")}><ChartColumn className="h-5 w-5" /><span className="ml-1 text-[10.5px]">Column</span></RibbonBtn>
                <RibbonBtn title="Insert a line chart from the selection" onClick={() => insertChart("line")}><ChartLine className="h-5 w-5" /><span className="ml-1 text-[10.5px]">Line</span></RibbonBtn>
                <RibbonBtn title="Insert a pie chart from the selection" onClick={() => insertChart("pie")}><ChartPie className="h-5 w-5" /><span className="ml-1 text-[10.5px]">Pie</span></RibbonBtn>
                <p className="self-center px-2 text-[11px] leading-snug text-muted-foreground">Select a range with labels in the first<br />column and numbers beside them.</p>
              </Group>
            )}

            {ribbonTab === "formulas" && (
              <>
                <Group label="AutoSum">
                  <div className="relative">
                    <RibbonBtn title="AutoSum — sums the numbers directly above" onClick={() => autoSum("SUM")}><Sigma className="h-4 w-4" /><span className="ml-1 text-[10.5px]">AutoSum</span><ChevronDown className="ml-0.5 h-3 w-3" /></RibbonBtn>
                    {autosumMenu && (
                      <Menu>
                        <MenuItem onClick={() => autoSum("SUM")}>Σ Sum</MenuItem>
                        <MenuItem onClick={() => autoSum("AVERAGE")}>x̄ Average</MenuItem>
                        <MenuItem onClick={() => autoSum("COUNT")}>Count Numbers</MenuItem>
                        <MenuItem onClick={() => autoSum("MAX")}>Max</MenuItem>
                        <MenuItem onClick={() => autoSum("MIN")}>Min</MenuItem>
                      </Menu>
                    )}
                  </div>
                </Group>
                <Group label="Function library — click, then edit the cell">
                  <div className="flex max-w-[880px] flex-wrap gap-1">
                    {FORMULA_BUTTONS.map((f) => (
                      <TooltipProvider key={f.label} delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="rounded-md border border-border px-1.5 py-1 font-mono text-[10.5px] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                              onClick={() => setEditVal(f.tpl)}
                            >
                              {f.label}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">{f.hint}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </Group>
              </>
            )}

            {ribbonTab === "data" && (
              <>
                <Group label="Get & Transform Data">
                  <RibbonBtn title="Import a CSV file" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /><span className="ml-1 text-[10.5px]">From CSV</span></RibbonBtn>
                  <RibbonBtn title="Export the sheet as CSV" onClick={exportCSV}><Download className="h-4 w-4" /><span className="ml-1 text-[10.5px]">To CSV</span></RibbonBtn>
                  <div className="flex max-w-[420px] flex-wrap items-center gap-1">
                    {["messy_sales", "bank_transactions", "deliveries", "server_logs", "finance_gl", "inventory"].map((id) => (
                      <button key={id} className="rounded-md border border-border px-1.5 py-1 text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => downloadDatasetCSV(id)}>
                        ↓ {getDatasetById(id)?.name.split(" (")[0] ?? id}
                      </button>
                    ))}
                  </div>
                </Group>
                <Group label="Sort & Filter">
                  <RibbonBtn title="Sort A→Z" onClick={() => sortRows(selectedColIdx, 1)}><ArrowUpNarrowWide className="h-4 w-4" /><span className="ml-1 text-[10.5px]">A→Z</span></RibbonBtn>
                  <RibbonBtn title="Sort Z→A" onClick={() => sortRows(selectedColIdx, -1)}><ArrowDownWideNarrow className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Z→A</span></RibbonBtn>
                  <RibbonBtn
                    title="AutoFilter — show filter dropdowns on the header row"
                    active={autoFilterOn}
                    onClick={() => { setAfOn(!afOn); if (afOn) { setHidden({}); setFilterCol(null); } }}
                  ><Filter className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Filter</span></RibbonBtn>
                </Group>
                <Group label="Data Tools">
                  <RibbonBtn title="Remove duplicate rows" onClick={dedupeRows}><Wand2 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Remove dupes</span></RibbonBtn>
                  <span className="flex items-center gap-1 px-1 text-[10.5px] text-muted-foreground">Text col {colName(selectedColIdx)}:</span>
                  {(["trim", "upper", "lower", "title"] as const).map((m) => (
                    <RibbonBtn key={m} title={`Make column ${colName(selectedColIdx)} ${m}`} onClick={() => transformCol(m)}><Wand2 className="h-3.5 w-3.5" /><span className="ml-0.5 text-[10.5px]">{m}</span></RibbonBtn>
                  ))}
                </Group>
                <Group label="Save">
                  <RibbonBtn title="Save this sheet to your Academy portfolio" onClick={() => saveSheet(sheet.name || "Sheet1", cells)}><Save className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Save to portfolio</span></RibbonBtn>
                </Group>
              </>
            )}

            {ribbonTab === "review" && (
              <Group label="Checking">
                <RibbonBtn title="Check the sheet for formula errors" onClick={() => {
                  const errs = Object.keys(cells).filter((ref) => displayValue(ref, cells, styles).startsWith("#"));
                  setLoadedInfo(errs.length ? `Error check: ${errs.length} error cell${errs.length === 1 ? "" : "s"} — ${errs.slice(0, 6).join(", ")}${errs.length > 6 ? "…" : ""}` : "Error check passed — no formula errors in this sheet. ✔");
                }}><SpellCheck2 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Check for errors</span></RibbonBtn>
                <div className="self-center px-2 text-[11px] leading-relaxed text-muted-foreground">
                  {usedR - 1} data rows · {usedC} columns · <b className="text-foreground">{formulaCount}</b> formulas · {Object.keys(styles).length} formatted cells
                </div>
              </Group>
            )}

            {ribbonTab === "view" && (
              <>
                <Group label="Freeze Panes">
                  <div className="relative">
                    <RibbonBtn title="Freeze rows/columns so headers stay visible" active={sheet.freeze !== "none"} onClick={() => setFreezeMenu((v) => !v)}><Snowflake className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Freeze</span><ChevronDown className="ml-0.5 h-3 w-3" /></RibbonBtn>
                    {freezeMenu && (
                      <Menu>
                        <MenuItem onClick={() => setFreeze("none")} check={sheet.freeze === "none"}>No freezing</MenuItem>
                        <MenuItem onClick={() => setFreeze("top")} check={sheet.freeze === "top"}>Freeze top row</MenuItem>
                        <MenuItem onClick={() => setFreeze("first")} check={sheet.freeze === "first"}>Freeze first column</MenuItem>
                        <MenuItem onClick={() => setFreeze("both")} check={sheet.freeze === "both"}>Freeze both</MenuItem>
                      </Menu>
                    )}
                  </div>
                </Group>
                <Group label="Show">
                  <RibbonBtn title="Show or hide gridlines" active={gridlines} onClick={() => setGridlines((g) => !g)}><Grid2x2 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Gridlines</span></RibbonBtn>
                </Group>
                <Group label="Zoom">
                  <RibbonBtn title="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut className="h-4 w-4" /></RibbonBtn>
                  <span className="flex w-12 items-center justify-center text-[11px] font-semibold">{zoom}%</span>
                  <RibbonBtn title="Zoom in" onClick={() => setZoom((z) => Math.min(160, z + 10))}><ZoomIn className="h-4 w-4" /></RibbonBtn>
                  <RibbonBtn title="Reset to 100%" onClick={() => setZoom(100)}>100%</RibbonBtn>
                </Group>
              </>
            )}
          </div>
        )}
      </div>

      {/* ============ grid + charts ============ */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onKey}
            onMouseMove={onGridMouseMove}
            onMouseUp={onGridMouseUp}
            onMouseLeave={onGridMouseUp}
            className={`${PANEL} relative overflow-auto outline-none scrollbar-thin`} style={{ maxHeight: "56vh" }}
          >
            <table
              className="border-collapse text-[13px]"
              style={{ minWidth: viewCols * 96, borderSpacing: 0 }}
            >
              <thead>
                <tr className="sticky top-0 z-20 bg-card">
                  <th
                    onMouseDown={(e) => { e.preventDefault(); selectAll(); }}
                    className="sticky left-0 z-30 w-10 cursor-pointer border-b border-r border-border bg-card px-1 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                    title="Select all"
                    style={{ left: 0 }}
                  >
                    <span className="mx-auto block h-2 w-2 border border-muted-foreground/50" />
                  </th>
                  {Array.from({ length: viewCols }, (_, c) => {
                    const colSelected = c >= nSel.c1 && c <= nSel.c2;
                    const w = sheet.colW[c] ?? 96;
                    return (
                      <th
                        key={c}
                        onMouseDown={(e) => { e.preventDefault(); dragRef.current = { kind: "col", start: [c, 0] }; setSel({ a: [c, 0], b: [c, ROWS - 1] }); gridRef.current?.focus(); }}
                        className={`relative cursor-pointer select-none border-b border-r px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                          colSelected ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-card text-muted-foreground hover:bg-muted"
                        }`}
                        style={{ minWidth: w, maxWidth: w }}
                      >
                        {colName(c)}
                        <span
                          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); resizeRef.current = { col: c, startX: e.clientX, startW: w }; setResizing(w); }}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-emerald-500/50"
                          title="Drag to resize column"
                        />
                        {autoFilterOn && (
                          <span
                            role="button"
                            aria-label={`Filter column ${colName(c)}`}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onMouseDown={(e) => { e.stopPropagation(); setFilterCol(filterCol === c ? null : c); }}
                          >
                            <ListFilter className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: viewRows }, (_, r) => {
                  if (autoFilterOn && rowHidden(r)) return null;
                  const rowIsSelected = r >= nSel.r1 && r <= nSel.r2;
                  return (
                    <tr key={r} className="group">
                      <td
                        onMouseDown={(e) => { e.preventDefault(); dragRef.current = { kind: "row", start: [0, r] }; setSel({ a: [0, r], b: [COLS - 1, r] }); }}
                        className={`sticky z-10 w-10 cursor-pointer select-none border-b border-r bg-card px-1 py-0 text-center text-[10px] font-medium ${
                          rowIsSelected ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                        }`}
                        style={{ height: 24, left: 0, top: frozenTop && r === 0 ? frozenTopPx : undefined, zIndex: r === 0 && frozenTop ? 12 : 10 }}
                      >
                        {r + 1}
                      </td>
                      {Array.from({ length: viewCols }, (_, c) => {
                        const ref = refFor(c, r);
                        const isA = sel.a[0] === c && sel.a[1] === r;
                        const inSel = c >= nSel.c1 && c <= nSel.c2 && r >= nSel.r1 && r <= nSel.r2;
                        const raw = cells[ref];
                        const isFormula = !!raw?.startsWith("=");
                        const st = styles[ref];
                        const disp = displayValue(ref, cells, styles);
                        const shown = isFormula ? disp : st?.nf ? fmtCellDisplay(raw ?? "", st.nf) : displayGeneral(raw ?? "");
                        const numeric = shown !== "" && !isNaN(parseFloat(String(shown).replace(/[$,%\s]/g, "")));
                        const cfBg = cfBgFor(ref, r, c);
                        const align = st?.al ?? (numeric && !st?.al ? "r" : "l");
                        const fill = st?.bg || cfBg;
                        const fillIsYellow = st?.bg && st.bg.startsWith("#fef08a");
                        return (
                          <td
                            key={c}
                            onMouseDown={(e) => {
                              if (resizeRef.current) return;
                              if (e.button === 2) { setSel({ a: [c, r], b: [c, r] }); return; }
                              dragRef.current = { kind: "cell", start: [c, r] };
                              selectCell(c, r, e.shiftKey);
                              gridRef.current?.focus();
                            }}
                            onMouseEnter={() => {
                              if (dragRef.current?.kind === "cell" && (dragRef.current.start[0] !== c || dragRef.current.start[1] !== r)) {
                                setSel((s) => ({ a: s.a, b: [c, r] }));
                              }
                            }}
                            onDoubleClick={() => { setSel({ a: [c, r], b: [c, r] }); startEdit(); }}
                            onContextMenu={(e) => { e.preventDefault(); setSel((s) => (c >= nSel.c1 && c <= nSel.c2 && r >= nSel.r1 && r <= nSel.r2 ? s : { a: [c, r], b: [c, r] })); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
                            className={`relative h-6 max-w-[240px] cursor-cell select-none overflow-hidden whitespace-nowrap border-b border-r px-1.5 py-0 transition-colors ${
                              gridlines ? "border-border/60" : "border-transparent"
                            } ${isA ? "z-10 outline outline-2 -outline-offset-1 outline-emerald-500" : ""} ${st?.bd ? "ring-1 inset-ring-1 ring-foreground/25" : ""}`}
                            style={{
                              minWidth: sheet.colW[c] ?? 96,
                              background: fill ?? (inSel && !isA ? "rgba(16,185,129,0.07)" : undefined),
                              color: st?.fc,
                              fontWeight: st?.b ? 700 : undefined,
                              fontStyle: st?.i ? "italic" : undefined,
                              textDecoration: st?.u ? "underline" : undefined,
                              fontSize: st?.sz ? `${st.sz}px` : undefined,
                              textAlign: align === "c" ? "center" : align === "r" ? "right" : "left",
                              position: "relative",
                              ...(frozenFirst && c === 0 && !isA ? { position: "sticky", left: 40, zIndex: 5, background: fill ?? "var(--card, #fff)" } : {}),
                              ...(frozenTop && r === 0 && !isA ? { position: "sticky", top: frozenTopPx, zIndex: 5, background: fill ?? "var(--card, #fff)" } : {}),
                              ...(frozenFirst && c === 0 && frozenTop && r === 0 && !isA ? { zIndex: 13 } : {}),
                            }}
                            title={isFormula ? `${ref}: ${raw}` : undefined}
                          >
                            {isA && editVal !== null ? (
                              <input
                                autoFocus
                                className="absolute inset-0 z-20 w-full bg-background px-1.5 font-mono text-[12px] text-foreground outline outline-2 -outline-offset-1 outline-emerald-500"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onBlur={() => commit("none")}
                              />
                            ) : (
                              <span className={isFormula ? "italic text-emerald-900 dark:text-emerald-100" : ""}>{shown}</span>
                            )}
                            {isFormula && shown.startsWith("#") && <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-red-500" />}
                            {isFormula && !shown.startsWith("#") && <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-sky-500/70" />}
                            {/* fill handle — bottom-right corner of the selection */}
                            {c === nSel.c2 && r === nSel.r2 && editVal === null && (
                              <span
                                onMouseDown={(e) => {
                                  e.stopPropagation(); e.preventDefault();
                                  const targets: { c: number; r: number }[] = [];
                                  for (let rr = nSel.r2 + 1; rr <= Math.min(nSel.r2 + 60, ROWS - 1); rr++) for (let cc = nSel.c1; cc <= nSel.c2; cc++) targets.push({ c: cc, r: rr });
                                  fillFrom(active, targets);
                                }}
                                className="absolute -bottom-[3px] -right-[3px] z-20 h-[7px] w-[7px] cursor-crosshair rounded-[1px] border border-background bg-emerald-500"
                                title="Drag the fill handle — copies the cell/formula down (references shift, Excel-style)"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* embedded charts float over the grid */}
            {charts.map((ch) => (
              <div
                key={ch.id}
                className="absolute z-30 w-[380px] rounded-xl border border-border bg-card shadow-2xl"
                style={{ left: `${ch.x}%`, top: `${ch.y}%` }}
              >
                <div className="flex cursor-move items-center justify-between border-b border-border px-3 py-1.5" onMouseDown={(e) => {
                  const startX = e.clientX; const startY = e.clientY;
                  const x0 = ch.x; const y0 = ch.y;
                  const move = (ev: MouseEvent) => {
                    const nx = Math.max(0, Math.min(60, x0 + ((ev.clientX - startX) / (gridRef.current?.clientWidth ?? 1000)) * 100));
                    const ny = Math.max(0, Math.min(70, y0 + ((ev.clientY - startY) / (gridRef.current?.clientHeight ?? 500)) * 100));
                    setCharts((ccs) => ccs.map((c2) => (c2.id === ch.id ? { ...c2, x: nx, y: ny } : c2)));
                  };
                  const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
                  window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
                }}>
                  <span className="truncate text-[11.5px] font-semibold text-foreground/85">{ch.title}</span>
                  <button className="text-muted-foreground hover:text-red-500" onClick={() => setCharts((cs) => cs.filter((c2) => c2.id !== ch.id))} title="Remove chart"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="h-52 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {ch.kind === "pie" ? (
                      <PieChart>
                        <RTooltip formatter={(v: number) => fmtNum(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Pie data={ch.labels.map((l, i) => ({ name: l, v: ch.series[0]?.values[i] ?? 0 }))} dataKey="v" nameKey="name" outerRadius={70} label={false}>
                          {ch.labels.map((_, i) => <RCell key={i} fill={["#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6", "#f97316", "#22c55e", "#ef4444"][i % 8]} />)}
                        </Pie>
                      </PieChart>
                    ) : ch.kind === "line" ? (
                      <LineChart data={ch.labels.map((l, i) => ({ name: l, ...Object.fromEntries(ch.series.map((s) => [s.name, s.values[i] ?? 0])) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNum} width={52} />
                        <RTooltip formatter={(v: number) => fmtNum(v)} />
                        {ch.series.map((s, si) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={["#10b981", "#0ea5e9", "#f59e0b", "#ec4899"][si % 4]} strokeWidth={2} dot={false} />)}
                      </LineChart>
                    ) : (
                      <BarChart data={ch.labels.map((l, i) => ({ name: l, ...Object.fromEntries(ch.series.map((s) => [s.name, s.values[i] ?? 0])) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} height={44} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNum} width={52} />
                        <RTooltip formatter={(v: number) => fmtNum(v)} />
                        {ch.series.map((s, si) => <Bar key={s.name} dataKey={s.name} fill={["#10b981", "#0ea5e9", "#f59e0b", "#ec4899"][si % 4]} radius={[3, 3, 0, 0]} />)}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* status bar */}
          <div className={`${PANEL} mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-[11px] text-muted-foreground`}>
            <span className={editVal !== null ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}>{editVal !== null ? "Enter" : "Ready"}</span>
            <span className="h-3 w-px bg-border" />
            <span>{clipboard ? <b className="text-foreground">Clipboard: {clipboard.h}×{clipboard.w}{clipboard.cut ? " (cut)" : ""}</b> : <>Selection <b className="font-mono text-foreground">{nSel.c2 - nSel.c1 + 1}×{nSel.r2 - nSel.r1 + 1}</b></>}</span>
            <span className="h-3 w-px bg-border" />
            <span>Count: <b className="font-mono text-foreground">{selStats.count.toLocaleString()}</b></span>
            <span>Numeric: <b className="font-mono text-foreground">{selStats.numCount.toLocaleString()}</b></span>
            <span>Sum: <b className="font-mono text-foreground">{fmtNum(selStats.sum)}</b></span>
            <span>Average: <b className="font-mono text-foreground">{fmtNum(selStats.avg)}</b></span>
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline">arrows move · Enter edits · Ctrl+D fills · drag ■ to fill</span>
              <ZoomOut className="h-3 w-3" />
              <input type="range" min={50} max={160} step={10} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="h-1 w-24 accent-emerald-500" aria-label="Zoom" />
              <ZoomIn className="h-3 w-3" />
              <b className="w-10 text-foreground">{zoom}%</b>
            </span>
          </div>

          {/* sheet tabs */}
          <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
            <button onClick={addSheet} className="flex shrink-0 items-center rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted" title="New sheet"><Plus className="h-3.5 w-3.5" /></button>
            {sheets.map((s) => (
              <div key={s.id} className="relative">
                <button
                  onClick={() => { setActiveId(s.id); setSel({ a: [0, 0], b: [0, 0] }); setHidden({}); }}
                  onDoubleClick={() => renameSheet(s.id)}
                  onContextMenu={(e) => { e.preventDefault(); setSheetMenu(s.id); }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-semibold transition-colors ${
                    s.id === activeId ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60"
                  }`}
                  title="Double-click to rename · right-click for more"
                >
                  {s.color && <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />}
                  <FileSpreadsheet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  {s.name}
                </button>
                {sheetMenu === s.id && (
                  <Menu align="left">
                    <MenuItem onClick={() => renameSheet(s.id)}>Rename</MenuItem>
                    <MenuItem onClick={() => { duplicateSheet(s.id); setSheetMenu(null); }}>Duplicate</MenuItem>
                    <MenuItem onClick={() => { deleteSheetById(s.id); setSheetMenu(null); }}>Delete</MenuItem>
                    <div className="my-1 h-px bg-border" />
                    <div className="flex gap-1.5 px-2 py-1.5">
                      {TAB_COLORS.map((c) => (
                        <button key={c} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} onClick={() => { updateSheet(s.id, (sh) => ({ color: sh.color === c ? undefined : c })); setSheetMenu(null); }} aria-label={`Tab color ${c}`} />
                      ))}
                    </div>
                  </Menu>
                )}
              </div>
            ))}
            <span className="ml-2 hidden items-center gap-1 text-[10.5px] text-muted-foreground md:flex">
              double-click a tab to rename · right-click: duplicate / delete / color
            </span>
          </div>

          {/* saved (portfolio) sheets */}
          {Object.keys(savedSheets).length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide">Portfolio saves:</span>
              {Object.values(savedSheets).map((s) => (
                <span key={s.name} className="group flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1">
                  <button className="font-medium text-foreground/85 hover:text-foreground" title="Load a copy into the workbook" onClick={() => {
                    const ns = newSheet(s.name.slice(0, 24));
                    ns.cells = { ...s.cells };
                    setSheets((ss) => [...ss, ns]);
                    setActiveId(ns.id);
                  }}>{s.name}</button>
                  <button className="text-muted-foreground/50 hover:text-red-500" aria-label={`Delete ${s.name}`} onClick={() => deleteSheet(s.name)}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* stats + help */}
        <div className="w-full shrink-0 space-y-3 lg:w-72">
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Column stats — {colName(selectedColIdx)}</span></div>
            <div className="p-3 text-[13px]">
              {colStats ? (
                <div className="space-y-1.5">
                  {([
                    ["Count", colStats.n], ["Sum", colStats.sum], ["Mean", colStats.mean],
                    ["Median", colStats.median], ["Std dev", colStats.std], ["Min", colStats.min], ["Max", colStats.max],
                  ] as [string, number][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono text-foreground">{fmtNum(v)}</span>
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
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=SUM(B2:B100)</span> · AVERAGE / MEDIAN / STDEV</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=SUMIF(E:E,"North",I:I)</span> · SUMIFS(I:I,E:E,"N",F:F,"W")</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=COUNTIF(E:E,"&gt;500")</span> · COUNTIFS(E:E,"N",I:I,"&gt;5")</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=VLOOKUP("Desk",G:J,4)</span> · XLOOKUP("Desk",G:G,I:I)</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=INDEX(I2:I21,3)</span> · MATCH("Desk",G2:G21,0)</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=IF(I2&gt;1000,"Big","Small")</span> · IFERROR(J2/K2,"n/a")</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=CONCAT(B2," ",C2)</span> · TEXTJOIN(", ",1,A2:A5)</p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=ROUND / ROUNDUP / ROUNDDOWN / INT / MOD</span></p>
              <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">=LEFT / RIGHT / MID / LEN / TRIM / PROPER</span></p>
            </div>
          </div>
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Excel keyboard</span></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-3 text-[11px] text-muted-foreground">
              {[["Ctrl+B / I / U", "bold / italic / underline"], ["Ctrl+C / X / V", "copy / cut / paste"], ["Ctrl+Z / Y", "undo / redo"], ["Ctrl+D", "fill down"], ["Ctrl+F", "find & replace"], ["Ctrl+A", "select all"], ["F2", "edit active cell"], ["Shift+arrows", "extend selection"]].map(([k, d]) => (
                <React.Fragment key={k}>
                  <span className="font-mono text-foreground/80">{k}</span>
                  <span>{d}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ autofilter panel ============ */}
      {filterCol !== null && (
        <div className={`${PANEL} w-full max-w-md p-3`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Filter — column {colName(filterCol)}</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setHidden((h) => ({ ...h, [filterCol]: new Set() }))}>Show all</Button>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setFilterCol(null)}><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <p className="mb-1.5 text-[11px] text-muted-foreground">Uncheck the values you want to hide. These behave like real Excel AutoFilter dropdowns.</p>
          <div className="max-h-52 space-y-0.5 overflow-auto rounded-lg border border-border p-1.5 scrollbar-thin">
            {distinctValues(filterCol).map((v) => {
              const excluded = hidden[filterCol]?.has(v);
              return (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-muted/60">
                  <Checkbox checked={!excluded} onCheckedChange={() => toggleFilterColValue(filterCol, v)} className="accent-emerald-500" />
                  <span className="truncate font-mono">{v}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ find & replace dialog ============ */}
      {findDlg && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24" onMouseDown={() => setFindDlg(null)}>
          <div className={`${PANEL} w-[420px] p-4 shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Search className="h-4 w-4 text-emerald-500" /> Find and Replace</p>
            <div className="space-y-2">
              <Input autoFocus value={findDlg.find} onChange={(e) => setFindDlg({ ...findDlg, find: e.target.value })} placeholder="Find what…" className="h-8 border-border text-[13px]" onKeyDown={(e) => e.key === "Enter" && findAll()} />
              <Input value={findDlg.replace} onChange={(e) => setFindDlg({ ...findDlg, replace: e.target.value })} placeholder="Replace with…" className="h-8 border-border text-[13px]" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 border-border" onClick={findAll}>Find All</Button>
              <Button size="sm" className="h-8 bg-emerald-500 text-white hover:bg-emerald-400" onClick={replaceAll}>Replace All</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setFindDlg(null)}>Close</Button>
            </div>
            {findDlg.results.length > 0 && (
              <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-border p-1.5 scrollbar-thin">
                <p className="px-1 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{findDlg.results.length} match{findDlg.results.length === 1 ? "" : "es"} — click to jump</p>
                {findDlg.results.map((ref) => (
                  <button key={ref} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-[12px] hover:bg-muted/60" onClick={() => gotoRef(ref)}>
                    <b className="text-emerald-600 dark:text-emerald-300">{ref}</b>
                    <span className="truncate text-muted-foreground">{displayValue(ref, cells, styles)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ context menu ============ */}
      {ctxMenu && (
        <div className="fixed z-50" style={{ left: ctxMenu.x, top: ctxMenu.y }} onMouseDown={(e) => e.stopPropagation()}>
          <Menu align="left">
            <MenuItem onClick={() => { copySel(false); setCtxMenu(null); }}><Copy className="mr-1.5 inline h-3 w-3" />Copy</MenuItem>
            <MenuItem onClick={() => { copySel(true); setCtxMenu(null); }}><Scissors className="mr-1.5 inline h-3 w-3" />Cut</MenuItem>
            <MenuItem onClick={() => { pasteAt(); setCtxMenu(null); }} disabled={!clipboard}><Clipboard className="mr-1.5 inline h-3 w-3" />Paste</MenuItem>
            <div className="my-1 h-px bg-border" />
            <MenuItem onClick={() => { shiftRows(nSel.r1, 1); setCtxMenu(null); }}>Insert row above</MenuItem>
            <MenuItem onClick={() => { shiftCols(nSel.c1, 1); setCtxMenu(null); }}>Insert column left</MenuItem>
            <MenuItem onClick={() => { shiftRows(nSel.r1, -1); setCtxMenu(null); }}>Delete row</MenuItem>
            <MenuItem onClick={() => { shiftCols(nSel.c1, -1); setCtxMenu(null); }}>Delete column</MenuItem>
            <div className="my-1 h-px bg-border" />
            <MenuItem onClick={() => { sortRows(selectedColIdx, 1); setCtxMenu(null); }}>Sort A→Z (col {colName(selectedColIdx)})</MenuItem>
            <MenuItem onClick={() => { sortRows(selectedColIdx, -1); setCtxMenu(null); }}>Sort Z→A</MenuItem>
            <MenuItem onClick={() => { clearFormatSel(); setCtxMenu(null); }}>Clear formats</MenuItem>
            <MenuItem onClick={() => { pushUndo(); setCells((c) => { const n = { ...c }; for (const ref of rectRefs(nSel)) delete n[ref]; return n; }); setCtxMenu(null); }}>Clear contents</MenuItem>
          </Menu>
        </div>
      )}

      <Coach view="excel" mission={EXCEL_MISSION} tips={tips} why="Excel is still the #1 tool analysts touch daily. Companies test formula fluency in interviews (SUMIFs, VLOOKUP, IF) because cleaned, well-structured sheets are how estimates, budgets and one-off analyses actually get done — before anything reaches Power BI." />
    </div>
  );
}

/* ================= ribbon atoms ================= */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative mx-1.5 flex flex-col rounded-lg border border-border/70 bg-muted/20 px-2 pb-4 pt-1.5">
      <div className="flex flex-wrap items-center gap-1">{children}</div>
      <span className="pointer-events-none absolute bottom-0.5 left-0 right-0 text-center text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">{label}</span>
    </div>
  );
}

function RibbonBtn({ title, onClick, children, active, disabled }: {
  title: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            className={`flex h-7 items-center rounded-md border px-1.5 text-[11px] transition-colors disabled:opacity-40 ${
              active
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "border-transparent text-foreground/80 hover:border-border hover:bg-muted"
            }`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ColorBtn({ icon, title, swatch, open, onToggle, onPick, colors, noneLabel }: {
  icon: React.ReactNode; title: string; swatch: string; open: boolean; onToggle: () => void;
  onPick: (c: string) => void; colors: string[]; noneLabel: string;
}) {
  return (
    <span className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <RibbonBtn title={title} onClick={onToggle} active={open}>
        {icon}<ChevronDown className="ml-0.5 h-2.5 w-2.5" />
      </RibbonBtn>
      {open && (
        <Menu>
          {noneLabel && <MenuItem onClick={() => onPick("")}><span className="mr-1 inline-block h-3 w-3 rounded-sm border border-border bg-background" /> {noneLabel}</MenuItem>}
          <div className="grid grid-cols-5 gap-1.5 p-2">
            {colors.map((c) => (
              <button key={c} className={`h-5 w-5 rounded border ${swatch === c ? "border-foreground ring-2 ring-emerald-500/40" : "border-border"}`} style={{ background: c || undefined }} onClick={() => onPick(c)} aria-label={c || noneLabel} />
            ))}
          </div>
        </Menu>
      )}
    </span>
  );
}

function Menu({ children, align = "right" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div className={`absolute top-full z-40 mt-1 min-w-[190px] rounded-xl border border-border bg-popover p-1 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}>
      {children}
    </div>
  );
}

function MenuItem({ children, onClick, disabled, check }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; check?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-1 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-foreground/90 hover:bg-muted disabled:opacity-40"
    >
      {check !== undefined && <Check className={`h-3.5 w-3.5 ${check ? "text-emerald-500" : "opacity-0"}`} />}
      {children}
    </button>
  );
}
