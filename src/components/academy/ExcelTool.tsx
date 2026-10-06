"use client";

/* Excel Studio — spreadsheet with a real formula engine, CSV import/export,
   sort/dedupe/text ops, stats panel and saved sheets. All client-side, instant. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolHeader, PANEL, PANEL_HEAD, fmtNum } from "./shared";
import { useAcademy } from "@/lib/academy/store";
import {
  getAllDatasets, getDatasetById, rowsToCSV, downloadFile, type Row,
} from "@/lib/academy/datasets";
import Papa from "papaparse";
import {
  Database, Download, Eraser, FileSpreadsheet, Save, Sigma, Trash2, Upload, Wand2, FolderOpen,
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
type Arg = { kind: "value"; v: Val } | { kind: "range"; values: string[] };

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
    return parsePrimary();
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
    const numMatch = /^\d+(\.\d+)?/.exec(src.slice(pos));
    if (numMatch) { pos += numMatch[0].length; return parseFloat(numMatch[0]); }
    const fnMatch = /^([A-Z][A-Z0-9.]*)\(/i.exec(src.slice(pos));
    if (fnMatch) {
      const name = fnMatch[1].toUpperCase();
      pos += fnMatch[0].length;
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
        return { kind: "range", values: rangeValues(ref, ref2Match[0].toUpperCase(), cells, stack) };
      }
      return { kind: "value", v: cellValue(ref, cells, stack) };
    }
    if (/^TRUE$/i.test(src.slice(pos, pos + 4))) { pos += 4; return 1; }
    if (/^FALSE$/i.test(src.slice(pos, pos + 5))) { pos += 5; return 0; }
    throw new FormulaError("#NAME?");
  }

  function parseArg(): Arg {
    ws();
    const startRef = /^\$?[A-Za-z]\$?\d+/.exec(src.slice(pos));
    if (startRef) {
      const ref = startRef[0].toUpperCase();
      const after = src.slice(pos + startRef[0].length);
      if (/^\s*:/.test(after)) {
        const m2 = /^\s*:\s*\$?[A-Za-z]\$?\d+/.exec(after);
        if (m2) {
          const ref2 = /^\s*:\s*(\$?[A-Za-z]\$?\d+)/.exec(after)![1].toUpperCase();
          pos += startRef[0].length + /^\s*:\s*\$?[A-Za-z]\$?\d+/.exec(after)![0].length;
          return { kind: "range", values: rangeValues(ref, ref2, cells, stack) };
        }
      }
    }
    const v = parseExpr();
    return { kind: "value", v };
  }

  const v = parseExpr();
  ws();
  if (pos < src.length) throw new FormulaError("#SYNTAX!");
  return v;
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
function rangeValues(a: string, b: string, cells: Record<string, string>, stack: Set<string>): string[] {
  const [c1, r1] = parseRef(a)!;
  const [c2, r2] = parseRef(b)!;
  const [cMin, cMax] = [Math.min(c1, c2), Math.max(c1, c2)];
  const [rMin, rMax] = [Math.min(r1, r2), Math.max(r1, r2)];
  const out: string[] = [];
  for (let r = rMin; r <= rMax; r++)
    for (let c = cMin; c <= cMax; c++)
      out.push(String(cellValue(refFor(c, r), cells, stack) ?? ""));
  return out;
}

function callFn(name: string, args: Arg[], ): Val {
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
    case "COUNT": return numeric(flat()).length;
    case "COUNTA": return nonEmpty().length;
    case "MIN": { const n = numeric(flat()); return n.length ? Math.min(...n) : 0; }
    case "MAX": { const n = numeric(flat()); return n.length ? Math.max(...n) : 0; }
    case "ROUND": {
      const a = args.map((x) => (x.kind === "value" ? x.v : num(x.values[0] ?? "0")));
      const d = a.length > 1 ? num(a[1]) : 0;
      return +num(a[0]).toFixed(d);
    }
    case "ABS": return Math.abs(num(args[0].kind === "value" ? args[0].v : num(args[0].values[0] ?? "0")));
    case "IF": {
      const cond = args[0].kind === "value" ? args[0].v : num(args[0].values[0] ?? "0");
      const yes = args[1]?.kind === "value" ? args[1].v : args[1]?.values[0] ?? "";
      const no = args[2]?.kind === "value" ? args[2].v : args[2]?.values[0] ?? "";
      const truthy = typeof cond === "number" ? cond !== 0 : String(cond).toUpperCase() === "TRUE" || (String(cond) !== "" && String(cond) !== "FALSE");
      return truthy ? yes : no;
    }
    case "AND": return args.every((a) => (typeof a.v === "number" ? a.v !== 0 : String(a.v).toUpperCase() !== "FALSE" && a.v !== "")) ? 1 : 0;
    case "OR": return args.some((a) => (typeof a.v === "number" ? a.v !== 0 : String(a.v).toUpperCase() === "TRUE")) ? 1 : 0;
    case "UPPER": return String(args[0].kind === "value" ? args[0].v : args[0].values[0] ?? "").toUpperCase();
    case "LOWER": return String(args[0].kind === "value" ? args[0].v : args[0].values[0] ?? "").toLowerCase();
    case "TRIM": return String(args[0].kind === "value" ? args[0].v : args[0].values[0] ?? "").trim();
    case "LEN": return String(args[0].kind === "value" ? args[0].v : args[0].values[0] ?? "").length;
    case "SUMIF":
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
      vals.forEach((v, i) => {
        if (v !== "" && test(v)) {
          const n = parseFloat(String(sums[i] ?? "").replace(/[$,\s]/g, ""));
          if (!isNaN(n)) s += n;
        }
      });
      return s;
    }
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
export function ExcelTool() {
  const { sheets, saveSheet, deleteSheet } = useAcademy();
  const [cells, setCells] = React.useState<Record<string, string>>({});
  const [active, setActive] = React.useState("A1");
  const [editVal, setEditVal] = React.useState<string | null>(null);
  const [sheetName, setSheetName] = React.useState("");
  const [selectedCol, setSelectedCol] = React.useState(0);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

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
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      startEdit(e.key);
      e.preventDefault();
    }
  };

  const loadDataset = (id: string) => {
    const ds = id === "messy_sales" ? getDatasetById("messy_sales")! : getAllDatasets().find((d) => d.id === id);
    if (!ds) return;
    const next: Record<string, string> = {};
    ds.columns.forEach((col, ci) => { next[refFor(ci, 0)] = col.name; });
    ds.rows.slice(0, 150).forEach((row: Row, ri) => {
      ds.columns.forEach((col, ci) => {
        const v = row[col.key];
        if (v !== undefined && v !== "") next[refFor(ci, ri + 1)] = String(v);
      });
    });
    setCells(next);
    setActive("A1");
  };

  const importCSV = (file: File) => {
    Papa.parse<Row>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (res) => {
        const next: Record<string, string> = {};
        res.data.slice(0, 200).forEach((row, ri) => {
          (row as string[]).slice(0, COLS).forEach((v, ci) => {
            if (v !== "") next[refFor(ci, ri)] = String(v);
          });
        });
        setCells(next);
        setActive("A1");
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

  const colStats = React.useMemo(() => {
    const stats: { n: number; sum: number; mean: number; median: number; std: number; min: number; max: number } | null = (() => {
      const vals: number[] = [];
      for (let r = 0; r < usedR; r++) {
        const v = parseFloat(String(displayValue(refFor(selectedCol, r), cells)).replace(/[$,\s]/g, ""));
        if (!isNaN(v) && String(displayValue(refFor(selectedCol, r), cells)) !== "") vals.push(v);
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
  const [ac, ar] = parseRef(active)!;

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<FileSpreadsheet className="h-5 w-5 text-emerald-400" />}
        title="Excel Studio"
        subtitle="Full spreadsheet with formula engine — SUM to SUMIF, stats, sort, dedupe, CSV in/out"
        actions={
          <>
            <Select onValueChange={(v) => loadDataset(v)}>
              <SelectTrigger className="w-[190px] border-white/15 bg-zinc-900 text-sm"><Database className="mr-1 h-4 w-4 text-emerald-400" /><SelectValue placeholder="Load sample data…" /></SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900">
                {getAllDatasets().map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                <SelectItem value="messy_sales">Retail Sales H2-2024 (Messy)</SelectItem>
              </SelectContent>
            </Select>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent hover:bg-white/10" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent hover:bg-white/10" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
          </>
        }
      />

      {/* formula bar */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-20 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/40 font-mono text-sm font-bold text-emerald-300">{active}</div>
        <div className="flex h-9 flex-1 items-center rounded-lg border border-white/15 bg-black/40 px-3 font-mono text-sm text-zinc-200">
          <Sigma className="mr-2 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-zinc-600"
            placeholder="Type a value or =SUM(A1:A50)  ·  =IF(A2>100,&quot;Big&quot;,&quot;Small&quot;)"
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

      {/* toolbar */}
      <div className={`${PANEL} flex flex-wrap items-center gap-1.5 px-2 py-1.5 text-xs`}>
        <span className="px-1 text-zinc-500">Sort col {colName(selectedCol)}:</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sortRows(selectedCol, 1)}>A→Z</Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sortRows(selectedCol, -1)}>Z→A</Button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={dedupeRows}><Eraser className="mr-1 h-3 w-3" />Remove duplicate rows</Button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <span className="px-1 text-zinc-500">Text col {colName(selectedCol)}:</span>
        {(["trim", "upper", "lower", "title"] as const).map((m) => (
          <Button key={m} variant="ghost" size="sm" className="h-7 px-2 text-xs capitalize" onClick={() => transformCol(m)}><Wand2 className="mr-1 h-3 w-3" />{m}</Button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-300 hover:bg-red-500/10" onClick={() => setCells({})}><Trash2 className="mr-1 h-3 w-3" />Clear sheet</Button>
        <span className="ml-auto flex items-center gap-1.5">
          <Input value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Sheet name" className="h-7 w-28 border-white/15 bg-black/30 text-xs" />
          <Button variant="outline" size="sm" className="h-7 border-white/15 px-2 text-xs" onClick={() => sheetName && saveSheet(sheetName, cells)}><Save className="h-3 w-3" /> Save</Button>
          {Object.keys(sheets).length > 0 && (
            <Select onValueChange={(v) => { setCells(sheets[v].cells); setSheetName(v); }}>
              <SelectTrigger className="h-7 w-[130px] border-white/15 bg-zinc-900 text-xs"><FolderOpen className="mr-1 h-3 w-3 text-emerald-400" /><SelectValue placeholder="Open saved…" /></SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900">
                {Object.values(sheets).map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    <span className="flex items-center justify-between gap-2"><span>{s.name}</span><span className="text-[10px] text-zinc-500">{new Date(s.savedAt).toLocaleDateString()}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </span>
      </div>

      {/* grid + stats */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={onKey}
          className={`${PANEL} flex-1 overflow-auto outline-none scrollbar-thin`} style={{ maxHeight: "62vh" }}
        >
          <table className="border-collapse text-[13px]" style={{ minWidth: viewCols * 96 }}>
            <thead>
              <tr className="sticky top-0 z-10 bg-zinc-900">
                <th className="sticky left-0 z-20 w-10 border-b border-r border-white/10 bg-zinc-900 px-1 py-1.5 text-[10px] font-medium text-zinc-500" />
                {Array.from({ length: viewCols }, (_, c) => (
                  <th
                    key={c}
                    onClick={() => setSelectedCol(c)}
                    className={`cursor-pointer border-b border-r border-white/10 px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      selectedCol === c ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-900 text-zinc-500 hover:bg-white/5"
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
                  <td className={`sticky left-0 z-10 w-10 border-b border-r border-white/10 bg-zinc-900 px-1 py-1 text-center text-[10px] font-medium ${active.endsWith(String(r + 1)) ? "text-emerald-300" : "text-zinc-500"}`}>{r + 1}</td>
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
                        className={`relative h-[26px] max-w-[180px] cursor-cell overflow-hidden whitespace-nowrap border-b border-r border-white/[0.06] px-2 py-0.5 text-right transition-colors ${
                          numeric ? "text-zinc-200" : "text-left text-zinc-300"
                        } ${isA ? "outline outline-2 -outline-offset-1 outline-emerald-400" : selectedCol === c ? "bg-emerald-500/[0.04]" : "hover:bg-white/[0.03]"}`}
                        style={{ minWidth: 96 }}
                      >
                        {isA && editVal !== null ? (
                          <input
                            autoFocus
                            className="absolute inset-0 z-10 w-full bg-zinc-800 px-2 font-mono text-[12px] text-white outline outline-2 -outline-offset-1 outline-emerald-400"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={commit}
                          />
                        ) : (
                          <span className={isFormula ? "italic" : ""}>{disp}</span>
                        )}
                        {isFormula && <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-sky-400/70" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* stats + help */}
        <div className="w-full shrink-0 space-y-3 lg:w-72">
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Column stats — {colName(selectedCol)}</span></div>
            <div className="p-3 text-[13px]">
              {colStats ? (
                <div className="space-y-1.5">
                  {[
                    ["Count", colStats.n], ["Sum", colStats.sum], ["Mean", colStats.mean],
                    ["Median", colStats.median], ["Std dev", colStats.std], ["Min", colStats.min], ["Max", colStats.max],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span className="text-zinc-500">{k as string}</span>
                      <span className="font-mono text-zinc-200">{fmtNum(v as number)}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] leading-snug text-zinc-500">If mean ≫ median the column is right-skewed — report the median.</p>
                </div>
              ) : (
                <p className="text-zinc-500">Select a column with numbers. Try loading sample data first.</p>
              )}
            </div>
          </div>
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Formula cheat-sheet</span></div>
            <div className="space-y-1 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
              <p><span className="text-emerald-300">=SUM(B2:B100)</span> · total</p>
              <p><span className="text-emerald-300">=AVERAGE / MEDIAN / STDEV</span></p>
              <p><span className="text-emerald-300">=SUMIF(E:E,"North",J:J)</span></p>
              <p><span className="text-emerald-300">=COUNTIF(E:E,"&gt;500")</span></p>
              <p><span className="text-emerald-300">=IF(J2&gt;1000,"Big","Small")</span></p>
              <p><span className="text-emerald-300">=ROUND(J2/12, 2)</span> · <span className="text-emerald-300">&amp;</span> joins text</p>
            </div>
          </div>
          {Object.keys(sheets).length > 0 && (
            <div className={PANEL}>
              <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Saved sheets</span></div>
              <div className="space-y-1 p-2">
                {Object.values(sheets).map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/5">
                    <button className="flex-1 text-left" onClick={() => { setCells(s.cells); setSheetName(s.name); }}>{s.name}</button>
                    <button className="text-zinc-500 hover:text-red-400" onClick={() => deleteSheet(s.name)}><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
