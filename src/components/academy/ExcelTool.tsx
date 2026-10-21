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
import { ToolHeader, PANEL, fmtNum, downloadDatasetCSV } from "./shared";
import { Coach } from "./Coach";
import { useAcademy } from "@/lib/academy/store";
import { coachSay } from "@/lib/academy/coach-bus";
import { LiveCoach } from "./LiveCoach";
import { getDatasetById, getSampleCatalog, downloadFile, type Row } from "@/lib/academy/datasets";
import Papa from "papaparse";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell as RCell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from "recharts";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownWideNarrow, ArrowUpNarrowWide,
  Baseline, Bold, ChartColumn, ChartLine, ChartPie, Check, ChevronDown, Clipboard,
  Copy, Download, Eraser, Filter, Grid2x2, Highlighter, Italic, ListFilter,
  PaintBucket, Percent, Plus, Redo2, Search, Save, Sigma, Scissors, Trash2,
  Underline, Undo2, Upload, Wand2, X, DollarSign, Hash, Snowflake,
  SpellCheck2, ZoomIn, ZoomOut, RotateCcw, Table2, TableCellsMerge, SquareSplitHorizontal, WrapText,
  RefreshCw, Globe2, Database, Columns3, ClipboardCheck, Group as GroupIcon, Ungroup,
  ChevronsDownUp, ChevronsUpDown, Target, Link2, WandSparkles, Braces, Landmark, TrendingUp,
} from "lucide-react";

import { COLS, ROWS, colName, refFor, parseRef, evalSheetFormula, FormulaError } from "@/lib/academy/formula-engine";
import { profileSnapshot, applyFix, FIX_LABELS, type DoctorSnapshot, type FixId } from "@/lib/academy/data-doctor";
import {
  MS, SEGOE, MsTitleBar, MsWindowGlyphs, MsAutoSave, MsQatBtn, RibbonTabs, RibbonBody, RGroup, RBig, RSmall, MsTip,
  MsMenu, MsMenuItem, MsSep, MsDialog, MsBackstage, MsSelect, ExcelLogo,
} from "./msui";
import { Info, BookOpenText, CircleHelp, GalleryVerticalEnd, Grid3x3, MessageSquarePlus } from "lucide-react";

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
  wr?: boolean;
  dec?: number;
  ff?: string;
}

export interface MergeRect { c1: number; r1: number; c2: number; r2: number }

interface XSheet {
  id: string;
  name: string;
  color?: string;
  cells: Record<string, string>;
  styles: Record<string, CellStyle>;
  colW: Record<number, number>;
  freeze: "none" | "top" | "first" | "both";
  cfRules: CfRule[];
  merges?: MergeRect[];
  comments?: Record<string, string>;
  validation?: SheetValidation[];
}

interface SheetValidation {
  col: number;
  type: "whole" | "decimal" | "list";
  min?: number;
  max?: number;
  list?: string[];
}

interface ConnectionInfo {
  id: string;
  name: string;
  kind: "sample" | "csv";
  rows: number;
  datasetId?: string;
  at: number;
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
const FONT_FAMILIES = ["Calibri", "Aptos", "Arial", "Segoe UI", "Times New Roman", "Courier New", "Georgia", "Verdana"];
const EXCEL_CHART_COLORS = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"];

function newSheet(name: string): XSheet {
  return { id: `sh_${Math.random().toString(36).slice(2, 9)}`, name, cells: {}, styles: {}, colW: {}, freeze: "none", cfRules: [], merges: [] };
}

function normSel(sel: Sel): NormSel {
  return {
    c1: Math.min(sel.a[0], sel.b[0]),
    c2: Math.max(sel.a[0], sel.b[0]),
    r1: Math.min(sel.a[1], sel.b[1]),
    r2: Math.max(sel.a[1], sel.b[1]),
  };
}

function fmtCellDisplay(v: string, nf: NumFmt | undefined, dec?: number): string {
  if (!nf || nf === "general" || v === "" || v.startsWith("#")) return v;
  const isNum = v !== "" && !isNaN(parseFloat(v.replace(/[$,\s]/g, "")));
  const n = isNum ? parseFloat(v.replace(/[$,\s]/g, "")) : null;
  if (n === null) return v;
  const d = dec ?? 2;
  switch (nf) {
    case "number": return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    case "currency": return `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
    case "comma": return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    case "percent": return `${(n * 100).toLocaleString("en-US", { minimumFractionDigits: dec === undefined ? 0 : dec, maximumFractionDigits: dec === undefined ? 1 : dec })}%`;
    case "text": return v;
    default: return v;
  }
}

function displayValue(ref: string, cells: Record<string, string>, styles: Record<string, CellStyle>): string {
  const raw = cells[ref];
  if (raw === undefined || raw === "") return "";
  if (!raw.startsWith("=")) return fmtCellDisplay(raw, styles[ref]?.nf, styles[ref]?.dec);
  try {
    const v = evalSheetFormula(raw.slice(1), cells, new Set([ref]));
    if (typeof v === "number") {
      const st = styles[ref];
      if (st?.nf) return fmtCellDisplay(String(v), st.nf, st.dec);
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

/** Data Validation check — mirrors real Excel's Stop alert behavior. */
function validateValue(raw: string, rule: SheetValidation): { ok: boolean; msg: string } {
  if (rule.type === "list") {
    const hit = rule.list?.some((x) => x.trim().toLowerCase() === raw.trim().toLowerCase());
    return hit ? { ok: true, msg: "" } : { ok: false, msg: `the value must be one of: ${rule.list?.slice(0, 6).join(", ")}${(rule.list?.length ?? 0) > 6 ? "…" : ""}` };
  }
  const n = parseFloat(raw.replace(/[$,\s]/g, ""));
  if (Number.isNaN(n)) return { ok: false, msg: "a number is required in this column" };
  if (rule.type === "whole" && !Number.isInteger(n)) return { ok: false, msg: "a whole number is required in this column" };
  if (rule.min !== undefined && n < rule.min) return { ok: false, msg: `value must be ≥ ${rule.min}` };
  if (rule.max !== undefined && n > rule.max) return { ok: false, msg: `value must be ≤ ${rule.max}` };
  return { ok: true, msg: "" };
}

/** Linked data types (offline training snapshot): Geography + Stocks. */
const GEO_TYPES: Record<string, { capital: string; population: number }> = {
  "united states": { capital: "Washington, D.C.", population: 331900000 },
  "usa": { capital: "Washington, D.C.", population: 331900000 },
  "united kingdom": { capital: "London", population: 67330000 },
  "france": { capital: "Paris", population: 67850000 },
  "germany": { capital: "Berlin", population: 83240000 },
  "spain": { capital: "Madrid", population: 47350000 },
  "italy": { capital: "Rome", population: 58940000 },
  "japan": { capital: "Tokyo", population: 125700000 },
  "china": { capital: "Beijing", population: 1412000000 },
  "india": { capital: "New Delhi", population: 1408000000 },
  "brazil": { capital: "Brasília", population: 214300000 },
  "canada": { capital: "Ottawa", population: 38250000 },
  "australia": { capital: "Canberra", population: 25690000 },
  "nigeria": { capital: "Abuja", population: 211400000 },
  "mexico": { capital: "Mexico City", population: 126500000 },
};
const STOCK_TYPES: Record<string, { price: number; change: number }> = {
  AAPL: { price: 228.4, change: 1.2 }, MSFT: { price: 419.1, change: -0.6 },
  GOOGL: { price: 166.8, change: 0.9 }, AMZN: { price: 186.3, change: 2.1 },
  TSLA: { price: 249.7, change: -2.4 }, NVDA: { price: 121.9, change: 3.5 },
  META: { price: 507.2, change: 1.8 }, NFLX: { price: 689.5, change: 0.4 },
};

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
    wb.sheets = wb.sheets.map((s) => ({ ...s, merges: s.merges ?? [] }));
    return wb;
  } catch { return null; }
}

/* ================= component ================= */
export function ExcelTool() {
  const { sheets: savedSheets, saveSheet, deleteSheet, setView } = useAcademy();
  /* workbook state */
  const [sheets, setSheets] = React.useState<XSheet[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");
  const [loaded, setLoaded] = React.useState(false);

  /* selection & editing */
  const [sel, setSel] = React.useState<Sel>({ a: [0, 0], b: [0, 0] });
  const [editVal, setEditVal] = React.useState<string | null>(null);
  const [nameBoxVal, setNameBoxVal] = React.useState<string | null>(null);

  /* chrome */
  const [ribbonTab, setRibbonTab] = React.useState<"home" | "insert" | "layout" | "formulas" | "data" | "review" | "view" | "help">("home");
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

  /* ms chrome */
  const [backstage, setBackstage] = React.useState<string | null>(null);
  const [fmtDlg, setFmtDlg] = React.useState(false);
  const [funcDlg, setFuncDlg] = React.useState(false);
  const [pasteMenu, setPasteMenu] = React.useState(false);
  const [autoSave, setAutoSave] = React.useState(true);
  const [headings, setHeadings] = React.useState(true);
  const [showFormulaBar, setShowFormulaBar] = React.useState(true);
  const [wbName, setWbName] = React.useState("Book1");
  const [styleMenu, setStyleMenu] = React.useState(false);
  const [dataMenu, setDataMenu] = React.useState(false);
  const [pivotDlg, setPivotDlg] = React.useState<{ rowField: number; valField: number; agg: "SUM" | "COUNT" | "AVERAGE"; colField: number | undefined } | null>(null);
  const [commentDlg, setCommentDlg] = React.useState<{ ref: string; text: string } | null>(null);
  const [helpDlg, setHelpDlg] = React.useState<"keys" | "about" | null>(null);

  /* Data tab — real-Excel dialogs & features */
  const [sortDlg, setSortDlg] = React.useState<{ levels: { col: number; dir: 1 | -1 }[] } | null>(null);
  const [ttcDlg, setTtcDlg] = React.useState<{ step: 1 | 2; delim: "comma" | "semicolon" | "tab" | "space" } | null>(null);
  const [dedupeDlg, setDedupeDlg] = React.useState<{ cols: number[] } | null>(null);
  const [validDlg, setValidDlg] = React.useState<{ type: "whole" | "decimal" | "list"; min: string; max: string; list: string } | null>(null);
  const [consDlg, setConsDlg] = React.useState<{ fn: "SUM" | "COUNT" | "AVERAGE" | "MAX" | "MIN"; keyCol: number; valCol: number } | null>(null);
  const [subDlg, setSubDlg] = React.useState<{ groupCol: number; fn: "SUM" | "COUNT" | "AVERAGE"; valCol: number } | null>(null);
  const [goalDlg, setGoalDlg] = React.useState<{ setCell: string; toVal: string; byCell: string; result: string | null } | null>(null);
  const [advDlg, setAdvDlg] = React.useState<{ col: number } | null>(null);
  const [webDlg, setWebDlg] = React.useState<{ url: string } | null>(null);
  const [dtDlg, setDtDlg] = React.useState<{ kind: "geo" | "stock" } | null>(null);
  const [connPane, setConnPane] = React.useState(false);
  const [connections, setConnections] = React.useState<ConnectionInfo[]>([]);
  const [refreshMenu, setRefreshMenu] = React.useState(false);
  const [whatIfMenu, setWhatIfMenu] = React.useState(false);
  const [rowGroups, setRowGroups] = React.useState<{ r1: number; r2: number }[]>([]);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<number>>(new Set());
  const lastDatasetRef = React.useRef<string | null>(null);

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
    if (!autoSave) return;
    try { localStorage.setItem(WB_KEY, JSON.stringify({ sheets, activeId })); } catch { /* full */ }
  }, [sheets, activeId, loaded, autoSave]);

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
    coachSay("excel", "excel.undo", "Undo");
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
    coachSay("excel", "excel.undo", "Redo");
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
    const pc = parseRef(active);
    /* Data Validation — real Excel refuses the entry with a Stop alert */
    if (pc && editVal !== "" && !editVal.startsWith("=")) {
      const rule = sheet?.validation?.find((v) => v.col === pc[0]);
      if (rule) {
        const chk = validateValue(editVal, rule);
        if (!chk.ok) {
          coachSay("excel", "excel.validate", "Data Validation blocked an invalid entry", chk.msg);
          setLoadedInfo(`⚠ Data Validation stopped this entry: ${chk.msg}. Fix the value, or review the rule under Data ▸ Data Validation.`);
          return;
        }
      }
    }
    pushUndo();
    if (editVal.startsWith("=")) coachSay("excel", "excel.formula", `Entered a formula in ${active}`, editVal);
    else if (editVal !== "") coachSay("excel", "excel.edit", `Typed a value into ${active}`, editVal);
    setCells((c) => {
      const next = { ...c };
      if (editVal === "") delete next[active];
      else next[active] = editVal;
      return next;
    });
    setEditVal(null);
    const [c, r] = pc!;
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
    if (patch && typeof patch === "object") {
      const keys = Object.keys(patch);
      if (keys.length === 1 && keys[0] === "nf") coachSay("excel", "excel.numfmt", "Changed the number format of the selection", String((patch as CellStyle).nf));
      else coachSay("excel", "excel.format", "Formatted the selection (font / fill / border / alignment)");
    }
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
    coachSay("excel", "excel.clearfmt", "Cleared formatting from the selection");
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
    coachSay("excel", "excel.sort", `Sorted by column ${colName(colIdx)} ${dir === 1 ? "A\u2192Z" : "Z\u2192A"}`);
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
    coachSay("excel", "excel.clean", "Removed duplicate rows");
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
    coachSay("excel", "excel.clean", `Cleaned text in column ${colName(selectedColIdx)} (${mode})`);
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

  /* ================= Data tab — real-Excel features (v4) ================= */

  /** multi-level sort (Sort dialog) */
  const multiSort = (levels: { col: number; dir: 1 | -1 }[]) => {
    if (!levels.length) return;
    coachSay("excel", "excel.multisort", `Sorted by ${levels.map((l) => `${headerLabel(l.col)} ${l.dir === 1 ? "A→Z" : "Z→A"}`).join(", then ")}`);
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
      for (const lv of levels) {
        const av = a[lv.col] ?? "", bv = b[lv.col] ?? "";
        const an = parseFloat(av.replace(/[$,\s]/g, "")), bn = parseFloat(bv.replace(/[$,\s]/g, ""));
        let cmp: number;
        if (!isNaN(an) && !isNaN(bn)) cmp = an - bn;
        else cmp = av.localeCompare(bv, undefined, { numeric: true });
        if (cmp !== 0) return cmp * lv.dir;
      }
      return 0;
    });
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) { const h = cells[refFor(c, 0)]; if (h) next[refFor(c, 0)] = h; }
    dataRows.forEach((row, ri) => { row.forEach((v, ci) => { if (v !== "") next[refFor(ci, ri + 1)] = v; }); });
    setCells(() => next);
    setRowGroups([]); setCollapsedGroups(new Set());
    setSortDlg(null);
    setLoadedInfo(`Sorted ${levels.length} level${levels.length > 1 ? "s" : ""}: ${levels.map((l) => headerLabel(l.col)).join(", then ")}.`);
    gridRef.current?.focus();
  };

  /** Text to Columns — split the selected column by delimiter, inserting new columns */
  const textToColumns = (delim: "comma" | "semicolon" | "tab" | "space") => {
    const sep: string | RegExp = delim === "comma" ? "," : delim === "semicolon" ? ";" : delim === "tab" ? "\t" : /\s+/;
    const col = selectedColIdx;
    const { rows: R, cols: C } = usedRange(cells);
    const splitRows: string[][] = [];
    for (let r = 0; r < R; r++) {
      const raw = cells[refFor(col, r)] ?? "";
      if (raw.startsWith("=")) { splitRows.push([raw]); continue; }
      const parts = String(sep) === "," ? raw.split(",") : delim === "semicolon" ? raw.split(";") : delim === "tab" ? raw.split("\t") : raw.trim().split(/\s+/);
      splitRows.push(parts.map((p) => (delim === "space" ? p : p.trim())).filter((p, i, arr) => !(delim === "space" && p === "" && arr.length === 1)));
    }
    const maxParts = Math.max(...splitRows.map((p) => p.length), 1);
    if (maxParts < 2) {
      setTtcDlg(null);
      setLoadedInfo(`No "${delim === "space" ? "spaces" : delim}" found in column ${colName(col)} — nothing to split.`);
      return;
    }
    pushUndo();
    for (let k = 0; k < maxParts - 1; k++) shiftCols(col + 1, 1);
    setCells((c) => {
      const next = { ...c };
      for (let r = 0; r < R; r++) {
        splitRows[r].forEach((p, j) => {
          const ref = refFor(col + j, r);
          if (p !== "") next[ref] = p; else delete next[ref];
        });
      }
      return next;
    });
    coachSay("excel", "excel.ttc", `Text to Columns — split ${headerLabel(col)} by "${delim}" into ${maxParts} columns`, `column ${colName(col)}`);
    setTtcDlg(null);
    setLoadedInfo(`Split column ${colName(col)} into ${maxParts} columns (${headerLabel(col)} + ${maxParts - 1} new).`);
    gridRef.current?.focus();
    void C;
  };

  /** Flash Fill — learn the transform from your first example, fill the rest */
  const flashFill = () => {
    const col = selectedColIdx;
    const nb = col > 0 ? col - 1 : col + 1;
    const { rows: R } = usedRange(cells);
    let transform: ((s: string) => string) | null = null;
    let exampleRow = -1;
    const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    for (let r = 1; r < R; r++) {
      const t = (cells[refFor(col, r)] ?? "").trim();
      const s = (cells[refFor(nb, r)] ?? "").trim();
      if (!t || !s || s.startsWith("=") || t.startsWith("=")) continue;
      if (s === t) transform = (x) => x.trim();
      else if (s.toUpperCase() === t) transform = (x) => x.trim().toUpperCase();
      else if (s.toLowerCase() === t) transform = (x) => x.trim().toLowerCase();
      else if (title(s) === t) transform = title;
      else if (s.trim().split(/\s+/)[0] === t) transform = (x) => x.trim().split(/\s+/)[0] ?? "";
      else if (s.trim().split(/\s+/).slice(1).join(" ") === t) transform = (x) => x.trim().split(/\s+/).slice(1).join(" ");
      else if (s.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("") === t) transform = (x) => x.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("");
      else if (s.replace(/[^a-z0-9]/gi, "").toLowerCase() === t.replace(/[^a-z0-9]/gi, "").toLowerCase()) transform = (x) => x.replace(/[^a-z0-9]/gi, "");
      if (transform) { exampleRow = r; break; }
    }
    if (!transform) {
      setLoadedInfo(`Flash Fill needs one example: type what you want in ${colName(col)} next to an existing value in ${colName(nb)}, then press Flash Fill.`);
      return;
    }
    let filled = 0;
    pushUndo();
    setCells((c) => {
      const next = { ...c };
      for (let r = 1; r < R; r++) {
        const cur = next[refFor(col, r)] ?? "";
        if (cur.trim() !== "") continue;
        const s = next[refFor(nb, r)] ?? "";
        if (!s.trim() || s.startsWith("=")) continue;
        const out = transform!(s);
        if (out) { next[refFor(col, r)] = out; filled++; }
      }
      return next;
    });
    coachSay("excel", "excel.flash", `Flash Fill filled ${filled} cells from your example`, `pattern learned in ${colName(col)} (from ${colName(nb)})`);
    setLoadedInfo(`Flash Fill: learned the pattern from row ${exampleRow + 1} and filled ${filled} cells in ${colName(col)}. Spot-check a few!`);
    gridRef.current?.focus();
  };

  /** Remove Duplicates with chosen key columns (dialog) */
  const dedupeCols = (cols: number[]) => {
    const { rows: R, cols: C } = usedRange(cells);
    pushUndo();
    const seen = new Set<string>();
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) { const h = cells[refFor(c, 0)]; if (h) next[refFor(c, 0)] = h; }
    let kept = 0;
    for (let r = 1; r < R; r++) {
      const key = cols.map((c) => (cells[refFor(c, r)] ?? "").trim().toLowerCase()).join("\u0001");
      if (seen.has(key)) continue;
      seen.add(key);
      for (let c = 0; c < C; c++) { const v = cells[refFor(c, r)]; if (v) next[refFor(c, kept + 1)] = v; }
      kept++;
    }
    const removed = R - 1 - kept;
    setCells(() => next);
    coachSay("excel", "excel.clean", `Remove Duplicates — key: ${cols.map((c) => headerLabel(c)).join(", ")}`, `${R - 1} rows → ${kept} (removed ${removed})`);
    setDedupeDlg(null);
    setLoadedInfo(`Remove Duplicates: ${R - 1} rows in, ${kept} out — ${removed} duplicate${removed === 1 ? "" : "s"} removed. Write those numbers down: that's your cleaning log.`);
    gridRef.current?.focus();
  };

  /** Data Validation — save a rule for the selected column */
  const applyValidation = (v: { type: "whole" | "decimal" | "list"; min: string; max: string; list: string }) => {
    const col = selectedColIdx;
    const rule: SheetValidation = { col, type: v.type };
    if (v.type === "list") rule.list = v.list.split(",").map((s) => s.trim()).filter(Boolean);
    else {
      const mn = parseFloat(v.min), mx = parseFloat(v.max);
      if (!isNaN(mn)) rule.min = mn;
      if (!isNaN(mx)) rule.max = mx;
    }
    pushUndo();
    updateSheet(sheet.id, (s) => ({ validation: [...(s.validation ?? []).filter((x) => x.col !== col), rule] }));
    coachSay("excel", "excel.validate", `Data Validation set on ${headerLabel(col)}`, v.type === "list" ? `allowed: ${rule.list?.slice(0, 4).join(", ")}…` : `${v.type} ${rule.min ?? "-∞"} to ${rule.max ?? "∞"}`);
    setValidDlg(null);
    setLoadedInfo(`Validation rule active on column ${colName(col)} (${headerLabel(col)}). Type a breaking value — Excel refuses it, exactly like the real product.`);
  };

  const circleInvalid = () => {
    const rules = sheet.validation ?? [];
    if (!rules.length) { setLoadedInfo("No validation rules yet — set one first with Data ▸ Data Validation."); return; }
    const bad: string[] = [];
    setStyles((st) => {
      const next = { ...st };
      for (const rule of rules) {
        for (let r = 1; r < usedR; r++) {
          const ref = refFor(rule.col, r);
          const v = cells[ref] ?? "";
          if (v === "") continue;
          if (!validateValue(v, rule).ok) { next[ref] = { ...next[ref], bg: "#FFC7CE" }; bad.push(ref); }
        }
      }
      return next;
    });
    setLoadedInfo(bad.length ? `Circle Invalid: ${bad.length} cell${bad.length === 1 ? "" : "s"} break the rules — circled in red. ${bad.slice(0, 6).join(", ")}${bad.length > 6 ? "…" : ""}` : "Circle Invalid: every cell passes its column's rule. ✔");
    coachSay("excel", "excel.validate", `Circled invalid data — ${bad.length} cell(s) flagged`);
  };

  const clearCircles = () => {
    setStyles((st) => {
      const next = { ...st };
      for (const rule of sheet.validation ?? [])
        for (let r = 1; r < usedR; r++) {
          const ref = refFor(rule.col, r);
          if (next[ref]?.bg === "#FFC7CE") next[ref] = { ...next[ref], bg: undefined };
        }
      return next;
    });
    setLoadedInfo("Cleared the invalid-data circles.");
  };

  /** Consolidate — aggregate rows by a key column into a new summary sheet */
  const consolidate = (fn: "SUM" | "COUNT" | "AVERAGE" | "MAX" | "MIN", keyCol: number, valCol: number) => {
    const { rows: R } = usedRange(cells);
    if (R < 2) { setConsDlg(null); return; }
    const groups = new Map<string, number[]>();
    for (let r = 1; r < R; r++) {
      const k = (cells[refFor(keyCol, r)] ?? "").trim();
      if (!k) continue;
      const raw = cells[refFor(valCol, r)] ?? "";
      const n = raw.startsWith("=") ? parseFloat(displayValue(refFor(valCol, r), cells, styles).replace(/[$,\s]/g, "")) : parseFloat(raw.replace(/[$,\s]/g, ""));
      const arr = groups.get(k) ?? [];
      if (!isNaN(n)) arr.push(n);
      groups.set(k, arr);
    }
    const agg = (xs: number[]): number => {
      if (fn === "COUNT") return groups.get(fn) ? xs.length : xs.length; // count of numeric occurrences
      if (!xs.length) return 0;
      if (fn === "SUM") return xs.reduce((a, b) => a + b, 0);
      if (fn === "AVERAGE") return xs.reduce((a, b) => a + b, 0) / xs.length;
      if (fn === "MAX") return Math.max(...xs);
      return Math.min(...xs);
    };
    pushUndo();
    const s = newSheet("Consolidation");
    const nc: Record<string, string> = {};
    nc[refFor(0, 0)] = headerLabel(keyCol);
    nc[refFor(1, 0)] = `${fn} of ${headerLabel(valCol)}`;
    const st: Record<string, CellStyle> = {
      [refFor(0, 0)]: { b: true, bg: "#e5e7eb" },
      [refFor(1, 0)]: { b: true, bg: "#e5e7eb" },
    };
    const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    keys.forEach((k, ri) => {
      nc[refFor(0, ri + 1)] = k;
      nc[refFor(1, ri + 1)] = String(+agg(groups.get(k)!).toFixed(2));
    });
    if (fn === "SUM" && keys.length) {
      nc[refFor(0, keys.length + 1)] = "Grand Total";
      nc[refFor(1, keys.length + 1)] = String(+keys.reduce((sum, k) => sum + agg(groups.get(k)!), 0).toFixed(2));
      st[refFor(0, keys.length + 1)] = { b: true };
      st[refFor(1, keys.length + 1)] = { b: true };
    }
    s.cells = nc; s.styles = st; s.freeze = "top";
    setSheets((ss) => [...ss, s]);
    setActiveId(s.id);
    setSel({ a: [0, 0], b: [0, 0] });
    coachSay("excel", "excel.consolidate", `Consolidated ${R - 1} rows into ${keys.length} groups (${fn})`, `${headerLabel(keyCol)} → ${fn} of ${headerLabel(valCol)}`);
    setConsDlg(null);
    setLoadedInfo(`Consolidation written to a new sheet: ${keys.length} groups, ${fn} of ${headerLabel(valCol)}.${fn === "SUM" ? " Grand Total included." : ""}`);
  };

  /** Subtotal — sort by group, insert subtotal rows + grand total (mutates the sheet like real Excel) */
  const insertSubtotal = (groupCol: number, fn: "SUM" | "COUNT" | "AVERAGE", valCol: number) => {
    const { rows: R, cols: C } = usedRange(cells);
    if (R < 2) { setSubDlg(null); return; }
    pushUndo();
    const rows: string[][] = [];
    for (let r = 1; r < R; r++) {
      const row: string[] = [];
      for (let c = 0; c < C; c++) row.push(cells[refFor(c, r)] ?? "");
      rows.push(row);
    }
    rows.sort((a, b) => (a[groupCol] ?? "").localeCompare(b[groupCol] ?? "", undefined, { numeric: true }));
    const num = (s: string) => parseFloat((s ?? "").replace(/[$,\s]/g, ""));
    const out: string[][] = [];
    let gi = 0;
    while (gi < rows.length) {
      let gj = gi;
      while (gj < rows.length && rows[gj][groupCol] === rows[gi][groupCol]) gj++;
      const grp = rows.slice(gi, gj);
      out.push(...grp);
      const vals = grp.map((rw) => num(rw[valCol])).filter((n) => !isNaN(n));
      const aggV = fn === "COUNT" ? vals.length : fn === "SUM" ? vals.reduce((a, b) => a + b, 0) : vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const lab = `${rows[gi][groupCol] || "(blank)"} ${fn === "AVERAGE" ? "Average" : fn} `;
      const subRow = Array.from({ length: C }, () => "");
      subRow[groupCol] = `${lab.trim()} Total`;
      subRow[valCol] = String(+aggV.toFixed(2));
      out.push(subRow);
      gi = gj;
    }
    const totals = out.map((rw) => num(rw[valCol])).filter((_, i) => out[i][groupCol].endsWith("Total"));
    const grand = fn === "COUNT" ? totals.length : fn === "SUM" ? totals.reduce((a, b) => a + b, 0) : totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const grandRow = Array.from({ length: C }, () => "");
    grandRow[groupCol] = "Grand Total";
    grandRow[valCol] = String(+grand.toFixed(2));
    out.push(grandRow);
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) { const h = cells[refFor(c, 0)]; if (h) next[refFor(c, 0)] = h; }
    out.forEach((rw, ri) => rw.forEach((v, ci) => { if (v !== "") next[refFor(ci, ri + 1)] = v; }));
    setCells(() => next);
    setStyles((st) => {
      const n2 = { ...st };
      for (let ri = 0; ri < out.length; ri++) {
        if (out[ri][groupCol].endsWith("Total") || out[ri][groupCol] === "Grand Total") {
          for (let c = 0; c < C; c++) n2[refFor(c, ri + 1)] = { ...n2[refFor(c, ri + 1)], b: true, bg: out[ri][groupCol] === "Grand Total" ? "#FCE4D6" : "#FFEB9C" };
        }
      }
      return n2;
    });
    coachSay("excel", "excel.subtotal", `Subtotals per ${headerLabel(groupCol)} (${fn}) + Grand Total`, `${out.length} rows written`);
    setSubDlg(null);
    setLoadedInfo(`Subtotals inserted: one row per ${headerLabel(groupCol)} (${fn}) plus a Grand Total. Detail was sorted by ${headerLabel(groupCol)} first.`);
    gridRef.current?.focus();
  };

  /** Goal Seek — back-solve the input so the formula hits the target */
  const runGoalSeek = (g: { setCell: string; toVal: string; byCell: string }) => {
    const sp = parseRef(g.setCell.trim().toUpperCase());
    const bp = parseRef(g.byCell.trim().toUpperCase());
    const target = parseFloat(g.toVal);
    if (!sp || !bp || isNaN(target)) { setGoalDlg({ ...g, result: "Check the cell references (like K2) and the target value." }); return; }
    const setRef = refFor(sp[0], sp[1]);
    const expr = cells[setRef] ?? "";
    if (!expr.startsWith("=")) { setGoalDlg({ ...g, result: `Cell ${setRef} must contain a formula to goal-seek.` }); return; }
    const f = (x: number): number => {
      try {
        const test = { ...cells, [refFor(bp[0], bp[1])]: String(x) };
        const v = evalSheetFormula(expr.slice(1), test, new Set([setRef]));
        return typeof v === "number" ? v : NaN;
      } catch { return NaN; }
    };
    let lo = -1e7, hi = 1e7, found: number | null = null;
    const flo = f(lo), fhi = f(hi);
    if (!isNaN(flo) && !isNaN(fhi) && (flo - target) * (fhi - target) <= 0) {
      for (let i = 0; i < 90; i++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (isNaN(fm)) break;
        if (Math.abs(fm - target) < 0.0001) { found = mid; break; }
        if ((flo - target) * (fm - target) <= 0) hi = mid; else { lo = mid; }
      }
      if (found === null) found = (lo + hi) / 2;
    }
    if (found === null) { setGoalDlg({ ...g, result: "No solution found in the range ±10,000,000 — the formula may not depend on the changing cell." }); return; }
    pushUndo();
    setCells((c) => ({ ...c, [refFor(bp[0], bp[1])]: String(+found.toFixed(6)) }));
    coachSay("excel", "excel.goalseek", `Goal Seek — set ${setRef} to ${target} by changing ${refFor(bp[0], bp[1])}`, `solved input = ${+found.toFixed(4)}`);
    setGoalDlg(null);
    setLoadedInfo(`Goal Seek solved it: ${refFor(bp[0], bp[1])} = ${+found.toFixed(4)} makes ${setRef} hit ${target}. (Ctrl+Z restores your old input.)`);
    gridRef.current?.focus();
  };

  /** Advanced Filter — extract unique values of a column to a new sheet */
  const advancedFilterExtract = (col: number) => {
    const { rows: R } = usedRange(cells);
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (let r = 1; r < R; r++) {
      const v = cells[refFor(col, r)] ?? "";
      if (!v.trim()) continue;
      const k = v.trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(v.trim());
    }
    pushUndo();
    const s = newSheet("Extract");
    const nc: Record<string, string> = { [refFor(0, 0)]: headerLabel(col) };
    uniq.forEach((v, ri) => { nc[refFor(0, ri + 1)] = v; });
    s.cells = nc;
    s.styles = { [refFor(0, 0)]: { b: true, bg: "#e5e7eb" } };
    s.freeze = "top";
    setSheets((ss) => [...ss, s]);
    setActiveId(s.id);
    setSel({ a: [0, 0], b: [0, 0] });
    coachSay("excel", "excel.advfilter", `Advanced Filter — extracted ${uniq.length} unique values of ${headerLabel(col)}`);
    setAdvDlg(null);
    setLoadedInfo(`Extracted ${uniq.length} unique values of ${headerLabel(col)} to the "Extract" sheet — a clean list ready for dropdowns and validation.`);
  };

  /** Data Types — insert linked fields for the values found in the selected column */
  const insertDataTypes = (kind: "geo" | "stock") => {
    const col = selectedColIdx;
    const { rows: R } = usedRange(cells);
    let hits = 0;
    const vals: { r: number; data: string[]; headers: string[] }[] = [];
    for (let r = 1; r < R; r++) {
      const raw = (cells[refFor(col, r)] ?? "").trim();
      if (!raw || raw.startsWith("=")) continue;
      if (kind === "geo") {
        const g = GEO_TYPES[raw.toLowerCase()];
        if (g) { hits++; vals.push({ r, data: [g.capital, String(g.population)], headers: ["Capital", "Population"] }); }
      } else {
        const s = STOCK_TYPES[raw.toUpperCase()];
        if (s) { hits++; vals.push({ r, data: [String(s.price), String(s.change)], headers: ["Price (USD)", "Day Change %"] }); }
      }
    }
    if (!hits) {
      setDtDlg(null);
      setLoadedInfo(kind === "geo"
        ? `No countries found in column ${colName(col)}. Try a column containing: United States, United Kingdom, France, Germany, Japan, India, Brazil, Canada, Australia, Nigeria, Mexico, Spain, Italy or China.`
        : `No tickers found in column ${colName(col)}. Try a column containing: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META or NFLX.`);
      return;
    }
    pushUndo();
    const newHeaders = vals[0].headers;
    for (let k = 0; k < newHeaders.length; k++) shiftCols(col + 1, 1);
    setCells((c) => {
      const next = { ...c };
      newHeaders.forEach((h, k) => { next[refFor(col + 1 + k, 0)] = h; });
      vals.forEach((v) => v.data.forEach((d, k) => { next[refFor(col + 1 + k, v.r)] = d; }));
      return next;
    });
    coachSay("excel", "excel.datatypes", `Data Types — inserted ${newHeaders.join(" & ")} for ${hits} value(s) in ${headerLabel(col)}`);
    setDtDlg(null);
    setLoadedInfo(`Inserted ${newHeaders.join(" and ")} for ${hits} ${kind === "geo" ? "countr" + (hits === 1 ? "y" : "ies") : "ticker"}${hits === 1 ? "" : "s"} (offline snapshot for training).`);
    gridRef.current?.focus();
  };

  /** Outline groups — collapse detail rows behind +/− like Excel's outline */
  const groupSelRows = () => {
    const { r1, r2 } = nSel;
    if (r1 === 0 && r2 === 0) { setLoadedInfo("Select the rows to group first (drag the row numbers)."); return; }
    pushUndo();
    setRowGroups((g) => [...g, { r1, r2 }]);
    coachSay("excel", "excel.group", `Grouped rows ${r1 + 1}–${r2 + 1} (outline)`);
    setLoadedInfo(`Grouped rows ${r1 + 1}–${r2 + 1}. Use Hide/Show Detail in Data ▸ Outline to collapse them for the manager view.`);
  };
  const ungroupSelRows = () => {
    const { r1, r2 } = nSel;
    pushUndo();
    setRowGroups((gs) => gs.filter((g) => !(g.r2 >= r1 && g.r1 <= r2)));
    setCollapsedGroups(new Set());
    setLoadedInfo("Removed outline groups overlapping the selection.");
  };
  const outlineHidden = React.useMemo(() => {
    const s = new Set<number>();
    rowGroups.forEach((g, gi) => { if (collapsedGroups.has(gi)) for (let r = g.r1; r <= g.r2; r++) s.add(r); });
    return s;
  }, [rowGroups, collapsedGroups]);

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
    if (outlineHidden.has(r)) return true; // collapsed outline group
    for (const [colStr, excl] of Object.entries(hidden)) {
      const col = +colStr;
      if (!excl.size) continue;
      const v = displayValue(refFor(col, r), cells, styles);
      if (excl.has(v)) return true; // value unchecked in its column filter → hide the row
    }
    return false;
  };

  const toggleFilterColValue = (col: number, v: string) => {
    coachSay("excel", "excel.filter", `Filtered column ${colName(col)} (show/hide "${v}")`);
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
    if (f !== "none") coachSay("excel", "excel.freeze", `Froze ${f === "top" ? "the top row" : f === "first" ? "the first column" : "headers (row + column)"}`);
    updateSheet(sheet.id, { freeze: f });
    setFreezeMenu(false);
  };

  /* ---------- data load / import / export ---------- */
  const [loadedInfo, setLoadedInfo] = React.useState<string | null>(null);

  const loadDataset = (id: string) => {
    const ds = getDatasetById(id);
    coachSay("excel", "excel.data", `Loaded sample data into the sheet`, ds?.name ?? id);
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
    setRowGroups([]); setCollapsedGroups(new Set());
    setSel({ a: [0, 0], b: [0, 0] });
    lastDatasetRef.current = id;
    setConnections((cs) => [
      { id: `c_${id}_${Date.now()}`, name: ds.name, kind: "sample" as const, rows: ds.rows.length, datasetId: id, at: Date.now() },
      ...cs.filter((c) => c.datasetId !== id),
    ].slice(0, 8));
    setLoadedInfo(
      ds.rows.length > ROWS - 1
        ? `${ds.name}: showing the first ${ROWS - 1} of ${ds.rows.length.toLocaleString()} rows (grid limit). Use the Cleaner or download the CSV for the full file.`
        : `${ds.name}: ${ds.rows.length.toLocaleString()} rows loaded.`
    );
    gridRef.current?.focus();
  };

  const importCSV = (file: File) => {
    coachSay("excel", "excel.data", "Imported a CSV file into the sheet", file.name);
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
        setRowGroups([]); setCollapsedGroups(new Set());
        setSel({ a: [0, 0], b: [0, 0] });
        setConnections((cs) => [{ id: `c_csv_${Date.now()}`, name: file.name, kind: "csv" as const, rows: res.data.length, at: Date.now() }, ...cs].slice(0, 8));
        setLoadedInfo(`Imported ${file.name}: ${Math.min(res.data.length, ROWS)} rows.`);
      },
    });
  };

  const exportCSV = () => {
    coachSay("excel", "excel.save", "Exported the sheet as CSV");
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
    coachSay("excel", "excel.chart", `Inserted a ${kind === "col" ? "column" : kind === "line" ? "line" : "pie"} chart`);
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
    coachSay("excel", "excel.find", "Replaced text across the sheet (Find & Replace)");
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
    coachSay("excel", "excel.style", `Added conditional formatting (${op === "gt" ? "greater than" : op === "lt" ? "less than" : "contains"} ${val})`);
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
    coachSay("excel", "excel.autosum", `AutoSum — ${fn}`, fn);
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
    coachSay("excel", "excel.sheet", "Added a new worksheet");
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
    coachSay("excel", "excel.sheet", "Renamed a sheet tab");
    const s = sheets.find((x) => x.id === id);
    if (!s) return;
    const nm = window.prompt("Rename sheet", s.name);
    if (nm?.trim()) updateSheet(id, { name: nm.trim().slice(0, 40) });
    setSheetMenu(null);
  };

  /* ---------- merge & center ---------- */
  const merges = sheet?.merges ?? [];
  const cover = React.useMemo(() => {
    const m = new Map<string, { rect: MergeRect; anchor: boolean }>();
    for (const r of merges) {
      for (let rr = r.r1; rr <= r.r2; rr++) for (let cc = r.c1; cc <= r.c2; cc++)
        m.set(`${cc}:${rr}`, { rect: r, anchor: cc === r.c1 && rr === r.r1 });
    }
    return m;
  }, [merges]);

  const mergeSel = (center = true) => {
    coachSay("excel", "excel.merge", center ? "Merged & centered the selection" : "Merged the selection");
    const { c1, c2, r1, r2 } = nSel;
    if (c1 === c2 && r1 === r2) { setLoadedInfo("Select more than one cell to merge."); return; }
    pushUndo();
    setCells((c) => {
      const n = { ...c };
      for (let r = r1; r <= r2; r++) for (let cc = c1; cc <= c2; cc++) { if (r === r1 && cc === c1) continue; delete n[refFor(cc, r)]; }
      return n;
    });
    if (center) {
      setStyles((st) => { const n = { ...st }; const cur = n[refFor(c1, r1)] ?? {}; n[refFor(c1, r1)] = { ...cur, al: "c" }; return n; });
    }
    updateSheet(sheet.id, (s) => ({
      merges: [...(s.merges ?? []).filter((mm) => !(mm.c2 >= c1 && mm.c1 <= c2 && mm.r2 >= r1 && mm.r1 <= r2)), { c1, c2, r1, r2 }],
    }));
    setLoadedInfo(`Merged ${refFor(c1, r1)}:${refFor(c2, r2)} — the anchor cell keeps the value.`);
    gridRef.current?.focus();
  };

  const unmergeSel = () => {
    const { c1, c2, r1, r2 } = nSel;
    const hit = merges.filter((mm) => mm.c2 >= c1 && mm.c1 <= c2 && mm.r2 >= r1 && mm.r1 <= r2);
    if (!hit.length) { setLoadedInfo("No merged cell in the selection."); return; }
    pushUndo();
    updateSheet(sheet.id, (s) => ({ merges: (s.merges ?? []).filter((mm) => !hit.includes(mm)) }));
    gridRef.current?.focus();
  };

  /* ---------- paste special ---------- */
  const pasteSpecial = (mode: "values" | "formats" | "transpose") => {
    coachSay("excel", "excel.pastespecial", `Paste Special — ${mode}`);
    if (!clipboard) { setLoadedInfo("Copy or cut something first (Ctrl+C)." ); return; }
    const { c1, r1 } = nSel;
    pushUndo();
    if (mode !== "formats") {
      const h = mode === "transpose" ? clipboard.w : clipboard.h;
      const w = mode === "transpose" ? clipboard.h : clipboard.w;
      setCells((c) => {
        const next = { ...c };
        for (let dr = 0; dr < h; dr++)
          for (let dc = 0; dc < w; dc++) {
            const src = mode === "transpose" ? clipboard.rows[dc]?.[dr] : clipboard.rows[dr]?.[dc];
            if (!src) continue;
            const ref = refFor(c1 + dc, r1 + dr);
            if (src.v === "") delete next[ref];
            else next[ref] = src.v.startsWith("=") ? `=${shiftFormula(src.v.slice(1), dc, dr)}` : src.v;
          }
        return next;
      });
    }
    if (mode !== "values") {
      const h = mode === "transpose" ? clipboard.w : clipboard.h;
      const w = mode === "transpose" ? clipboard.h : clipboard.w;
      setStyles((st) => {
        const next = { ...st };
        for (let dr = 0; dr < h; dr++)
          for (let dc = 0; dc < w; dc++) {
            const src = mode === "transpose" ? clipboard.rows[dc]?.[dr] : clipboard.rows[dr]?.[dc];
            if (!src) continue;
            const ref = refFor(c1 + dc, r1 + dr);
            if (src.s) next[ref] = src.s;
          }
        return next;
      });
    }
    setLoadedInfo(`Pasted special — ${mode}.`);
    gridRef.current?.focus();
  };

  /* ---------- format as table / cell styles ---------- */
  const formatAsTable = () => {
    coachSay("excel", "excel.table", "Formatted the range as a Table (banded rows + filters)");
    const { rows: R, cols: C } = usedRange(cells);
    if (R < 1) { setLoadedInfo("Nothing to format — load data first."); return; }
    pushUndo();
    setStyles((st) => {
      const next = { ...st };
      for (let c = 0; c < C; c++) next[refFor(c, 0)] = { ...next[refFor(c, 0)], b: true, fc: "#ffffff", bg: "#4472C4", al: "c" };
      for (let r = 1; r < R; r++)
        for (let c = 0; c < C; c++) {
          const ref = refFor(c, r);
          next[ref] = { ...next[ref], bd: true, bg: r % 2 === 0 ? "#D9E2F3" : undefined };
        }
      return next;
    });
    setLoadedInfo(`Formatted ${C} columns × ${R - 1} rows as a table (header + banded rows).`);
  };

  const applyPreset = (p: "good" | "bad" | "neutral" | "heading" | "total") => {
    coachSay("excel", "excel.style", `Applied the "${p}" cell style`);
    const presets: Record<string, CellStyle> = {
      good: { bg: "#C6EFCE", fc: "#006100" },
      bad: { bg: "#FFC7CE", fc: "#9C0006" },
      neutral: { bg: "#FFEB9C", fc: "#9C6500" },
      heading: { b: true, fc: "#1F3864", bg: "#D9E2F3" },
      total: { b: true, bd: true, bg: "#FCE4D6" },
    };
    applyStyleToSel(presets[p]);
  };

  const changeDecimals = (delta: 1 | -1) => {
    const cur = activeStyle?.dec ?? 2;
    applyStyleToSel({ dec: Math.max(0, Math.min(6, cur + delta)) });
  };

  /* ---------- PivotTable: group the data and write a summary sheet ---------- */
  const openPivot = () => {
    const headers = Array.from({ length: usedC }, (_, c) => displayValue(refFor(c, 0), cells, styles) || colName(c));
    const isNumCol = (c: number) => {
      for (let r = 1; r < Math.min(usedR, 60); r++) {
        const raw = String(cells[refFor(c, r)] ?? "").trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return false; // dates are not values
        if (raw !== "" && /^[\d.,$\s+-]+$/.test(raw) && !isNaN(parseFloat(raw.replace(/[$,\s]/g, "")))) return true;
      }
      return false;
    };
    const firstNumeric = headers.findIndex((_, c) => isNumCol(c));
    setPivotDlg({ rowField: 0, valField: firstNumeric >= 0 ? firstNumeric : 0, agg: "SUM", colField: undefined });
  };

  const insertPivot = (cfg: { rowField: number; valField: number; agg: "SUM" | "COUNT" | "AVERAGE"; colField: number | undefined }) => {
    const { rowField, valField, agg, colField } = cfg;
    const groups = new Map<string, Map<string, number[]>>();
    for (let r = 1; r < usedR; r++) {
      const rk = String(displayValue(refFor(rowField, r), cells, styles) ?? "").trim() || "(blank)";
      const ck = colField === undefined ? "" : String(displayValue(refFor(colField, r), cells, styles) ?? "").trim() || "(blank)";
      const raw = String(cells[refFor(valField, r)] ?? "");
      if (agg === "COUNT") {
        if (raw === "") continue;
        if (!groups.has(rk)) groups.set(rk, new Map());
        const m = groups.get(rk)!;
        if (!m.has(ck)) m.set(ck, []);
        m.get(ck)!.push(1);
      } else {
        const n = parseFloat(raw.replace(/[$,\s]/g, ""));
        if (raw === "" || isNaN(n)) continue;
        if (!groups.has(rk)) groups.set(rk, new Map());
        const m = groups.get(rk)!;
        if (!m.has(ck)) m.set(ck, []);
        m.get(ck)!.push(n);
      }
    }
    if (!groups.size) {
      const vh = displayValue(refFor(valField, 0), cells, styles) || colName(valField);
      setLoadedInfo(agg === "COUNT"
        ? "PivotTable: no data rows found — load a dataset first."
        : `PivotTable: "${vh}" has no numbers in it — pick a numeric column to aggregate (Revenue, Units…), or switch to Count.`);
      return;
    }
    const aggOf = (vals: number[]) => (agg === "COUNT" ? vals.length : agg === "SUM" ? vals.reduce((a, b) => a + b, 0) : vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    const rowKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    const colKeys = colField === undefined ? [""] : [...new Set(rowKeys.flatMap((rk) => [...groups.get(rk)!.keys()]))].sort((a, b) => a.localeCompare(b));
    const rowHeader = displayValue(refFor(rowField, 0), cells, styles) || colName(rowField);
    const valHeader = displayValue(refFor(valField, 0), cells, styles) || colName(valField);
    const ns = newSheet(`Pivot${sheets.length + 1}`);
    const put = (col: number, row: number, v: string, bold = false) => {
      const ref = refFor(col, row - 1);
      ns.cells[ref] = v;
      if (bold) ns.styles[ref] = { b: true, bg: "#e2efda" };
    };
    put(0, 1, `PivotTable — ${agg === "COUNT" ? "Count" : agg} of ${valHeader} by ${rowHeader}`, true);
    let rr = 3;
    put(0, rr, rowHeader, true);
    colKeys.forEach((ck, ci) => put(1 + ci, rr, colField === undefined ? `${agg === "COUNT" ? "Count" : agg} of ${valHeader}` : ck, true));
    for (const rk of rowKeys) {
      rr++;
      put(0, rr, rk);
      colKeys.forEach((ck, ci) => {
        const v = +aggOf(groups.get(rk)?.get(ck) ?? []).toFixed(2);
        const ref = refFor(1 + ci, rr - 1);
        ns.cells[ref] = String(v);
        ns.styles[ref] = { nf: "number", dec: 2 };
      });
    }
    rr++;
    put(0, rr, "Grand Total", true);
    colKeys.forEach((ck, ci) => {
      let all: number[] = [];
      for (const rk of rowKeys) all.push(...(groups.get(rk)?.get(ck) ?? []));
      const ref = refFor(1 + ci, rr - 1);
      ns.cells[ref] = String(+aggOf(all).toFixed(2));
      ns.styles[ref] = { nf: "number", dec: 2, b: true };
    });
    setSheets((ss) => [...ss, ns]);
    setActiveId(ns.id);
    setPivotDlg(null);
    coachSay("excel", "excel.pivot", `Inserted a PivotTable (${agg === "COUNT" ? "Count" : agg} of ${valHeader} by ${rowHeader}) — ${rowKeys.length} groups`);
  };

  /* ---------- comments (Review tab) ---------- */
  const saveComment = () => {
    if (!commentDlg) return;
    const { ref, text } = commentDlg;
    updateSheet(sheet.id, (sh) => {
      const next = { ...(sh.comments ?? {}) };
      if (text.trim()) next[ref] = text.trim();
      else delete next[ref];
      return { comments: next };
    });
    if (text.trim()) coachSay("excel", "excel.comment", `Added a comment on cell ${ref}`);
    setCommentDlg(null);
  };

  const exportWorkbookJSON = () => {
    coachSay("excel", "excel.save", "Saved the workbook as JSON (all sheets, formulas and formats)");
    downloadFile(`${wbName || "workbook"}.excel.json`, JSON.stringify({ app: "data-analytics-academy-excel", name: wbName, sheets, activeId }, null, 2), "application/json");
  };

  const newWorkbook = () => {
    pushUndo();
    const s = newSheet("Sheet1");
    setSheets([s]);
    setActiveId(s.id);
    setSel({ a: [0, 0], b: [0, 0] });
    setHidden({});
    setCharts([]);
    setLoadedInfo(null);
    setWbName("Book1");
    setBackstage(null);
  };

  /* ---------- derived ---------- */
  const { rows: usedR, cols: usedC } = usedRange(cells);

  const headerLabel = (ci: number): string => cells[refFor(ci, 0)] ?? `Column ${colName(ci)}`;
  const fieldOpts = React.useMemo(
    () => Array.from({ length: usedC }, (_, i) => ({ value: String(i), label: cells[refFor(i, 0)] ?? `Column ${colName(i)}` })),
    [cells, usedC]
  );
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

  /* Data Doctor — a live scan of THIS sheet's data, re-run on every edit */
  const doctorSnapshot = React.useMemo<DoctorSnapshot | null>(() => {
    if (!sheet) return null;
    const { rows: R, cols: C } = usedRange(cells);
    if (R < 2 || C < 1) return null;
    const headers: string[] = [];
    for (let c = 0; c < C; c++) headers.push(cells[refFor(c, 0)] ?? `Column ${colName(c)}`);
    const rows: Record<string, string>[] = [];
    for (let r = 1; r < R; r++) {
      const row: Record<string, string> = {};
      for (let c = 0; c < C; c++) row[headers[c]] = cells[refFor(c, r)] ?? "";
      rows.push(row);
    }
    return { source: "excel", file: `${sheet.name || "Sheet1"} (this sheet)`, headers, rows };
  }, [sheet?.cells, sheet?.name]);

  const applyDoctorFix = (fix: FixId, col: string | null) => {
    if (!doctorSnapshot) return;
    pushUndo();
    const C = doctorSnapshot.headers.length;
    const fixed = applyFix(doctorSnapshot.rows, doctorSnapshot.headers, col, fix);
    const next: Record<string, string> = {};
    for (let c = 0; c < C; c++) { const h = cells[refFor(c, 0)]; if (h) next[refFor(c, 0)] = h; }
    fixed.forEach((row, ri) => {
      for (let c = 0; c < C; c++) {
        const v = row[doctorSnapshot.headers[c]];
        if (v !== undefined && v !== "") next[refFor(c, ri + 1)] = v;
      }
    });
    setCells(() => next);
    coachSay("excel", "excel.doctorfix", `Data Doctor — applied “${FIX_LABELS[fix]}”${col ? ` on ${col}` : ""}`, `${doctorSnapshot.rows.length} rows scanned → ${fixed.length} rows after`);
    setLoadedInfo(`Fix applied (${FIX_LABELS[fix]}${col ? ` · ${col}` : ""}). The doctor re-scans automatically — watch the Clean file tab tick it off.`);
    gridRef.current?.focus();
  };

  if (!loaded || !sheet) return <div className={`${PANEL} h-64 animate-pulse`} />;

  const frozenTop = sheet.freeze === "top" || sheet.freeze === "both";
  const frozenFirst = sheet.freeze === "first" || sheet.freeze === "both";
  const frozenTopPx = 27; // header row height
  const CAL = '"Calibri", "Segoe UI", -apple-system, sans-serif';

  /* commands for the title-bar search ("Tell me what you want to do") */
  const commands: { label: string; hint: string; run: () => void }[] = [
    { label: "Load sample data", hint: "Data", run: () => { setRibbonTab("data"); setRibbonOpen(true); } },
    { label: "Import from CSV", hint: "Data", run: () => fileRef.current?.click() },
    { label: "Export to CSV", hint: "Data", run: exportCSV },
    { label: "Format as Table", hint: "Home", run: formatAsTable },
    { label: "Merge & Center", hint: "Home", run: () => mergeSel(true) },
    { label: "Unmerge cells", hint: "Home", run: unmergeSel },
    { label: "Freeze top row", hint: "View", run: () => setFreeze("top") },
    { label: "Freeze first column", hint: "View", run: () => setFreeze("first") },
    { label: "Find & Replace", hint: "Home", run: () => setFindDlg({ find: "", replace: "", results: [] }) },
    { label: "Insert Function", hint: "Formulas", run: () => setFuncDlg(true) },
    { label: "Format Cells", hint: "Ctrl+1", run: () => setFmtDlg(true) },
    { label: "Remove Duplicates", hint: "Data", run: dedupeRows },
    { label: "Sort A to Z", hint: "Data", run: () => sortRows(selectedColIdx, 1) },
    { label: "Sort Z to A", hint: "Data", run: () => sortRows(selectedColIdx, -1) },
    { label: "Save to portfolio", hint: "File", run: () => { saveSheet(sheet.name || "Sheet1", cells); } },
    { label: "New workbook", hint: "File", run: () => setBackstage("new") },
    { label: "Check for errors", hint: "Review", run: () => {
      const errs = Object.keys(cells).filter((ref) => displayValue(ref, cells, styles).startsWith("#"));
      setLoadedInfo(errs.length ? `Error check: ${errs.length} error cell${errs.length === 1 ? "" : "s"} — ${errs.slice(0, 6).join(", ")}${errs.length > 6 ? "…" : ""}` : "Error check passed — no formula errors. ✔");
    } },
    { label: "Toggle gridlines", hint: "View", run: () => setGridlines((g) => !g) },
    { label: "Zoom to 100%", hint: "View", run: () => setZoom(100) },
  ];

  /* catalog grouped for File ▸ Open + Data ▸ Get Data */
  const catalog = getSampleCatalog();

  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-0" style={{ fontFamily: SEGOE, color: MS.ink }} onMouseDown={() => { setCtxMenu(null); setColorMenu(null); setCfMenu(false); setFreezeMenu(false); setAutosumMenu(false); setSheetMenu(null); setPasteMenu(false); }}>
      {/* ============ title bar (green, like Excel) ============ */}
      <div className="overflow-visible rounded-t-lg">
        <MsTitleBar
          color={MS.excelGreen}
          logo={<ExcelLogo size={17} />}
          title={`${wbName} - Excel  ·  Data Analytics Academy`}
          search="Tell me what you want to do"
          searchItems={commands}
          qat={
            <>
              <MsAutoSave on={autoSave} onToggle={() => setAutoSave((v) => !v)} />
              <span className="mx-0.5 h-4 w-px bg-white/25" />
              <MsQatBtn title="Save to your Academy portfolio" onClick={() => saveSheet(sheet.name || "Sheet1", cells)}><Save className="h-4 w-4" /></MsQatBtn>
              <MsQatBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={!undoDepth}><Undo2 className="h-4 w-4" /></MsQatBtn>
              <MsQatBtn title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoDepth}><Redo2 className="h-4 w-4" /></MsQatBtn>
            </>
          }
          right={<MsWindowGlyphs onCollapse={() => setRibbonOpen((o) => !o)} collapsed={!ribbonOpen} />}
        />
      </div>

      {/* ============ formula bar ============ */}
      {showFormulaBar && (
        <div className="flex items-stretch border-b bg-white" style={{ borderColor: MS.border }}>
          <input
            className="w-[92px] shrink-0 border-r px-2 text-center text-[12px] font-semibold outline-none"
            style={{ borderColor: MS.border, color: MS.ink, background: "#fff" }}
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
          <button
            className="w-9 shrink-0 border-r text-[13px] italic text-[#605e5c] hover:bg-[#f3f2f1]"
            style={{ borderColor: MS.border, fontFamily: "Georgia, serif" }}
            title="Insert Function"
            onClick={() => setFuncDlg(true)}
          >fx</button>
          <div className="flex min-w-0 flex-1 items-center gap-1 px-2">
            <input
              className="min-w-0 flex-1 bg-transparent py-[5px] text-[12.5px] outline-none placeholder:text-[#a19f9d]"
              style={{ fontFamily: CAL }}
              placeholder="Type a value or =SUM(I2:I50) · =XLOOKUP(&quot;Office Chair&quot;,G:G,I:I)"
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
                <button className="rounded-[3px] p-1 text-[#107C10] hover:bg-[#f3f2f1]" title="Enter ✓" onClick={() => commit()}><Check className="h-4 w-4" /></button>
                <button className="rounded-[3px] p-1 text-[#a4262c] hover:bg-[#f3f2f1]" title="Cancel ✗" onClick={() => { setEditVal(null); gridRef.current?.focus(); }}><X className="h-4 w-4" /></button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ ribbon ============ */}
      <div className="overflow-visible border-b" style={{ borderColor: MS.border }}>
        <RibbonTabs
          accent={MS.excelGreen}
          menuBtn={{ label: "File", onClick: () => setBackstage("info") }}
          active={ribbonTab}
          onChange={(t) => { setRibbonTab(t); setRibbonOpen(true); }}
          tabs={[["home", "Home"], ["insert", "Insert"], ["layout", "Page Layout"], ["formulas", "Formulas"], ["data", "Data"], ["review", "Review"], ["view", "View"], ["help", "Help"]] as const}
          right={
            <span className="pr-2 text-[10.5px] text-[#605e5c]">
              {usedR - 1} data rows · {formulaCount} formulas · AutoSave {autoSave ? "On" : "Off"}
            </span>
          }
        />
        <RibbonBody collapsed={!ribbonOpen}>
          {/* Clipboard — every tab */}
          <RGroup label="Clipboard">
            <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
              <RBig title="Paste (Ctrl+V) — click the arrow for Paste Special" onClick={pasteAt} chevron disabled={!clipboard} label="Paste"><Clipboard className="h-5 w-5" /></RBig>
              {pasteMenu && (
                <MsMenu width={220}>
                  <MsMenuItem onClick={() => { pasteAt(); setPasteMenu(false); }} icon={<Clipboard className="h-3.5 w-3.5" />}>Paste (all)</MsMenuItem>
                  <MsMenuItem onClick={() => { pasteSpecial("values"); setPasteMenu(false); }} icon={<Sigma className="h-3.5 w-3.5" />}>Paste Values (123)</MsMenuItem>
                  <MsMenuItem onClick={() => { pasteSpecial("formats"); setPasteMenu(false); }} icon={<PaintBucket className="h-3.5 w-3.5" />}>Paste Formatting</MsMenuItem>
                  <MsSep />
                  <MsMenuItem onClick={() => { pasteSpecial("transpose"); setPasteMenu(false); }} icon={<RotateCcw className="h-3.5 w-3.5" />}>Paste Transpose</MsMenuItem>
                </MsMenu>
              )}
            </div>
            <RSmall title="Cut (Ctrl+X)" onClick={() => copySel(true)}><Scissors className="h-4 w-4" /></RSmall>
            <RSmall title="Copy (Ctrl+C)" onClick={() => copySel(false)}><Copy className="h-4 w-4" /></RSmall>
          </RGroup>

          {ribbonTab === "home" && (
            <>
              <RGroup label="Undo">
                <RSmall title="Undo (Ctrl+Z)" onClick={undo} disabled={!undoDepth}><Undo2 className="h-4 w-4" /></RSmall>
                <RSmall title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoDepth}><Redo2 className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Font">
                <MsSelect
                  title="Font"
                  width={92}
                  value={activeStyle?.ff ?? "Calibri"}
                  onChange={(v) => applyStyleToSel({ ff: v })}
                  options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
                />
                <MsSelect
                  title="Font size"
                  width={48}
                  value={String(activeStyle?.sz ?? 13)}
                  onChange={(v) => applyStyleToSel({ sz: +v })}
                  options={[10, 11, 12, 13, 16, 18, 24].map((s) => ({ value: String(s), label: String(s) }))}
                />
                <RSmall title="Bold (Ctrl+B)" onClick={() => toggleStyle("b")} active={!!activeStyle?.b} toggleLook><Bold className="h-4 w-4" /></RSmall>
                <RSmall title="Italic (Ctrl+I)" onClick={() => toggleStyle("i")} active={!!activeStyle?.i} toggleLook><Italic className="h-4 w-4" /></RSmall>
                <RSmall title="Underline (Ctrl+U)" onClick={() => toggleStyle("u")} active={!!activeStyle?.u} toggleLook><Underline className="h-4 w-4" /></RSmall>
                <ColorSplit
                  icon={<Baseline className="h-4 w-4" />}
                  title="Font color"
                  swatch={activeStyle?.fc ?? "#111827"}
                  open={colorMenu === "fc"}
                  onToggle={() => setColorMenu(colorMenu === "fc" ? null : "fc")}
                  onPick={(c) => { applyStyleToSel({ fc: c || undefined }); setColorMenu(null); }}
                  colors={FONT_COLORS}
                  noneLabel="Automatic"
                />
                <ColorSplit
                  icon={<PaintBucket className="h-4 w-4" />}
                  title="Fill color"
                  swatch={activeStyle?.bg || ""}
                  open={colorMenu === "bg"}
                  onToggle={() => setColorMenu(colorMenu === "bg" ? null : "bg")}
                  onPick={(c) => { applyStyleToSel({ bg: c || undefined }); setColorMenu(null); }}
                  colors={FILL_COLORS}
                  noneLabel="No fill"
                />
                <RSmall title="Borders on/off for the selection" onClick={() => applyStyleToSel({ bd: !activeStyle?.bd })} active={!!activeStyle?.bd} toggleLook><Grid2x2 className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Alignment">
                <RSmall title="Align left" onClick={() => applyStyleToSel({ al: "l" })} active={activeStyle?.al === "l"} toggleLook><AlignLeft className="h-4 w-4" /></RSmall>
                <RSmall title="Align center" onClick={() => applyStyleToSel({ al: "c" })} active={activeStyle?.al === "c"} toggleLook><AlignCenter className="h-4 w-4" /></RSmall>
                <RSmall title="Align right" onClick={() => applyStyleToSel({ al: "r" })} active={activeStyle?.al === "r"} toggleLook><AlignRight className="h-4 w-4" /></RSmall>
                <RSmall title="Wrap text — show long values on multiple lines" onClick={() => applyStyleToSel({ wr: !activeStyle?.wr })} active={!!activeStyle?.wr} toggleLook><WrapText className="h-4 w-4" /></RSmall>
                <RSmall title="Merge & Center the selection" onClick={() => mergeSel(true)}><TableCellsMerge className="h-4 w-4" /></RSmall>
                <RSmall title="Unmerge" onClick={unmergeSel}><SquareSplitHorizontal className="h-4 w-4 -scale-x-100" /></RSmall>
              </RGroup>
              <RGroup label="Number">
                <MsSelect
                  title="Number format"
                  width={118}
                  value={activeStyle?.nf ?? "general"}
                  onChange={(v) => applyStyleToSel({ nf: v as NumFmt })}
                  options={[
                    { value: "general", label: "General" },
                    { value: "number", label: "Number" },
                    { value: "currency", label: "Currency" },
                    { value: "comma", label: "Comma" },
                    { value: "percent", label: "Percent" },
                    { value: "text", label: "Text" },
                  ]}
                />
                <RSmall title="Currency format" onClick={() => applyStyleToSel({ nf: "currency" })}><DollarSign className="h-4 w-4" /></RSmall>
                <RSmall title="Percent format" onClick={() => applyStyleToSel({ nf: "percent" })}><Percent className="h-4 w-4" /></RSmall>
                <RSmall title="Comma format" onClick={() => applyStyleToSel({ nf: "comma" })}><Hash className="h-4 w-4" /></RSmall>
                <RSmall title="Increase decimal" onClick={() => changeDecimals(1)} label=".0↞" />
                <RSmall title="Decrease decimal" onClick={() => changeDecimals(-1)} label=".00↠" />
              </RGroup>
              <RGroup label="Styles">
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Conditional Formatting — highlight what matters" onClick={() => setCfMenu((v) => !v)} label="Conditional" active={cfMenu}><Highlighter className="h-5 w-5" /></RBig>
                  {cfMenu && (
                    <MsMenu width={250}>
                      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#605e5c]">Highlight cells in column {colName(selectedColIdx)}</p>
                      <MsMenuItem onClick={() => { const v = window.prompt("Highlight cells GREATER than…", "1000"); if (v) addCfRule("gt", v, CF_COLORS[0]); }}>Greater Than…</MsMenuItem>
                      <MsMenuItem onClick={() => { const v = window.prompt("Highlight cells LESS than…", "100"); if (v) addCfRule("lt", v, CF_COLORS[2]); }}>Less Than…</MsMenuItem>
                      <MsMenuItem onClick={() => { const v = window.prompt("Highlight cells containing text…", "refund"); if (v) addCfRule("contains", v, CF_COLORS[1]); }}>Text Contains…</MsMenuItem>
                      {sheet.cfRules.length > 0 && (
                        <>
                          <MsSep />
                          <MsMenuItem onClick={() => { pushUndo(); updateSheet(sheet.id, { cfRules: [] }); setCfMenu(false); }} icon={<RotateCcw className="h-3 w-3" />}>Clear rules ({sheet.cfRules.length})</MsMenuItem>
                        </>
                      )}
                    </MsMenu>
                  )}
                </div>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Format as Table — header + banded rows" onClick={() => { formatAsTable(); }} label="Format as Table"><Table2 className="h-5 w-5" /></RBig>
                </div>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Cell Styles — Excel presets" onClick={() => setStyleMenu((v) => !v)} chevron label="Cell Styles"><GalleryVerticalEnd className="h-5 w-5" /></RBig>
                  {styleMenu && (
                    <MsMenu width={200}>
                      {([["good", "Good"], ["bad", "Bad"], ["neutral", "Neutral"], ["heading", "Heading"], ["total", "Total"]] as const).map(([k, lbl]) => (
                        <MsMenuItem key={k} onClick={() => { applyPreset(k); setStyleMenu(false); }}>{lbl}</MsMenuItem>
                      ))}
                      <MsSep />
                      <MsMenuItem onClick={() => { clearFormatSel(); setStyleMenu(false); }} icon={<Eraser className="h-3.5 w-3.5" />}>Clear formatting</MsMenuItem>
                    </MsMenu>
                  )}
                </div>
              </RGroup>
              <RGroup label="Cells">
                <RBig title="Insert rows / columns above or left of the selection" onClick={() => shiftRows(nSel.r1, 1)} chevron label="Insert"><Plus className="h-5 w-5" /></RBig>
                <RSmall title="Insert column left" onClick={() => shiftCols(nSel.c1, 1)} label="Column" />
                <RSmall title="Delete selected row" onClick={() => shiftRows(nSel.r1, -1)} label="Row" />
                <RSmall title="Delete selected column" onClick={() => shiftCols(nSel.c1, -1)} label="Column" />
              </RGroup>
              <RGroup label="Editing" last>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="AutoSum — sums the numbers directly above" onClick={() => autoSum("SUM")} chevron label="AutoSum" accentIcon={MS.excelGreen}><Sigma className="h-5 w-5" /></RBig>
                  {autosumMenu && (
                    <MsMenu>
                      <MsMenuItem onClick={() => { autoSum("SUM"); setAutosumMenu(false); }}>Σ Sum</MsMenuItem>
                      <MsMenuItem onClick={() => { autoSum("AVERAGE"); setAutosumMenu(false); }}>x̄ Average</MsMenuItem>
                      <MsMenuItem onClick={() => { autoSum("COUNT"); setAutosumMenu(false); }}>Count Numbers</MsMenuItem>
                      <MsMenuItem onClick={() => { autoSum("MAX"); setAutosumMenu(false); }}>Max</MsMenuItem>
                      <MsMenuItem onClick={() => { autoSum("MIN"); setAutosumMenu(false); }}>Min</MsMenuItem>
                    </MsMenu>
                  )}
                </div>
                <RSmall title="Sort A→Z by selected column" onClick={() => sortRows(selectedColIdx, 1)}><ArrowUpNarrowWide className="h-4 w-4" /></RSmall>
                <RSmall title="Sort Z→A by selected column" onClick={() => sortRows(selectedColIdx, -1)}><ArrowDownWideNarrow className="h-4 w-4" /></RSmall>
                <RSmall title="Find & Replace (Ctrl+F)" onClick={() => setFindDlg({ find: "", replace: "", results: [] })}><Search className="h-4 w-4" /></RSmall>
                <RSmall title="Clear the whole sheet" onClick={() => { pushUndo(); updateSheet(sheet.id, { cells: {}, styles: {}, merges: [] }); setHidden({}); setCharts([]); setLoadedInfo(null); }}><Trash2 className="h-4 w-4" /></RSmall>
              </RGroup>
            </>
          )}

          {ribbonTab === "insert" && (
            <>
              <RGroup label="Charts — select your data first">
                <RBig title="Insert a column chart from the selection" onClick={() => insertChart("col")} label="Column"><ChartColumn className="h-5 w-5" /></RBig>
                <RBig title="Insert a line chart from the selection" onClick={() => insertChart("line")} label="Line"><ChartLine className="h-5 w-5" /></RBig>
                <RBig title="Insert a pie chart from the selection" onClick={() => insertChart("pie")} label="Pie"><ChartPie className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Tables">
                <RBig title="Format the used range as a table (header + banded rows)" onClick={formatAsTable} label="Table"><Table2 className="h-5 w-5" /></RBig>
                <RBig title="PivotTable — group rows by a field and sum/average/count a value column onto a new sheet" onClick={openPivot} label="PivotTable"><Grid3x3 className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Text" last>
                <RBig title="Wrap text in the selection" onClick={() => applyStyleToSel({ wr: !activeStyle?.wr })} label="Wrap Text"><WrapText className="h-5 w-5" /></RBig>
                <p className="max-w-[210px] self-center px-2 text-[11px] leading-snug text-[#605e5c]">
                  Select a range with labels in the first column and numbers beside them, then click a chart type.
                </p>
              </RGroup>
            </>
          )}

          {ribbonTab === "layout" && (
            <>
              <RGroup label="Themes">
                {([["Office", "#e5e7eb", "#111827"], ["Envy", "#217346", "#ffffff"], ["Azure", "#2b579a", "#ffffff"], ["Crimson", "#a4262c", "#ffffff"]] as const).map(([nm, bg, fc]) => (
                  <button
                    key={nm}
                    title={`${nm} theme — recolors the header row`}
                    onClick={() => {
                      pushUndo();
                      setStyles((st) => {
                        const next = { ...st };
                        for (let c = 0; c < usedC; c++) next[refFor(c, 0)] = { ...next[refFor(c, 0)], b: true, bg, fc };
                        return next;
                      });
                      setLoadedInfo(`${nm} theme applied to the header row.`);
                    }}
                    className="h-[46px] w-[64px] rounded-[4px] border border-[#d2d0ce] text-[10px] font-semibold hover:border-[#217346]"
                    style={{ background: bg, color: fc }}
                  >
                    {nm}
                  </button>
                ))}
              </RGroup>
              <RGroup label="Sheet Options" last>
                <RSmall title="Show or hide gridlines" onClick={() => setGridlines((g) => !g)} active={gridlines} toggleLook label="Gridlines" />
                <RSmall title="Show or hide row & column headings" onClick={() => setHeadings((h) => !h)} active={headings} toggleLook label="Headings" />
                <RSmall title="Show or hide the formula bar" onClick={() => setShowFormulaBar((v) => !v)} active={showFormulaBar} toggleLook label="Formula Bar" />
                <RSmall title="Rename this workbook (shows in the title bar)" onClick={() => { const nm = window.prompt("Workbook name", wbName); if (nm?.trim()) setWbName(nm.trim().slice(0, 40)); }} label="Rename Book" />
              </RGroup>
            </>
          )}

          {ribbonTab === "formulas" && (
            <>
              <RGroup label="Function Library">
                <RBig title="Insert Function — browse all functions with descriptions" onClick={() => setFuncDlg(true)} label="Insert Function" accentIcon={MS.excelGreen}><BookOpenText className="h-5 w-5" /></RBig>
              </RGroup>
              {([
                ["Math", ["SUM", "AVERAGE", "MEDIAN", "COUNT", "COUNTA", "ROUND", "SUMPRODUCT", "LARGE", "SMALL", "RANK"]],
                ["Logical", ["IF", "IFS", "IFERROR", "AND", "OR"]],
                ["Text", ["TEXTJOIN", "CONCAT", "LEFT", "RIGHT", "MID", "LEN", "TRIM", "SUBSTITUTE", "FIND", "SEARCH"]],
                ["Lookup", ["VLOOKUP", "XLOOKUP", "HLOOKUP", "INDEX", "MATCH"]],
                ["Conditional", ["SUMIF", "SUMIFS", "COUNTIF", "COUNTIFS", "AVERAGEIF", "MAXIFS", "MINIFS"]],
                ["Date", ["TODAY", "DATE", "YEAR", "MONTH", "DAY", "EOMONTH", "WEEKDAY", "WEEKNUM", "TEXT"]],
              ] as [string, string[]][]).map(([cat, fns]) => (
                <RGroup key={cat} label={cat}>
                  <div className="flex max-w-[240px] flex-wrap gap-1 self-start pt-1">
                    {fns.map((fn) => {
                      const f = FORMULA_BUTTONS.find((x) => x.label === fn);
                      if (!f) return null;
                      return (
                        <button
                          key={fn}
                          title={f.hint}
                          onClick={() => setEditVal(f.tpl)}
                          className="rounded-[3px] border border-[#e1dfdd] px-1.5 py-0.5 text-[10.5px] text-[#217346] hover:bg-[#f3f2f1]"
                          style={{ fontFamily: CAL }}
                        >
                          {fn}
                        </button>
                      );
                    })}
                  </div>
                </RGroup>
              ))}
              <RGroup label="Calculation" last>
                <span className="self-center px-2 text-[11px] text-[#605e5c]">Calculation mode: <b>Automatic</b> — formulas recalc instantly.</span>
              </RGroup>
            </>
          )}

          {ribbonTab === "data" && (
            <>
              {/* Get & Transform Data */}
              <RGroup label="Get & Transform Data">
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Get Data — from files, the web or the Academy's sample library" onClick={() => setDataMenu((v) => !v)} chevron label="Get Data"><Download className="h-5 w-5" /></RBig>
                  {dataMenu && (
                    <MsMenu width={340}>
                      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#605e5c]">From this computer</p>
                      <MsMenuItem onClick={() => { fileRef.current?.click(); setDataMenu(false); }}>From Text/CSV…</MsMenuItem>
                      <MsMenuItem onClick={() => { setWebDlg({ url: "" }); setDataMenu(false); }}>From Web…</MsMenuItem>
                      <MsSep />
                      <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#605e5c]">Sample files — {catalog.length} datasets</p>
                      <div className="max-h-[280px] overflow-auto">
                        {(["Small", "Medium", "Large", "Huge"] as const).map((sz) => (
                          <React.Fragment key={sz}>
                            {catalog.filter((f) => f.size === sz).map((f) => (
                              <MsMenuItem key={f.id} onClick={() => { loadDataset(f.id); setDataMenu(false); }}>
                                <span className="flex w-full items-center gap-2">
                                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                  {f.messy && <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[9px] font-bold uppercase text-amber-700">messy</span>}
                                  <span className="shrink-0 text-[10px] text-[#605e5c]">{f.rows.toLocaleString()}×{f.cols}</span>
                                </span>
                              </MsMenuItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </MsMenu>
                  )}
                </div>
                <RBig title="Turn the selected range into a table you can transform (like Power Query's From Table/Range)" onClick={formatAsTable} label="From Table/Range"><Table2 className="h-5 w-5" /></RBig>
                <RBig
                  title="Launch the Power Query-style cleaning workbench"
                  onClick={() => { coachSay("excel", "excel.data", "Launched the Power Query-style Cleaner workbench"); setView("cleaner"); }}
                  label="Launch Editor"
                  accentIcon={MS.excelGreen}
                ><WandSparkles className="h-5 w-5" /></RBig>
              </RGroup>

              {/* Queries & Connections */}
              <RGroup label="Queries & Connections">
                <RSmall title="Show the Queries & Connections pane — every source this workbook has loaded" onClick={() => setConnPane((v) => !v)} active={connPane} toggleLook label="Queries & Connections"><Database className="h-4 w-4" /></RSmall>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RSmall title="Refresh All — re-pull every loaded source so formulas run on today's data" onClick={() => setRefreshMenu((v) => !v)} chevron label="Refresh All"><RefreshCw className="h-4 w-4" /></RSmall>
                  {refreshMenu && (
                    <MsMenu>
                      <MsMenuItem onClick={() => {
                        setRefreshMenu(false);
                        if (lastDatasetRef.current) { loadDataset(lastDatasetRef.current); coachSay("excel", "excel.refresh", "Refresh All — reloaded the latest source", lastDatasetRef.current); }
                        else setLoadedInfo("Nothing to refresh yet — load a source with Get Data first.");
                      }}>Refresh All</MsMenuItem>
                      <MsMenuItem onClick={() => {
                        setRefreshMenu(false);
                        if (lastDatasetRef.current) { loadDataset(lastDatasetRef.current); coachSay("excel", "excel.refresh", "Refreshed the connection", lastDatasetRef.current); }
                        else setLoadedInfo("No connection to refresh yet.");
                      }}>Refresh</MsMenuItem>
                      <MsMenuItem onClick={() => { setRefreshMenu(false); setConnPane(true); setLoadedInfo("Connection properties are listed in the Queries & Connections pane."); }}>Edit Properties…</MsMenuItem>
                    </MsMenu>
                  )}
                </div>
                <RSmall title="Edit Links — manage links to external workbooks" onClick={() => setLoadedInfo("This workbook has no external links — data was loaded directly. (Real Excel lists linked workbooks here.)")} label="Edit Links"><Link2 className="h-4 w-4" /></RSmall>
              </RGroup>

              {/* Data Types */}
              <RGroup label="Data Types">
                <RSmall title="Geography — convert a country column into countries with Capital & Population fields" onClick={() => setDtDlg({ kind: "geo" })} label="Geography"><Globe2 className="h-4 w-4" /></RSmall>
                <RSmall title="Stocks — convert a ticker column into stocks with Price & Day Change fields" onClick={() => setDtDlg({ kind: "stock" })} label="Stocks"><TrendingUp className="h-4 w-4" /></RSmall>
              </RGroup>

              {/* Sort & Filter */}
              <RGroup label="Sort & Filter">
                <RSmall title="Sort A→Z on the selected column" onClick={() => sortRows(selectedColIdx, 1)} label="A→Z"><ArrowUpNarrowWide className="h-4 w-4" /></RSmall>
                <RSmall title="Sort Z→A on the selected column" onClick={() => sortRows(selectedColIdx, -1)} label="Z→A"><ArrowDownWideNarrow className="h-4 w-4" /></RSmall>
                <RSmall title="Sort by multiple levels (Region, then Date…)" onClick={() => setSortDlg({ levels: [{ col: selectedColIdx, dir: 1 }] })} label="Sort"><ListFilter className="h-4 w-4" /></RSmall>
                <RSmall
                  title="AutoFilter — show filter dropdowns on the header row"
                  onClick={() => { setAfOn(!afOn); if (afOn) { setHidden({}); setFilterCol(null); } }}
                  active={autoFilterOn}
                  toggleLook
                  label="Filter"
                ><Filter className="h-4 w-4" /></RSmall>
                <RSmall title="Clear all filters" onClick={() => { setHidden({}); setFilterCol(null); }} label="Clear" />
                <RSmall title="Reapply — re-run the filters against changed data" onClick={() => { setHidden({ ...hidden }); setLoadedInfo("Filters reapplied against the current data."); }} label="Reapply" />
                <RSmall title="Advanced Filter — copy unique values of a column to their own sheet" onClick={() => setAdvDlg({ col: selectedColIdx })} label="Advanced"><Clipboard className="h-4 w-4" /></RSmall>
              </RGroup>

              {/* Data Tools */}
              <RGroup label="Data Tools">
                <RSmall title="Text to Columns — split one column into several by a delimiter" onClick={() => setTtcDlg({ step: 1, delim: "comma" })} label="Text to Columns"><Columns3 className="h-4 w-4" /></RSmall>
                <RSmall title="Flash Fill (Ctrl+E) — learn the pattern from one example and fill the rest" onClick={flashFill} label="Flash Fill"><Wand2 className="h-4 w-4" /></RSmall>
                <RSmall title="Remove Duplicates — choose the key columns, Excel keeps the first of each" onClick={() => setDedupeDlg({ cols: Array.from({ length: usedC }, (_, i) => i) })} label="Remove Dupes"><Wand2 className="h-4 w-4" /></RSmall>
                <RSmall title="Data Validation — restrict what can be typed in this column" onClick={() => setValidDlg({ type: "whole", min: "0", max: "1000", list: "" })} label="Validation"><ClipboardCheck className="h-4 w-4" /></RSmall>
                <RSmall title="Consolidate — aggregate rows by a key column into a summary sheet" onClick={() => setConsDlg({ fn: "SUM", keyCol: 0, valCol: Math.min(usedC - 1, 1) })} label="Consolidate"><Sigma className="h-4 w-4" /></RSmall>
              </RGroup>

              {/* Forecast */}
              <RGroup label="Forecast">
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RSmall title="What-If Analysis — Goal Seek back-solves an input to hit a target" onClick={() => setWhatIfMenu((v) => !v)} chevron label="What-If Analysis"><Target className="h-4 w-4" /></RSmall>
                  {whatIfMenu && (
                    <MsMenu>
                      <MsMenuItem onClick={() => { setWhatIfMenu(false); setGoalDlg({ setCell: "", toVal: "", byCell: "", result: null }); }}>Goal Seek…</MsMenuItem>
                      <MsMenuItem onClick={() => { setWhatIfMenu(false); setLoadedInfo("Data Tables re-run one formula across a grid of inputs — build one by copying your formula row, listing the inputs, then What-If ▸ Data Table in real Excel."); }}>Data Table…</MsMenuItem>
                      <MsMenuItem onClick={() => { setWhatIfMenu(false); setLoadedInfo("Scenario Manager stores named sets of inputs (Best case / Worst case…). Try Goal Seek first — same engine, one target."); }}>Scenario Manager…</MsMenuItem>
                    </MsMenu>
                  )}
                </div>
                <RSmall
                  title="Forecast Sheet — project the selected numeric column forward with a linear trend"
                  onClick={() => {
                    const col = selectedColIdx;
                    const vals: number[] = [];
                    for (let r = 1; r < usedR; r++) {
                      const n = parseFloat((cells[refFor(col, r)] ?? "").replace(/[$,\s]/g, ""));
                      if (!isNaN(n)) vals.push(n);
                    }
                    if (vals.length < 4) { setLoadedInfo("Forecast needs at least 4 numeric rows in the selected column."); return; }
                    const n = vals.length;
                    const xs = vals.map((_, i) => i + 1);
                    const mx = xs.reduce((a, b) => a + b, 0) / n, my = vals.reduce((a, b) => a + b, 0) / n;
                    const slope = xs.reduce((s, x, i) => s + (x - mx) * (vals[i] - my), 0) / (xs.reduce((s, x) => s + (x - mx) * (x - mx), 0) || 1);
                    const intercept = my - slope * mx;
                    pushUndo();
                    const s = newSheet("Forecast");
                    const nc: Record<string, string> = { [refFor(0, 0)]: headerLabel(col), [refFor(1, 0)]: "Forecast" };
                    const stl: Record<string, CellStyle> = { [refFor(0, 0)]: { b: true, bg: "#e5e7eb" }, [refFor(1, 0)]: { b: true, bg: "#e5e7eb" } };
                    vals.forEach((v, i) => { nc[refFor(0, i + 1)] = String(v); });
                    for (let k = 0; k < 6; k++) nc[refFor(1, k + 1)] = String(+(intercept + slope * (n + k)).toFixed(2));
                    s.cells = nc; s.styles = stl; s.freeze = "top";
                    setSheets((ss) => [...ss, s]); setActiveId(s.id); setSel({ a: [0, 0], b: [0, 0] });
                    coachSay("excel", "excel.goalseek", "Forecast Sheet — projected the next 6 periods with a linear trend", `${headerLabel(col)}: trend ${slope >= 0 ? "+" : ""}${slope.toFixed(2)} per row`);
                    setLoadedInfo(`Forecast written to a new sheet: linear trend of ${headerLabel(col)} continues ${slope >= 0 ? "up" : "down"} ~${Math.abs(slope).toFixed(2)} per row for 6 more periods.`);
                  }}
                  label="Forecast Sheet"
                ><ChartLine className="h-4 w-4" /></RSmall>
              </RGroup>

              {/* Outline */}
              <RGroup label="Outline" last>
                <RSmall title="Group — bundle the selected rows so they can collapse behind a +/− " onClick={groupSelRows} label="Group"><GroupIcon className="h-4 w-4" /></RSmall>
                <RSmall title="Ungroup — remove outline groups from the selection" onClick={ungroupSelRows} label="Ungroup"><Ungroup className="h-4 w-4" /></RSmall>
                <RSmall title="Hide Detail — collapse every group for the summary view" onClick={() => { if (!rowGroups.length) { setLoadedInfo("No groups yet — select rows and press Group first."); return; } setCollapsedGroups(new Set(rowGroups.map((_, i) => i))); setLoadedInfo("Detail hidden — the sheet now shows the manager's summary view."); }}><ChevronsDownUp className="h-4 w-4" /></RSmall>
                <RSmall title="Show Detail — expand every collapsed group" onClick={() => { setCollapsedGroups(new Set()); }}><ChevronsUpDown className="h-4 w-4" /></RSmall>
                <RSmall title="Subtotal — sort by a column and insert a subtotal row per group + Grand Total" onClick={() => setSubDlg({ groupCol: 0, fn: "SUM", valCol: Math.min(usedC - 1, 1) })} label="Subtotal"><Sigma className="h-4 w-4" /></RSmall>
                {rowGroups.length > 0 && <span className="self-center px-1.5 text-[10.5px] text-[#605e5c]">{rowGroups.length} group{rowGroups.length > 1 ? "s" : ""} · {collapsedGroups.size} collapsed</span>}
              </RGroup>
            </>
          )}

          {ribbonTab === "review" && (
            <>
              <RGroup label="Checking">
                <RBig
                  title="Check the sheet for formula errors"
                  onClick={() => {
                    const errs = Object.keys(cells).filter((ref) => displayValue(ref, cells, styles).startsWith("#"));
                    setLoadedInfo(errs.length ? `Error check: ${errs.length} error cell${errs.length === 1 ? "" : "s"} — ${errs.slice(0, 6).join(", ")}${errs.length > 6 ? "…" : ""}` : "Error check passed — no formula errors in this sheet. ✔");
                  }}
                  label="Check Errors"
                ><SpellCheck2 className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Comments">
                <RBig
                  title="Add a comment to the active cell — leave a note about why this number matters"
                  onClick={() => setCommentDlg({ ref: active, text: sheet.comments?.[active] ?? "" })}
                  label="New Comment"
                ><MessageSquarePlus className="h-5 w-5" /></RBig>
                <span className="self-center px-2 text-[11px] text-[#605e5c]">{Object.keys(sheet.comments ?? {}).length} on this sheet</span>
              </RGroup>
              <RGroup label="Workbook Statistics" last>
                <div className="self-center px-2 text-[11px] leading-relaxed text-[#605e5c]">
                  {usedR - 1} data rows · {usedC} columns · <b>{formulaCount}</b> formulas · {Object.keys(styles).length} formatted cells · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
                </div>
              </RGroup>
            </>
          )}

          {ribbonTab === "view" && (
            <>
              <RGroup label="Workbook Views">
                <RSmall title="Normal view" active toggleLook label="Normal"><Grid2x2 className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Show">
                <RSmall title="Gridlines" onClick={() => setGridlines((g) => !g)} active={gridlines} toggleLook label="Gridlines"><Grid2x2 className="h-4 w-4" /></RSmall>
                <RSmall title="Headings (row & column headers)" onClick={() => setHeadings((h) => !h)} active={headings} toggleLook label="Headings" />
                <RSmall title="Formula bar" onClick={() => setShowFormulaBar((v) => !v)} active={showFormulaBar} toggleLook label="Formula Bar" />
              </RGroup>
              <RGroup label="Zoom">
                <RSmall title="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut className="h-4 w-4" /></RSmall>
                <span className="flex w-10 items-center justify-center text-[11px] font-semibold">{zoom}%</span>
                <RSmall title="Zoom in" onClick={() => setZoom((z) => Math.min(160, z + 10))}><ZoomIn className="h-4 w-4" /></RSmall>
                <RSmall title="Reset to 100%" onClick={() => setZoom(100)} label="100%" />
              </RGroup>
              <RGroup label="Freeze Panes" last>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Freeze rows/columns so headers stay visible" onClick={() => setFreezeMenu((v) => !v)} chevron label="Freeze Panes"><Snowflake className="h-5 w-5" /></RBig>
                  {freezeMenu && (
                    <MsMenu>
                      <MsMenuItem onClick={() => { setFreeze("none"); }} check={sheet.freeze === "none"}>No freezing</MsMenuItem>
                      <MsMenuItem onClick={() => { setFreeze("top"); }} check={sheet.freeze === "top"}>Freeze top row</MsMenuItem>
                      <MsMenuItem onClick={() => { setFreeze("first"); }} check={sheet.freeze === "first"}>Freeze first column</MsMenuItem>
                      <MsMenuItem onClick={() => { setFreeze("both"); }} check={sheet.freeze === "both"}>Freeze both</MsMenuItem>
                    </MsMenu>
                  )}
                </div>
              </RGroup>
            </>
          )}

          {ribbonTab === "help" && (
            <>
              <RGroup label="Support">
                <RBig title="Keyboard shortcuts" onClick={() => setHelpDlg("keys")} chevron label="Shortcuts"><CircleHelp className="h-5 w-5" /></RBig>
                <RBig title="Browse the function reference" onClick={() => setFuncDlg(true)} label="Functions"><BookOpenText className="h-5 w-5" /></RBig>
                <RBig title="About this simulator" onClick={() => setHelpDlg("about")} label="About"><Info className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Learning" last>
                <p className="max-w-[430px] self-center px-2 text-[11px] leading-relaxed text-[#605e5c]">
                  This is a faithful in-browser Excel: every button above works on the real grid. The <b>Functions Lab</b> in the top navigation teaches each formula step by step, and the <b>Coach</b> below suggests the next move.
                </p>
              </RGroup>
            </>
          )}
        </RibbonBody>
      </div>

      {/* ============ work area + live coach dock ============ */}
      <div className="flex items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-2 lg:flex-row" style={{ background: "#fff" }}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onKey}
            onMouseMove={onGridMouseMove}
            onMouseUp={onGridMouseUp}
            onMouseLeave={onGridMouseUp}
            className="relative overflow-auto outline-none scrollbar-thin"
            style={{ maxHeight: "58vh", background: "#fff", border: `1px solid ${MS.border}`, fontFamily: CAL }}
          >
            <table className="border-collapse text-[13px]" style={{ minWidth: viewCols * 96, borderSpacing: 0 }}>
              {headings && (
                <thead>
                  <tr className="sticky top-0 z-20" style={{ background: "#f8f8f8" }}>
                    <th
                      onMouseDown={(e) => { e.preventDefault(); selectAll(); }}
                      className="sticky left-0 z-30 w-10 cursor-pointer border-b border-r px-1 py-1.5 hover:bg-[#e1dfdd]"
                      style={{ borderColor: "#d9d9d9", left: 0, background: "#f8f8f8" }}
                      title="Select all"
                    >
                      <span className="mx-auto block h-2 w-2 border border-[#a19f9d]" />
                    </th>
                    {Array.from({ length: viewCols }, (_, c) => {
                      const colSelected = c >= nSel.c1 && c <= nSel.c2;
                      const w = sheet.colW[c] ?? 96;
                      return (
                        <th
                          key={c}
                          onMouseDown={(e) => { e.preventDefault(); dragRef.current = { kind: "col", start: [c, 0] }; setSel({ a: [c, 0], b: [c, ROWS - 1] }); gridRef.current?.focus(); }}
                          className="relative cursor-pointer select-none border-b border-r px-2 py-1 text-[11px] font-normal transition-colors"
                          style={{
                            minWidth: w, maxWidth: w,
                            background: colSelected ? MS.headerGreen : "#f8f8f8",
                            color: colSelected ? "#1d4b2a" : "#5f6368",
                            borderColor: "#d9d9d9",
                          }}
                        >
                          {colName(c)}
                          <span
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); resizeRef.current = { col: c, startX: e.clientX, startW: w }; setResizing(w); }}
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#217346]/60"
                            title="Drag to resize column"
                          />
                          {autoFilterOn && (
                            <span
                              role="button"
                              aria-label={`Filter column ${colName(c)}`}
                              className="absolute bottom-0.5 right-0.5 rounded-[2px] p-px text-[#605e5c] hover:bg-[#e1dfdd] hover:text-[#217346]"
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
              )}
              <tbody>
                {Array.from({ length: viewRows }, (_, r) => {
                  if (autoFilterOn && rowHidden(r)) return null;
                  const rowIsSelected = r >= nSel.r1 && r <= nSel.r2;
                  const stickyTop = headings ? frozenTopPx : 0;
                  return (
                    <tr key={r} className="group">
                      {headings && (
                        <td
                          onMouseDown={(e) => { e.preventDefault(); dragRef.current = { kind: "row", start: [0, r] }; setSel({ a: [0, r], b: [COLS - 1, r] }); }}
                          className="sticky z-10 w-10 cursor-pointer select-none border-b border-r px-1 py-0 text-center text-[10px]"
                          style={{
                            height: 24, left: 0,
                            top: frozenTop && r === 0 ? frozenTopPx : undefined,
                            zIndex: r === 0 && frozenTop ? 12 : 10,
                            background: rowIsSelected ? MS.headerGreen : "#f8f8f8",
                            color: rowIsSelected ? "#1d4b2a" : "#5f6368",
                            borderColor: "#d9d9d9",
                          }}
                        >
                          {r + 1}
                        </td>
                      )}
                      {Array.from({ length: viewCols }, (_, c) => {
                        const cv = cover.get(`${c}:${r}`);
                        if (cv && !cv.anchor) return null;
                        const span = cv ? { colSpan: cv.rect.c2 - cv.rect.c1 + 1, rowSpan: cv.rect.r2 - cv.rect.r1 + 1 } : {};
                        const ref = refFor(c, r);
                        const isA = sel.a[0] === c && sel.a[1] === r;
                        const inSel = c >= nSel.c1 && c <= nSel.c2 && r >= nSel.r1 && r <= nSel.r2;
                        const raw = cells[ref];
                        const isFormula = !!raw?.startsWith("=");
                        const st = styles[ref];
                        const disp = displayValue(ref, cells, styles);
                        const shown = isFormula ? disp : st?.nf ? fmtCellDisplay(raw ?? "", st.nf, st.dec) : displayGeneral(raw ?? "");
                        const numeric = shown !== "" && !isNaN(parseFloat(String(shown).replace(/[$,%\s]/g, "")));
                        const cfBg = cfBgFor(ref, r, c);
                        const align = st?.al ?? (numeric && !st?.al ? "r" : "l");
                        const fill = st?.bg || cfBg;
                        return (
                          <td
                            key={c}
                            {...span}
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
                            className="relative h-6 max-w-[280px] select-none overflow-hidden border-b border-r px-1.5 py-0"
                            style={{
                              minWidth: sheet.colW[c] ?? 96,
                              borderColor: gridlines ? "#e1e1e1" : "transparent",
                              background: fill ?? (inSel && !isA ? "rgba(33,115,70,0.08)" : "#fff"),
                              color: st?.fc ?? "#252423",
                              fontWeight: st?.b ? 700 : undefined,
                              fontStyle: st?.i ? "italic" : undefined,
                              textDecoration: st?.u ? "underline" : undefined,
                              fontSize: st?.sz ? `${st.sz}px` : undefined,
                              fontFamily: st?.ff ? `"${st.ff}", Calibri, sans-serif` : undefined,
                              textAlign: align === "c" ? "center" : align === "r" ? "right" : "left",
                              whiteSpace: st?.wr ? "normal" : "nowrap",
                              position: "relative",
                              ...(isA ? { outline: "2px solid #217346", outlineOffset: -1, zIndex: 9 } : {}),
                              ...(frozenFirst && c === 0 && !isA ? { position: "sticky", left: headings ? 40 : 0, zIndex: 5, background: fill ?? "#fff" } : {}),
                              ...(frozenTop && r === 0 && !isA ? { position: "sticky", top: stickyTop, zIndex: 5, background: fill ?? "#fff" } : {}),
                              ...(frozenFirst && c === 0 && frozenTop && r === 0 && !isA ? { zIndex: 13 } : {}),
                            }}
                            title={isFormula ? `${ref}: ${raw}` : undefined}
                          >
                            {isA && editVal !== null ? (
                              <input
                                autoFocus
                                className="absolute inset-0 z-20 w-full bg-white px-1.5 text-[12px] outline outline-2 -outline-offset-1 outline-[#217346]"
                                style={{ fontFamily: CAL }}
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onBlur={() => commit("none")}
                              />
                            ) : (
                              <span>{shown}</span>
                            )}
                            {sheet.comments?.[refFor(c, r)] && (
                              <span
                                className="pointer-events-none absolute right-0 top-0 border-t-[8px] border-t-[#a4262c] border-l-[8px] border-l-transparent"
                                title={`Comment: ${sheet.comments[refFor(c, r)]}`}
                              />
                            )}
                            {isFormula && shown.startsWith("#") && <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#a4262c]" />}
                            {isFormula && !shown.startsWith("#") && <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#0ea5e9]/70" />}
                            {c === nSel.c2 && r === nSel.r2 && editVal === null && (
                              <span
                                onMouseDown={(e) => {
                                  e.stopPropagation(); e.preventDefault();
                                  const targets: { c: number; r: number }[] = [];
                                  for (let rr = nSel.r2 + 1; rr <= Math.min(nSel.r2 + 60, ROWS - 1); rr++) for (let cc = nSel.c1; cc <= nSel.c2; cc++) targets.push({ c: cc, r: rr });
                                  fillFrom(active, targets);
                                }}
                                className="absolute -bottom-[3px] -right-[3px] z-20 h-[7px] w-[7px] cursor-crosshair rounded-[1px] border border-white"
                                style={{ background: "#217346" }}
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

            {/* embedded charts float over the grid — Excel-style palette */}
            {charts.map((ch) => (
              <div
                key={ch.id}
                className="absolute z-30 w-[380px] rounded-[4px] border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                style={{ left: `${ch.x}%`, top: `${ch.y}%`, borderColor: MS.border }}
              >
                <div className="flex cursor-move items-center justify-between border-b px-3 py-1.5" style={{ borderColor: "#edebe9" }} onMouseDown={(e) => {
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
                  <span className="truncate text-[11.5px] font-semibold text-[#252423]">{ch.title}</span>
                  <button className="text-[#605e5c] hover:text-[#a4262c]" onClick={() => setCharts((cs) => cs.filter((c2) => c2.id !== ch.id))} title="Remove chart"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="h-52 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {ch.kind === "pie" ? (
                      <PieChart>
                        <RTooltip formatter={(v: number) => fmtNum(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Pie data={ch.labels.map((l, i) => ({ name: l, v: ch.series[0]?.values[i] ?? 0 }))} dataKey="v" nameKey="name" outerRadius={70} label={false}>
                          {ch.labels.map((_, i) => <RCell key={i} fill={EXCEL_CHART_COLORS[i % EXCEL_CHART_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    ) : ch.kind === "line" ? (
                      <LineChart data={ch.labels.map((l, i) => ({ name: l, ...Object.fromEntries(ch.series.map((s) => [s.name, s.values[i] ?? 0])) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.12)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNum} width={52} />
                        <RTooltip formatter={(v: number) => fmtNum(v)} />
                        {ch.series.map((s, si) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={EXCEL_CHART_COLORS[si % EXCEL_CHART_COLORS.length]} strokeWidth={2} dot={false} />)}
                      </LineChart>
                    ) : (
                      <BarChart data={ch.labels.map((l, i) => ({ name: l, ...Object.fromEntries(ch.series.map((s) => [s.name, s.values[i] ?? 0])) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.12)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} height={44} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNum} width={52} />
                        <RTooltip formatter={(v: number) => fmtNum(v)} />
                        {ch.series.map((s, si) => <Bar key={s.name} dataKey={s.name} fill={EXCEL_CHART_COLORS[si % EXCEL_CHART_COLORS.length]} />)}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* status bar — Excel style */}
          <div
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1 text-[11px] text-[#444]"
            style={{ background: MS.surface, border: `1px solid ${MS.border}` }}
          >
            <span className={editVal !== null ? "font-semibold" : ""} style={editVal !== null ? { color: MS.excelGreen } : { color: MS.ink }}>{editVal !== null ? "Enter" : "Ready"}</span>
            <span className="h-3 w-px" style={{ background: MS.border }} />
            {clipboard ? <b>Clipboard: {clipboard.h}×{clipboard.w}{clipboard.cut ? " (cut)" : ""}</b> : <>Selection <b className="font-mono">{nSel.c2 - nSel.c1 + 1}×{nSel.r2 - nSel.r1 + 1}</b></>}
            <span className="h-3 w-px" style={{ background: MS.border }} />
            <span>Count: <b className="font-mono">{selStats.count.toLocaleString()}</b></span>
            <span>Numerical: <b className="font-mono">{selStats.numCount.toLocaleString()}</b></span>
            <span>Sum: <b className="font-mono">{fmtNum(selStats.sum)}</b></span>
            <span>Average: <b className="font-mono">{fmtNum(selStats.avg)}</b></span>
            {loadedInfo && <span className="max-w-[360px] truncate font-medium" style={{ color: MS.excelGreen }} title={loadedInfo}>{loadedInfo}</span>}
            <span className="ml-auto flex items-center gap-2">
              <button title="Toggle gridlines" onClick={() => setGridlines((g) => !g)} className={`rounded-[3px] p-1 ${gridlines ? "bg-[#dbe6dc]" : "hover:bg-[#e1dfdd]"}`}><Grid2x2 className="h-3.5 w-3.5" /></button>
              <button title="Toggle headings" onClick={() => setHeadings((h) => !h)} className={`rounded-[3px] p-1 ${headings ? "bg-[#dbe6dc]" : "hover:bg-[#e1dfdd]"}`}><GalleryVerticalEnd className="h-3.5 w-3.5" /></button>
              <ZoomOut className="h-3 w-3" />
              <input type="range" min={50} max={160} step={10} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="h-1 w-24 accent-[#217346]" aria-label="Zoom" />
              <ZoomIn className="h-3 w-3" />
              <b className="w-10">{zoom}%</b>
            </span>
          </div>

          {/* sheet tabs — Excel style strip */}
          <div className="mt-1 flex items-center gap-0 overflow-x-auto pb-0" style={{ background: MS.surface, border: `1px solid ${MS.border}` }}>
            <button onClick={addSheet} className="flex h-[28px] w-8 shrink-0 items-center justify-center text-[#605e5c] hover:bg-[#e1dfdd]" title="New sheet"><Plus className="h-3.5 w-3.5" /></button>
            {sheets.map((s) => (
              <div key={s.id} className="relative shrink-0">
                <button
                  onClick={() => { setActiveId(s.id); setSel({ a: [0, 0], b: [0, 0] }); setHidden({}); }}
                  onDoubleClick={() => renameSheet(s.id)}
                  onContextMenu={(e) => { e.preventDefault(); setSheetMenu(s.id); }}
                  className="relative flex h-[28px] items-center gap-1.5 px-3.5 text-[12px] transition-colors"
                  style={{
                    background: s.id === activeId ? "#fff" : "transparent",
                    color: s.id === activeId ? "#252423" : "#444",
                    fontWeight: s.id === activeId ? 600 : 400,
                  }}
                  title="Double-click to rename · right-click for more"
                >
                  {s.color && <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />}
                  {s.name}
                  {s.id === activeId && <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: MS.excelGreen }} />}
                </button>
                {sheetMenu === s.id && (
                  <MsMenu align="left" width={190}>
                    <MsMenuItem onClick={() => { renameSheet(s.id); }}>Rename</MsMenuItem>
                    <MsMenuItem onClick={() => { duplicateSheet(s.id); setSheetMenu(null); }}>Duplicate</MsMenuItem>
                    <MsMenuItem onClick={() => { deleteSheetById(s.id); setSheetMenu(null); }}>Delete</MsMenuItem>
                    <MsSep />
                    <div className="flex gap-1.5 px-2.5 py-1.5">
                      {TAB_COLORS.map((c) => (
                        <button key={c} className="h-4 w-4 rounded-full border border-[#d2d0ce]" style={{ background: c }} onClick={() => { updateSheet(s.id, (sh) => ({ color: sh.color === c ? undefined : c })); setSheetMenu(null); }} aria-label={`Tab color ${c}`} />
                      ))}
                    </div>
                  </MsMenu>
                )}
              </div>
            ))}
            <span className="ml-3 hidden whitespace-nowrap pr-2 text-[10.5px] text-[#605e5c] md:inline">
              double-click a tab to rename · right-click: duplicate / delete / color
            </span>
          </div>

          {/* saved (portfolio) sheets */}
          {Object.keys(savedSheets).length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-[#605e5c]">
              <span className="font-semibold uppercase tracking-wide">Portfolio saves:</span>
              {Object.values(savedSheets).map((s) => (
                <span key={s.name} className="group flex items-center gap-1 rounded-[3px] border px-2 py-1" style={{ borderColor: MS.border, background: "#faf9f8" }}>
                  <button className="font-medium text-[#252423] hover:underline" title="Load a copy into the workbook" onClick={() => {
                    const ns = newSheet(s.name.slice(0, 24));
                    ns.cells = { ...s.cells };
                    setSheets((ss) => [...ss, ns]);
                    setActiveId(ns.id);
                  }}>{s.name}</button>
                  <button className="text-[#a19f9d] hover:text-[#a4262c]" aria-label={`Delete ${s.name}`} onClick={() => deleteSheet(s.name)}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* stats + help — Office-style task cards */}
        <div className="w-full shrink-0 space-y-3 lg:w-72">
          <div className="rounded-[4px] border" style={{ borderColor: MS.border, background: "#fff" }}>
            <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: "#edebe9", background: MS.surface, color: "#605e5c" }}>Column stats — {colName(selectedColIdx)}</div>
            <div className="p-3 text-[12.5px]">
              {colStats ? (
                <div className="space-y-1.5">
                  {([
                    ["Count", colStats.n], ["Sum", colStats.sum], ["Mean", colStats.mean],
                    ["Median", colStats.median], ["Std dev", colStats.std], ["Min", colStats.min], ["Max", colStats.max],
                  ] as [string, number][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#605e5c]">{k}</span>
                      <span className="font-mono">{fmtNum(v)}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] leading-snug text-[#605e5c]">If mean ≫ median the column is right-skewed — report the median.</p>
                </div>
              ) : (
                <p className="text-[#605e5c]">Select a column with numbers. Try loading sample data first.</p>
              )}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: MS.border, background: "#fff" }}>
            <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: "#edebe9", background: MS.surface, color: "#605e5c" }}>Formula cheat-sheet</div>
            <div className="space-y-1 p-3 text-[11px] leading-relaxed text-[#605e5c]" style={{ fontFamily: CAL }}>
              <p><b style={{ color: MS.excelGreen }}>=SUM(B2:B100)</b> · AVERAGE / MEDIAN / STDEV</p>
              <p><b style={{ color: MS.excelGreen }}>=SUMIF(E:E,&quot;North&quot;,I:I)</b> · SUMIFS</p>
              <p><b style={{ color: MS.excelGreen }}>=COUNTIF(E:E,&quot;&gt;500&quot;)</b> · COUNTIFS</p>
              <p><b style={{ color: MS.excelGreen }}>=VLOOKUP(&quot;Desk&quot;,G:J,4)</b> · XLOOKUP</p>
              <p><b style={{ color: MS.excelGreen }}>=INDEX(I2:I21,3)</b> · MATCH</p>
              <p><b style={{ color: MS.excelGreen }}>=IF(I2&gt;1000,&quot;Big&quot;,&quot;Small&quot;)</b> · IFERROR</p>
              <p><b style={{ color: MS.excelGreen }}>=CONCAT(B2,&quot; &quot;,C2)</b> · TEXTJOIN</p>
              <p><b style={{ color: MS.excelGreen }}>=ROUND / INT / MOD</b></p>
              <p><b style={{ color: MS.excelGreen }}>=LEFT / RIGHT / MID / LEN / TRIM</b></p>
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: MS.border, background: "#fff" }}>
            <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: "#edebe9", background: MS.surface, color: "#605e5c" }}>Excel keyboard</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-3 text-[11px] text-[#605e5c]">
              {[["Ctrl+B / I / U", "bold / italic / underline"], ["Ctrl+C / X / V", "copy / cut / paste"], ["Ctrl+Z / Y", "undo / redo"], ["Ctrl+D", "fill down"], ["Ctrl+F", "find & replace"], ["Ctrl+A", "select all"], ["F2", "edit active cell"], ["Ctrl+1", "format cells"]].map(([k, d]) => (
                <React.Fragment key={k}>
                  <span className="font-mono text-[#252423]">{k}</span>
                  <span>{d}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        </div>

        <LiveCoach
          tool="excel"
          accent={MS.excelGreen}
          office
          tips={tips}
          doctor={{
            snapshot: doctorSnapshot,
            canFix: true,
            onFix: applyDoctorFix,
            fixLabel: "Excel",
            emptyHint: "Load a file first (Data ▸ Get Data or File ▸ Open) — then I scan every cell in it and list THIS file's exact problems: blanks, duplicates, text-numbers, date chaos and more, with the rows to look at.",
          }}
        />
      </div>

      {/* ============ autofilter panel (dialog-style) ============ */}
      {filterCol !== null && (
        <MsDialog title={`Filter — column ${colName(filterCol)}`} onClose={() => setFilterCol(null)} width={380}>
          <div className="mb-2 flex gap-1.5">
            <button className="rounded-[3px] border border-[#d2d0ce] px-2.5 py-1 text-[12px] hover:bg-[#f3f2f1]" onClick={() => setHidden((h) => ({ ...h, [filterCol]: new Set() }))}>Select All</button>
            <button className="rounded-[3px] border border-[#d2d0ce] px-2.5 py-1 text-[12px] hover:bg-[#f3f2f1]" onClick={() => setFilterCol(null)}>Close</button>
          </div>
          <p className="mb-1.5 text-[11.5px] text-[#605e5c]">Uncheck the values you want to hide — behaves exactly like Excel&apos;s AutoFilter dropdown.</p>
          <div className="max-h-52 space-y-0.5 overflow-auto rounded-[3px] border border-[#e1dfdd] p-1.5 scrollbar-thin">
            {distinctValues(filterCol).map((v) => {
              const excluded = hidden[filterCol]?.has(v);
              return (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-[#f3f2f1]">
                  <Checkbox checked={!excluded} onCheckedChange={() => toggleFilterColValue(filterCol, v)} className="accent-[#217346]" />
                  <span className="truncate font-mono">{v}</span>
                </label>
              );
            })}
          </div>
        </MsDialog>
      )}

      {/* ============ find & replace dialog ============ */}
      {findDlg && (
        <MsDialog title="Find and Replace" onClose={() => setFindDlg(null)} width={440}>
          <div className="space-y-2">
            <Input autoFocus value={findDlg.find} onChange={(e) => setFindDlg({ ...findDlg, find: e.target.value })} placeholder="Find what…" className="h-8 border-[#d2d0ce] text-[13px]" onKeyDown={(e) => e.key === "Enter" && findAll()} />
            <Input value={findDlg.replace} onChange={(e) => setFindDlg({ ...findDlg, replace: e.target.value })} placeholder="Replace with…" className="h-8 border-[#d2d0ce] text-[13px]" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-3 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={findAll}>Find All</button>
            <button className="rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={replaceAll}>Replace All</button>
            <button className="rounded-[3px] px-3 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setFindDlg(null)}>Close</button>
          </div>
          {findDlg.results.length > 0 && (
            <div className="mt-3 max-h-40 overflow-auto rounded-[3px] border border-[#e1dfdd] p-1.5 scrollbar-thin">
              <p className="px-1 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#605e5c]">{findDlg.results.length} match{findDlg.results.length === 1 ? "" : "es"} — click to jump</p>
              {findDlg.results.map((ref) => (
                <button key={ref} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-[12px] hover:bg-[#f3f2f1]" onClick={() => gotoRef(ref)}>
                  <b style={{ color: MS.excelGreen }}>{ref}</b>
                  <span className="truncate text-[#605e5c]">{displayValue(ref, cells, styles)}</span>
                </button>
              ))}
            </div>
          )}
        </MsDialog>
      )}

      {/* ============ format cells dialog (Ctrl+1) ============ */}
      {fmtDlg && (
        <MsDialog title="Format Cells" onClose={() => setFmtDlg(false)} width={480}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-[12px] font-semibold">Number</p>
              <MsSelect
                title="Category"
                width={180}
                value={activeStyle?.nf ?? "general"}
                onChange={(v) => applyStyleToSel({ nf: v as NumFmt })}
                options={[
                  { value: "general", label: "General" }, { value: "number", label: "Number" },
                  { value: "currency", label: "Currency" }, { value: "comma", label: "Comma" },
                  { value: "percent", label: "Percent" }, { value: "text", label: "Text" },
                ]}
              />
              <label className="mt-2 flex items-center gap-2 text-[12px]">
                Decimal places
                <input
                  type="number" min={0} max={6}
                  value={activeStyle?.dec ?? 2}
                  onChange={(e) => applyStyleToSel({ dec: Math.max(0, Math.min(6, +e.target.value || 0)) })}
                  className="h-7 w-16 rounded-[3px] border border-[#d2d0ce] px-1.5 text-[12px]"
                />
              </label>
              <p className="mt-2 rounded-[3px] border border-[#e1dfdd] bg-[#faf9f8] px-2 py-1.5 text-[12px]">
                Sample: <b className="font-mono">{(() => { const v = cells[active] ?? ""; return v && !v.startsWith("=") ? fmtCellDisplay(v, activeStyle?.nf, activeStyle?.dec) : "1,234.50"; })()}</b>
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold">Font &amp; Fill</p>
              <div className="mb-2 flex gap-1">
                {(["b", "i", "u"] as const).map((k) => (
                  <button key={k} onClick={() => toggleStyle(k)} className={`rounded-[3px] border border-[#d2d0ce] px-2 py-1 text-[12px] ${((k === "b" && activeStyle?.b) || (k === "i" && activeStyle?.i) || (k === "u" && activeStyle?.u)) ? "bg-[#dbe6dc]" : "hover:bg-[#f3f2f1]"}`}>
                    {k === "b" ? "B" : k === "i" ? "I" : "U"}
                  </button>
                ))}
              </div>
              <p className="mb-1 text-[11px] text-[#605e5c]">Fill</p>
              <div className="flex flex-wrap gap-1">
                {FILL_COLORS.map((c) => (
                  <button key={c || "none"} className={`h-5 w-5 rounded-sm border ${activeStyle?.bg === c ? "ring-2 ring-[#217346]" : "border-[#d2d0ce]"}`} style={{ background: c || undefined }} onClick={() => applyStyleToSel({ bg: c || undefined })} aria-label={c || "No fill"} />
                ))}
              </div>
              <p className="mb-1 mt-2 text-[11px] text-[#605e5c]">Font color</p>
              <div className="flex flex-wrap gap-1">
                {FONT_COLORS.map((c) => (
                  <button key={c} className={`h-5 w-5 rounded-sm border ${activeStyle?.fc === c ? "ring-2 ring-[#217346]" : "border-[#d2d0ce]"}`} style={{ background: c }} onClick={() => applyStyleToSel({ fc: c })} aria-label={c} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-[#edebe9] pt-3">
            <p className="mb-1.5 text-[12px] font-semibold">Alignment</p>
            <div className="flex gap-1">
              {(["l", "c", "r"] as const).map((a) => (
                <button key={a} onClick={() => applyStyleToSel({ al: a })} className={`rounded-[3px] border border-[#d2d0ce] px-2.5 py-1 text-[12px] ${activeStyle?.al === a ? "bg-[#dbe6dc]" : "hover:bg-[#f3f2f1]"}`}>
                  {a === "l" ? "Left" : a === "c" ? "Center" : "Right"}
                </button>
              ))}
              <button onClick={() => applyStyleToSel({ wr: !activeStyle?.wr })} className={`rounded-[3px] border border-[#d2d0ce] px-2.5 py-1 text-[12px] ${activeStyle?.wr ? "bg-[#dbe6dc]" : "hover:bg-[#f3f2f1]"}`}>Wrap text</button>
              <button onClick={() => applyStyleToSel({ bd: !activeStyle?.bd })} className={`rounded-[3px] border border-[#d2d0ce] px-2.5 py-1 text-[12px] ${activeStyle?.bd ? "bg-[#dbe6dc]" : "hover:bg-[#f3f2f1]"}`}>Borders</button>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setFmtDlg(false)}>Close</button>
          </div>
        </MsDialog>
      )}

      {/* ============ insert function dialog ============ */}
      {funcDlg && (
        <MsDialog title="Insert Function" onClose={() => setFuncDlg(false)} width={520}>
          <p className="mb-2 text-[12px] text-[#605e5c]">Search for a function, then click <b>Insert</b> — it drops the formula into the active cell ({active}) ready for you to edit the ranges.</p>
          <div className="max-h-[320px] space-y-1 overflow-auto rounded-[3px] border border-[#e1dfdd] p-1.5 scrollbar-thin">
            {FORMULA_BUTTONS.map((f) => (
              <div key={f.label} className="flex items-start gap-3 rounded px-2 py-1.5 hover:bg-[#f3f2f1]">
                <code className="w-20 shrink-0 text-[12px] font-semibold" style={{ color: MS.excelGreen }}>{f.label}</code>
                <span className="min-w-0 flex-1 text-[12px] text-[#444]">{f.hint}</span>
                <button
                  className="shrink-0 rounded-[3px] border border-[#d2d0ce] px-2 py-0.5 text-[11px] hover:bg-white"
                  onClick={() => { setEditVal(f.tpl); setFuncDlg(false); gridRef.current?.focus(); }}
                >Insert</button>
              </div>
            ))}
          </div>
        </MsDialog>
      )}

      {/* ============ help dialogs ============ */}
      {helpDlg === "keys" && (
        <MsDialog title="Keyboard shortcuts" onClose={() => setHelpDlg(null)} width={420}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
            {[["Ctrl+B / I / U", "bold / italic / underline"], ["Ctrl+C / X / V", "copy / cut / paste"], ["Ctrl+Z / Y", "undo / redo"], ["Ctrl+D", "fill down"], ["Ctrl+F", "find & replace"], ["Ctrl+A", "select all"], ["Ctrl+1", "format cells"], ["F2", "edit active cell"], ["Enter / Tab", "commit & move"], ["Shift+arrows", "extend selection"]].map(([k, d]) => (
              <React.Fragment key={k}>
                <span className="font-mono text-[#252423]">{k}</span>
                <span className="text-[#605e5c]">{d}</span>
              </React.Fragment>
            ))}
          </div>
        </MsDialog>
      )}
      {helpDlg === "about" && (
        <MsDialog title="About this simulator" onClose={() => setHelpDlg(null)} width={460}>
          <p className="text-[13px] leading-relaxed text-[#444]">
            This is <b>Data Analytics Academy — Excel Studio</b>: a faithful, fully client-side recreation of Microsoft Excel&apos;s interface and behavior. The ribbon, formula bar, name box, fill handle, AutoFilter, freeze panes, merge &amp; center, format-as-table, conditional formatting, charts, multi-sheet workbooks, undo/redo and the formula engine (SUM → XLOOKUP) all run locally in your browser — nothing is uploaded, and it is completely free.
          </p>
          <p className="mt-2 text-[12.5px] text-[#605e5c]">Your workbook auto-saves in this browser (AutoSave pill in the title bar). Save sheets to your Academy portfolio, then push them to GitHub from the Workspace tab.</p>
        </MsDialog>
      )}

      {/* ============ context menu (Excel style) ============ */}
      {ctxMenu && (
        <div className="fixed z-50" style={{ left: ctxMenu.x, top: ctxMenu.y }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="relative">
            <MsMenu align="left" width={230}>
              <MsMenuItem onClick={() => { copySel(false); setCtxMenu(null); }} icon={<Copy className="h-3.5 w-3.5" />}>Copy</MsMenuItem>
              <MsMenuItem onClick={() => { copySel(true); setCtxMenu(null); }} icon={<Scissors className="h-3.5 w-3.5" />}>Cut</MsMenuItem>
              <MsMenuItem onClick={() => { pasteAt(); setCtxMenu(null); }} disabled={!clipboard} icon={<Clipboard className="h-3.5 w-3.5" />}>Paste</MsMenuItem>
              <MsMenuItem onClick={() => { pasteSpecial("values"); setCtxMenu(null); }} disabled={!clipboard}>Paste Values</MsMenuItem>
              <MsSep />
              <MsMenuItem onClick={() => { shiftRows(nSel.r1, 1); setCtxMenu(null); }}>Insert row above</MsMenuItem>
              <MsMenuItem onClick={() => { shiftCols(nSel.c1, 1); setCtxMenu(null); }}>Insert column left</MsMenuItem>
              <MsMenuItem onClick={() => { shiftRows(nSel.r1, -1); setCtxMenu(null); }}>Delete row</MsMenuItem>
              <MsMenuItem onClick={() => { shiftCols(nSel.c1, -1); setCtxMenu(null); }}>Delete column</MsMenuItem>
              <MsSep />
              <MsMenuItem onClick={() => { sortRows(selectedColIdx, 1); setCtxMenu(null); }}>Sort A→Z (col {colName(selectedColIdx)})</MsMenuItem>
              <MsMenuItem onClick={() => { sortRows(selectedColIdx, -1); setCtxMenu(null); }}>Sort Z→A</MsMenuItem>
              <MsMenuItem onClick={() => { mergeSel(true); setCtxMenu(null); }}>Merge &amp; Center</MsMenuItem>
              <MsSep />
              <MsMenuItem onClick={() => { setFmtDlg(true); setCtxMenu(null); }}>Format Cells…</MsMenuItem>
              <MsMenuItem onClick={() => { clearFormatSel(); setCtxMenu(null); }}>Clear formats</MsMenuItem>
              <MsMenuItem onClick={() => { pushUndo(); setCells((c) => { const n = { ...c }; for (const ref of rectRefs(nSel)) delete n[ref]; return n; }); setCtxMenu(null); }}>Clear contents</MsMenuItem>
            </MsMenu>
          </div>
        </div>
      )}

      {/* ============ File backstage ============ */}
      {backstage && (
        <MsBackstage
          color={MS.excelGreen}
          title={(({ info: "Info", new: "New", open: "Open", save: "Save As", saveac: "Save a Copy", export: "Export", options: "Options" }) as Record<string, string>)[backstage] ?? "File"}
          items={[["info", "Info"], ["new", "New"], ["open", "Open"], ["saveac", "Save a Copy"], ["save", "Save As"], ["export", "Export"], ["options", "Options"]] as const}
          active={backstage}
          onNavigate={(id) => {
            if (id === "new") { newWorkbook(); return; }
            setBackstage(id);
          }}
          onClose={() => setBackstage(null)}
        >
          {backstage === "info" && (
            <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
              {([
                ["Workbook", `${wbName} — ${sheets.length} sheet${sheets.length === 1 ? "" : "s"}`],
                ["Data", `${usedR - 1} data rows × ${usedC} columns (used range)`],
                ["Formulas", `${formulaCount} formulas · ${Object.keys(styles).length} formatted cells`],
                ["AutoSave", autoSave ? "On — the workbook persists in this browser" : "Off — turn it on in the title bar"],
                ["Errors", `${Object.keys(cells).filter((ref) => displayValue(ref, cells, styles).startsWith("#")).length} formula errors`],
                ["Portfolio", `${Object.keys(savedSheets).length} saved sheet${Object.keys(savedSheets).length === 1 ? "" : "s"}`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="rounded-[4px] border border-[#e1dfdd] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">{k}</p>
                  <p className="mt-1 text-[13px]">{v}</p>
                </div>
              ))}
            </div>
          )}
          {backstage === "new" && (
            <div className="max-w-xl">
              <p className="text-[13px] text-[#444]">Start a blank workbook. This clears the current one (Undo works).</p>
              <button className="mt-3 rounded-[3px] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={newWorkbook}>Blank workbook</button>
            </div>
          )}
          {backstage === "open" && (
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <button className="rounded-[3px] border border-[#d2d0ce] px-3 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => fileRef.current?.click()}>Import a CSV file…</button>
                <span className="text-[12px] text-[#605e5c]">or open an Academy sample file:</span>
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {catalog.map((f) => (
                  <button key={f.id} className="flex items-center justify-between gap-2 rounded-[4px] border border-[#e1dfdd] px-3 py-2 text-left hover:border-[#217346]" onClick={() => { loadDataset(f.id); setBackstage(null); }}>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{f.name}</span>
                      <span className="text-[11px] text-[#605e5c]">{f.rows.toLocaleString()} rows × {f.cols} cols · {f.size}</span>
                    </span>
                    {f.messy && <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[9px] font-bold uppercase text-amber-700">messy</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {backstage === "saveac" && (
            <div className="max-w-xl">
              <p className="text-[13px] text-[#444]">Copy the active sheet into your Academy portfolio. It appears under the sheet tabs and in your GitHub workspace.</p>
              <button className="mt-3 rounded-[3px] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => { saveSheet(sheet.name || "Sheet1", cells); setBackstage(null); }}>Save to portfolio</button>
            </div>
          )}
          {backstage === "save" && (
            <div className="max-w-xl">
              <label className="text-[12px] font-semibold text-[#605e5c]">Workbook name</label>
              <input value={wbName} onChange={(e) => setWbName(e.target.value)} className="mt-1 h-9 w-full max-w-xs rounded-[3px] border border-[#d2d0ce] px-2.5 text-[13px]" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-[3px] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={exportCSV}>Save as CSV</button>
                <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-2 text-[13px] hover:bg-[#f3f2f1]" onClick={exportWorkbookJSON}>Save as workbook JSON</button>
              </div>
            </div>
          )}
          {backstage === "export" && (
            <div className="max-w-xl space-y-2">
              <button className="block w-full rounded-[4px] border border-[#e1dfdd] px-4 py-3 text-left hover:border-[#217346]" onClick={exportCSV}>
                <span className="block text-[13px] font-semibold">CSV (comma-separated values)</span>
                <span className="text-[11.5px] text-[#605e5c]">The active sheet — opens anywhere: Excel, Power BI, Python, SQL importers.</span>
              </button>
              <button className="block w-full rounded-[4px] border border-[#e1dfdd] px-4 py-3 text-left hover:border-[#217346]" onClick={exportWorkbookJSON}>
                <span className="block text-[13px] font-semibold">Workbook JSON</span>
                <span className="text-[11.5px] text-[#605e5c]">Every sheet, cell, formula and format — a full backup of your work.</span>
              </button>
            </div>
          )}
          {backstage === "options" && (
            <div className="max-w-xl space-y-2.5 text-[13px]">
              {([
                ["AutoSave — persist the workbook in this browser", autoSave, () => setAutoSave((v) => !v)],
                ["Gridlines", gridlines, () => setGridlines((v) => !v)],
                ["Headings (row & column headers)", headings, () => setHeadings((v) => !v)],
                ["Formula bar", showFormulaBar, () => setShowFormulaBar((v) => !v)],
              ] as [string, boolean, () => void][]).map(([label, on, toggle]) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox checked={on} onCheckedChange={toggle} className="accent-[#217346]" />
                  {label}
                </label>
              ))}
            </div>
          )}
        </MsBackstage>
      )}

      {pivotDlg && (
        <MsDialog title="PivotTable — build a summary" onClose={() => setPivotDlg(null)} width={430}>
          <p className="mb-3 text-[12px] leading-relaxed text-[#605e5c]">
            Group every data row by a field, then aggregate a value column — the summary lands on a new sheet. This is Excel&apos;s most powerful reporting tool: no formulas needed.
          </p>
          {(() => {
              const headers = Array.from({ length: usedC }, (_, c) => displayValue(refFor(c, 0), cells, styles) || colName(c));
              const fieldOpts = headers.map((h, c) => ({ value: String(c), label: h }));
              const numericOpts = fieldOpts.filter(({ value }) => {
                const c = +value;
                for (let r = 1; r < Math.min(usedR, 60); r++) {
                  const raw = String(cells[refFor(c, r)] ?? "").trim();
                  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return false; // dates are not values
                  if (raw !== "" && /^[\d.,$\s+-]+$/.test(raw) && !isNaN(parseFloat(raw.replace(/[$,\s]/g, "")))) return true;
                }
                return false;
              });
              return (
            <div className="space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Rows — group by</span>
                <MsSelect value={String(pivotDlg.rowField)} onChange={(v) => setPivotDlg({ ...pivotDlg, rowField: +v })} options={fieldOpts} ariaLabel="Rows field" width="100%" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Values — aggregate</span>
                <MsSelect value={String(pivotDlg.valField)} onChange={(v) => setPivotDlg({ ...pivotDlg, valField: +v })} options={numericOpts.length ? numericOpts : fieldOpts} ariaLabel="Values field" width="100%" />
              </label>
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Aggregate</span>
                  <MsSelect value={pivotDlg.agg} onChange={(v) => setPivotDlg({ ...pivotDlg, agg: v as "SUM" | "COUNT" | "AVERAGE" })} options={[{ value: "SUM", label: "Sum" }, { value: "COUNT", label: "Count" }, { value: "AVERAGE", label: "Average" }]} ariaLabel="Aggregation" width="100%" />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Columns (optional)</span>
                  <MsSelect value={pivotDlg.colField === undefined ? "none" : String(pivotDlg.colField)} onChange={(v) => setPivotDlg({ ...pivotDlg, colField: v === "none" ? undefined : +v })} options={[{ value: "none", label: "None" }, ...fieldOpts]} ariaLabel="Columns field" width="100%" />
                </label>
              </div>
            </div>
              );
            })()}
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setPivotDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => insertPivot(pivotDlg)}>Insert PivotTable</button>
          </div>
        </MsDialog>
      )}

      {commentDlg && (
        <MsDialog title={`Comment — cell ${commentDlg.ref}`} onClose={() => setCommentDlg(null)} width={380}>
          <textarea
            autoFocus
            value={commentDlg.text}
            onChange={(e) => setCommentDlg({ ...commentDlg, text: e.target.value })}
            rows={4}
            placeholder="Why does this number matter? Where is it from? What did you check?"
            className="w-full resize-none rounded-[3px] border border-[#d2d0ce] p-2.5 text-[13px] outline-none focus:border-[#217346]"
          />
          <p className="mt-1.5 text-[11px] text-[#605e5c]">Comments show as a red triangle on the cell — hover to read. Real teams review sheets through these notes.</p>
          <div className="mt-4 flex justify-end gap-2">
            {sheet.comments?.[commentDlg.ref] && (
              <button
                className="mr-auto rounded-[3px] border border-[#d2d0ce] px-3 py-1.5 text-[12.5px] text-[#a4262c] hover:bg-[#fdf3f4]"
                onClick={() => { setCommentDlg({ ...commentDlg, text: "" }); setTimeout(() => { updateSheet(sheet.id, (sh) => { const n = { ...(sh.comments ?? {}) }; delete n[commentDlg.ref]; return { comments: n }; }); setCommentDlg(null); }, 0); }}
              >Delete comment</button>
            )}
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setCommentDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={saveComment}>Save comment</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Queries & Connections pane (docked left, like Excel's side pane) ===== */}
      {connPane && (
        <div className="fixed left-3 top-44 z-30 flex max-h-[60vh] w-[300px] flex-col overflow-hidden rounded-[6px] border bg-white shadow-[0_10px_32px_rgba(0,0,0,0.22)]" style={{ borderColor: MS.border }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#edebe9" }}>
            <p className="text-[12px] font-bold" style={{ color: MS.ink }}>Queries &amp; Connections</p>
            <button onClick={() => setConnPane(false)} className="rounded p-1 text-[#605e5c] hover:bg-[#f3f2f1]" aria-label="Close pane"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
            {connections.length === 0 ? (
              <p className="px-1 py-2 text-[11.5px] leading-relaxed text-[#605e5c]">
                No connections yet. Use <b>Data ▸ Get Data</b> to load a sample file or CSV — every source you load shows up here, ready to refresh.
              </p>
            ) : connections.map((c) => (
              <div key={c.id} className="mb-1.5 rounded-[4px] border border-[#edebe9] px-2.5 py-2 hover:bg-[#f8f8f8]">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: MS.ink }}>
                  <Database className="h-3.5 w-3.5" style={{ color: MS.excelGreen }} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                </p>
                <p className="mt-0.5 text-[10.5px] text-[#605e5c]">{c.kind === "sample" ? "Sample dataset" : "CSV file"} · {c.rows.toLocaleString()} rows · loaded {new Date(c.at).toLocaleTimeString()}</p>
                <div className="mt-1.5 flex gap-1.5">
                  {c.datasetId && (
                    <button className="rounded-[3px] border px-2 py-0.5 text-[10.5px] font-semibold hover:bg-[#f3f2f1]" style={{ borderColor: MS.border, color: MS.ink }} onClick={() => { loadDataset(c.datasetId!); coachSay("excel", "excel.refresh", `Refreshed ${c.name} from the Queries & Connections pane`); }}>Refresh</button>
                  )}
                  <button className="rounded-[3px] border px-2 py-0.5 text-[10.5px] font-semibold hover:bg-[#f3f2f1]" style={{ borderColor: MS.border, color: MS.ink }} onClick={() => setLoadedInfo(`${c.name} — ${c.rows.toLocaleString()} rows, loaded ${new Date(c.at).toLocaleString()}. Source: ${c.kind === "sample" ? "Academy sample library" : "CSV import"}.`)}>Properties</button>
                  <button className="ml-auto rounded-[3px] border px-2 py-0.5 text-[10.5px] hover:bg-[#fdf3f4]" style={{ borderColor: MS.border, color: "#a4262c" }} onClick={() => setConnections((cs) => cs.filter((x) => x.id !== c.id))}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Sort dialog (multi-level, like Data ▸ Sort) ===== */}
      {sortDlg && (
        <MsDialog title="Sort" onClose={() => setSortDlg(null)} width={430}>
          <p className="mb-2 text-[11.5px] leading-relaxed text-[#605e5c]">Sort the whole table by up to 4 levels. Rows are sorted together — like real Excel.</p>
          {sortDlg.levels.map((lv, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <span className="w-16 text-[11px] font-semibold" style={{ color: MS.ink }}>Level {i + 1}</span>
              <MsSelect value={String(lv.col)} onChange={(v) => setSortDlg({ levels: sortDlg.levels.map((l, j) => (j === i ? { ...l, col: +v } : l)) })} options={fieldOpts} ariaLabel="Sort by column" width="180px" />
              <MsSelect value={String(lv.dir)} onChange={(v) => setSortDlg({ levels: sortDlg.levels.map((l, j) => (j === i ? { ...l, dir: +v as 1 | -1 } : l)) })} options={[{ value: "1", label: "A to Z" }, { value: "-1", label: "Z to A" }]} ariaLabel="Order" width="90px" />
              <button className="rounded p-1 text-[#a4262c] hover:bg-[#fdf3f4]" title="Delete level" onClick={() => setSortDlg({ levels: sortDlg.levels.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button
            className="mt-1 rounded-[3px] border px-3 py-1 text-[12px] font-semibold hover:bg-[#f3f2f1] disabled:opacity-40"
            style={{ borderColor: MS.border, color: MS.ink }}
            disabled={sortDlg.levels.length >= 4}
            onClick={() => setSortDlg({ levels: [...sortDlg.levels, { col: 0, dir: 1 }] })}
          >+ Add level</button>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setSortDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => multiSort(sortDlg.levels)}>OK</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Text to Columns wizard ===== */}
      {ttcDlg && (
        <MsDialog title="Text to Columns" onClose={() => setTtcDlg(null)} width={470}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#605e5c]">Step {ttcDlg.step} of 2</p>
          {ttcDlg.step === 1 ? (
            <>
              <p className="mb-2 text-[12.5px] leading-relaxed" style={{ color: MS.ink }}>
                Column <b>{colName(selectedColIdx)}</b> ({headerLabel(selectedColIdx)}) will be split into new columns. First pick what separates the values.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["comma", "semicolon", "tab", "space"] as const).map((d) => (
                  <button key={d} onClick={() => setTtcDlg({ ...ttcDlg, delim: d })}
                    className="rounded-[3px] border px-3 py-2 text-left text-[12.5px] capitalize"
                    style={{ borderColor: ttcDlg.delim === d ? MS.excelGreen : MS.border, background: ttcDlg.delim === d ? "#eaf3ee" : "#fff", color: MS.ink }}
                  >{d === "comma" ? "Comma  ," : d === "semicolon" ? "Semicolon  ;" : d === "tab" ? "Tab" : "Space"}</button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#605e5c]">Example: <b>Austin, TX</b> with Comma → <b>Austin</b> | <b>TX</b>. Existing columns shift right to make room — nothing is overwritten.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setTtcDlg(null)}>Cancel</button>
                <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => setTtcDlg({ ...ttcDlg, step: 2 })}>Next</button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-[12.5px] leading-relaxed" style={{ color: MS.ink }}>Ready to split <b>{headerLabel(selectedColIdx)}</b> on <b>{ttcDlg.delim}</b>. A data preview will appear in the grid — press Finish.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setTtcDlg(null)}>Cancel</button>
                <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setTtcDlg({ ...ttcDlg, step: 1 })}>Back</button>
                <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => textToColumns(ttcDlg.delim)}>Finish</button>
              </div>
            </>
          )}
        </MsDialog>
      )}

      {/* ===== Remove Duplicates dialog ===== */}
      {dedupeDlg && (
        <MsDialog title="Remove Duplicates" onClose={() => setDedupeDlg(null)} width={420}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>
            Tick the columns that make a row unique — Excel keeps the <b>first</b> of each duplicate combination.
            {dedupeDlg.cols.length === usedC ? " All columns ticked = only fully identical rows are removed." : " Fewer ticked columns = broader key (more removals)."}
          </p>
          <div className="max-h-[240px] overflow-auto rounded-[4px] border border-[#edebe9] p-2">
            {fieldOpts.map((f) => (
              <label key={f.value} className="flex items-center gap-2 px-1 py-1 text-[12.5px]" style={{ color: MS.ink }}>
                <input
                  type="checkbox"
                  checked={dedupeDlg.cols.includes(+f.value)}
                  onChange={(e) => setDedupeDlg({ cols: e.target.checked ? [...dedupeDlg.cols, +f.value].sort((a, b) => a - b) : dedupeDlg.cols.filter((c) => c !== +f.value) })}
                  className="accent-[#217346]"
                />
                {f.label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setDedupeDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ background: MS.excelGreen }} disabled={!dedupeDlg.cols.length} onClick={() => dedupeCols(dedupeDlg.cols)}>Remove Duplicates</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Data Validation dialog ===== */}
      {validDlg && (
        <MsDialog title={`Data Validation — column ${colName(selectedColIdx)}`} onClose={() => setValidDlg(null)} width={440}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>
            Rule for <b>{headerLabel(selectedColIdx)}</b>: after this, Excel <b>refuses</b> entries that break the rule — exactly like the real Stop alert.
          </p>
          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Allow</span>
              <MsSelect value={validDlg.type} onChange={(v) => setValidDlg({ ...validDlg, type: v as typeof validDlg.type })} options={[{ value: "whole", label: "Whole number" }, { value: "decimal", label: "Decimal" }, { value: "list", label: "List of values" }]} ariaLabel="Validation type" width="100%" />
            </label>
            {validDlg.type === "list" ? (
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Allowed values (comma separated)</span>
                <input value={validDlg.list} onChange={(e) => setValidDlg({ ...validDlg, list: e.target.value })} placeholder="North, South, East, West" className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
              </label>
            ) : (
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Minimum</span>
                  <input value={validDlg.min} onChange={(e) => setValidDlg({ ...validDlg, min: e.target.value })} className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Maximum</span>
                  <input value={validDlg.max} onChange={(e) => setValidDlg({ ...validDlg, max: e.target.value })} className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
                </label>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button className="rounded-[3px] border px-2.5 py-1 text-[11px] font-semibold hover:bg-[#f3f2f1]" style={{ borderColor: MS.border, color: MS.ink }} onClick={circleInvalid}>Circle invalid data now</button>
            <button className="rounded-[3px] border px-2.5 py-1 text-[11px] font-semibold hover:bg-[#f3f2f1]" style={{ borderColor: MS.border, color: MS.ink }} onClick={clearCircles}>Clear circles</button>
            <button className="rounded-[3px] border px-2.5 py-1 text-[11px] hover:bg-[#fdf3f4]" style={{ borderColor: MS.border, color: "#a4262c" }} onClick={() => { updateSheet(sheet.id, (s) => ({ validation: (s.validation ?? []).filter((v) => v.col !== selectedColIdx) })); setValidDlg(null); setLoadedInfo(`Validation rule removed from column ${colName(selectedColIdx)}.`); }}>Remove rule</button>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setValidDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => applyValidation(validDlg)}>Apply rule</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Consolidate dialog ===== */}
      {consDlg && (
        <MsDialog title="Consolidate" onClose={() => setConsDlg(null)} width={430}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>Aggregate detail rows into one line per key — written to a new <b>Consolidation</b> sheet.</p>
          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Group by (labels)</span>
              <MsSelect value={String(consDlg.keyCol)} onChange={(v) => setConsDlg({ ...consDlg, keyCol: +v })} options={fieldOpts} ariaLabel="Key column" width="100%" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Value to aggregate (numbers)</span>
              <MsSelect value={String(consDlg.valCol)} onChange={(v) => setConsDlg({ ...consDlg, valCol: +v })} options={fieldOpts} ariaLabel="Value column" width="100%" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Function</span>
              <MsSelect value={consDlg.fn} onChange={(v) => setConsDlg({ ...consDlg, fn: v as typeof consDlg.fn })} options={["SUM", "COUNT", "AVERAGE", "MAX", "MIN"].map((f) => ({ value: f, label: f }))} ariaLabel="Aggregate function" width="100%" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setConsDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => consolidate(consDlg.fn, consDlg.keyCol, consDlg.valCol)}>Consolidate</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Subtotal dialog ===== */}
      {subDlg && (
        <MsDialog title="Subtotal" onClose={() => setSubDlg(null)} width={430}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>
            Sorts by the group column, then inserts a <b>subtotal row after each group</b> and a <b>Grand Total</b> at the end — the classic finance layout.
          </p>
          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">At each change in (group)</span>
              <MsSelect value={String(subDlg.groupCol)} onChange={(v) => setSubDlg({ ...subDlg, groupCol: +v })} options={fieldOpts} ariaLabel="Group column" width="100%" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Add subtotal of (numbers)</span>
              <MsSelect value={String(subDlg.valCol)} onChange={(v) => setSubDlg({ ...subDlg, valCol: +v })} options={fieldOpts} ariaLabel="Value column" width="100%" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Function</span>
              <MsSelect value={subDlg.fn} onChange={(v) => setSubDlg({ ...subDlg, fn: v as typeof subDlg.fn })} options={["SUM", "COUNT", "AVERAGE"].map((f) => ({ value: f, label: f }))} ariaLabel="Subtotal function" width="100%" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setSubDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => insertSubtotal(subDlg.groupCol, subDlg.fn, subDlg.valCol)}>Insert Subtotals</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Goal Seek dialog ===== */}
      {goalDlg && (
        <MsDialog title="Goal Seek" onClose={() => setGoalDlg(null)} width={420}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>Back-solve an input: <i>what must the changing cell be for the formula to hit the target?</i></p>
          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Set cell (must contain a formula)</span>
              <input value={goalDlg.setCell} onChange={(e) => setGoalDlg({ ...goalDlg, setCell: e.target.value })} placeholder="K2" className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">To value</span>
              <input value={goalDlg.toVal} onChange={(e) => setGoalDlg({ ...goalDlg, toVal: e.target.value })} placeholder="50000" className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">By changing cell (an input the formula uses)</span>
              <input value={goalDlg.byCell} onChange={(e) => setGoalDlg({ ...goalDlg, byCell: e.target.value })} placeholder="J2" className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
            </label>
            {goalDlg.result && <p className="rounded-[3px] border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[12px] text-amber-800">{goalDlg.result}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setGoalDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => runGoalSeek(goalDlg)}>Run Goal Seek</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Advanced Filter dialog ===== */}
      {advDlg && (
        <MsDialog title="Advanced Filter — extract unique values" onClose={() => setAdvDlg(null)} width={420}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>
            Copies one clean copy of every distinct value in <b>{headerLabel(advDlg.col)}</b> to a new <b>Extract</b> sheet — perfect for validation lists and report dropdowns.
          </p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Column</span>
            <MsSelect value={String(advDlg.col)} onChange={(v) => setAdvDlg({ col: +v })} options={fieldOpts} ariaLabel="Extract column" width="100%" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setAdvDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => advancedFilterExtract(advDlg.col)}>Extract</button>
          </div>
        </MsDialog>
      )}

      {/* ===== From Web dialog ===== */}
      {webDlg && (
        <MsDialog title="From Web" onClose={() => setWebDlg(null)} width={430}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>Real Excel fetches a CSV from a URL here. The Academy runs 100% offline on purpose — nothing leaves your browser — so instead of a live download, pick the same data from the sample library.</p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">URL</span>
            <input value={webDlg.url} onChange={(e) => setWebDlg({ ...webDlg, url: e.target.value })} placeholder="https://company.com/reports/sales.csv" className="w-full rounded-[3px] border border-[#d2d0ce] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#217346]" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setWebDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => { coachSay("excel", "excel.data", "Tried From Web — offline Academy pointed to the sample library instead"); setDataMenu(true); setWebDlg(null); }}>Connect</button>
          </div>
        </MsDialog>
      )}

      {/* ===== Data Types dialog ===== */}
      {dtDlg && (
        <MsDialog title={`Data Types — ${dtDlg.kind === "geo" ? "Geography" : "Stocks"}`} onClose={() => setDtDlg(null)} width={430}>
          <p className="mb-2 text-[12px] leading-relaxed" style={{ color: MS.ink }}>
            Scans <b>{headerLabel(selectedColIdx)}</b> for {dtDlg.kind === "geo" ? "country names" : "stock tickers"} and inserts the linked fields as new columns — no VLOOKUP needed.
          </p>
          <p className="mb-2 rounded-[3px] bg-[#f8f8f8] px-2.5 py-1.5 text-[11.5px] leading-relaxed text-[#605e5c]">
            {dtDlg.kind === "geo"
              ? "Recognised: United States, United Kingdom, France, Germany, Spain, Italy, Japan, China, India, Brazil, Canada, Australia, Nigeria, Mexico → inserts Capital + Population (offline training snapshot)."
              : "Recognised: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX → inserts Price (USD) + Day Change % (offline training snapshot)."}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-4 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setDtDlg(null)}>Cancel</button>
            <button className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90" style={{ background: MS.excelGreen }} onClick={() => insertDataTypes(dtDlg.kind)}>Convert & insert fields</button>
          </div>
        </MsDialog>
      )}

    </div>
  );
}

/* ================= local atoms ================= */

/** Split color button — icon over a swatch strip, opens an Office palette menu. */
function ColorSplit({ icon, title, swatch, open, onToggle, onPick, colors, noneLabel }: {
  icon: React.ReactNode; title: string; swatch: string; open: boolean; onToggle: () => void;
  onPick: (c: string) => void; colors: string[]; noneLabel: string;
}) {
  return (
    <span className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <MsTip title={title}>
        <button
          onClick={onToggle}
          className="flex h-[26px] min-w-[26px] flex-col items-center justify-center gap-0 rounded-[3px] px-1 transition-colors"
          style={{ background: open ? MS.pressed : "transparent" }}
          onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = MS.hover; }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
        >
          {icon}
          <span className="h-[3px] w-[14px] rounded-sm border border-[#d2d0ce]" style={{ background: swatch || "transparent" }} />
        </button>
      </MsTip>
      {open && (
        <MsMenu width={170}>
          {noneLabel && <MsMenuItem onClick={() => onPick("")}><span className="mr-1 inline-block h-3 w-3 rounded-sm border border-[#d2d0ce] bg-white" /> {noneLabel}</MsMenuItem>}
          <div className="grid grid-cols-5 gap-1.5 p-2">
            {colors.map((c) => (
              <button key={c} className={`h-5 w-5 rounded-sm border ${swatch === c ? "border-[#252423] ring-2 ring-[#217346]/40" : "border-[#d2d0ce]"}`} style={{ background: c || undefined }} onClick={() => onPick(c)} aria-label={c || noneLabel} />
            ))}
          </div>
        </MsMenu>
      )}
    </span>
  );
}
