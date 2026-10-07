"use client";

/* Power BI Studio — a faithful Power BI Desktop recreation.
   Yellow title bar + QAT, File/Home/Insert/Modeling/View/Help ribbon,
   left Report/Data/Model rail, Visualizations pane (gallery + Build/Format),
   Data + Filters panes, free-form canvas on the gray work surface with page
   tabs + zoom, cross-filtering, slicers, DAX measure dialog, Enter Data,
   backstage File menu. 100% client-side and instant. */

import * as React from "react";
import Papa from "papaparse";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PANEL, PANEL_HEAD, fmtMoney, fmtNum } from "./shared";
import { coachSay } from "@/lib/academy/coach-bus";
import { LiveCoach } from "./LiveCoach";
import { useAcademy, type SavedDashboard } from "@/lib/academy/store";
import { getDatasetById, getSampleCatalog, downloadFile, type Dataset, type Row } from "@/lib/academy/datasets";
import { createDaxEngine } from "@/lib/academy/dax-engine";
import {
  MS, SEGOE, MsTitleBar, MsWindowGlyphs, MsQatBtn, RibbonTabs, RibbonBody, RGroup, RBig, RSmall,
  MsMenu, MsMenuItem, MsDialog, MsBackstage, PbiLogo,
} from "./msui";
import {
  Activity, BarChart3, ChartPie, Check, ChevronDown, ChevronUp, CircleHelp, ClipboardList, Columns3,
  Copy, Database, Download, Eye, EyeOff, FileJson, Filter, Gauge, Grid3x3, LayoutDashboard,
  LineChart as LineIcon, Link2, ListFilter, Maximize2, Paintbrush, Plus, Redo2, RotateCcw, Save,
  Search, Sigma, SlidersHorizontal, Sparkles, Square, Table2, Trash2, TrendingUp, Type, Minimize2,
  Undo2, Upload, Calendar, X, Palette, Pencil, MoreHorizontal, MousePointerClick, Move, ZoomIn, ZoomOut,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ScatterChart, Scatter, ComposedChart,
  Treemap, FunnelChart, Funnel, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

/* ================= model ================= */
type Agg = "sum" | "avg" | "count" | "min" | "max";
type WType = "kpi" | "kpi2" | "waterfall" | "bar" | "line" | "area" | "pie" | "donut" | "scatter" | "combo" | "table" | "slicer" | "treemap" | "funnel" | "gauge" | "matrix" | "textbox" | "shape";

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
  /* textbox only */
  text?: string;
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
  { name: "Power BI (default)", colors: ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#D64550"] },
  { name: "Emerald", colors: ["#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6", "#f97316", "#22c55e", "#ef4444"] },
  { name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#3b82f6", "#6366f1", "#14b8a6", "#0284c7", "#22d3ee", "#818cf8"] },
  { name: "Sunset", colors: ["#f97316", "#ef4444", "#f59e0b", "#ec4899", "#e11d48", "#fb923c", "#fbbf24", "#f472b6"] },
  { name: "Orchid", colors: ["#8b5cf6", "#d946ef", "#a855f7", "#6366f1", "#c026d3", "#7c3aed", "#e879f9", "#818cf8"] },
  { name: "Slate", colors: ["#475569", "#0ea5e9", "#64748b", "#10b981", "#94a3b8", "#334155", "#38bdf8", "#6b7280"] },
];

const WTYPE_META: Record<WType, { label: string; icon: React.ReactNode; blurb: string }> = {
  kpi: { label: "Card", icon: <Gauge className="h-4 w-4" />, blurb: "One big number — the 5-second layer" },
  kpi2: { label: "KPI", icon: <Gauge className="h-4 w-4" />, blurb: "Value vs target with a trend — the exec glance" },
  waterfall: { label: "Waterfall", icon: <TrendingUp className="h-4 w-4" />, blurb: "How parts build to a total — contribution view" },
  bar: { label: "Clustered column", icon: <BarChart3 className="h-4 w-4" />, blurb: "Compare categories side by side" },
  line: { label: "Line chart", icon: <LineIcon className="h-4 w-4" />, blurb: "Trend over time" },
  area: { label: "Area chart", icon: <TrendingUp className="h-4 w-4" />, blurb: "Volume over time" },
  pie: { label: "Pie chart", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole (≤5 slices)" },
  donut: { label: "Donut chart", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole with a center gap" },
  scatter: { label: "Scatter chart", icon: <Activity className="h-4 w-4" />, blurb: "Relationship between two measures" },
  combo: { label: "Line & clustered column", icon: <TrendingUp className="h-4 w-4" />, blurb: "Two measures, two scales — Power BI classic" },
  table: { label: "Table", icon: <Table2 className="h-4 w-4" />, blurb: "The 5-minute detail layer" },
  matrix: { label: "Matrix", icon: <Grid3x3 className="h-4 w-4" />, blurb: "Groups with subtotals — Power BI's pivot" },
  treemap: { label: "Treemap", icon: <LayoutDashboard className="h-4 w-4" />, blurb: "Nested rectangles — share of the whole" },
  funnel: { label: "Funnel", icon: <Filter className="h-4 w-4" />, blurb: "Stages that shrink — conversion steps" },
  gauge: { label: "Gauge", icon: <Gauge className="h-4 w-4" />, blurb: "Progress toward a target" },
  slicer: { label: "Slicer", icon: <SlidersHorizontal className="h-4 w-4" />, blurb: "Filters every visual on this page" },
  textbox: { label: "Text box", icon: <Type className="h-4 w-4" />, blurb: "Titles, notes and commentary on the page" },
  shape: { label: "Shape", icon: <Square className="h-4 w-4" />, blurb: "A rectangle — backgrounds and section dividers" },
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

/** Split "Measure Name = EXPRESSION" — only when the LHS is a plain name (no brackets/parens),
 *  so CALCULATE filter expressions like `Sales[revenue] > 500` are never cut at their `=`. */
function splitMeasureName(src: string): { name: string; expr: string } {
  const m = /^\s*([A-Za-z][A-Za-z0-9 _%]*)\s*=\s*(?!=)([\s\S]+)$/.exec(src);
  if (m) return { name: m[1].trim() || "New measure", expr: m[2].trim() };
  return { name: "New measure", expr: src.trim() };
}

/** Module-level treemap cell renderer (recharts clones the element with node props). */
function TreemapCell(p: { palette: string[]; money: boolean; x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; index?: number }) {
  const { palette, money } = p;
  const x = p.x, y = p.y, ww = p.width, hh = p.height;
  if (x === undefined || y === undefined || !ww || !hh) return <g />;
  return (
    <g>
      <rect x={x} y={y} width={ww} height={hh} style={{ fill: palette[(p.index ?? 0) % palette.length], stroke: "#fff", strokeWidth: 2 }} />
      {ww > 52 && hh > 24 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={10} fontWeight={600}>
          {String(p.name ?? "").slice(0, Math.max(0, Math.floor((ww - 12) / 6.2)))}
        </text>
      )}
      {ww > 52 && hh > 42 && <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.85)" fontSize={9.5}>{fmtVal(p.value ?? 0, money)}</text>}
    </g>
  );
}

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
  if (type === "kpi2") { base.title = `${numericCols[0]?.name ?? "Total"} KPI`; base.topN = 0; base.w = 30; base.h = 26; }
  if (type === "waterfall") {
    const dimName = ds.columns.find((c) => c.key === base.dimension)?.name;
    const measName = ds.columns.find((c) => c.key === base.measure)?.name;
    base.title = `${measName ?? "Value"} by ${dimName ?? "Category"} (waterfall)`;
    base.topN = 8;
  }
  if (type === "slicer") { base.field = bestDimension(ds); base.title = "Slicer"; base.selected = []; base.w = 20; base.h = 44; base.x = 2; base.y = 3; }
  if (type === "textbox") { base.title = "Text box"; base.text = "Double-click into the Format tab to edit this text. Use text boxes for page titles, definitions and takeaways — exactly like Power BI."; base.showTitle = false; base.w = 30; base.h = 14; }
  if (type === "shape") { base.title = "Shape"; base.showTitle = false; base.w = 14; base.h = 8; base.color = 0; }
  if (type === "bar" || type === "pie" || type === "donut" || type === "treemap" || type === "funnel") {
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
export function DashboardTool() {
  const { dashboards, saveDashboard, deleteDashboard, daxMeasures, saveDaxMeasure } = useAcademy();
  const [dsId, setDsId] = React.useState("clean_sales");
  const [customDs, setCustomDs] = React.useState<Dataset | null>(null);
  const ds = React.useMemo(
    () => (customDs && dsId === customDs.id ? customDs : getDatasetById(dsId) ?? getDatasetById("clean_sales")!),
    [dsId, customDs]
  );

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

  const [ribbonTab, setRibbonTab] = React.useState<"home" | "insert" | "modeling" | "view" | "help">("home");
  const [themeIdx, setThemeIdx] = React.useState(0);
  const [themeMenu, setThemeMenu] = React.useState(false);
  const [gridlines, setGridlines] = React.useState(true);
  const [pageFilters, setPageFilters] = React.useState<PageFilter[]>([]);
  const [crossFilters, setCrossFilters] = React.useState<CrossFilter[]>([]);
  const [pageMenu, setPageMenu] = React.useState<string | null>(null);
  const [savedName, setSavedName] = React.useState("");
  const [dataCol, setDataCol] = React.useState<string | null>(null);
  const [getDataMenu, setGetDataMenu] = React.useState(false);
  const [visualGallery, setVisualGallery] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [backstage, setBackstage] = React.useState<string | null>(null);
  const [measureDlg, setMeasureDlg] = React.useState(false);
  const [measureExpr, setMeasureExpr] = React.useState("Avg Order Value = AVERAGE(Sales[revenue]) / COUNTROWS(Sales)");
  const [measureResult, setMeasureResult] = React.useState<{ display: string; err?: string } | null>(null);
  const [enterDataDlg, setEnterDataDlg] = React.useState(false);
  const [enterDataCsv, setEnterDataCsv] = React.useState("");
  const [canvasZoom, setCanvasZoom] = React.useState(1);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [showVisPane, setShowVisPane] = React.useState(true);
  const [showFieldsPane, setShowFieldsPane] = React.useState(true);
  const [showFiltersPane, setShowFiltersPane] = React.useState(true);

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
    if (patch && typeof patch === "object") {
      if ("agg" in patch) coachSay("dashboard", "pbi.agg", `Changed the aggregation to ${String(patch.agg).toUpperCase()}`);
      else if ("format" in patch) coachSay("dashboard", "pbi.format", "Changed a visual's formatting");
      else if ("title" in patch) coachSay("dashboard", "pbi.format", "Renamed a visual's title");
    }
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...(typeof patch === "function" ? patch(w) : patch) } : w)));
  };

  const addWidget = (type: WType) => {
    coachSay("dashboard", "pbi.visual", `Added a ${WTYPE_META[type].label} visual to the page`, WTYPE_META[type].label);
    pushUndo();
    const w = newWidget(type, ds, page.widgets);
    setWidgets((ws) => [...ws, w]);
    setSelectedId(w.id);
    setPaneTab("build");
  };

  const removeWidget = (id: string) => {
    coachSay("dashboard", "pbi.remove", "Removed a visual from the page");
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
    coachSay("dashboard", "pbi.page", "Added a report page");
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
    coachSay("dashboard", "pbi.page", "Renamed a report page");
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
    const nd = getDatasetById(id);
    coachSay("dashboard", "pbi.data", "Connected a dataset to the report", nd?.name ?? id);
    setDsId(id);
    setSelectedId(null);
    setCrossFilters([]);
    setPageFilters([]);
    setDataCol(null);
  };

  /* ---------- cross-filtering ---------- */
  const toggleCrossFilter = (col: string, val: string, from: string) => {
    coachSay("dashboard", "pbi.crossfilter", `Cross-filtered the page: ${ds.columns.find((c) => c.key === col)?.name ?? col} = ${val}`);
    setCrossFilters((cfs) => {
      const exists = cfs.find((c) => c.col === col && c.val === val && c.from === from);
      if (exists) return cfs.filter((c) => !(c.col === col && c.val === val && c.from === from));
      return [...cfs.filter((c) => c.from !== from), { col, val, from }];
    });
  };

  const slicerSet = (wid: string, field: string, vals: string[]) => {
    coachSay("dashboard", "pbi.slicer", `Slicer set: ${ds.columns.find((c) => c.key === field)?.name ?? field} (${vals.length} selected)`);
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
      if (dragState.current && (dragState.current.kind === "move" || dragState.current.kind === "resize")) {
        const w0 = dragState.current;
        coachSay("dashboard", "pbi.drag", w0.kind === "move" ? "Moved a visual on the canvas" : "Resized a visual on the canvas");
      }
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* live-coach tips — recomputed from report state */
  const coachTips: string[] = React.useMemo(() => {
    const t: string[] = [];
    t.push("Free-form canvas: **drag a visual's header** to move it, **drag the bottom-right corner** to resize. \u201cTidy layout\u201d (View tab) snaps everything back to a clean grid.");
    t.push(view === "report" && page.widgets.length > 1
      ? "Now the Power BI magic: **click a column or slice** in one chart and watch every other visual filter. Click the chip under the canvas (or the bar again) to undo."
      : "Add at least two visuals, then click one — **cross-filtering** is the interaction interviewers ask about.");
    t.push("Data view = check the grain (one row per what?). Model view = your schema card + the implicit measures Power BI created from your visuals.");
    return t;
  }, [view, page.widgets.length]);

  /* ---------- save / load ---------- */
  const doSave = () => {
    coachSay("dashboard", "pbi.save", "Saved the report to your Academy portfolio");
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
    coachSay("dashboard", "pbi.save", "Exported the report JSON (every page, visual and theme)");
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
    coachSay("dashboard", "pbi.field", `Toggled the field "${col.name}" in the visual wells`, col.name);
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
  const catalog = getSampleCatalog();
  const pbiTitle = `${savedName.trim() || "Untitled"} - Power BI Desktop`;

  return (
    <div className="space-y-0" style={{ fontFamily: SEGOE, color: MS.ink }} onMouseDown={() => { setThemeMenu(false); setGetDataMenu(false); setPageMenu(null); }}>
      {/* ============ title bar (Power BI yellow) ============ */}
      <div className="overflow-visible rounded-t-lg">
        <MsTitleBar
          color={MS.pbiYellow}
          logo={<PbiLogo size={17} />}
          title={pbiTitle}
          qat={
            <>
              <MsQatBtn dark title="Save this report to your Academy portfolio" onClick={doSave}><Save className="h-4 w-4" /></MsQatBtn>
              <MsQatBtn dark title="Undo (Ctrl+Z)" onClick={undo} disabled={!undoDepth}><Undo2 className="h-4 w-4" /></MsQatBtn>
              <MsQatBtn dark title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoDepth}><Redo2 className="h-4 w-4" /></MsQatBtn>
            </>
          }
          right={<MsWindowGlyphs onCollapse={() => setPaneOpen((o) => !o)} collapsed={!paneOpen} />}
        />
      </div>

      {/* ============ ribbon ============ */}
      <div className="overflow-visible border-b" style={{ borderColor: MS.border }}>
        <RibbonTabs
          accent={MS.pbiYellow}
          menuBtn={{ label: "File", onClick: () => setBackstage("info") }}
          active={ribbonTab}
          onChange={setRibbonTab}
          tabs={[["home", "Home"], ["insert", "Insert"], ["modeling", "Modeling"], ["view", "View"], ["help", "Help"]] as const}
          right={
            <span className="pr-2 text-[10.5px] text-[#605e5c]">
              {page.widgets.length} visual{page.widgets.length === 1 ? "" : "s"} · {pages.filter((p) => !p.hidden).length} page{pages.filter((p) => !p.hidden).length === 1 ? "" : "s"} · {ds.rows.length.toLocaleString()} rows
            </span>
          }
        />
        <RibbonBody collapsed={!paneOpen}>
          {ribbonTab === "home" && (
            <>
              <RGroup label="Clipboard">
                <RSmall title="Undo (Ctrl+Z)" onClick={undo} disabled={!undoDepth}><Undo2 className="h-4 w-4" /></RSmall>
                <RSmall title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoDepth}><Redo2 className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Insert">
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="New visual — pick any visual type" onClick={() => setVisualGallery((v) => !v)} chevron label="New Visual"><BarChart3 className="h-5 w-5" /></RBig>
                  {visualGallery && (
                    <MsMenu width={230}>
                      {(Object.keys(WTYPE_META) as WType[]).map((t) => (
                        <MsMenuItem key={t} onClick={() => { addWidget(t); setVisualGallery(false); }} icon={WTYPE_META[t].icon}>
                          {WTYPE_META[t].label}
                        </MsMenuItem>
                      ))}
                    </MsMenu>
                  )}
                </div>
                <RBig title="Add a Card (KPI) visual" onClick={() => addWidget("kpi")} label="Card"><Gauge className="h-5 w-5" /></RBig>
                <RBig title="Add a clustered column chart" onClick={() => addWidget("bar")} label="Column"><BarChart3 className="h-5 w-5" /></RBig>
                <RBig title="Add a line chart" onClick={() => addWidget("line")} label="Line"><LineIcon className="h-5 w-5" /></RBig>
                <RBig title="Add a slicer" onClick={() => addWidget("slicer")} label="Slicer"><SlidersHorizontal className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Data">
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Get Data — load one of the Academy sample files" onClick={() => setGetDataMenu((v) => !v)} chevron label="Get Data"><Database className="h-5 w-5" /></RBig>
                  {getDataMenu && (
                    <MsMenu width={330}>
                      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#605e5c]">Sample files — {catalog.length} datasets</p>
                      <div className="max-h-[320px] overflow-auto">
                        {(["Small", "Medium", "Large", "Huge"] as const).map((sz) => (
                          <React.Fragment key={sz}>
                            {catalog.filter((f) => f.size === sz).map((f) => (
                              <MsMenuItem key={f.id} onClick={() => { loadDataset(f.id); setGetDataMenu(false); }}>
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
                <RBig title="Enter Data — type or paste a small table" onClick={() => setEnterDataDlg(true)} label="Enter Data"><Table2 className="h-5 w-5" /></RBig>
                <RBig title="Refresh — clear cross-filters and recalculate" onClick={() => { setCrossFilters([]); }} label="Refresh"><RotateCcw className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Export">
                <RBig title="Export the report definition as JSON (re-importable)" onClick={exportJSON} label="Export JSON"><FileJson className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Save" last>
                <input value={savedName} onChange={(e) => setSavedName(e.target.value)} placeholder="Report name" className="h-[26px] w-36 rounded-[3px] border border-[#d2d0ce] bg-white px-2 text-[11.5px] outline-none focus:border-[#118DFF]" />
                <RBig title="Save this report to your Academy portfolio" onClick={doSave} label="Save"><Save className="h-5 w-5" /></RBig>
              </RGroup>
            </>
          )}

          {ribbonTab === "insert" && (
            <>
              <RGroup label="Pages">
                <RBig title="Add a new report page" onClick={addPage} label="New Page"><Plus className="h-5 w-5" /></RBig>
                <RSmall title="Duplicate the current page" onClick={() => duplicatePage(page.id)} label="Duplicate"><Copy className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Elements">
                <RBig title="Text box — titles, notes and takeaways" onClick={() => addWidget("textbox")} label="Text Box"><Type className="h-5 w-5" /></RBig>
                <RBig title="Shape — a rectangle for backgrounds and dividers" onClick={() => addWidget("shape")} label="Shape"><Square className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Visualizations — click to drop on the canvas" last>
                <div className="flex max-w-[560px] flex-wrap gap-1 self-start pt-1">
                  {(Object.keys(WTYPE_META) as WType[]).map((t) => (
                    <RSmall key={t} title={`${WTYPE_META[t].label} — ${WTYPE_META[t].blurb}`} onClick={() => addWidget(t)}>
                      {WTYPE_META[t].icon}
                      <span className="whitespace-nowrap">{WTYPE_META[t].label}</span>
                    </RSmall>
                  ))}
                </div>
              </RGroup>
            </>
          )}

          {ribbonTab === "modeling" && (
            <>
              <RGroup label="Calculations">
                <RBig title="New measure — write real DAX and evaluate it instantly" onClick={() => { setMeasureDlg(true); setMeasureResult(null); }} label="New Measure" accentIcon="#b58900"><Sigma className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Relationships">
                <RSmall title="Open Model view — schema, fields and measures" onClick={() => setView("model")} label="Model View"><Link2 className="h-4 w-4" /></RSmall>
                <RSmall title="Open Data view — the raw table" onClick={() => setView("data")} label="Data View"><Table2 className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Format" last>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <RBig title="Change the report color theme" onClick={() => setThemeMenu((v) => !v)} chevron label="Theme"><Palette className="h-5 w-5" /></RBig>
                  {themeMenu && (
                    <MsMenu width={240}>
                      {THEMES.map((t, i) => (
                        <button key={t.name} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12.5px] text-[#252423] hover:bg-[#f3f2f1]" onClick={() => { coachSay("dashboard", "pbi.format", `Applied the "${THEMES[i].name}" report theme — every visual re-colored`); setThemeIdx(i); setThemeMenu(false); }}>
                          {i === themeIdx ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                          <span className="flex gap-0.5">{t.colors.slice(0, 5).map((c) => <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />)}</span>
                          {t.name}
                        </button>
                      ))}
                    </MsMenu>
                  )}
                </div>
              </RGroup>
            </>
          )}

          {ribbonTab === "view" && (
            <>
              <RGroup label="Show Panes">
                <RSmall title="Visualizations pane" onClick={() => setShowVisPane((v) => !v)} active={showVisPane} toggleLook label="Visualizations" />
                <RSmall title="Data (Fields) pane" onClick={() => setShowFieldsPane((v) => !v)} active={showFieldsPane} toggleLook label="Data" />
                <RSmall title="Filters pane" onClick={() => setShowFiltersPane((v) => !v)} active={showFiltersPane} toggleLook label="Filters" />
              </RGroup>
              <RGroup label="Show">
                <RSmall title="Canvas gridlines for alignment" onClick={() => setGridlines((g) => !g)} active={gridlines} toggleLook label="Gridlines"><Grid3x3 className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Layout">
                <RSmall title="Tidy — arrange all visuals in a clean grid" onClick={() => { pushUndo(); setWidgets((ws) => smartLayout(ds, ws)); }} label="Tidy Layout"><Sparkles className="h-4 w-4" /></RSmall>
              </RGroup>
              <RGroup label="Zoom" last>
                {([["50%", 0.5], ["75%", 0.75], ["100%", 1], ["125%", 1.25], ["150%", 1.5]] as [string, number][]).map(([lbl, z]) => (
                  <RSmall key={lbl} title={`Canvas zoom ${lbl}`} onClick={() => setCanvasZoom(z)} active={Math.abs(canvasZoom - z) < 0.01} toggleLook label={lbl} />
                ))}
              </RGroup>
            </>
          )}

          {ribbonTab === "help" && (
            <>
              <RGroup label="Guidance">
                <RBig title="About this simulator" onClick={() => setHelpOpen(true)} label="About" accentIcon="#b58900"><CircleHelp className="h-5 w-5" /></RBig>
              </RGroup>
              <RGroup label="Learning" last>
                <p className="max-w-[460px] self-center px-2 text-[11px] leading-relaxed text-[#605e5c]">
                  Every control here works on a real dataset. Learn the DAX layer in the <b>Functions Lab</b> (top navigation) — measures, CALCULATE, iterators — then come back and build the report a company would actually pay for.
                </p>
              </RGroup>
            </>
          )}
        </RibbonBody>
      </div>

      {/* ============ main body ============ */}
      <div className="flex items-stretch bg-white">
        {/* left view rail — Power BI style */}
        <div className="flex shrink-0 flex-col items-center gap-1 py-2" style={{ background: MS.surface, borderRight: `1px solid ${MS.border}`, minHeight: "58vh" }} role="tablist" aria-label="View mode">
          {([["report", LayoutDashboard, "Report view"], ["data", Table2, "Data view"], ["model", Link2, "Model view"]] as const).map(([v, Icon, label]) => (
            <TooltipProvider key={v} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button role="tab" aria-selected={view === v} onClick={() => { if (v !== "report") coachSay("dashboard", "pbi.dataview", v === "data" ? "Inspected the table in Data view" : "Reviewed the model in Model view"); setView(v); }}
                    className="relative flex h-10 w-10 items-center justify-center rounded-[4px] transition-colors"
                    style={{ background: view === v ? "#e0dfdd" : "transparent", color: view === v ? "#252423" : "#605e5c" }}
                    onMouseEnter={(e) => { if (view !== v) e.currentTarget.style.background = MS.hover; }}
                    onMouseLeave={(e) => { if (view !== v) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {view === v && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r" style={{ background: MS.pbiYellow }} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* center stage */}
        <div className="min-w-0 flex-1">
          {view === "report" && (
            <>
              {/* canvas — gray work surface with a white 16:9 page */}
              <div className="p-3" style={{ background: MS.pbiSurface }}>
                <div
                  ref={canvasRef}
                  className="relative mx-auto aspect-video w-full overflow-hidden bg-white"
                  style={{ border: "1px solid #c8c8c8", boxShadow: "0 1px 5px rgba(0,0,0,0.14)", zoom: canvasZoom }}
                  onMouseDown={() => { setSelectedId(null); setVisualGallery(false); }}
                >
                  {gridlines && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                        backgroundSize: "12.5% 25%",
                      }}
                    />
                  )}
                  {page.widgets.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                      <MousePointerClick className="h-8 w-8 text-[#c8c8c8]" />
                      <p className="text-[13px] font-semibold text-[#8a8886]">Your canvas is empty</p>
                      <p className="max-w-sm text-[11.5px] leading-relaxed text-[#a19f9d]">
                        Click a visual type in the <b>Visualizations</b> pane (right) or the <b>Insert</b> ribbon, then wire fields in the <b>Data</b> pane. Drag visuals freely — exactly like Power BI Desktop.
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
                      onFocus={() => setFocusId(w.id)}
                    />
                  ))}
                  {/* focus mode — one visual, full page (Power BI's Focus button) */}
                  {(() => {
                    const fw = page.widgets.find((x) => x.id === focusId);
                    if (!fw) return null;
                    return (
                      <div className="absolute inset-0 z-50 flex flex-col bg-white p-3" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2">
                          <p className="text-[13px] font-semibold text-[#252423]">{fw.title}</p>
                          <button
                            className="flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-[11.5px] font-semibold text-[#252423] hover:bg-[#f3f2f1]"
                            style={{ borderColor: MS.border }}
                            onClick={() => setFocusId(null)}
                          ><Minimize2 className="h-3.5 w-3.5" /> Back to report</button>
                        </div>
                        <div className="min-h-0 flex-1">
                          <VisualCard
                            w={{ ...fw, x: 1, y: 1, w: 98, h: 98 }}
                            ds={ds}
                            palette={PALETTE}
                            pageFilters={pageFilters}
                            cross={crossFilters}
                            selected
                            dimmed={false}
                            onMouseDownHeader={() => {}}
                            onResizeStart={() => {}}
                            onSelect={() => {}}
                            onRemove={() => setFocusId(null)}
                            onDuplicate={() => {}}
                            onCrossToggle={toggleCrossFilter}
                            onSlicerChange={slicerSet}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  {/* cross-filter chips */}
                  {crossFilters.length > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 z-40 flex max-w-[95%] flex-wrap items-center gap-1">
                      <span className="rounded-[3px] bg-[#252423] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">Filtering</span>
                      {crossFilters.map((cf, i) => (
                        <button key={i} className="flex items-center gap-1 rounded-[3px] bg-[#118DFF] px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-[#0f7de0]"
                          title="Click to clear this cross-filter"
                          onClick={() => setCrossFilters((c) => c.filter((x) => x !== cf))}>
                          {ds.columns.find((c) => c.key === cf.col)?.name ?? cf.col}: {cf.val} <X className="h-2.5 w-2.5" />
                        </button>
                      ))}
                      <button className="rounded-[3px] bg-[#252423] px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-[#3b3a39]" onClick={() => setCrossFilters([])}>Clear all</button>
                    </div>
                  )}
                </div>

                {/* page tabs + zoom — on the gray surface, PBI style */}
                <div className="flex items-center justify-between gap-3 pt-1.5">
                  <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                    {pages.filter((p) => !p.hidden || p.id === page.id).map((p) => (
                      <div key={p.id} className="relative shrink-0">
                        <button
                          onClick={() => { setActivePageId(p.id); setSelectedId(null); setCrossFilters([]); }}
                          onDoubleClick={() => renamePage(p.id)}
                          className="flex h-[30px] items-center gap-1.5 rounded-t-[4px] px-3 text-[12px] transition-colors"
                          style={{
                            background: p.id === page.id ? "#ffffff" : "transparent",
                            color: p.id === page.id ? "#252423" : "#605e5c",
                            fontWeight: p.id === page.id ? 600 : 400,
                            border: `1px solid ${p.id === page.id ? "#c8c8c8" : "transparent"}`,
                            borderBottom: p.id === page.id ? "none" : "1px solid transparent",
                            opacity: p.hidden ? 0.6 : 1,
                          }}
                          title="Double-click to rename"
                        >
                          {p.hidden && <EyeOff className="h-3 w-3" />}
                          {p.name}
                          <span className="rounded bg-black/5 px-1 text-[9px] text-[#605e5c]">{p.widgets.length}</span>
                        </button>
                        <button
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#a19f9d] hover:text-[#252423]"
                          onClick={(e) => { e.stopPropagation(); setPageMenu(pageMenu === p.id ? null : p.id); }}
                          aria-label={`Page options for ${p.name}`}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </button>
                        {pageMenu === p.id && (
                          <MsMenu align="left" width={180}>
                            <MsMenuItem onClick={() => renamePage(p.id)}><Pencil className="mr-1 inline h-3 w-3" />Rename</MsMenuItem>
                            <MsMenuItem onClick={() => duplicatePage(p.id)}><Copy className="mr-1 inline h-3 w-3" />Duplicate</MsMenuItem>
                            <MsMenuItem onClick={() => togglePageHidden(p.id)}>{p.hidden ? <Eye className="mr-1 inline h-3 w-3" /> : <EyeOff className="mr-1 inline h-3 w-3" />}{p.hidden ? "Show page" : "Hide page"}</MsMenuItem>
                            <MsMenuItem onClick={() => deletePage(p.id)} disabled={pages.length <= 1}><Trash2 className="mr-1 inline h-3 w-3" />Delete</MsMenuItem>
                          </MsMenu>
                        )}
                      </div>
                    ))}
                    <button onClick={addPage} className="flex h-[30px] w-8 shrink-0 items-center justify-center rounded-[4px] text-[#605e5c] hover:bg-black/5" title="New page"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#605e5c]">
                    <button className="rounded p-0.5 hover:bg-black/5" title="Zoom out" onClick={() => setCanvasZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}><ZoomOut className="h-3.5 w-3.5" /></button>
                    <b className="w-10 text-center">{Math.round(canvasZoom * 100)}%</b>
                    <button className="rounded p-0.5 hover:bg-black/5" title="Zoom in" onClick={() => setCanvasZoom((z) => Math.min(1.5, Math.round((z + 0.25) * 100) / 100))}><ZoomIn className="h-3.5 w-3.5" /></button>
                    <button className="rounded px-1.5 py-0.5 hover:bg-black/5" title="Fit to page" onClick={() => setCanvasZoom(1)}>Fit</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "data" && <DataView ds={ds} dataCol={dataCol} setDataCol={setDataCol} />}
          {view === "model" && <ModelView ds={ds} widgets={pages.flatMap((p) => p.widgets)} />}
        </div>

        {/* right panes */}
        {view === "report" && paneOpen && (
          <div className="hidden w-[268px] shrink-0 space-y-2 py-2 pr-2 lg:block xl:w-[300px]" style={{ background: MS.surface }}>
            {/* Visualizations pane */}
            {showVisPane && (
            <div className="rounded-[4px] border bg-white" style={{ borderColor: MS.border }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid #edebe9` }}>
                <span className="text-[12px] font-semibold">Visualizations</span>
                <Sigma className="h-3.5 w-3.5 text-[#b58900]" />
              </div>
              {/* gallery — 4 per row like Power BI */}
              <div className="p-2">
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(WTYPE_META) as WType[]).map((t) => (
                    <TooltipProvider key={t} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => addWidget(t)}
                            className="flex h-[34px] items-center justify-center rounded-[4px] border transition-colors"
                            style={{
                              borderColor: selected?.type === t ? "#252423" : MS.border,
                              background: selected?.type === t ? "#f3f2f1" : "#fff",
                              color: selected?.type === t ? "#252423" : "#605e5c",
                            }}
                            onMouseEnter={(e) => { if (selected?.type !== t) { e.currentTarget.style.borderColor = "#a19f9d"; e.currentTarget.style.color = "#252423"; } }}
                            onMouseLeave={(e) => { if (selected?.type !== t) { e.currentTarget.style.borderColor = MS.border; e.currentTarget.style.color = "#605e5c"; } }}
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
                {/* Build / Format segmented tabs — below the gallery, like PBI */}
                <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-[4px] border" style={{ borderColor: MS.border }}>
                  <button
                    onClick={() => { setPaneTab("build"); if (!selected && page.widgets.length) setSelectedId(page.widgets[page.widgets.length - 1].id); }}
                    className="flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-semibold"
                    style={{ background: paneTab === "build" ? "#e0dfdd" : "#fff", color: "#252423" }}
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Build visual
                  </button>
                  <button
                    onClick={() => setPaneTab("format")}
                    className="flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-semibold"
                    style={{ background: paneTab === "format" ? "#e0dfdd" : "#fff", color: "#252423" }}
                  >
                    <Paintbrush className="h-3.5 w-3.5" /> Format visual
                  </button>
                </div>

                {paneTab === "build" ? (
                  <div className="pt-2">
                    {selected ? (
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">{WTYPE_META[selected.type].label}</p>
                        {selected.type === "slicer" ? (
                          <Well label="Field" value={selected.field ?? ""} onChange={(v) => update(selected.id, { field: v })} cols={dimCols.length ? dimCols : ds.columns} />
                        ) : selected.type === "textbox" ? (
                          <div>
                            <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-[#605e5c]">Text</label>
                            <textarea
                              value={selected.text ?? ""}
                              onChange={(e) => update(selected.id, { text: e.target.value })}
                              rows={5}
                              className="w-full rounded-[3px] border border-[#d2d0ce] bg-white p-2 text-[12px] outline-none focus:border-[#118DFF]"
                            />
                          </div>
                        ) : selected.type === "shape" ? (
                          <div>
                            <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[#605e5c]">Fill color</p>
                            <div className="flex flex-wrap gap-1.5">
                              {PALETTE.map((c, i) => (
                                <button key={c} onClick={() => update(selected.id, { color: i })}
                                  className={`h-5 w-5 rounded-full border-2 ${selected.color === i ? "border-[#252423]" : "border-transparent"}`}
                                  style={{ background: c }} aria-label={`Color ${i + 1}`} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <Well
                              label={selected.type === "kpi" || selected.type === "gauge" ? "Fields" : selected.type === "pie" || selected.type === "donut" ? "Legend" : "X-axis"}
                              value={selected.dimension}
                              onChange={(v) => update(selected.id, { dimension: v })}
                              cols={selected.type === "scatter" ? ds.columns : dimCols.length ? dimCols : ds.columns}
                            />
                            <Well
                              label={selected.type === "scatter" ? "Y-axis (average)" : selected.type === "gauge" ? "Value" : "Y-axis"}
                              value={selected.measure}
                              onChange={(v) => update(selected.id, { measure: v })}
                              cols={numericCols.length ? numericCols : ds.columns}
                              agg={selected.agg}
                              onAgg={(a) => update(selected.id, { agg: a })}
                            />
                            {(selected.type === "scatter" || selected.type === "combo") && (
                              <Well label={selected.type === "combo" ? "Line values" : "Y-axis (total)"} value={selected.measure2 ?? ""} onChange={(v) => update(selected.id, { measure2: v })} cols={numericCols.length ? numericCols : ds.columns} />
                            )}
                            {selected.type !== "kpi" && selected.type !== "gauge" && (
                              <div>
                                <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-[#605e5c]">Top N</label>
                                <div className="flex flex-wrap gap-1">
                                  {[3, 5, 7, 10, 0].map((n) => (
                                    <button key={n} onClick={() => update(selected.id, { topN: n })}
                                      className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold"
                                      style={{
                                        background: selected.topN === n ? "#FDF0D1" : "transparent",
                                        color: selected.topN === n ? "#8a6d00" : "#605e5c",
                                      }}>
                                      {n === 0 ? "All" : n}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="pb-1 text-[11px] leading-snug text-[#605e5c]">Click a visual type to add it, then use the <b>Data</b> pane below to wire columns into the wells.</p>
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
                  <p className="pb-2 text-[11px] leading-snug text-[#605e5c]">Select a visual on the canvas to open its format options — exactly like Power BI&apos;s paint-roller pane.</p>
                )}
              </div>
            </div>
            )}

            {/* Data pane (Fields) */}
            {showFieldsPane && (
            <div className="rounded-[4px] border bg-white" style={{ borderColor: MS.border }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid #edebe9` }}>
                <span className="text-[12px] font-semibold">Data</span>
                <Database className="h-3.5 w-3.5 text-[#b58900]" />
              </div>
              <div className="p-2">
                <div className="relative mb-1.5">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#a19f9d]" />
                  <Input value={fieldsSearch} onChange={(e) => setFieldsSearch(e.target.value)} placeholder="Search fields" className="h-7 border-[#d2d0ce] bg-white pl-7 text-[11.5px]" />
                </div>
                {/* table row */}
                <div className="flex items-center gap-1.5 rounded-[3px] px-1.5 py-1 text-[12px] font-semibold">
                  <Table2 className="h-3.5 w-3.5 shrink-0 text-[#b58900]" />
                  <span className="min-w-0 flex-1 truncate">{ds.name.split(" (")[0]}</span>
                  <span className="shrink-0 text-[9.5px] font-normal text-[#605e5c]">{ds.rows.length.toLocaleString()} rows</span>
                </div>
                <div className="ml-2.5 space-y-px border-l pl-1.5" style={{ borderColor: "#e1dfdd" }}>
                  {ds.columns.filter((c) => c.name.toLowerCase().includes(fieldsSearch.toLowerCase())).map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-[3px] px-1.5 py-1 hover:bg-[#f3f2f1]" title={c.name}>
                      <Checkbox checked={wellFieldChecked(c.key)} onCheckedChange={() => toggleFieldInWells(c.key)} className="h-3.5 w-3.5 accent-[#b58900]" />
                      {THEME_ICON[c.type] ?? <Type className="h-3 w-3 text-[#605e5c]" />}
                      <span className="min-w-0 flex-1 truncate text-[12px]">{c.name}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 border-t pt-2 text-[10.5px] leading-snug text-[#605e5c]" style={{ borderColor: "#edebe9" }}>
                  Tick a column to add it to the selected visual&apos;s wells (untick to remove). σ = numeric, T = text, calendar = date.
                </p>
              </div>
            </div>
            )}

            {/* Filters pane — PBI card style */}
            {showFiltersPane && (
            <div className="rounded-[4px] border bg-white" style={{ borderColor: MS.border }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid #edebe9` }}>
                <span className="text-[12px] font-semibold">Filters</span>
                <ListFilter className="h-3.5 w-3.5 text-[#605e5c]" />
              </div>
              <div className="space-y-2 p-2.5">
                <div className="rounded-[4px] border p-2" style={{ borderColor: "#e1dfdd", background: "#faf9f8" }}>
                  <p className="mb-1.5 text-[11px] font-semibold">Filters on this page</p>
                  {pageFilters.length === 0 && <p className="text-[10.5px] leading-snug text-[#605e5c]">No page filters yet. Add one below — it applies to every visual on the page.</p>}
                  <div className="space-y-1.5">
                    {pageFilters.map((f) => (
                      <div key={f.id} className="flex items-center gap-1.5 rounded-[3px] bg-white px-2 py-1 text-[11.5px]" style={{ border: `1px solid #e1dfdd` }}>
                        <span className="min-w-0 flex-1 truncate">
                          <b>{ds.columns.find((c) => c.key === f.col)?.name ?? f.col}</b> = {f.val}
                        </span>
                        <button className="text-[#a19f9d] hover:text-[#a4262c]" onClick={() => setPageFilters((fs) => fs.filter((x) => x.id !== f.id))}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5">
                    <Select value={"__add"} onValueChange={(v) => { if (v !== "__add") setPageFilters((fs) => [...fs, { id: `f_${Math.random().toString(36).slice(2, 7)}`, col: v.split("::")[0], val: v.split("::")[1] }]); }}>
                      <SelectTrigger className="h-7 w-full border-[#d2d0ce] bg-white text-[11px]"><SelectValue placeholder="+ Add a filter…" /></SelectTrigger>
                      <SelectContent className="max-h-56 border-[#e1dfdd] bg-white">
                        {dimCols.flatMap((c) => [...new Set(ds.rows.map((r) => String(r[c.key] ?? "")).filter(Boolean))].slice(0, 20).map((val) => (
                          <SelectItem key={`${c.key}::${val}`} value={`${c.key}::${val}`} className="text-[11.5px]">{c.name}: {val}</SelectItem>
                        )))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* hand-in-hand live coach — docked like another Power BI pane */}
        <LiveCoach tool="dashboard" accent="#b58900" office tips={coachTips} />
      </div>

      {/* saved dashboards */}
      {dashboards.length > 0 && (
        <div className="border-t px-3 py-2" style={{ borderColor: "#edebe9", background: MS.surface }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#605e5c]">Saved reports:</span>
            {dashboards.map((d) => (
              <span key={d.id} className="group flex items-center gap-2 rounded-[3px] border bg-white px-2.5 py-1 text-[12px]" style={{ borderColor: MS.border }}>
                <ClipboardList className="h-3.5 w-3.5 text-[#b58900]" />
                <span className="font-medium">{d.name}</span>
                <span className="text-[10px] text-[#605e5c]">{d.pages ? (d.pages as Page[]).length : 0}p</span>
                <button
                  className="font-medium text-[#0f6cbd] hover:underline"
                  onClick={() => {
                    const pagesIn = (d.pages as Page[] | undefined) ?? [];
                    pushUndo();
                    setPages(pagesIn.length ? pagesIn : [{ id: "p_overview", name: "Overview", widgets: [] }]);
                    setActivePageId(pagesIn[0]?.id ?? "p_overview");
                    setDsId(d.datasetId);
                  }}>open</button>
                <button className="text-[#a19f9d] hover:text-[#a4262c]" onClick={() => deleteDashboard(d.id)}><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ============ dialogs ============ */}
      {measureDlg && (
        <MsDialog title="New measure (DAX)" onClose={() => setMeasureDlg(false)} width={520}>
          <p className="mb-2 text-[12px] text-[#605e5c]">Measures are calculations evaluated on the fly — the heart of Power BI&apos;s model layer. Write <b>Name = EXPRESSION</b> using the DAX you learn in the Functions Lab.</p>
          <div className="space-y-2">
            <Input value={measureExpr} onChange={(e) => setMeasureExpr(e.target.value)} placeholder="Total Revenue = SUM(Sales[revenue])" className="h-9 border-[#d2d0ce] font-mono text-[12.5px]" />
            <div className="flex flex-wrap gap-1">
              {([
                ["Total Revenue = SUM(Sales[revenue])", ds.columns.some((c) => c.key === "revenue")],
                ["Orders = COUNTROWS(Sales)", true],
                ["Avg Order Value = AVERAGE(Sales[revenue])", ds.columns.some((c) => c.key === "revenue")],
                ["Big Orders = CALCULATE([Total Revenue], Sales[revenue] > 500)", ds.columns.some((c) => c.key === "revenue")],
              ] as [string, boolean][]).filter(([expr, ok]) => ok).map(([expr]) => (
                <button key={expr} className="rounded-[3px] border border-[#d2d0ce] px-1.5 py-0.5 font-mono text-[10.5px] text-[#605e5c] hover:bg-[#f3f2f1]" onClick={() => setMeasureExpr(expr)}>
                  {expr.split(" =")[0]}
                </button>
              ))}
            </div>
            {measureResult && (
              <div className={`rounded-[3px] border px-3 py-2 text-[13px] ${measureResult.err ? "border-[#d13438] bg-[#fdf3f4] text-[#a4262c]" : "border-[#9fd89f] bg-[#f1faf1]"}`}>
                {measureResult.err ? <span className="font-mono text-[12px]">{measureResult.err}</span> : <>Result: <b className="font-mono">{measureResult.display}</b></>}
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-3 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => {
              try {
                const eng = createDaxEngine("Sales", ds.rows, []);
                const r = eng.evaluate(splitMeasureName(measureExpr).expr);
                setMeasureResult({ display: r.display });
              } catch (e) {
                setMeasureResult({ display: "", err: e instanceof Error ? e.message : "Invalid DAX" });
              }
            }}>Evaluate</button>
            <button
              className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
              style={{ background: "#0f6cbd" }}
              onClick={() => {
                const { name, expr } = splitMeasureName(measureExpr);
                saveDaxMeasure(name, expr);
                coachSay("dashboard", "pbi.measure", `Created the DAX measure [${name}]`, `${name} = ${expr}`);
                setMeasureDlg(false);
              }}
            >Save measure</button>
          </div>
          <p className="mt-2 text-[10.5px] text-[#a19f9d]">Saved measures appear in Model view and in the Functions Lab. Engine table name: <b>Sales</b> — e.g. SUM(Sales[revenue]).</p>
        </MsDialog>
      )}

      {enterDataDlg && (
        <MsDialog title="Enter Data" onClose={() => setEnterDataDlg(false)} width={520}>
          <p className="mb-2 text-[12px] text-[#605e5c]">Paste a small CSV (first row = column names). It becomes a real table you can build visuals on — exactly like Power BI&apos;s Enter Data.</p>
          <textarea
            value={enterDataCsv}
            onChange={(e) => setEnterDataCsv(e.target.value)}
            rows={7}
            placeholder={"month,spend,revenue\nJan,1200,3400\nFeb,1500,4100"}
            className="w-full rounded-[3px] border border-[#d2d0ce] p-2 font-mono text-[12px] outline-none focus:border-[#118DFF]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button className="rounded-[3px] border border-[#d2d0ce] px-3 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => setEnterDataDlg(false)}>Cancel</button>
            <button
              className="rounded-[3px] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
              style={{ background: "#0f6cbd" }}
              onClick={() => {
                const txt = enterDataCsv.trim();
                if (!txt) return;
                const res = Papa.parse<Record<string, string>>(txt, { header: true, skipEmptyLines: true });
                if (!res.data.length) return;
                const keys = Object.keys(res.data[0]);
                const columns: Dataset["columns"] = keys.map((k) => {
                  const vals = res.data.map((r) => r[k]).filter((v) => v !== "" && v !== null && v !== undefined);
                  const numeric = vals.length > 0 && vals.every((v) => !isNaN(parseFloat(String(v))));
                  return { key: k, name: k, type: numeric ? ("number" as const) : ("text" as const) };
                });
                const rows: Row[] = res.data.map((r) => {
                  const o: Row = {};
                  for (const c of columns) { const raw = r[c.key]; o[c.key] = c.type === "number" ? (raw === "" || raw === undefined ? 0 : parseFloat(String(raw))) : (raw ?? ""); }
                  return o;
                });
                const newDs: Dataset = { id: `entered_${Date.now().toString(36)}`, name: "Entered Data", description: "A table you typed or pasted via Enter Data.", columns, rows };
                coachSay("dashboard", "pbi.data", "Created a table with Enter Data", `${rows.length} rows × ${columns.length} columns`);
                setCustomDs(newDs);
                setDsId(newDs.id);
                setEnterDataDlg(false);
              }}
            >Create table</button>
          </div>
        </MsDialog>
      )}

      {helpOpen && (
        <MsDialog title="About this simulator" onClose={() => setHelpOpen(false)} width={470}>
          <p className="text-[13px] leading-relaxed text-[#3b3a39]">
            This is <b>Data Analytics Academy — Power BI Studio</b>: a faithful, fully client-side recreation of Power BI Desktop. Report / Data / Model views, the Visualizations + Data + Filters panes, field wells with aggregations, drag &amp; resize visuals, cross-filtering, slicers, pages, themes, DAX measures and JSON export all run locally in your browser — nothing is uploaded, and it is completely free.
          </p>
          <p className="mt-2 text-[12.5px] text-[#605e5c]">Try the signature interaction: click a column in one chart and watch every other visual filter. Save reports to your portfolio and push them to GitHub from the Workspace tab.</p>
        </MsDialog>
      )}

      {backstage && (
        <MsBackstage
          color={MS.pbiYellowDark}
          title={(({ info: "Info", open: "Open", save: "Save", export: "Export" }) as Record<string, string>)[backstage] ?? "File"}
          items={[["info", "Info"], ["open", "Open"], ["save", "Save"], ["export", "Export"]] as const}
          active={backstage}
          onNavigate={(id) => setBackstage(id)}
          onClose={() => setBackstage(null)}
        >
          {backstage === "info" && (
            <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
              {([
                ["Report", `${savedName.trim() || "Untitled"} — ${pages.length} page${pages.length === 1 ? "" : "s"}`],
                ["Data", `${ds.name} — ${ds.rows.length.toLocaleString()} rows × ${ds.columns.length} columns`],
                ["Visuals", `${pages.reduce((s, p) => s + p.widgets.length, 0)} across all pages`],
                ["Theme", THEMES[themeIdx].name],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="rounded-[4px] border border-[#e1dfdd] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">{k}</p>
                  <p className="mt-1 text-[13px]">{v}</p>
                </div>
              ))}
            </div>
          )}
          {backstage === "open" && (
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
                <button className="rounded-[3px] border border-[#d2d0ce] px-3 py-1.5 text-[12.5px] hover:bg-[#f3f2f1]" onClick={() => jsonFileRef.current?.click()}>Import a report JSON…</button>
                <span className="text-[12px] text-[#605e5c]">or load a sample dataset:</span>
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {catalog.map((f) => (
                  <button key={f.id} className="flex items-center justify-between gap-2 rounded-[4px] border border-[#e1dfdd] px-3 py-2 text-left hover:border-[#0f6cbd]" onClick={() => { loadDataset(f.id); setBackstage(null); }}>
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
          {backstage === "save" && (
            <div className="max-w-xl">
              <label className="text-[12px] font-semibold text-[#605e5c]">Report name</label>
              <input value={savedName} onChange={(e) => setSavedName(e.target.value)} placeholder="Untitled" className="mt-1 h-9 w-full max-w-xs rounded-[3px] border border-[#d2d0ce] px-2.5 text-[13px]" />
              <button className="mt-3 rounded-[3px] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90" style={{ background: "#0f6cbd" }} onClick={() => { doSave(); setBackstage(null); }}>Save to portfolio</button>
            </div>
          )}
          {backstage === "export" && (
            <div className="max-w-xl space-y-2">
              <button className="block w-full rounded-[4px] border border-[#e1dfdd] px-4 py-3 text-left hover:border-[#0f6cbd]" onClick={() => { exportJSON(); setBackstage(null); }}>
                <span className="block text-[13px] font-semibold">Report JSON</span>
                <span className="text-[11.5px] text-[#605e5c]">Every page, visual, field well and theme — re-import it anytime via File ▸ Open.</span>
              </button>
            </div>
          )}
        </MsBackstage>
      )}

    </div>
  );
}

/* ================= visual card (Power BI chrome) ================= */
function VisualCard({
  w, ds, palette, pageFilters, cross, selected, dimmed,
  onMouseDownHeader, onResizeStart, onSelect, onRemove, onDuplicate, onCrossToggle, onSlicerChange, onFocus,
}: {
  w: Widget; ds: Dataset; palette: string[]; pageFilters: PageFilter[]; cross: CrossFilter[];
  selected: boolean; dimmed: boolean;
  onMouseDownHeader: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onFocus?: () => void;
  onSelect: () => void; onRemove: () => void; onDuplicate: () => void;
  onCrossToggle: (col: string, val: string, from: string) => void;
  onSlicerChange: (id: string, field: string, vals: string[]) => void;
}) {
  const f = w.format ?? {};
  const money = isMoneyMeasure(ds, w);
  const body = (() => {
    if (w.type === "shape") {
      return <div className="h-full w-full rounded-[3px]" style={{ background: palette[(w.color ?? 0) % palette.length], opacity: 0.92 }} />;
    }
    if (w.type === "textbox") {
      return (
        <div className="h-full overflow-auto p-2 text-[12px] leading-snug" style={{ background: f.bg }}>
          <p className="whitespace-pre-wrap">{w.text}</p>
        </div>
      );
    }
    if (w.type === "slicer") {
      const vals = [...new Set(ds.rows.map((r) => String(r[w.field ?? w.dimension] ?? "")).filter(Boolean))].sort().slice(0, 24);
      const cur = new Set(w.selected ?? []);
      return (
        <div className="flex h-full flex-col overflow-auto p-1.5">
          {vals.map((v) => {
            const on = cur.has(v);
            return (
              <label key={v} className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[11px] hover:bg-[#f3f2f1]">
                <Checkbox
                  checked={on}
                  onCheckedChange={() => {
                    const next = on ? [...cur].filter((x) => x !== v) : [...cur, v];
                    onSlicerChange(w.id, w.field ?? w.dimension, next);
                    w.selected = next;
                  }}
                  className="h-3 w-3 accent-[#b58900]"
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
      return (
        <div className="flex h-full flex-col justify-center px-2">
          <p className="truncate text-xl font-bold tracking-tight text-[#252423]">{fmtVal(total, money)}</p>
          <p className="truncate text-[10px] text-[#605e5c]">{w.agg.toUpperCase()} of {ds.columns.find((c) => c.key === w.measure)?.name}</p>
        </div>
      );
    }
    if (w.type === "kpi2") {
      const data = [...aggregate(ds, w, pageFilters, cross)].sort((a, b) => b.value - a.value);
      const total = data.reduce((su, d) => su + d.value, 0);
      const target = data.length ? total / data.length : 0;
      const delta = target ? ((total - target * data.length) / Math.max(1, target * data.length)) * 100 : 0;
      const good = total >= target * Math.max(1, data.length) * 0.98;
      const spark = data.slice(0, 12).reverse();
      return (
        <div className="flex h-full flex-col px-2 pb-1 pt-1.5">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-lg font-bold tracking-tight text-[#252423]">{fmtVal(total, money)}</span>
            <span className="flex items-center gap-0.5 text-[10.5px] font-bold" style={{ color: good ? "#107c10" : "#d13438" }}>
              {good ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
            </span>
          </div>
          <p className="truncate text-[9.5px] text-[#605e5c]">
            Target {fmtVal(target * Math.max(1, data.length), money)} · {w.agg.toUpperCase()} of {ds.columns.find((c) => c.key === w.measure)?.name}
          </p>
          <div className="mt-auto h-[34%] min-h-[24px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                <Line type="monotone" dataKey="value" stroke={good ? "#107c10" : "#d13438"} strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    if (w.type === "waterfall") {
      const data = [...aggregate(ds, w, pageFilters, cross)].sort((a, b) => b.value - a.value).slice(0, w.topN || 8);
      const grand = data.reduce((su, d) => su + d.value, 0);
      const rows: { name: string; base: number; delta: number; kind: "first" | "pos" | "neg" | "total" }[] = [];
      let cum = 0;
      data.forEach((d, i) => {
        const start = cum;
        cum += d.value;
        rows.push({ name: d.label, base: Math.min(start, cum), delta: Math.abs(d.value), kind: i === 0 ? "first" : d.value >= 0 ? "pos" : "neg" });
      });
      rows.push({ name: "Total", base: 0, delta: Math.abs(grand), kind: "total" });
      const colorOf = (k: string) => (k === "first" ? "#118DFF" : k === "pos" ? "#12239E" : k === "neg" ? "#d13438" : "#252423");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 24 : 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} interval={0} angle={rows.length > 5 ? -16 : 0} height={rows.length > 5 ? 38 : 18} textAnchor={rows.length > 5 ? "end" : "middle"} />
            <YAxis tick={axisTick} tickFormatter={fmtNum} width={46} />
            <RTooltip
              formatter={(_v: number, _n: string, p: unknown) => {
                const row = (p as { payload?: { kind?: string; base?: number; delta?: number } })?.payload;
                if (!row || typeof row.delta !== "number" || typeof row.base !== "number") return "";
                return row.kind === "total" ? `Total: ${fmtVal(row.delta, money)}` : `${fmtVal(row.delta, money)} (running ${fmtVal(row.base + row.delta, money)})`;
              }}
              contentStyle={{ fontSize: 11 }}
            />
            {f.legend !== false && <Legend wrapperStyle={{ fontSize: 9.5 }} />}
            <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="delta" stackId="wf" radius={[2, 2, 0, 0]} cursor="pointer" isAnimationActive={false}
              onClick={(e: { payload?: { name?: string; kind?: string } }) => { const nm = e?.payload?.name; if (nm && nm !== "Total") onCrossToggle(w.dimension, nm, w.id); }}>
              {rows.map((row, i) => <Cell key={i} fill={colorOf(row.kind)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "gauge") {
      const data = aggregate(ds, w, pageFilters, cross);
      const total = data.reduce((s, d) => s + d.value, 0);
      const maxv = Math.max(total * 1.25, 1);
      return (
        <div className="relative h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="66%"
              outerRadius="98%"
              data={[{ name: "value", value: total, fill: palette[(w.color ?? 0) % palette.length] }]}
              startAngle={200}
              endAngle={-20}
            >
              <PolarAngleAxis type="number" domain={[0, maxv]} tick={false} axisLine={false} />
              <RadialBar dataKey="value" background={{ fill: "#f0f0f0" }} cornerRadius={6} isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
            <span className="text-[15px] font-bold text-[#252423]">{fmtVal(total, money)}</span>
            <span className="text-[9px] text-[#605e5c]">{ds.columns.find((c) => c.key === w.measure)?.name}</span>
          </div>
        </div>
      );
    }
    if (w.type === "table" || w.type === "matrix") {
      const data = aggregate(ds, w, pageFilters, cross);
      const total = data.reduce((s, d) => s + d.value, 0);
      return (
        <div className="h-full overflow-auto">
          <table className="w-full text-left text-[10.5px]">
            <thead className="sticky top-0" style={{ background: "#f3f2f1" }}>
              <tr>
                <th className="px-1.5 py-1 font-semibold text-[#605e5c]">{ds.columns.find((c) => c.key === w.dimension)?.name}</th>
                <th className="px-1.5 py-1 text-right font-semibold text-[#605e5c]">{w.agg} {ds.columns.find((c) => c.key === w.measure)?.name}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "#f0f0f0" }}>
                  <td className="max-w-[120px] truncate px-1.5 py-0.5 text-[#3b3a39]">{d.label}</td>
                  <td className="px-1.5 py-0.5 text-right font-mono text-[#3b3a39]">{fmtVal(d.value, money)}</td>
                </tr>
              ))}
              {w.type === "matrix" && data.length > 1 && (
                <tr style={{ background: "#f3f2f1", fontWeight: 700 }}>
                  <td className="px-1.5 py-1 text-[#252423]">Total</td>
                  <td className="px-1.5 py-1 text-right font-mono text-[#252423]">{fmtVal(total, money)}</td>
                </tr>
              )}
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" />
            <XAxis dataKey="x" name={ds.columns.find((c) => c.key === w.measure)?.name} tick={axisTick} tickFormatter={fmtNum} />
            <YAxis dataKey="y" name={ds.columns.find((c) => c.key === (w.measure2 ?? w.measure))?.name} tick={axisTick} tickFormatter={fmtNum} width={48} />
            <RTooltip formatter={(v: number, nm) => `${nm}: ${fmtNum(v)}`} labelFormatter={() => ""} contentStyle={{ fontSize: 11 }} />
            {f.legend !== false && <Legend wrapperStyle={{ fontSize: 9.5 }} />}
            <Scatter name={w.title} data={data} fill={palette[(w.color ?? 0) % palette.length]} onClick={(_: unknown, i: number) => { const d = data[i]; if (d) onCrossToggle(w.dimension, d.name, w.id); }} cursor="pointer" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "treemap") {
      const data = aggregate(ds, w, pageFilters, cross);
      const chartData = data.map((d) => ({ name: d.label, value: d.value }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={chartData}
            dataKey="value"
            isAnimationActive={false}
            content={<TreemapCell palette={palette} money={money} />}
            onClick={(e: { name?: string }) => { if (e?.name) onCrossToggle(w.dimension, e.name, w.id); }}
          />
        </ResponsiveContainer>
      );
    }
    if (w.type === "funnel") {
      const data = aggregate(ds, w, pageFilters, cross);
      const chartData = data.map((d) => ({ name: d.label, value: d.value }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
            {f.legend !== false && <Legend wrapperStyle={{ fontSize: 9.5 }} />}
            <Funnel
              dataKey="value"
              nameKey="name"
              data={chartData}
              isAnimationActive={false}
              onClick={(e: { name?: string; payload?: { name?: string } }) => { const nm = e?.payload?.name ?? e?.name; if (nm) onCrossToggle(w.dimension, nm, w.id); }}
              cursor="pointer"
            >
              {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    }
    const data = aggregate(ds, w, pageFilters, cross);
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
    const markClick = (entry: unknown) => {
      const e = entry as { name?: string; payload?: { name?: string; label?: string } };
      const nm = e?.payload?.name ?? e?.payload?.label ?? e?.name;
      if (nm) onCrossToggle(w.dimension, nm, w.id);
    };
    if (w.type === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...common} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 26 : 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} interval={0} angle={chartData.length > 6 ? -16 : 0} height={chartData.length > 6 ? 40 : 18} textAnchor={chartData.length > 6 ? "end" : "middle"} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
            <YAxis tick={axisTick} tickFormatter={fmtNum} width={46} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.measure)?.name, angle: -90, position: "insideLeft", fontSize: 9 } : undefined} />
            <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
            {legendNode}
            <Bar dataKey="value" radius={[2, 2, 0, 0]} cursor="pointer" onClick={markClick} label={f.dataLabels ? { position: "top", fontSize: 9, formatter: (v: number) => fmtVal(v, money) } : false}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" />
              <XAxis dataKey="name" tick={axisTick} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
              <YAxis tick={axisTick} tickFormatter={fmtNum} width={46} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.measure)?.name, angle: -90, position: "insideLeft", fontSize: 9 } : undefined} />
              <RTooltip formatter={(v: number) => fmtVal(v, money)} contentStyle={{ fontSize: 11 }} />
              {legendNode}
              <Line type="monotone" dataKey="value" stroke={colorFor(0)} strokeWidth={2.2} dot={false} cursor="pointer" onClick={markClick} activeDot={{ r: 4, onClick: markClick as unknown as (e: React.MouseEvent) => void }} label={f.dataLabels ? { fontSize: 8.5, formatter: (v: number) => fmtVal(v, money) } : false} />
            </LineChart>
          ) : (
            <AreaChart {...common} margin={{ top: 8, right: 8, bottom: f.axisTitles ? 26 : 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" />
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" />
          <XAxis dataKey="name" tick={axisTick} label={f.axisTitles ? { value: ds.columns.find((c) => c.key === w.dimension)?.name, position: "insideBottom", offset: -14, fontSize: 9 } : undefined} />
          <YAxis yAxisId="l" tick={axisTick} tickFormatter={fmtNum} width={46} />
          <YAxis yAxisId="r" orientation="right" tick={axisTick} tickFormatter={fmtNum} width={40} />
          <RTooltip formatter={(v: number) => fmtNum(v)} contentStyle={{ fontSize: 11 }} />
          {legendNode}
          <Bar yAxisId="l" dataKey="value" name={ds.columns.find((c) => c.key === w.measure)?.name} fill={palette[(w.color ?? 0) % palette.length]} radius={[2, 2, 0, 0]} cursor="pointer" />
          <Line yAxisId="r" type="monotone" dataKey="line" name={ds.columns.find((c) => c.key === (w.measure2 ?? w.measure))?.name} stroke={palette[2 % palette.length]} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  })();

  return (
    <div
      className={`absolute flex flex-col bg-white transition-shadow ${!selected ? "hover:shadow-md" : ""} ${dimmed ? "opacity-80" : ""}`}
      style={{
        left: `${w.x}%`, top: `${w.y}%`, width: `${w.w}%`, height: `${w.h}%`,
        border: selected ? "2px solid #118DFF" : "1px solid #dcdcdc",
        boxShadow: selected ? "0 2px 10px rgba(17,141,255,0.25)" : "0 1px 2px rgba(0,0,0,0.06)",
        background: f.bg,
      }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* header */}
      <div
        className="flex cursor-move items-center gap-1 border-b px-2 py-1"
        style={{ borderColor: "#f0f0f0" }}
        onMouseDown={onMouseDownHeader}
        title="Drag to move this visual"
      >
        <Move className="h-2.5 w-2.5 shrink-0 text-[#d0d0d0]" />
        {w.showTitle !== false && (
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-[#252423]" style={{ fontSize: f.titleSize ? `${f.titleSize}px` : undefined }}>
            {w.title}
          </span>
        )}
        <span className="flex shrink-0 items-center gap-0.5">
          {onFocus && <button className="rounded p-0.5 text-[#a19f9d] hover:bg-[#f3f2f1] hover:text-[#252423]" title="Focus mode — zoom this visual full screen (like Power BI)" onClick={(e) => { e.stopPropagation(); onFocus(); }}><Maximize2 className="h-2.5 w-2.5" /></button>}
          <button className="rounded p-0.5 text-[#a19f9d] hover:bg-[#f3f2f1] hover:text-[#252423]" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-2.5 w-2.5" /></button>
          <button className="rounded p-0.5 text-[#a19f9d] hover:bg-[#fdf3f4] hover:text-[#a4262c]" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Trash2 className="h-3 w-3" /></button>
        </span>
      </div>
      {/* body */}
      <div className="min-h-0 flex-1 p-1">{body}</div>
      {/* selection handles — Power BI style */}
      {selected && (
        <>
          {([[0, 0], [50, 0], [100, 0], [0, 50], [100, 50], [0, 100], [50, 100], [100, 100]] as [number, number][]).map(([px, py]) => (
            <span
              key={`${px}-${py}`}
              className="pointer-events-none absolute z-10 h-[7px] w-[7px] rounded-full border bg-white"
              style={{ left: `${px}%`, top: `${py}%`, transform: "translate(-50%, -50%)", borderColor: "#118DFF" }}
            />
          ))}
        </>
      )}
      {/* resize handle */}
      <span
        onMouseDown={(e) => onResizeStart(e)}
        className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize"
        title="Drag to resize"
        style={{
          background: selected
            ? "linear-gradient(135deg, transparent 50%, #118DFF 50%)"
            : "linear-gradient(135deg, transparent 50%, #c8c8c8 50%)",
        }}
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
  const isChart = !["kpi", "slicer", "table", "matrix", "textbox", "shape", "gauge"].includes(w.type);
  return (
    <div className="max-h-[420px] space-y-3 overflow-auto p-2.5 scrollbar-thin">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">General — position &amp; size</p>
      <div className="grid grid-cols-4 gap-1.5">
        {([["X", "x"], ["Y", "y"], ["W", "w"], ["H", "h"]] as const).map(([lbl, k]) => (
          <label key={k} className="text-[9px] font-semibold uppercase text-[#605e5c]">
            {lbl}
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(w[k])}
              onChange={(e) => onGeom({ [k]: Math.max(0, Math.min(100, +e.target.value || 0)) } as Partial<Widget>)}
              className="mt-0.5 h-6 w-full rounded-[3px] border border-[#d2d0ce] bg-white px-1 text-[10.5px]"
            />
          </label>
        ))}
      </div>
      {w.type === "textbox" && (
        <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Text</p>
          <textarea
            value={w.text ?? ""}
            onChange={(e) => onWidget({ text: e.target.value })}
            rows={5}
            className="w-full rounded-[3px] border border-[#d2d0ce] bg-white p-2 text-[12px] outline-none focus:border-[#118DFF]"
          />
        </div>
      )}
      <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Title</p>
        <label className="mb-1.5 flex items-center gap-2 text-[11.5px]">
          <Checkbox checked={w.showTitle !== false} onCheckedChange={(v) => onWidget({ showTitle: !!v })} className="accent-[#b58900]" />
          Show title
        </label>
        <Input value={w.title} onChange={(e) => onWidget({ title: e.target.value })} className="h-7 border-[#d2d0ce] bg-white text-[11.5px]" placeholder="Title text" />
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[9.5px] font-semibold uppercase text-[#605e5c]">Size</span>
          <input type="range" min={9} max={16} value={f.titleSize ?? 12} onChange={(e) => on({ titleSize: +e.target.value })} className="h-1 flex-1 accent-[#b58900]" />
        </div>
      </div>
      {isChart && (
        <>
          <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Legend</p>
            <label className="flex items-center gap-2 text-[11.5px]">
              <Checkbox checked={f.legend !== false} onCheckedChange={(v) => on({ legend: !!v })} className="accent-[#b58900]" />
              Show legend
            </label>
            {f.legend !== false && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(["top", "bottom", "left", "right"] as const).map((p) => (
                  <button key={p} onClick={() => on({ legendPos: p })}
                    className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold capitalize"
                    style={{
                      background: f.legendPos === p ? "#FDF0D1" : "transparent",
                      color: f.legendPos === p ? "#8a6d00" : "#605e5c",
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Data labels</p>
            <label className="flex items-center gap-2 text-[11.5px]">
              <Checkbox checked={!!f.dataLabels} onCheckedChange={(v) => on({ dataLabels: !!v })} className="accent-[#b58900]" />
              Show values on the visual
            </label>
          </div>
          <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Axis titles</p>
            <label className="flex items-center gap-2 text-[11.5px]">
              <Checkbox checked={!!f.axisTitles} onCheckedChange={(v) => on({ axisTitles: !!v })} className="accent-[#b58900]" />
              Label the X and Y axes
            </label>
          </div>
        </>
      )}
      <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Data colors</p>
        <div className="flex flex-wrap gap-1.5">
          {palette.map((c, i) => (
            <button key={c} onClick={() => onWidget({ color: i })}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${w.color === i ? "border-[#252423]" : "border-transparent"}`}
              style={{ background: c }} aria-label={`Theme color ${i + 1}`} />
          ))}
        </div>
      </div>
      <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Effects</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-[#605e5c]">Background</span>
          <div className="flex gap-1">
            {["", "#fef9c3", "#dbeafe", "#dcfce7", "#fae8ff", "#e5e7eb"].map((c) => (
              <button key={c || "none"} onClick={() => on({ bg: c || undefined })}
                className={`h-4.5 w-4.5 rounded-full border ${f.bg === c ? "border-[#252423] ring-2 ring-[#b58900]/30" : "border-[#d2d0ce]"}`}
                style={{ background: c || "transparent" }} title={c || "Default"} />
            ))}
          </div>
        </div>
      </div>
      {w.type !== "slicer" && (
        <div className="border-t pt-2.5" style={{ borderColor: "#edebe9" }}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Visual-level filter</p>
          <Select value={w.filterCol || "__none"} onValueChange={(v) => onWidget({ filterCol: v === "__none" ? "" : v, filterVal: "" })}>
            <SelectTrigger className="h-7 w-full border-[#d2d0ce] bg-white text-[11px]"><SelectValue placeholder="No filter" /></SelectTrigger>
            <SelectContent className="border-[#e1dfdd] bg-white">
              <SelectItem value="__none">No filter</SelectItem>
              {dimCols.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {w.filterCol && (
            <Select value={w.filterVal || "__pick"} onValueChange={(v) => onWidget({ filterVal: v })}>
              <SelectTrigger className="mt-1.5 h-7 w-full border-[#d2d0ce] bg-white text-[11px]"><SelectValue placeholder="Pick value" /></SelectTrigger>
              <SelectContent className="max-h-48 border-[#e1dfdd] bg-white">
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
    <div className="p-3" style={{ background: MS.pbiSurface, minHeight: "58vh" }}>
      <div className="rounded-[4px] border bg-white" style={{ borderColor: "#c8c8c8" }}>
        <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#edebe9" }}>
          <span className="flex items-center gap-2 text-[12px] font-semibold"><Table2 className="h-3.5 w-3.5 text-[#b58900]" /> {ds.name}</span>
          <span className="text-[10.5px] text-[#605e5c]">click a column header for its summary</span>
        </div>
        <div className="max-h-[52vh] overflow-auto scrollbar-thin">
          <table className="w-full text-left text-[11.5px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {ds.columns.map((c) => (
                  <th key={c.key} onClick={() => setDataCol(dataCol === c.key ? null : c.key)}
                    className="cursor-pointer whitespace-nowrap border-b px-2.5 py-2 font-mono text-[11px] font-normal transition-colors"
                    style={{
                      background: dataCol === c.key ? "#FDF0D1" : "#f3f2f1",
                      color: dataCol === c.key ? "#8a6d00" : "#605e5c",
                      borderColor: "#e1dfdd",
                    }}>
                    <span className="mr-1 inline-block align-[-2px]">{THEME_ICON[c.type]}</span>
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b hover:bg-[#f8f8f8]" style={{ borderColor: "#f0f0f0" }}>
                  {ds.columns.map((c) => (
                    <td key={c.key} className="max-w-[180px] truncate whitespace-nowrap px-2.5 py-1 font-mono text-[#3b3a39]">
                      {c.type === "currency" && typeof r[c.key] === "number" ? `$${(r[c.key] as number).toFixed(2)}` : String(r[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-3 py-1.5 text-[10.5px] text-[#605e5c]" style={{ borderColor: "#edebe9", background: "#faf9f8" }}>
          Displayed rows: {rows.length.toLocaleString()} of {ds.rows.length.toLocaleString()} · grain check: one row = one {ds.id.includes("events") ? "event" : "record"}
        </div>
      </div>
      {stats && (
        <div className="mt-3 rounded-[4px] border bg-white p-3" style={{ borderColor: "#c8c8c8" }}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Column summary — {stats.name}</p>
          {stats.kind === "numeric" ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4 lg:grid-cols-7">
              {([["Count", stats.count], ["Distinct", stats.distinct], ["Sum", fmtNum(stats.sum)], ["Average", fmtNum(stats.avg)], ["Min", fmtNum(stats.min)], ["Median", fmtNum(stats.median)], ["Max", fmtNum(stats.max)]] as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-[#605e5c]">{k}</span>
                  <span className="font-mono text-[#252423]">{v.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4">
              <div className="flex justify-between"><span className="text-[#605e5c]">Count</span><span className="font-mono">{stats.count.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#605e5c]">Distinct</span><span className="font-mono">{stats.distinct}</span></div>
              {stats.top.map(([v, n]) => (
                <div key={v} className="flex justify-between gap-2"><span className="max-w-[140px] truncate text-[#605e5c]">{v}</span><span className="font-mono">{n}</span></div>
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
  const { daxMeasures } = useAcademy();
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
    <div className="p-3" style={{ background: MS.pbiSurface, minHeight: "58vh" }}>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[4px] border bg-white" style={{ borderColor: "#c8c8c8" }}>
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#edebe9" }}>
            <span className="flex items-center gap-2 text-[12px] font-semibold"><Table2 className="h-3.5 w-3.5 text-[#b58900]" /> {ds.name.split(" (")[0]}</span>
            <span className="text-[10px] text-[#605e5c]">fact table</span>
          </div>
          <div className="p-2">
            <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">{ds.columns.length} fields · {ds.rows.length.toLocaleString()} rows</p>
            {ds.columns.map((c) => (
              <div key={c.key} className="flex items-center gap-2 rounded-[3px] px-2 py-1 text-[12px] hover:bg-[#f3f2f1]">
                {THEME_ICON[c.type] ?? <Type className="h-3 w-3" />}
                <span className="min-w-0 flex-1 truncate font-mono text-[#3b3a39]">{c.name}</span>
                <span className="text-[9.5px] uppercase text-[#a19f9d]">{c.type}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[4px] border bg-white" style={{ borderColor: "#c8c8c8" }}>
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#edebe9" }}>
            <span className="flex items-center gap-2 text-[12px] font-semibold"><Sigma className="h-3.5 w-3.5 text-[#0f6cbd]" /> Measures</span>
          </div>
          <div className="p-2">
            {measures.length ? measures.map(([m, t]) => (
              <div key={m} className="flex items-center gap-2 rounded-[3px] px-2 py-1 text-[12px]">
                <Sigma className="h-3 w-3 text-[#0f6cbd]" />
                <span className="min-w-0 flex-1 truncate font-mono text-[#3b3a39]">{m}</span>
                <span className="text-[9.5px] uppercase text-[#a19f9d]">{t}</span>
              </div>
            )) : <p className="p-2 text-[11.5px] leading-snug text-[#605e5c]">Add visuals with value fields — each one creates an implicit measure (Sum of Revenue, Average of Units…) that shows up here, just like Power BI&apos;s model view.</p>}
            {daxMeasures.length > 0 && (
              <>
                <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#605e5c]">Your DAX measures (Modeling ▸ New Measure)</p>
                {daxMeasures.map((m) => (
                  <div key={m.name} className="flex items-center gap-2 rounded-[3px] px-2 py-1 text-[12px]">
                    <Sigma className="h-3 w-3 text-[#b58900]" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[#3b3a39]">{m.name}</span>
                    <span className="text-[9.5px] text-[#a19f9d]">DAX</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="rounded-[4px] border bg-white" style={{ borderColor: "#c8c8c8" }}>
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#edebe9" }}>
            <span className="flex items-center gap-2 text-[12px] font-semibold"><Link2 className="h-3.5 w-3.5 text-[#0f6cbd]" /> Relationships</span>
          </div>
          <div className="space-y-2 p-3 text-[12.5px] leading-relaxed text-[#605e5c]">
            <p>This report has a single flat fact table — one row per transaction/event. That is the simplest (and most common) BI model.</p>
            <p>Real models add <b className="text-[#252423]">dimension tables</b> (Date, Products, Customers) related 1→* to the fact table. Try the <b className="text-[#252423]">SQL Playground</b>: its schema browser shows a real 5-table star schema with relationships.</p>
            <p className="rounded-[4px] border px-2.5 py-1.5 text-[11.5px]" style={{ borderColor: "#c7e0f4", background: "#f3f9fd", color: "#0f3b5e" }}>
              Grain check: confirm one row = one event (one order line, one transaction). Everything in the model — filters, measures, relationships — depends on it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= field well ================= */
function Well({ label, value, onChange, cols, agg, onAgg }: {
  label: string; value: string; onChange: (v: string) => void; cols: Dataset["columns"]; agg?: Agg; onAgg?: (a: Agg) => void;
}) {
  const col = cols.find((c) => c.key === value) ?? cols[0];
  return (
    <div>
      <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-[#605e5c]">{label}</label>
      <div className="flex gap-1">
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-7 flex-1 border-[#d2d0ce] bg-white text-[11.5px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <Sigma className={`h-3 w-3 shrink-0 ${col && (col.type === "number" || col.type === "currency") ? "text-[#0f6cbd]" : "text-[#a19f9d]"}`} />
              <SelectValue placeholder="Pick a field" />
            </span>
          </SelectTrigger>
          <SelectContent className="border-[#e1dfdd] bg-white">
            {cols.map((c) => <SelectItem key={c.key} value={c.key} className="text-[12px]">{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {agg && onAgg && (
          <Select value={agg} onValueChange={(v) => onAgg(v as Agg)}>
            <SelectTrigger className="h-7 w-[74px] shrink-0 border-[#d2d0ce] bg-white text-[10.5px]" title="Aggregation"><SelectValue /></SelectTrigger>
            <SelectContent className="border-[#e1dfdd] bg-white">
              {(["sum", "avg", "count", "min", "max"] as Agg[]).map((a) => <SelectItem key={a} value={a} className="uppercase text-[11.5px]">{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
