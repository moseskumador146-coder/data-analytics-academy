"use client";

/* Power BI Studio — a faithful Power BI Desktop-style report builder.
   Left view rail (Report / Data / Model), ribbon, Visualizations pane with
   Build + Format tabs, Fields pane with per-column checkboxes, field wells with
   aggregation pickers, free-form canvas (drag & resize every visual),
   cross-filtering (click a bar or slice to filter the whole page), slicers,
   multi-page tabs, themes, page filters, undo/redo, Data view with column
   summaries and a Model view schema card. 100% client-side and instant. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolHeader, PANEL, PANEL_HEAD, fmtMoney, fmtNum, DatasetPicker, downloadDatasetCSV } from "./shared";
import { Coach } from "./Coach";
import { useAcademy, type SavedDashboard } from "@/lib/academy/store";
import { getDatasetById, downloadFile, type Dataset, type Row } from "@/lib/academy/datasets";
import {
  Activity, BarChart3, ChartPie, Check, ChevronDown, ChevronUp, ClipboardList, Columns3,
  Copy, Database, Download, Eye, EyeOff, FileJson, Gauge, Grid3x3, LayoutDashboard,
  LineChart as LineIcon, Link2, ListFilter, Maximize2, Paintbrush, Plus, Redo2, Save,
  Search, Sigma, SlidersHorizontal, Sparkles, Square, Table2, Trash2, TrendingUp, Type,
  Undo2, Upload, Calendar, X, Palette, Pencil, MoreHorizontal, MousePointerClick, Move,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ScatterChart, Scatter, ComposedChart,
} from "recharts";

/* ================= model ================= */
type Agg = "sum" | "avg" | "count" | "min" | "max";
type WType = "kpi" | "bar" | "line" | "area" | "pie" | "donut" | "scatter" | "combo" | "table" | "slicer";

interface WFormat {
  legend?: boolean;
  legendPos?: "top" | "bottom" | "left" | "right";
  dataLabels?: boolean;
  axisTitles?: boolean;
  bg?: string;
  border?: boolean;
  titleSize?: number;
}

interface Widget {
  id: string;
  type: WType;
  title: string;
  dimension: string;
  measure: string;
  measure2?: string;
  agg: Agg;
  topN: number;
  filterCol: string;
  filterVal: string;
  color?: number;
  showTitle?: boolean;
  format?: WFormat;
  /* canvas geometry — % of page canvas */
  x: number;
  y: number;
  w: number;
  h: number;
  /* slicer only */
  field?: string;
  selected?: string[];
}

interface Page {
  id: string;
  name: string;
  widgets: Widget[];
  hidden?: boolean;
}

interface PageFilter { id: string; col: string; val: string }
interface CrossFilter { col: string; val: string; from: string }

const THEMES: { name: string; colors: string[] }[] = [
  { name: "Emerald (default)", colors: ["#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6", "#f97316", "#22c55e", "#ef4444"] },
  { name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#3b82f6", "#6366f1", "#14b8a6", "#0284c7", "#22d3ee", "#818cf8"] },
  { name: "Sunset", colors: ["#f97316", "#ef4444", "#f59e0b", "#ec4899", "#e11d48", "#fb923c", "#fbbf24", "#f472b6"] },
  { name: "Orchid", colors: ["#8b5cf6", "#d946ef", "#a855f7", "#6366f1", "#c026d3", "#7c3aed", "#e879f9", "#818cf8"] },
  { name: "Slate", colors: ["#475569", "#0ea5e9", "#64748b", "#10b981", "#94a3b8", "#334155", "#38bdf8", "#6b7280"] },
];

const WTYPE_META: Record<WType, { label: string; icon: React.ReactNode; blurb: string }> = {
  kpi: { label: "Card", icon: <Gauge className="h-4 w-4" />, blurb: "One big number — the 5-second layer" },
  bar: { label: "Clustered column", icon: <BarChart3 className="h-4 w-4" />, blurb: "Compare categories side by side" },
  line: { label: "Line chart", icon: <LineIcon className="h-4 w-4" />, blurb: "Trend over time" },
  area: { label: "Area chart", icon: <TrendingUp className="h-4 w-4" />, blurb: "Volume over time" },
  pie: { label: "Pie chart", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole (≤5 slices)" },
  donut: { label: "Donut chart", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole with a center gap" },
  scatter: { label: "Scatter chart", icon: <Activity className="h-4 w-4" />, blurb: "Relationship between two measures" },
  combo: { label: "Line & clustered column", icon: <TrendingUp className="h-4 w-4" />, blurb: "Two measures, two scales — Power BI classic" },
  table: { label: "Table", icon: <Table2 className="h-4 w-4" />, blurb: "The 5-minute detail layer" },
  slicer: { label: "Slicer", icon: <SlidersHorizontal className="h-4 w-4" />, blurb: "Filters every visual on this page" },
};

const THEME_ICON: Record<string, React.ReactNode> = {
  number: <Sigma className="h-3 w-3 text-emerald-500" />,
  currency: <Sigma className="h-3 w-3 text-emerald-500" />,
  text: <Type className="h-3 w-3 text-sky-500" />,
  date: <Calendar className="h-3 w-3 text-amber-500" />,
};

/* ================= aggregation ================= */
function applyFilters(rows: Row[], w: Widget | null, pageFilters: PageFilter[], cross: CrossFilter[], excludeId?: string): Row[] {
  let out = rows;
  if (w && w.filterCol && w.filterVal) {
    out = out.filter((r) => String(r[w.filterCol] ?? "").trim().toLowerCase() === w.filterVal.trim().toLowerCase());
  }
  for (const f of pageFilters) {
    if (f.col && f.val) out = out.filter((r) => String(r[f.col] ?? "").trim().toLowerCase() === f.val.trim().toLowerCase());
  }
  for (const cf of cross) {
    if (cf.from === excludeId) continue;
    out = out.filter((r) => String(r[cf.col] ?? "").trim().toLowerCase() === cf.val.trim().toLowerCase());
  }
  return out;
}

function aggregate(ds: Dataset, w: Widget, pageFilters: PageFilter[] = [], cross: CrossFilter[] = []): { label: string; value: number }[] {
  const rows = applyFilters(ds.rows, w, pageFilters, cross, w.id);
  const col = ds.columns.find((c) => c.key === w.dimension);
  const isDate = col?.type === "date";
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const rawKey = r[w.dimension];
    const key = rawKey === undefined || rawKey === "" ? "(blank)" : isDate ? String(rawKey).slice(0, 7) : String(rawKey);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const measureNum = (r: Row) => {
    if (w.agg === "count") return 1;
    const v = r[w.measure];
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  if (w.type === "kpi") {
    let value: number;
    if (w.agg === "count") value = rows.length;
    else {
      const all = rows.map(measureNum);
      value = w.agg === "sum" ? all.reduce((s, x) => s + x, 0)
        : w.agg === "avg" ? (all.length ? all.reduce((s, x) => s + x, 0) / all.length : 0)
        : w.agg === "min" ? (all.length ? Math.min(...all) : 0)
        : (all.length ? Math.max(...all) : 0);
    }
    return [{ label: w.title || "Total", value }];
  }
  const out: { label: string; value: number }[] = [];
  for (const [label, grp] of groups) {
    let value: number;
    if (w.agg === "count") value = grp.length;
    else {
      const all = grp.map(measureNum);
      value = w.agg === "sum" ? all.reduce((s, x) => s + x, 0)
        : w.agg === "avg" ? (all.length ? all.reduce((s, x) => s + x, 0) / all.length : 0)
        : w.agg === "min" ? (all.length ? Math.min(...all) : 0)
        : (all.length ? Math.max(...all) : 0);
    }
    out.push({ label, value });
  }
  const sorted = out.sort((a, b) =>
    isDate ? a.label.localeCompare(b.label) : b.value - a.value
  );
  return w.topN > 0 ? sorted.slice(0, w.topN) : sorted;
}

function scatterData(ds: Dataset, w: Widget, pageFilters: PageFilter[], cross: CrossFilter[]) {
  const rows = applyFilters(ds.rows, w, pageFilters, cross, w.id);
  const dim = ds.columns.find((c) => c.key === w.dimension);
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = String(r[w.dimension] ?? "(blank)");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const num = (r: Row, k?: string) => {
    const v = k ? r[k] : undefined;
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  return [...groups.entries()].slice(0, 60).map(([label, grp]) => ({
    name: dim?.type === "date" ? label.slice(0, 7) : label,
    x: grp.reduce((s, r) => s + num(r, w.measure), 0) / grp.length,
    y: grp.reduce((s, r) => s + num(r, w.measure2 ?? w.measure), 0),
    n: grp.length,
  }));
}

function fmtVal(v: number, money: boolean): string {
  if (money) return fmtMoney(v);
  return Math.abs(v) >= 10_000 ? fmtNum(v) : Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function isMoneyMeasure(ds: Dataset, w: Widget): boolean {
  const col = ds.columns.find((c) => c.key === w.measure);
  return col?.type === "currency" && w.agg !== "count";
}

const axisTick = { fontSize: 10 } as const;

/* ================= default geometry ================= */
let cascade = 0;
/** pick the most chart-friendly category column: lowest cardinality, ignoring ID-like columns */
function bestDimension(ds: Dataset): string {
  const candidates = ds.columns.filter((c) => c.type === "text" && !/\bid\b|_id$|^id|^ord|^cust|^trans/i.test(c.key) && !/\bid\b|_id$|^id|^ord|^cust|^trans/i.test(c.name));
  const pool = candidates.length ? candidates : ds.columns.filter((c) => c.type === "text");
  if (!pool.length) return ds.columns[0].key;
  const sample = ds.rows.slice(0, 400);
  let best = pool[0];
  let bestCard = Infinity;
  for (const c of pool) {
    const card = new Set(sample.map((r) => String(r[c.key] ?? ""))).size;
    if (card >= 2 && card < bestCard) { best = c; bestCard = card; }
  }
  return best.key;
}

function newWidget(type: WType, ds: Dataset, existing: Widget[]): Widget {
  const numericCols = ds.columns.filter((c) => c.type === "number" || c.type === "currency");
  const dimCols = ds.columns.filter((c) => c.type === "text" || c.type === "date");
  const dateCol = ds.columns.find((c) => c.type === "date");
  const slot = existing.length % 8;
  const base: Widget = {
    id: `w_${Math.random().toString(36).slice(2, 9)}`,
    type,
    title: WTYPE_META[type].label,
    dimension: bestDimension(ds),
    measure: numericCols[0]?.key ?? ds.columns[0].key,
    agg: "sum",
    topN: type === "pie" || type === "donut" ? 5 : type === "kpi" || type === "slicer" ? 0 : 7,
    filterCol: "",
    filterVal: "",
    color: 0,
    showTitle: true,
    format: { legend: true, legendPos: "bottom", dataLabels: false, axisTitles: false, bg: undefined, border: false, titleSize: 12 },
    x: 2 + (slot % 2) * 49,
    y: 3 + Math.floor(slot / 2) * 47,
    w: type === "kpi" ? 23 : 47,
    h: type === "kpi" ? 20 : 44,
  };
  if (cascade++ % 2 === 1) { base.x += 0; }
  if (type === "kpi") base.title = numericCols[0]?.name ?? "Total";
  if (type === "slicer") { base.field = bestDimension(ds); base.title = "Slicer"; base.selected = []; base.w = 20; base.h = 44; base.x = 2; base.y = 3; }
  if (type === "bar" || type === "pie" || type === "donut") {
    const dimName = ds.columns.find((c) => c.key === base.dimension)?.name;
    const measName = ds.columns.find((c) => c.key === base.measure)?.name;
    if (dimName && measName) base.title = `${measName} by ${dimName}`;
  }
  if ((type === "line" || type === "area") && dateCol) base.dimension = dateCol.key;
  if (type === "scatter" || type === "combo") {
    base.measure2 = numericCols[1]?.key ?? numericCols[0]?.key ?? ds.columns[0].key;
    if (type === "combo") base.title = "Revenue and orders";
  }
  return base;
}

function smartLayout(ds: Dataset, ws: Widget[]): Widget[] {
  const grid = [
    { x: 2, y: 3, w: 23, h: 20 }, { x: 27, y: 3, w: 23, h: 20 },
    { x: 52, y: 3, w: 23, h: 20 }, { x: 77, y: 3, w: 21, h: 20 },
    { x: 2, y: 26, w: 32, h: 34 }, { x: 36, y: 26, w: 32, h: 34 },
    { x: 70, y: 26, w: 28, h: 34 }, { x: 2, y: 62, w: 48, h: 36 },
    { x: 52, y: 62, w: 46, h: 36 },
  ];
  return ws.map((w, i) => ({ ...w, ...(grid[i % grid.length]) }));
}

/* ================= component ================= */
const BI_MISSION = [
  { id: "load", label: "Load a dataset", detail: "Use the **data picker** — *Retail Sales 2025 (Clean)* is the classic starter; *App Events* (11,000 rows) is the big-file stress test." },
  { id: "build", label: "Build 3 visuals", detail: "In **Report view**, click visual types in the **Visualizations** pane (or the Insert ribbon): a Card KPI, a clustered column by category, and a line over months. Drag visuals anywhere — grab a header to move, the corner to resize." },
  { id: "fields", label: "Wire the fields", detail: "Select a visual, open **Fields**, tick checkboxes to add columns, then set **Axis / Values** wells and the aggregation (Sum / Average / Count…) like the real field wells." },
  { id: "format", label: "Format like PBI", detail: "Toggle the **Format** tab in the Visualizations pane: title, legend position, data labels, colors, background & border. Turn on gridlines in **View → Gridlines** for pixel alignment." },
  { id: "cross", label: "Cross-filter the page", detail: "**Click a column** in the category chart — every other visual filters instantly (Power BI's signature interaction). Click again to un-filter. Add a **Slicer** for persistent filtering." },
  { id: "model", label: "Inspect Data & Model", detail: "Switch to **Data view** to check the grain and column summaries; **Model view** shows the schema card + every implicit measure your visuals created." },
  { id: "ship", label: "Save & export", detail: "Save the report to your Academy portfolio, or **Export JSON** — it round-trips: import it back anytime." },
];

export function DashboardTool() {
  const { dashboards, saveDashboard, deleteDashboard } = useAcademy();
  const [dsId, setDsId] = React.useState("clean_sales");
  const ds = React.useMemo(() => getDatasetById(dsId) ?? getDatasetById("clean_sales")!, [dsId]);

  const [view, setView] = React.useState<"report" | "data" | "model">("report");
  const [pages, setPages] = React.useState<Page[]>([
    { id: "p_overview", name: "Overview", widgets: [] },
  ]);
  const [activePageId, setActivePageId] = React.useState("p_overview");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [paneTab, setPaneTab] = React.useState<"build" | "format">("build");
  const [paneOpen, setPaneOpen] = React.useState(true);
  const [fieldsSearch, setFieldsSearch] = React.useState("");
  const [fieldsOpen, setFieldsOpen] = React.useState(true);

  const [ribbonTab, setRibbonTab] = React.useState<"home" | "insert" | "view">("home");
  const [themeIdx, setThemeIdx] = React.useState(0);
  const [themeMenu, setThemeMenu] = React.useState(false);
  const [gridlines, setGridlines] = React.useState(true);
  const [pageFilters, setPageFilters] = React.useState<PageFilter[]>([]);
  const [filterMenu, setFilterMenu] = React.useState(false);
  const [crossFilters, setCrossFilters] = React.useState<CrossFilter[]>([]);
  const [pageMenu, setPageMenu] = React.useState<string | null>(null);
  const [savedName, setSavedName] = React.useState("");
  const [visualMenu, setVisualMenu] = React.useState(false);
  const [dataCol, setDataCol] = React.useState<string | null>(null);

  const undoRef = React.useRef<string[]>([]);
  const redoRef = React.useRef<string[]>([]);
  const [undoDepth, setUndoDepth] = React.useState(0);
  const [redoDepth, setRedoDepth] = React.useState(0);

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const jsonFileRef = React.useRef<HTMLInputElement>(null);

  const PALETTE = THEMES[themeIdx].colors;
  const page = pages.find((p) => p.id === activePageId) ?? pages[0];
  const selected = page.widgets.find((w) => w.id === selectedId) ?? null;
  const numericCols = ds.columns.filter((c) => c.type === "number" || c.type === "currency");
  const dimCols = ds.columns.filter((c) => c.type === "text" || c.type === "date");

  /* ---------- history ---------- */
  const snapshot = React.useCallback(
    () => JSON.stringify({ pages, activePageId }),
    [pages, activePageId]
  );
  const pushUndo = React.useCallback(() => {
    undoRef.current.push(snapshot());
    if (undoRef.current.length > 30) undoRef.current.shift();
    redoRef.current = [];
    setUndoDepth(undoRef.current.length);
    setRedoDepth(0);
  }, [snapshot]);
  const undo = React.useCallback(() => {
    const s = undoRef.current.pop();
    if (!s) return;
    redoRef.current.push(snapshot());
    const st = JSON.parse(s) as { pages: Page[]; activePageId: string };
    setPages(st.pages);
    setActivePageId(st.pages.some((p) => p.id === st.activePageId) ? st.activePageId : st.pages[0].id);
    setUndoDepth(undoRef.current.length);
    setRedoDepth(redoRef.current.length);
  }, [snapshot]);
  const redo = React.useCallback(() => {
    const s = redoRef.current.pop();
    if (!s) return;
    undoRef.current.push(snapshot());
    const st = JSON.parse(s) as { pages: Page[]; activePageId: string };
    setPages(st.pages);
    setActivePageId(st.pages.some((p) => p.id === st.activePageId) ? st.activePageId : st.pages[0].id);
    setUndoDepth(undoRef.current.length);
    setRedoDepth(redoRef.current.length);
  }, [snapshot]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /* ---------- page & widget ops ---------- */
  const updatePage = (patch: Partial<Page> | ((p: Page) => Partial<Page>)) => {
    setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p)));
  };
  const setWidgets = (fn: (ws: Widget[]) => Widget[]) => updatePage((p) => ({ widgets: fn(p.widgets) }));

  const update = (id: string, patch: Partial<Widget> | ((w: Widget) => Partial<Widget>)) => {
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...(typeof patch === "function" ? patch(w) : patch) } : w)));
  };

  const addWidget = (type: WType) => {
    pushUndo();
    const w = newWidget(type, ds, page.widgets);
    setWidgets((ws) => [...ws, w]);
    setSelectedId(w.id);
    setPaneTab("build");
  };

  const removeWidget = (id: string) => {
    pushUndo();
    setWidgets((ws) => ws.filter((w) => w.id !== id));
    if (selectedId === id) setSelectedId(null);
    setCrossFilters((cf) => cf.filter((c) => c.from !== id));
  };

  const duplicateWidget = (id: string) => {
    const src = page.widgets.find((w) => w.id === id);
    if (!src) return;
    pushUndo();
    const copy: Widget = { ...src, id: `w_${Math.random().toString(36).slice(2, 9)}`, x: Math.min(70, src.x + 4), y: Math.min(80, src.y + 4) };
    setWidgets((ws) => [...ws, copy]);
    setSelectedId(copy.id);
  };

  const addPage = () => {
    pushUndo();
    const p: Page = { id: `p_${Math.random().toString(36).slice(2, 7)}`, name: `Page ${pages.length + 1}`, widgets: [] };
    setPages((ps) => [...ps, p]);
    setActivePageId(p.id);
    setSelectedId(null);
    setCrossFilters([]);
    setPageFilters([]);
  };

  const duplicatePage = (id: string) => {
    pushUndo();
    const src = pages.find((p) => p.id === id);
    if (!src) return;
    const copy: Page = {
      id: `p_${Math.random().toString(36).slice(2, 7)}`,
      name: `${src.name} (copy)`,
      widgets: src.widgets.map((w) => ({ ...w, id: `w_${Math.random().toString(36).slice(2, 9)}` })),
    };
    setPages((ps) => [...ps, copy]);
    setActivePageId(copy.id);
    setPageMenu(null);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    pushUndo();
    const rest = pages.filter((p) => p.id !== id);
    setPages(rest);
    if (activePageId === id) setActivePageId(rest[0].id);
    setPageMenu(null);
  };

  const renamePage = (id: string) => {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    const nm = window.prompt("Rename page", p.name);
    if (nm?.trim()) setPages((ps) => ps.map((x) => (x.id === id ? { ...x, name: nm.trim().slice(0, 30) } : x)));
    setPageMenu(null);
  };

  const togglePageHidden = (id: string) => {
    setPages((ps) => ps.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)));
    setPageMenu(null);
  };

  const loadDataset = (id: string) => {
    setDsId(id);
    setSelectedId(null);
    setCrossFilters([]);
    setPageFilters([]);
    setDataCol(null);
  };

  /* ---------- cross-filtering ---------- */
  const toggleCrossFilter = (col: string, val: string, from: string) => {
    setCrossFilters((cfs) => {
      const exists = cfs.find((c) => c.col === col && c.val === val && c.from === from);
      if (exists) return cfs.filter((c) => !(c.col === col && c.val === val && c.from === from));
      return [...cfs.filter((c) => c.from !== from), { col, val, from }];
    });
  };

  const slicerSet = (wid: string, field: string, vals: string[]) => {
    setCrossFilters((cfs) => [...cfs.filter((c) => c.from !== wid), ...vals.map((v) => ({ col: field, val: v, from: wid }))]);
  };

  /* ---------- drag & resize on canvas ---------- */
  const dragState = React.useRef<{ id: string; kind: "move" | "resize"; startX: number; startY: number; x0: number; y0: number; w0: number; h0: number } | null>(null);

  const onCardMouseDown = (e: React.MouseEvent, w: Widget, kind: "move" | "resize") => {
    if (kind === "move") setSelectedId(w.id);
    e.stopPropagation();
    const st = { id: w.id, kind, startX: e.clientX, startY: e.clientY, x0: w.x, y0: w.y, w0: w.w, h0: w.h };
    dragState.current = st;
    const onMove = (ev: MouseEvent) => {
      const cw = canvasRef.current?.clientWidth ?? 1000;
      const ch = canvasRef.current?.clientHeight ?? 560;
      const dx = ((ev.clientX - st.startX) / cw) * 100;
      const dy = ((ev.clientY - st.startY) / ch) * 100;
      if (st.kind === "move") {
        const nx = Math.max(0, Math.min(100 - st.w0, Math.round((st.x0 + dx) * 2) / 2));
        const ny = Math.max(0, Math.min(100 - st.h0, Math.round((st.y0 + dy) * 2) / 2));
        update(st.id, { x: nx, y: ny });
      } else {
        const nw = Math.max(8, Math.min(100 - st.x0, Math.round((st.w0 + dx) * 2) / 2));
        const nh = Math.max(8, Math.min(100 - st.y0, Math.round((st.h0 + dy) * 2) / 2));
        update(st.id, { w: nw, h: nh });
      }
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* ---------- save / load ---------- */
  const doSave = () => {
    const name = savedName.trim() || `${ds.name.split(" (")[0]} report`;
    const d: SavedDashboard = {
      id: `dash_${Math.random().toString(36).slice(2, 9)}`,
      name,
      datasetId: dsId,
      widgets: [],
      pages,
      createdAt: new Date().toISOString(),
    };
    saveDashboard(d);
    setSavedName("");
  };

  const exportJSON = () => {
    downloadFile(
      `${page.name.replace(/\s+/g, "_").toLowerCase()}_report.json`,
      JSON.stringify({ datasetId: dsId, pages, themeIdx }, null, 2),
      "application/json"
    );
  };

  const importJSON = (file: File) => {
    file.text().then((txt) => {
      try {
        const j = JSON.parse(txt) as { datasetId?: string; pages?: Page[]; themeIdx?: number };
        if (j.pages?.length) {
          pushUndo();
          setPages(j.pages);
          setActivePageId(j.pages[0].id);
          if (j.datasetId) setDsId(j.datasetId);
          if (typeof j.themeIdx === "number") setThemeIdx(j.themeIdx);
        }
      } catch { /* invalid file */ }
    });
  };

  /* ---------- fields pane interactions ---------- */
  const toggleFieldInWells = (colKey: string) => {
    const col = ds.columns.find((c) => c.key === colKey);
    if (!col) return;
    const isNumeric = col.type === "number" || col.type === "currency";
    if (!selected) {
      addWidget(isNumeric ? "kpi" : "bar");
      return;
    }
    const inDim = selected.dimension === colKey;
    const inMeasure = selected.measure === colKey;
    const inMeasure2 = selected.measure2 === colKey;
    const inSlicer = selected.type === "slicer" && selected.field === colKey;
    if (inDim || inMeasure || inMeasure2 || inSlicer) {
      // remove from wells
      update(selected.id, (w) => {
        const p: Partial<Widget> = {};
        if (inDim) p.dimension = (dimCols.find((c) => c.key !== colKey) ?? ds.columns[0]).key;
        if (inMeasure) p.measure = (numericCols.find((c) => c.key !== colKey) ?? ds.columns[0]).key;
        if (inMeasure2) p.measure2 = undefined;
        if (inSlicer) p.field = dimCols[0]?.key ?? ds.columns[0].key;
        return p;
      });
    } else {
      update(selected.id, (w) => {
        if (w.type === "slicer") return { field: colKey };
        if (isNumeric) return w.measure === w.measure2 ? { measure2: colKey } : { measure: colKey };
        return { dimension: colKey };
      });
    }
  };

  const wellFieldChecked = (colKey: string): boolean => {
    if (!selected) return false;
    return selected.dimension === colKey || selected.measure === colKey || selected.measure2 === colKey || (selected.type === "slicer" && selected.field === colKey);
  };

  /* ---------- canvas helpers ---------- */

  /* ================================================================
     render
     ================================================================ */
  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<LayoutDashboard className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />}
        title="Power BI Studio"
        subtitle="Power BI Desktop in your browser — Report/Data/Model views, field wells, cross-filtering, pages"
        actions={
          <>
            <DatasetPicker value={dsId} onPick={loadDataset} />
            {ds && <span className="hidden max-w-[220px] truncate text-[11px] text-muted-foreground xl:inline">{ds.rows.length.toLocaleString()} rows × {ds.columns.length} cols</span>}
            <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
            <Button variant="outline" size="sm" className="border-border" onClick={exportJSON}><Download className="h-4 w-4" /> Export JSON</Button>
            <Button variant="outline" size="sm" className="border-border" onClick={() => jsonFileRef.current?.click()}><Upload className="h-4 w-4" /> Import</Button>
          </>
        }
      />

      {/* ============ ribbon ============ */}
      <div className={`${PANEL} overflow-visible`}>
        <div className="flex items-center gap-0.5 border-b border-border px-2 pt-1" role="tablist" aria-label="Power BI ribbon">
          {([["home", "Home"], ["insert", "Insert"], ["view", "View"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={ribbonTab === id}
              onClick={() => setRibbonTab(id)}
              className={`rounded-t-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                ribbonTab === id ? "border border-b-0 border-border bg-muted/60 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              {label}
            </button>
          ))}
          <span className="ml-auto pb-1 pr-2 text-[10.5px] text-muted-foreground">
            {page.widgets.length} visual{page.widgets.length === 1 ? "" : "s"} · {pages.filter((p) => !p.hidden).length} visible page{pages.filter((p) => !p.hidden).length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
          {ribbonTab === "home" && (
            <>
              <RibbonGroup label="Clipboard">
                <RBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={!undoDepth}><Undo2 className="h-4 w-4" /></RBtn>
                <RBtn title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoDepth}><Redo2 className="h-4 w-4" /></RBtn>
              </RibbonGroup>
              <RibbonGroup label="Insert">
                <RBtn title="Add a Card (KPI) visual" onClick={() => addWidget("kpi")}><Gauge className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Card</span></RBtn>
                <RBtn title="Add a clustered column chart" onClick={() => addWidget("bar")}><BarChart3 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Column</span></RBtn>
                <RBtn title="Add a line chart" onClick={() => addWidget("line")}><LineIcon className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Line</span></RBtn>
                <RBtn title="Add a slicer" onClick={() => addWidget("slicer")}><SlidersHorizontal className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Slicer</span></RBtn>
              </RibbonGroup>
              <RibbonGroup label="Pages">
                <RBtn title="Add a new report page" onClick={addPage}><Plus className="h-4 w-4" /><span className="ml-1 text-[10.5px]">New page</span></RBtn>
                <RBtn title="Duplicate the current page" onClick={() => duplicatePage(page.id)}><Copy className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Duplicate</span></RBtn>
              </RibbonGroup>
              <RibbonGroup label="Filters">
                <RBtn title="Page-level filters" active={filterMenu} onClick={() => setFilterMenu((v) => !v)}><ListFilter className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Filters</span></RBtn>
              </RibbonGroup>
              <RibbonGroup label="Save">
                <input value={savedName} onChange={(e) => setSavedName(e.target.value)} placeholder="Report name" className="h-7 w-32 rounded-md border border-border bg-card px-2 text-[11px]" />
                <RBtn title="Save this report to your Academy portfolio" onClick={doSave}><Save className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Save</span></RBtn>
              </RibbonGroup>
            </>
          )}
          {ribbonTab === "insert" && (
            <RibbonGroup label="Visualizations — click to drop on the canvas">
              {(Object.keys(WTYPE_META) as WType[]).map((t) => (
                <RBtn key={t} title={`${WTYPE_META[t].label} — ${WTYPE_META[t].blurb}`} onClick={() => addWidget(t)}>
                  {WTYPE_META[t].icon}<span className="ml-1 text-[10.5px]">{WTYPE_META[t].label}</span>
                </RBtn>
              ))}
            </RibbonGroup>
          )}
          {ribbonTab === "view" && (
            <>
              <RibbonGroup label="Themes">
                <div className="relative">
                  <RBtn title="Change the report color theme" active={themeMenu} onClick={() => setThemeMenu((v) => !v)}><Palette className="h-4 w-4" /><span className="ml-1 text-[10.5px]">{THEMES[themeIdx].name.split(" ")[0]}</span><ChevronDown className="ml-0.5 h-3 w-3" /></RBtn>
                  {themeMenu && (
                    <PaneMenu>
                      {THEMES.map((t, i) => (
                        <button key={t.name} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-muted" onClick={() => { setThemeIdx(i); setThemeMenu(false); }}>
                          {i === themeIdx ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <span className="w-3.5" />}
                          <span className="flex gap-0.5">{t.colors.slice(0, 5).map((c) => <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />)}</span>
                          {t.name}
                        </button>
                      ))}
                    </PaneMenu>
                  )}
                </div>
              </RibbonGroup>
              <RibbonGroup label="Show">
                <RBtn title="Canvas gridlines for alignment" active={gridlines} onClick={() => setGridlines((g) => !g)}><Grid3x3 className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Gridlines</span></RBtn>
              </RibbonGroup>
              <RibbonGroup label="Layout">
                <RBtn title="Tidy — arrange all visuals in a clean grid" onClick={() => { pushUndo(); setWidgets((ws) => smartLayout(ds, ws)); }}><Sparkles className="h-4 w-4" /><span className="ml-1 text-[10.5px]">Tidy layout</span></RBtn>
              </RibbonGroup>
            </>
          )}
        </div>
      </div>

      {/* ============ main body ============ */}
      <div className="flex items-start gap-3">
        {/* left view rail — Power BI style */}
        <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-border bg-card p-1.5" role="tablist" aria-label="View mode">
          {([["report", LayoutDashboard, "Report view"], ["data", Table2, "Data view"], ["model", Link2, "Model view"]] as const).map(([v, Icon, label]) => (
            <TooltipProvider key={v} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button role="tab" aria-selected={view === v} onClick={() => setView(v)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      view === v ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"
                    }`}>
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <div className="my-1 h-px w-6 bg-border" />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => { setPaneOpen((o) => !o); setView("report"); }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted ${!paneOpen && view === "report" ? "bg-muted" : ""}`}>
                  {paneOpen ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Show / hide the panes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* center stage */}
        <div className="min-w-0 flex-1">
          {view === "report" && (
            <>
              {/* canvas */}
              <div
                ref={canvasRef}
                className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-white shadow-inner dark:bg-zinc-900"
                onMouseDown={() => { setSelectedId(null); setVisualMenu(false); }}
                style={{
                  backgroundImage: gridlines
                    ? "linear-gradient(to right, rgba(128,128,128,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.13) 1px, transparent 1px)"
                    : undefined,
                  backgroundSize: gridlines ? "12.5% 25%" : undefined,
                }}
              >
                {page.widgets.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                    <MousePointerClick className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500">Your canvas is empty</p>
                    <p className="max-w-sm text-[11.5px] leading-relaxed text-zinc-400/80 dark:text-zinc-500">
                      Click a visual type in the <b>Visualizations</b> pane (right) or the <b>Insert</b> ribbon, then wire fields in the <b>Fields</b> pane. Drag visuals freely — exactly like Power BI Desktop.
                    </p>
                  </div>
                )}
                {page.widgets.map((w) => (
                  <VisualCard
                    key={w.id}
                    w={w}
                    ds={ds}
                    palette={PALETTE}
                    pageFilters={pageFilters}
                    cross={crossFilters}
                    selected={selectedId === w.id}
                    dimmed={crossFilters.some((c) => c.from === w.id)}
                    onMouseDownHeader={(e) => onCardMouseDown(e, w, "move")}
                    onResizeStart={(e) => onCardMouseDown(e, w, "resize")}
                    onSelect={() => { setSelectedId(w.id); setPaneTab("build"); }}
                    onRemove={() => removeWidget(w.id)}
                    onDuplicate={() => duplicateWidget(w.id)}
                    onCrossToggle={toggleCrossFilter}
                    onSlicerChange={slicerSet}
                  />
                ))}
                {/* cross-filter chips */}
                {crossFilters.length > 0 && (
                  <div className="absolute bottom-1.5 left-1.5 z-40 flex max-w-[95%] flex-wrap items-center gap-1">
                    <span className="rounded bg-zinc-800/85 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">Filtering</span>
                    {crossFilters.map((cf, i) => (
                      <button key={i} className="flex items-center gap-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-500"
                        title="Click to clear this cross-filter"
                        onClick={() => setCrossFilters((c) => c.filter((x) => x !== cf))}>
                        {ds.columns.find((c) => c.key === cf.col)?.name ?? cf.col}: {cf.val} <X className="h-2.5 w-2.5" />
                      </button>
                    ))}
                    <button className="rounded bg-zinc-800/85 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-zinc-700" onClick={() => setCrossFilters([])}>Clear all</button>
                  </div>
                )}
              </div>

              {/* page tabs — PBI style */}
              <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
                {pages.filter((p) => !p.hidden || p.id === page.id).map((p) => (
                  <div key={p.id} className="relative">
                    <button
                      onClick={() => { setActivePageId(p.id); setSelectedId(null); setCrossFilters([]); }}
                      onDoubleClick={() => renamePage(p.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-semibold transition-colors ${
                        p.id === page.id ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60"
                      } ${p.hidden ? "opacity-60" : ""}`}
                      title="Double-click to rename"
                    >
                      {p.hidden && <EyeOff className="h-3 w-3" />}
                      {p.name}
                      <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">{p.widgets.length}</span>
                    </button>
                    <button
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/50 hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setPageMenu(pageMenu === p.id ? null : p.id); }}
                      aria-label={`Page options for ${p.name}`}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                    {pageMenu === p.id && (
                      <PaneMenu align="left">
                        <MenuItem onClick={() => renamePage(p.id)}><Pencil className="mr-1.5 inline h-3 w-3" />Rename</MenuItem>
                        <MenuItem onClick={() => duplicatePage(p.id)}><Copy className="mr-1.5 inline h-3 w-3" />Duplicate</MenuItem>
                        <MenuItem onClick={() => togglePageHidden(p.id)}>{p.hidden ? <Eye className="mr-1.5 inline h-3 w-3" /> : <EyeOff className="mr-1.5 inline h-3 w-3" />}{p.hidden ? "Show page" : "Hide page"}</MenuItem>
                        <MenuItem onClick={() => deletePage(p.id)} disabled={pages.length <= 1}><Trash2 className="mr-1.5 inline h-3 w-3" />Delete</MenuItem>
                      </PaneMenu>
                    )}
                  </div>
                ))}
                <button onClick={addPage} className="flex shrink-0 items-center rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted" title="New page"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </>
          )}

          {view === "data" && <DataView ds={ds} dataCol={dataCol} setDataCol={setDataCol} />}
          {view === "model" && <ModelView ds={ds} widgets={pages.flatMap((p) => p.widgets)} />}
        </div>

        {/* right panes */}
        {view === "report" && paneOpen && (
          <div className="hidden w-[268px] shrink-0 space-y-3 lg:block xl:w-[300px]">
            {/* Visualizations pane */}
            <div className={PANEL}>
              <div className={PANEL_HEAD}>
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Sigma className="h-3.5 w-3.5 text-amber-500" /> Visualizations</span>
              </div>
              {/* build / format toggle */}
              <div className="grid grid-cols-2 border-b border-border">
                <button
                  onClick={() => { setPaneTab("build"); if (!selected && page.widgets.length) setSelectedId(page.widgets[page.widgets.length - 1].id); }}
                  className={`flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold ${paneTab === "build" ? "border-b-2 border-amber-500 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Build
                </button>
                <button
                  onClick={() => setPaneTab("format")}
                  className={`flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold ${paneTab === "format" ? "border-b-2 border-amber-500 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                >
                  <Paintbrush className="h-3.5 w-3.5" /> Format
                </button>
              </div>

              {paneTab === "build" ? (
                <div className="p-2.5">
                  {/* gallery */}
                  <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(WTYPE_META) as WType[]).map((t) => (
                      <TooltipProvider key={t} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => addWidget(t)}
                              className={`flex h-8 items-center justify-center rounded-lg border transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 ${selected?.type === t ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300" : "border-border text-muted-foreground"}`}
                              aria-label={`Add ${WTYPE_META[t].label}`}
                            >
                              {WTYPE_META[t].icon}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">{WTYPE_META[t].label} — {WTYPE_META[t].blurb}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                  {selected ? (
                    <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Field wells — {WTYPE_META[selected.type].label}</p>
                      {selected.type === "slicer" ? (
                        <Well label="Field" value={selected.field ?? ""} onChange={(v) => update(selected.id, { field: v })} cols={dimCols.length ? dimCols : ds.columns} />
                      ) : (
                        <>
                          <Well label={selected.type === "kpi" ? "Field" : selected.type === "scatter" ? "X axis" : "Axis"} value={selected.dimension} onChange={(v) => update(selected.id, { dimension: v })} cols={selected.type === "scatter" ? ds.columns : dimCols.length ? dimCols : ds.columns} />
                          <Well
                            label={selected.type === "scatter" ? "Y axis (average)" : "Values"}
                            value={selected.measure}
                            onChange={(v) => update(selected.id, { measure: v })}
                            cols={numericCols.length ? numericCols : ds.columns}
                            agg={selected.agg}
                            onAgg={(a) => update(selected.id, { agg: a })}
                          />
                          {(selected.type === "scatter" || selected.type === "combo") && (
                            <Well label={selected.type === "combo" ? "Line values" : "Y axis (total)"} value={selected.measure2 ?? ""} onChange={(v) => update(selected.id, { measure2: v })} cols={numericCols.length ? numericCols : ds.columns} />
                          )}
                        </>
                      )}
                      {selected.type !== "kpi" && selected.type !== "slicer" && (
                        <div>
                          <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Top N</label>
                          <div className="flex flex-wrap gap-1">
                            {[3, 5, 7, 10, 0].map((n) => (
                              <button key={n} onClick={() => update(selected.id, { topN: n })}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${selected.topN === n ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"}`}>
                                {n === 0 ? "All" : n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground">Click a visual type to add it, then use the <b>Fields</b> pane below to wire columns into Axis / Values.</p>
                  )}
                </div>
              ) : selected ? (
                <FormatPane
                  key={selected.id}
                  w={selected}
                  ds={ds}
                  dimCols={dimCols}
                  palette={PALETTE}
                  on={(patch) => update(selected.id, (w) => ({ format: { ...(w.format ?? {}), ...patch } }))}
                  onWidget={(patch) => update(selected.id, patch)}
                  onGeom={(patch) => update(selected.id, patch)}
                />
              ) : (
                <p className="p-3 text-[11px] leading-snug text-muted-foreground">Select a visual on the canvas to open its format options — exactly like Power BI&apos;s paint-roller pane.</p>
              )}
            </div>

            {/* Fields pane */}
            <div className={PANEL}>
              <div className={PANEL_HEAD}>
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Database className="h-3.5 w-3.5 text-sky-500" /> Fields</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setFieldsOpen((o) => !o)}><ChevronUp className={`h-3.5 w-3.5 transition-transform ${fieldsOpen ? "" : "rotate-180"}`} /></button>
              </div>
              {fieldsOpen && (
                <div className="p-2">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/60" />
                    <Input value={fieldsSearch} onChange={(e) => setFieldsSearch(e.target.value)} placeholder="Search fields" className="h-7 border-border bg-card pl-7 text-[11.5px]" />
                  </div>
                  {/* table row */}
                  <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-semibold text-foreground/90">
                    <Table2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1 truncate">{ds.name.split(" (")[0]}</span>
                    <span className="shrink-0 text-[9.5px] font-normal text-muted-foreground">{ds.rows.length.toLocaleString()} rows</span>
                  </div>
                  <div className="ml-2.5 space-y-px border-l border-border/70 pl-1.5">
                    {ds.columns.filter((c) => c.name.toLowerCase().includes(fieldsSearch.toLowerCase())).map((c) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/60" title={c.name}>
                        <Checkbox checked={wellFieldChecked(c.key)} onCheckedChange={() => toggleFieldInWells(c.key)} className="h-3.5 w-3.5 accent-amber-500" />
                        {THEME_ICON[c.type] ?? <Type className="h-3 w-3 text-muted-foreground" />}
                        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 border-t border-border pt-2 text-[10.5px] leading-snug text-muted-foreground">
                    Tick a column to add it to the selected visual&apos;s wells (untick to remove). σ = numeric, T = text, calendar = date.
                  </p>
                </div>
              )}
            </div>

            {/* Page filters pane */}
            <div className={PANEL}>
              <div className={PANEL_HEAD}>
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><ListFilter className="h-3.5 w-3.5 text-rose-500" /> Filters — this page</span>
              </div>
              <div className="space-y-2 p-2.5">
                {pageFilters.map((f) => (
                  <div key={f.id} className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[11.5px]">
                      <b className="text-foreground/85">{ds.columns.find((c) => c.key === f.col)?.name ?? f.col}</b> = {f.val}
                    </span>
                    <button className="text-muted-foreground hover:text-red-500" onClick={() => setPageFilters((fs) => fs.filter((x) => x.id !== f.id))}><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Select value={"__add"} onValueChange={(v) => { if (v !== "__add") setPageFilters((fs) => [...fs, { id: `f_${Math.random().toString(36).slice(2, 7)}`, col: v.split("::")[0], val: v.split("::")[1] }]); }}>
                    <SelectTrigger className="h-7 flex-1 border-border bg-card text-[11px]"><SelectValue placeholder="Add a page filter…" /></SelectTrigger>
                    <SelectContent className="max-h-56 border-border bg-popover">
                      {dimCols.flatMap((c) => [...new Set(ds.rows.map((r) => String(r[c.key] ?? "")).filter(Boolean))].slice(0, 20).map((val) => (
                        <SelectItem key={`${c.key}::${val}`} value={`${c.key}::${val}`} className="text-[11.5px]">{c.name}: {val}</SelectItem>
                      )))}
                    </SelectContent>
                  </Select>
                </div>
                {!pageFilters.length && <p className="text-[10.5px] leading-snug text-muted-foreground">Page filters apply to every visual. Visual-level filters live in the Format tab.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* saved dashboards */}
      {dashboards.length > 0 && (
        <div className={PANEL}>
          <div className={PANEL_HEAD}><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved reports</span></div>
          <div className="flex flex-wrap gap-2 p-3">
            {dashboards.map((d) => (
              <span key={d.id} className="group flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[12px]">
                <ClipboardList className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-foreground/85">{d.name}</span>
                <span className="text-[10px] text-muted-foreground">{d.pages ? (d.pages as Page[]).length : 0}p</span>
                <button className="text-emerald-600 opacity-0 hover:underline group-hover:opacity-100 dark:text-emerald-300"
                  onClick={() => {
                    const pagesIn = (d.pages as Page[] | undefined) ?? [];
                    pushUndo();
                    setPages(pagesIn.length ? pagesIn : [{ id: "p_overview", name: "Overview", widgets: [] }]);
                    setActivePageId(pagesIn[0]?.id ?? "p_overview");
                    setDsId(d.datasetId);
                  }}>open</button>
                <button className="text-muted-foreground/50 hover:text-red-500" onClick={() => deleteDashboard(d.id)}><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <Coach view="dashboard" mission={BI_MISSION} tips={[
        "Free-form canvas: **drag a visual's header** to move it, **drag the bottom-right corner** to resize. “Tidy layout” (View tab) snaps everything back to a clean grid.",
        view === "report" && page.widgets.length > 1
          ? "Now the Power BI magic: **click a column or slice** in one chart and watch every other visual filter. Click the chip under the canvas (or the bar again) to undo."
          : "Add at least two visuals, then click one — **cross-filtering** is the interaction interviewers ask about.",
        "Data view = check the grain (one row per what?). Model view = your schema card + the implicit measures Power BI created from your visuals.",
      ].filter(Boolean) as string[]} why="Companies don't buy dashboards — they buy faster decisions. A good report answers the three questions leadership actually asks (how much, trending which way, where) in under 30 seconds, then lets each viewer filter to their own region or product line. That's exactly the interaction model you just built." />
    </div>
  );
}

/* ================= visual card ================= */
function VisualCard({
  w, ds, palette, pageFilters, cross, selected, dimmed,
  onMouseDownHeader, onResizeStart, onSelect, onRemove, onDuplicate, onCrossToggle, onSlicerChange,
}: {
  w: Widget; ds: Dataset; palette: string[]; pageFilters: PageFilter[]; cross: CrossFilter[];
  selected: boolean; dimmed: boolean;
  onMouseDownHeader: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onSelect: () => void; onRemove: () => void; onDuplicate: () => void;
  onCrossToggle: (col: string, val: string, from: string) => void;
  onSlicerChange: (id: string, field: string, vals: string[]) => void;
}) {
  const f = w.format ?? {};
  const body = (() => {
    if (w.type === "slicer") {
      const vals = [...new Set(ds.rows.map((r) => String(r[w.field ?? w.dimension] ?? "")).filter(Boolean))].sort().slice(0, 24);
      const cur = new Set(w.selected ?? []);
      return (
        <div className="flex h-full flex-col overflow-auto p-1.5">
          {vals.map((v) => {
            const on = cur.has(v);
            return (
              <label key={v} className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[11px] hover:bg-muted/60">
                <Checkbox
                  checked={on}
                  onCheckedChange={() => {
                    const next = on ? [...cur].filter((x) => x !== v) : [...cur, v];
                    onSlicerChange(w.id, w.field ?? w.dimension, next);
                    w.selected = next;
                  }}
                  className="h-3 w-3 accent-amber-500"
                />
                <span className="truncate">{v}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (w.type === "kpi") {
      const data = aggregate(ds, w, pageFilters, cross);
      const total = data.reduce((s, d) => s + d.value, 0);
      const money = isMoneyMeasure(ds, w);
      return (
        <div className="flex h-full flex-col justify-center px-2">
          <p className="truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{fmtVal(total, money)}</p>
          <p className="truncate text-[10px] text-zinc-500">{w.agg.toUpperCase()} of {ds.columns.find((c) => c.key === w.measure)?.name}</p>
        </div>
      );
    }
    if (w.type === "table") {
      const data = aggregate(ds, w, pageFilters, cross);
      const money = isMoneyMeasure(ds, w);
      return (
        <div className="h-full overflow-auto">
          <table className="w-full text-left text-[10.5px]">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="px-1.5 py-1 font-semibold text-zinc-600 dark:text-zinc-300">{ds.columns.find((c) => c.key === w.dimension)?.name}</th>
                <th className="px-1.5 py-1 text-right font-semibold text-zinc-600 dark:text-zinc-300">{w.agg} {ds.columns.find((c) => c.key === w.measure)?.name}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b border-zinc-200/60 dark:border-zinc-700/50">
                  <td className="max-w-[120px] truncate px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300">{d.label}</td>
                  <td className="px-1.5 py-0.5 text-right font-mono text-zinc-700 dark:text-zinc-300">{fmtVal(d.value, money)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (w.type === "scatter") {
      const data = scatterData(ds, w, pageFilters, cross);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 10, bottom: 14, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
            <XAxis dataKey="x" name={ds.columns.find((c) => c.key === w.measure)?.name} tick={axisTick} tickFormatter={fmtNum} />
            <YAxis dataKey="y" name={ds.columns.find((c) => c.key === (w.measure2 ?? w.measure))?.name} tick={axisTick} tickFormatter={fmtNum} width={48} />
            <RTooltip formatter={(v: number, nm) => `${nm}: ${fmtNum(v)}`} labelFormatter={() => ""} contentStyle={{ fontSize: 11 }} />
            {f.legend !== false && <Legend wrapperStyle={{ fontSize: 9.5 }} />}
            <Scatter name={w.title} data={data} fill={palette[(w.color ?? 0) % palette.length]} onClick={(_: unknown, i: number) => { const d = data[i]; if (d) onCrossToggle(w.dimension, d.name, w.id); }} cursor="pointer" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    const data = aggregate(ds, w, pageFilters, cross);
    const money = isMoneyMeasure(ds, w);
    const colorFor = (i: number) => palette[(w.color ?? 0) % palette.length] ?? palette[0];
    const multi = w.type === "pie" || w.type === "donut";
    const chartData = data.map((d) => ({ name: d.label, value: d.value }));
    const common = { data: chartData, onClick: (entry: unknown) => {
      const nm = (entry as { name?: string; activeLabel?: string; payload?: { name?: string } })?.name
        ?? (entry as { activeLabel?: string })?.activeLabel
        ?? (entry as { payload?: { name?: string } })?.payload?.name;
      if (nm) onCrossToggle(w.dimension, nm, w.id);
    } };
    const legendNode = f.legend === false ? undefined : <Legend verticalAlign={(f.legendPos ?? "bottom") === "top" ? "top" : (f.legendPos ?? "bottom") === "bottom" ? "bottom" : "middle"} align={(f.legendPos ?? "bottom") === "left" ? "left" : (f.legendPos ?? "bottom") === "right" ? "right" : "center"} wrapperStyle={{ fontSize: 9.5 }} />;
    /* mark-level click → cross-filter (works regardless of chart hover state) */
    const markClick = (entry: unknown) => {
      const e = entry as { name?: string; payload?: { name?: string; label?: string } };
      const nm = e?.payload?.name ?? e?.payload?.label ?? e?.name;
      if (nm) onCrossToggle(w.dimension, nm, w.id);
    };
    if (w.type === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...common} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 26 : 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} interval={0} angle={chartData.length > 6 ? -16 : 0} height={chartData.length > 6 ? 40 : 18} textAnchor={chartData.length > 6 ? "end" : "middle"} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
            <YAxis tick={axisTick} tickFormatter={fmtNum} width={46} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.measure)?.name, angle: -90, position: "insideLeft", fontSize: 9 } : undefined} />
            <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
            {legendNode}
            <Bar dataKey="value" radius={[3, 3, 0, 0]} cursor="pointer" onClick={markClick} label={f.dataLabels ? { position: "top", fontSize: 9, formatter: (v: number) => fmtVal(v, money) } : false}>
              {chartData.map((_, i) => <Cell key={i} fill={multi ? palette[i % palette.length] : colorFor(i)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "line" || w.type === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          {w.type === "line" ? (
            <LineChart {...common} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 26 : 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
              <XAxis dataKey="name" tick={axisTick} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
              <YAxis tick={axisTick} tickFormatter={fmtNum} width={46} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.measure)?.name, angle: -90, position: "insideLeft", fontSize: 9 } : undefined} />
              <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
              {legendNode}
              <Line type="monotone" dataKey="value" stroke={colorFor(0)} strokeWidth={2.2} dot={false} cursor="pointer" onClick={markClick} activeDot={{ r: 4, onClick: markClick as unknown as (e: React.MouseEvent) => void }} label={f.dataLabels ? { fontSize: 8.5, formatter: (v: number) => fmtVal(v, money) } : false} />
            </LineChart>
          ) : (
            <AreaChart {...common} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 26 : 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
              <XAxis dataKey="name" tick={axisTick} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
              <YAxis tick={axisTick} tickFormatter={fmtNum} width={46} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.measure)?.name, angle: -90, position: "insideLeft", fontSize: 9 } : undefined} />
              <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
              {legendNode}
              <Area type="monotone" dataKey="value" stroke={colorFor(0)} fill={colorFor(0)} fillOpacity={0.25} strokeWidth={2} cursor="pointer" onClick={markClick} label={f.dataLabels ? { fontSize: 8.5, formatter: (v: number) => fmtVal(v, money) } : false} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      );
    }
    if (w.type === "pie" || w.type === "donut") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
            {legendNode}
            <Pie {...common} dataKey="value" nameKey="name" innerRadius={w.type === "donut" ? "55%" : 0} outerRadius="80%" onClick={markClick} label={f.dataLabels ? ((props: { name?: string; value?: number }) => `${props.name ?? ""}: ${fmtVal(props.value ?? 0, money)}`) : false} cursor="pointer">
              {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }
    /* combo */
    const second = (() => {
      const rows = applyFilters(ds.rows, w, pageFilters, cross, w.id);
      const groups = new Map<string, Row[]>();
      const col = ds.columns.find((c) => c.key === w.dimension);
      for (const r of rows) {
        const rawKey = r[w.dimension];
        const key = rawKey === undefined || rawKey === "" ? "(blank)" : col?.type === "date" ? String(rawKey).slice(0, 7) : String(rawKey);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      const num = (r: Row, k?: string) => {
        const v = k ? r[k] : undefined;
        const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
        return isNaN(n) ? 0 : n;
      };
      return [...groups.entries()]
        .map(([label, grp]) => ({ name: label, value: grp.reduce((s, r) => s + num(r, w.measure), 0), line: grp.reduce((s, r) => s + num(r, w.measure2 ?? w.measure), 0) }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, w.topN > 0 ? w.topN : 12);
    })();
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={second} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 26 : 10, left: 0 }} onClick={(e: { activeLabel?: string }) => { if (e?.activeLabel) onCrossToggle(w.dimension, e.activeLabel, w.id); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
          <XAxis dataKey="name" tick={axisTick} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
          <YAxis yAxisId="l" tick={axisTick} tickFormatter={fmtNum} width={46} />
          <YAxis yAxisId="r" orientation="right" tick={axisTick} tickFormatter={fmtNum} width={40} />
          <RTooltip formatter={(v: number) => fmtNum(v)} contentStyle={{ fontSize: 11 }} />
          {legendNode}
          <Bar yAxisId="l" dataKey="value" name={ds.columns.find((c) => c.key === w.measure)?.name} fill={palette[(w.color ?? 0) % palette.length]} radius={[3, 3, 0, 0]} cursor="pointer" />
          <Line yAxisId="r" type="monotone" dataKey="line" name={ds.columns.find((c) => c.key === (w.measure2 ?? w.measure))?.name} stroke={palette[2 % palette.length]} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  })();

  return (
    <div
      className={`absolute flex flex-col rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 ${
        selected ? "border-amber-500 shadow-md ring-1 ring-amber-500/50" : "border-zinc-200 dark:border-zinc-700"
      } ${dimmed ? "opacity-80" : ""}`}
      style={{ left: `${w.x}%`, top: `${w.y}%`, width: `${w.w}%`, height: `${w.h}%`, background: f.bg, borderColor: f.border ? (f.bg ? undefined : "rgba(16,185,129,0.5)") : undefined }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* header */}
      <div
        className="flex cursor-move items-center gap-1 border-b border-zinc-200/70 px-2 py-1 dark:border-zinc-700/70"
        onMouseDown={onMouseDownHeader}
        title="Drag to move this visual"
      >
        <Move className="h-2.5 w-2.5 shrink-0 text-zinc-300 dark:text-zinc-600" />
        {w.showTitle !== false && (
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-zinc-700 dark:text-zinc-200" style={{ fontSize: f.titleSize ? `${f.titleSize}px` : undefined }}>
            {w.title}
          </span>
        )}
        <span className="flex shrink-0 items-center gap-0.5">
          <button className="rounded p-0.5 text-zinc-400 hover:bg-muted hover:text-zinc-600 dark:hover:text-zinc-300" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-2.5 w-2.5" /></button>
          <button className="rounded p-0.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-500" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Trash2 className="h-3 w-3" /></button>
        </span>
      </div>
      {/* body */}
      <div className="min-h-0 flex-1 p-1">{body}</div>
      {/* resize handle */}
      <span
        onMouseDown={(e) => onResizeStart(e)}
        className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize rounded-tl-md border-r-2 border-b-2 border-zinc-300 hover:border-amber-500 dark:border-zinc-600"
        title="Drag to resize"
      />
    </div>
  );
}

/* ================= format pane ================= */
function FormatPane({ w, ds, dimCols, palette, on, onWidget, onGeom }: {
  w: Widget; ds: Dataset; dimCols: Dataset["columns"]; palette: string[];
  on: (patch: WFormat) => void; onWidget: (patch: Partial<Widget>) => void; onGeom: (patch: Partial<Widget>) => void;
}) {
  const f = w.format ?? {};
  const isChart = !["kpi", "slicer", "table"].includes(w.type);
  return (
    <div className="max-h-[420px] space-y-3 overflow-auto p-2.5 scrollbar-thin">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">General — position &amp; size</p>
      <div className="grid grid-cols-4 gap-1.5">
        {([["X", "x"], ["Y", "y"], ["W", "w"], ["H", "h"]] as const).map(([lbl, k]) => (
          <label key={k} className="text-[9px] font-semibold uppercase text-muted-foreground">
            {lbl}
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(w[k])}
              onChange={(e) => onGeom({ [k]: Math.max(0, Math.min(100, +e.target.value || 0)) } as Partial<Widget>)}
              className="mt-0.5 h-6 w-full rounded border border-border bg-card px-1 text-[10.5px]"
            />
          </label>
        ))}
      </div>
      <div className="border-t border-border pt-2.5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</p>
        <label className="mb-1.5 flex items-center gap-2 text-[11.5px]">
          <Checkbox checked={w.showTitle !== false} onCheckedChange={(v) => onWidget({ showTitle: !!v })} className="accent-amber-500" />
          Show title
        </label>
        <Input value={w.title} onChange={(e) => onWidget({ title: e.target.value })} className="h-7 border-border bg-card text-[11.5px]" placeholder="Title text" />
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[9.5px] font-semibold uppercase text-muted-foreground">Size</span>
          <input type="range" min={9} max={16} value={f.titleSize ?? 12} onChange={(e) => on({ titleSize: +e.target.value })} className="h-1 flex-1 accent-amber-500" />
        </div>
      </div>
      {isChart && (
        <>
          <div className="border-t border-border pt-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Legend</p>
            <label className="flex items-center gap-2 text-[11.5px]">
              <Checkbox checked={f.legend !== false} onCheckedChange={(v) => on({ legend: !!v })} className="accent-amber-500" />
              Show legend
            </label>
            {f.legend !== false && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(["top", "bottom", "left", "right"] as const).map((p) => (
                  <button key={p} onClick={() => on({ legendPos: p })}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${f.legendPos === p ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border pt-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data labels</p>
            <label className="flex items-center gap-2 text-[11.5px]">
              <Checkbox checked={!!f.dataLabels} onCheckedChange={(v) => on({ dataLabels: !!v })} className="accent-amber-500" />
              Show values on the visual
            </label>
          </div>
          <div className="border-t border-border pt-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Axis titles</p>
            <label className="flex items-center gap-2 text-[11.5px]">
              <Checkbox checked={!!f.axisTitles} onCheckedChange={(v) => on({ axisTitles: !!v })} className="accent-amber-500" />
              Label the X and Y axes
            </label>
          </div>
          <div className="border-t border-border pt-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data colors</p>
            <div className="flex flex-wrap gap-1.5">
              {palette.map((c, i) => (
                <button key={c} onClick={() => onWidget({ color: i })}
                  className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${w.color === i ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} aria-label={`Theme color ${i + 1}`} />
              ))}
            </div>
          </div>
        </>
      )}
      <div className="border-t border-border pt-2.5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Effects</p>
        <label className="flex items-center gap-2 text-[11.5px]">
          <Checkbox checked={f.border ?? false} onCheckedChange={(v) => on({ border: !!v })} className="accent-amber-500" />
          Border
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Background</span>
          <div className="flex gap-1">
            {["", "#fef9c3", "#dbeafe", "#dcfce7", "#fae8ff", "#e5e7eb"].map((c) => (
              <button key={c || "none"} onClick={() => on({ bg: c || undefined })}
                className={`h-4.5 w-4.5 rounded-full border ${f.bg === c ? "border-foreground ring-2 ring-amber-500/40" : "border-border"}`}
                style={{ background: c || "transparent" }} title={c || "Default"} />
            ))}
          </div>
        </div>
      </div>
      {w.type !== "slicer" && (
        <div className="border-t border-border pt-2.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visual-level filter</p>
          <Select value={w.filterCol || "__none"} onValueChange={(v) => onWidget({ filterCol: v === "__none" ? "" : v, filterVal: "" })}>
            <SelectTrigger className="h-7 w-full border-border bg-card text-[11px]"><SelectValue placeholder="No filter" /></SelectTrigger>
            <SelectContent className="border-border bg-popover">
              <SelectItem value="__none">No filter</SelectItem>
              {dimCols.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {w.filterCol && (
            <Select value={w.filterVal || "__pick"} onValueChange={(v) => onWidget({ filterVal: v })}>
              <SelectTrigger className="mt-1.5 h-7 w-full border-border bg-card text-[11px]"><SelectValue placeholder="Pick value" /></SelectTrigger>
              <SelectContent className="max-h-48 border-border bg-popover">
                {[...new Set(ds.rows.map((r) => String(r[w.filterCol])))].slice(0, 40).map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= data view ================= */
function DataView({ ds, dataCol, setDataCol }: { ds: Dataset; dataCol: string | null; setDataCol: (k: string | null) => void }) {
  const rows = ds.rows.slice(0, 300);
  const stats = React.useMemo(() => {
    if (!dataCol) return null;
    const col = ds.columns.find((c) => c.key === dataCol);
    const vals = ds.rows.map((r) => r[dataCol]).filter((v) => v !== null && v !== undefined && v !== "");
    const nums = vals.map((v) => (typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, "")))).filter((n) => !isNaN(n));
    if (nums.length) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((s, x) => s + x, 0);
      const mid = Math.floor(sorted.length / 2);
      return {
        kind: "numeric" as const,
        name: col?.name ?? dataCol,
        count: vals.length,
        sum, avg: sum / nums.length,
        min: sorted[0], max: sorted[sorted.length - 1],
        median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
        distinct: new Set(vals.map(String)).size,
      };
    }
    const counts = new Map<string, number>();
    for (const v of vals) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { kind: "text" as const, name: col?.name ?? dataCol, count: vals.length, distinct: counts.size, top };
  }, [dataCol, ds]);

  return (
    <div className={PANEL}>
      <div className={PANEL_HEAD}>
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Table2 className="h-3.5 w-3.5 text-amber-500" /> {ds.name} — Data view</span>
        <span className="text-[10.5px] text-muted-foreground">{ds.rows.length.toLocaleString()} rows · showing first {rows.length} · click a column header for its summary</span>
      </div>
      <div className="max-h-[54vh] overflow-auto scrollbar-thin">
        <table className="w-full text-left text-[11.5px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              {ds.columns.map((c) => (
                <th key={c.key} onClick={() => setDataCol(dataCol === c.key ? null : c.key)}
                  className={`cursor-pointer whitespace-nowrap border-b border-border px-2.5 py-2 font-mono text-[11px] transition-colors ${dataCol === c.key ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"}`}>
                  <span className="mr-1 inline-block align-[-2px]">{THEME_ICON[c.type]}</span>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-border/50 hover:bg-muted/40">
                {ds.columns.map((c) => (
                  <td key={c.key} className="max-w-[180px] truncate whitespace-nowrap px-2.5 py-1 font-mono text-foreground/80">
                    {c.type === "currency" && typeof r[c.key] === "number" ? `$${(r[c.key] as number).toFixed(2)}` : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stats && (
        <div className="border-t border-border p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Column summary — {stats.name}</p>
          {stats.kind === "numeric" ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4 lg:grid-cols-7">
              {([["Count", stats.count], ["Distinct", stats.distinct], ["Sum", fmtNum(stats.sum)], ["Average", fmtNum(stats.avg)], ["Min", fmtNum(stats.min)], ["Median", fmtNum(stats.median)], ["Max", fmtNum(stats.max)]] as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono text-foreground">{v.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Count</span><span className="font-mono">{stats.count.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Distinct</span><span className="font-mono">{stats.distinct}</span></div>
              {stats.top.map(([v, n]) => (
                <div key={v} className="flex justify-between gap-2"><span className="max-w-[140px] truncate text-muted-foreground">{v}</span><span className="font-mono">{n}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= model view ================= */
function ModelView({ ds, widgets }: { ds: Dataset; widgets: Widget[] }) {
  const measures = React.useMemo(() => {
    const set = new Map<string, string>();
    for (const w of widgets) {
      if (w.type === "slicer") continue;
      const mCol = ds.columns.find((c) => c.key === w.measure);
      if (mCol) set.set(`${w.agg.toUpperCase()}(${mCol.name})`, mCol.type);
      if (w.measure2) {
        const m2 = ds.columns.find((c) => c.key === w.measure2);
        if (m2) set.set(`SUM(${m2.name})`, m2.type);
      }
    }
    return [...set.entries()];
  }, [widgets, ds]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className={PANEL}>
        <div className={PANEL_HEAD}>
          <span className="flex items-center gap-2 text-xs font-semibold"><Table2 className="h-3.5 w-3.5 text-amber-500" /> {ds.name.split(" (")[0]}</span>
          <span className="text-[10px] text-muted-foreground">fact table</span>
        </div>
        <div className="p-2">
          <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ds.columns.length} fields · {ds.rows.length.toLocaleString()} rows</p>
          {ds.columns.map((c) => (
            <div key={c.key} className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px] hover:bg-muted/50">
              {THEME_ICON[c.type] ?? <Type className="h-3 w-3" />}
              <span className="min-w-0 flex-1 truncate font-mono text-foreground/85">{c.name}</span>
              <span className="text-[9.5px] uppercase text-muted-foreground">{c.type}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={PANEL}>
        <div className={PANEL_HEAD}>
          <span className="flex items-center gap-2 text-xs font-semibold"><Sigma className="h-3.5 w-3.5 text-emerald-500" /> Implicit measures</span>
        </div>
        <div className="p-2">
          {measures.length ? measures.map(([m, t]) => (
            <div key={m} className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px]">
              <Sigma className="h-3 w-3 text-emerald-500" />
              <span className="min-w-0 flex-1 truncate font-mono text-foreground/85">{m}</span>
              <span className="text-[9.5px] uppercase text-muted-foreground">{t}</span>
            </div>
          )) : <p className="p-2 text-[11.5px] text-muted-foreground">Add visuals with value fields — each one creates an implicit measure (Sum of Revenue, Average of Units…) that shows up here, just like Power BI&apos;s model view.</p>}
        </div>
      </div>
      <div className={PANEL}>
        <div className={PANEL_HEAD}>
          <span className="flex items-center gap-2 text-xs font-semibold"><Link2 className="h-3.5 w-3.5 text-sky-500" /> Relationships</span>
        </div>
        <div className="space-y-2 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          <p>This report has a single flat fact table — one row per transaction/event. That is the simplest (and most common) BI model.</p>
          <p>Real models add <b className="text-foreground">dimension tables</b> (Date, Products, Customers) related 1→* to the fact table. Try the <b className="text-foreground">SQL Playground</b>: its schema browser shows a real 5-table star schema with relationships.</p>
          <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[11.5px] text-sky-900 dark:text-sky-100/90">Grain check: confirm one row = one event (one order line, one transaction). Everything in the model — filters, measures, relationships — depends on it.</p>
        </div>
      </div>
    </div>
  );
}

/* ================= ribbon atoms & panes ================= */
function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative mx-1.5 flex flex-col rounded-lg border border-border/70 bg-muted/20 px-2 pb-4 pt-1.5">
      <div className="flex flex-wrap items-center gap-1">{children}</div>
      <span className="pointer-events-none absolute bottom-0.5 left-0 right-0 text-center text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">{label}</span>
    </div>
  );
}

function RBtn({ title, onClick, children, active, disabled }: {
  title: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onClick} disabled={disabled}
            className={`flex h-7 items-center rounded-md border px-1.5 text-[11px] transition-colors disabled:opacity-40 ${
              active ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300" : "border-transparent text-foreground/80 hover:border-border hover:bg-muted"
            }`}>
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Well({ label, value, onChange, cols, agg, onAgg }: {
  label: string; value: string; onChange: (v: string) => void; cols: Dataset["columns"]; agg?: Agg; onAgg?: (a: Agg) => void;
}) {
  const col = cols.find((c) => c.key === value) ?? cols[0];
  return (
    <div>
      <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-7 flex-1 border-border bg-card text-[11.5px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <Sigma className={`h-3 w-3 shrink-0 ${col && (col.type === "number" || col.type === "currency") ? "text-emerald-500" : "text-muted-foreground/50"}`} />
              <SelectValue placeholder="Pick a field" />
            </span>
          </SelectTrigger>
          <SelectContent className="border-border bg-popover">
            {cols.map((c) => <SelectItem key={c.key} value={c.key} className="text-[12px]">{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {agg && onAgg && (
          <Select value={agg} onValueChange={(v) => onAgg(v as Agg)}>
            <SelectTrigger className="h-7 w-[74px] shrink-0 border-border bg-card text-[10.5px]" title="Aggregation"><SelectValue /></SelectTrigger>
            <SelectContent className="border-border bg-popover">
              {(["sum", "avg", "count", "min", "max"] as Agg[]).map((a) => <SelectItem key={a} value={a} className="uppercase text-[11.5px]">{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

function PaneMenu({ children, align = "right" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div className={`absolute top-full z-40 mt-1 min-w-[180px] rounded-xl border border-border bg-popover p-1 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}>
      {children}
    </div>
  );
}

function MenuItem({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-1 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-foreground/90 hover:bg-muted disabled:opacity-40">
      {children}
    </button>
  );
}
