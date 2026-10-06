"use client";

/* Dashboard Studio — Power BI-style report builder.
   Report / Data / Model views, Visualizations + Fields panes, field wells,
   page tabs with multi-page support, slicers that filter the whole page,
   KPI cards, bar/line/area/pie/donut/table visuals, saved dashboards, JSON export. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolHeader, PANEL, PANEL_HEAD, fmtMoney, fmtNum, DatasetPicker, downloadDatasetCSV } from "./shared";
import { Coach } from "./Coach";
import { useAcademy, type SavedDashboard } from "@/lib/academy/store";
import { getDatasetById, downloadFile, type Dataset, type Row } from "@/lib/academy/datasets";
import {
  BarChart3, ChartPie, ChevronLeft, ChevronRight, Columns3, Download, Gauge, LayoutDashboard,
  LineChart as LineIcon, Link2, Plus, Save, Sigma, SlidersHorizontal, Sparkles, Table2, Trash2, TrendingUp, Copy, Activity, Undo2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ScatterChart, Scatter, ComposedChart,
} from "recharts";

/* ================= model ================= */
type Agg = "sum" | "avg" | "count" | "min" | "max";
type WType = "kpi" | "bar" | "line" | "area" | "pie" | "donut" | "scatter" | "combo" | "table" | "slicer";
type WSize = "sm" | "md" | "lg";

interface Widget {
  id: string;
  type: WType;
  title: string;
  dimension: string;
  measure: string;
  /** second measure — used by scatter (Y axis) and combo (line series) */
  measure2?: string;
  agg: Agg;
  topN: number;
  filterCol: string;
  filterVal: string;
  color?: number;
  showTitle?: boolean;
  /** canvas footprint */
  size?: WSize;
  /** slicer only */
  field?: string;
  selected?: string[];
}

interface Page {
  id: string;
  name: string;
  widgets: Widget[];
}

interface DashState {
  name: string;
  datasetId: string;
  pages: Page[];
}

const PALETTE = ["#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6", "#f97316", "#22c55e", "#ef4444"];
const PALETTE_SOFT = PALETTE.map((c) => c);

const WTYPE_META: Record<WType, { label: string; icon: React.ReactNode; blurb: string }> = {
  kpi: { label: "Card (KPI)", icon: <Gauge className="h-4 w-4" />, blurb: "One big number — the 5-second layer" },
  bar: { label: "Clustered bar", icon: <BarChart3 className="h-4 w-4" />, blurb: "Compare categories side by side" },
  line: { label: "Line chart", icon: <LineIcon className="h-4 w-4" />, blurb: "Trend over time" },
  area: { label: "Area chart", icon: <TrendingUp className="h-4 w-4" />, blurb: "Volume over time" },
  pie: { label: "Pie chart", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole (≤5 slices)" },
  donut: { label: "Donut chart", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole with a center gap" },
  scatter: { label: "Scatter plot", icon: <Activity className="h-4 w-4" />, blurb: "Relationship between two measures" },
  combo: { label: "Bar + line combo", icon: <TrendingUp className="h-4 w-4" />, blurb: "Two measures, two scales — Power BI classic" },
  table: { label: "Table", icon: <Table2 className="h-4 w-4" />, blurb: "The 5-minute detail layer" },
  slicer: { label: "Slicer", icon: <SlidersHorizontal className="h-4 w-4" />, blurb: "Filters every visual on this page" },
};

const SIZE_CLS: Record<WSize, string> = { sm: "xl:col-span-1", md: "xl:col-span-1", lg: "xl:col-span-2" };

function newWidget(type: WType, ds: Dataset): Widget {
  const numericCols = ds.columns.filter((c) => c.type === "number" || c.type === "currency");
  const dimCols = ds.columns.filter((c) => c.type === "text" || c.type === "date");
  const w: Widget = {
    id: `w_${Math.random().toString(36).slice(2, 9)}`,
    type,
    title: WTYPE_META[type].label,
    dimension: dimCols[0]?.key ?? ds.columns[0].key,
    measure: numericCols[0]?.key ?? ds.columns[0].key,
    agg: "sum",
    topN: type === "pie" || type === "donut" ? 5 : type === "kpi" || type === "slicer" ? 0 : 7,
    filterCol: "",
    filterVal: "",
    color: 0,
    showTitle: true,
    size: "md",
  };
  if (type === "kpi") w.title = numericCols[0]?.name ?? "Total";
  if (type === "slicer") { w.field = dimCols[0]?.key ?? ds.columns[0].key; w.title = "Slicer"; w.selected = []; }
  if (type === "line" || type === "area") {
    const dateCol = ds.columns.find((c) => c.type === "date");
    if (dateCol) w.dimension = dateCol.key;
  }
  if (type === "scatter" || type === "combo") {
    w.measure2 = numericCols[1]?.key ?? numericCols[0]?.key ?? ds.columns[0].key;
    if (type === "combo") w.title = "Revenue and orders";
  }
  return w;
}

/* ================= aggregation ================= */
interface PageFilter { col: string; values: string[] }

function applyFilters(rows: Row[], w: Widget, pageFilters: PageFilter[]): Row[] {
  let out = rows;
  if (w.filterCol && w.filterVal) {
    out = out.filter((r) => String(r[w.filterCol] ?? "").trim().toLowerCase() === w.filterVal.trim().toLowerCase());
  }
  for (const f of pageFilters) {
    if (f.values.length) {
      const set = new Set(f.values.map((v) => String(v).trim().toLowerCase()));
      out = out.filter((r) => set.has(String(r[f.col] ?? "").trim().toLowerCase()));
    }
  }
  return out;
}

function aggregate(ds: Dataset, w: Widget, pageFilters: PageFilter[] = []): { label: string; value: number }[] {
  const rows = applyFilters(ds.rows, w, pageFilters);
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
    else if (w.agg === "sum") value = rows.reduce((s, r) => s + measureNum(r), 0);
    else if (w.agg === "avg") value = rows.length ? rows.reduce((s, r) => s + measureNum(r), 0) / rows.length : 0;
    else if (w.agg === "min") value = rows.length ? Math.min(...rows.map(measureNum)) : 0;
    else value = rows.length ? Math.max(...rows.map(measureNum)) : 0;
    return [{ label: w.title, value: +value.toFixed(2) }];
  }
  let out = [...groups.entries()].map(([label, rs]) => {
    let value: number;
    if (w.agg === "count") value = rs.length;
    else if (w.agg === "sum") value = rs.reduce((s, r) => s + measureNum(r), 0);
    else if (w.agg === "avg") value = rs.length ? rs.reduce((s, r) => s + measureNum(r), 0) / rs.length : 0;
    else if (w.agg === "min") value = Math.min(...rs.map(measureNum));
    else value = Math.max(...rs.map(measureNum));
    let value2: number | undefined;
    if (w.measure2) {
      const m2 = (r: Row) => {
        const v = r[w.measure2!];
        const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
        return isNaN(n) ? 0 : n;
      };
      value2 = w.agg === "count" ? rs.length
        : w.agg === "sum" ? rs.reduce((s, r) => s + m2(r), 0)
        : w.agg === "avg" ? (rs.length ? rs.reduce((s, r) => s + m2(r), 0) / rs.length : 0)
        : w.agg === "min" ? Math.min(...rs.map(m2))
        : Math.max(...rs.map(m2));
      value2 = +value2.toFixed(2);
    }
    return { label, value: +value.toFixed(2), ...(value2 !== undefined ? { value2 } : {}) };
  });
  if (w.type !== "line" && w.type !== "area" && w.type !== "combo") out.sort((a, b) => b.value - a.value);
  else out.sort((a, b) => a.label.localeCompare(b.label));
  if (w.topN > 0) out = out.slice(0, w.topN);
  return out;
}

const fmtVal = (v: number, money: boolean) => (money ? fmtMoney(v) : fmtNum(v));

/* ================= component ================= */
const BI_MISSION = [
  { id: "data", label: "Pick a dataset", detail: "Start with **Retail Sales 2025 (Clean)** — or try the 6,000-row **Web Server Logs** for a big-file test." },
  { id: "sample", label: "Load the sample report", detail: "Click **Sample report** to see a finished 2-page executive dashboard, then tear it apart." },
  { id: "kpi", label: "Add 3 KPI cards", detail: "Cards are the 5-second layer: total revenue, order count, average order value. Click **Card** in Visualizations." },
  { id: "trend", label: "Chart the trend", detail: "Add a **Line chart** with `order_date` on Axis and revenue on Values — look for the seasonal spike." },
  { id: "slice", label: "Cut with a slicer", detail: "Add a **Slicer** on region — notice how every visual on the page filters together. That's page-level filtering." },
  { id: "fields", label: "Bind fields like Power BI", detail: "Select a visual, then click fields in the **Fields pane** — dimensions go to Axis, numbers go to Values." },
  { id: "insight", label: "Title with the insight", detail: "Rename a chart from “Revenue by region” to “West leads revenue; East lags 18%”. Titles should pass the so-what test." },
  { id: "save", label: "Save + export", detail: "**Save** keeps it in your browser; **Export JSON** downloads the report definition for your portfolio." },
];

export function DashboardTool() {
  const { dashboards, saveDashboard, deleteDashboard } = useAcademy();
  const [datasetId, setDatasetId] = React.useState("clean_sales");
  const [name, setName] = React.useState("My Executive Report");
  const [pages, setPages] = React.useState<Page[]>([{ id: "p1", name: "Page 1", widgets: [] }]);
  const [activePage, setActivePage] = React.useState(0);
  const [view, setView] = React.useState<"report" | "data" | "model">("report");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [renamingPage, setRenamingPage] = React.useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = React.useState("");
  const [dataPageIdx, setDataPageIdx] = React.useState(0);
  const ds = getDatasetById(datasetId)!;

  const numericCols = ds.columns.filter((c) => c.type === "number" || c.type === "currency");
  const dimCols = ds.columns.filter((c) => c.type === "text" || c.type === "date");

  /* reset when dataset changes */
  React.useEffect(() => {
    setPages((ps) => ps.map((p) => ({ ...p, widgets: [] })));
    setSelectedId(null);
    setDataPageIdx(0);
  }, [datasetId]);

  const page = pages[Math.min(activePage, pages.length - 1)] ?? pages[0];
  const updatePage = (patch: Partial<Page>) =>
    setPages((ps) => ps.map((p, i) => (i === activePage ? { ...p, ...patch } : p)));

  const selected = page.widgets.find((w) => w.id === selectedId) ?? null;

  /* page filters from slicers (excluding the widget's own slicer values) */
  const pageFilters: PageFilter[] = React.useMemo(
    () =>
      page.widgets
        .filter((w) => w.type === "slicer" && w.field && (w.selected?.length ?? 0) > 0)
        .map((w) => ({ col: w.field!, values: w.selected! })),
    [page]
  );

  const update = (id: string, patch: Partial<Widget>) =>
    updatePage({ widgets: page.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) });

  /* undo — Power BI has it, so do we (Ctrl+Z works too) */
  const undoStack = React.useRef<Page[][]>([]);
  const pushUndo = () => {
    undoStack.current = [...undoStack.current.slice(-24), pages.map((p) => ({ ...p, widgets: [...p.widgets] }))];
  };
  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) {
      setPages(prev);
      setActivePage((a) => Math.min(a, prev.length - 1));
      setSelectedId(null);
    }
  };
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && view === "report") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const addWidget = (type: WType) => {
    pushUndo();
    const w = newWidget(type, ds);
    updatePage({ widgets: [...page.widgets, w] });
    setSelectedId(w.id);
  };

  const removeWidget = (id: string) => {
    pushUndo();
    updatePage({ widgets: page.widgets.filter((w) => w.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const moveWidget = (id: string, dir: -1 | 1) => {
    const idx = page.widgets.findIndex((w) => w.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= page.widgets.length) return;
    const ws = [...page.widgets];
    [ws[idx], ws[to]] = [ws[to], ws[idx]];
    updatePage({ widgets: ws });
  };

  const duplicateWidget = (id: string) => {
    const w = page.widgets.find((x) => x.id === id);
    if (!w) return;
    const copy = { ...w, id: `w_${Math.random().toString(36).slice(2, 9)}` };
    updatePage({ widgets: [...page.widgets, copy] });
    setSelectedId(copy.id);
  };

  const addPage = () => {
    const p: Page = { id: `p_${Math.random().toString(36).slice(2, 6)}`, name: `Page ${pages.length + 1}`, widgets: [] };
    setPages((ps) => [...ps, p]);
    setActivePage(pages.length);
    setSelectedId(null);
  };

  const deletePage = (idx: number) => {
    if (pages.length <= 1) return;
    setPages((ps) => ps.filter((_, i) => i !== idx));
    setActivePage((a) => Math.max(0, a >= idx ? a - 1 : a));
    setSelectedId(null);
  };

  const sampleReport = () => {
    const mk = (w: Partial<Widget> & { type: WType }): Widget => ({ ...newWidget(w.type, ds), ...w, id: `s_${Math.random().toString(36).slice(2, 9)}` });
    const has = (k: string) => ds.columns.some((c) => c.key === k);
    setPages([
      {
        id: "sp1", name: "Executive Summary",
        widgets: [
          ...(has("revenue") ? [
            mk({ type: "kpi", title: "Total Revenue", measure: "revenue", agg: "sum" }),
            mk({ type: "kpi", title: "Orders", measure: has("order_id") ? "order_id" : "revenue", agg: "count" }),
            mk({ type: "kpi", title: "Avg Order Value", measure: "revenue", agg: "avg" }),
          ] : [mk({ type: "kpi", title: "Total Rows", agg: "count", measure: ds.columns[0].key })]),
          ...(has("order_date") && has("revenue") ? [mk({ type: "line", title: "Monthly revenue — watch the seasonality", dimension: "order_date", measure: "revenue", agg: "sum", topN: 0 })] : []),
          ...(has("revenue") ? [mk({ type: "bar", title: "Revenue by region", dimension: has("region") ? "region" : ds.columns[0].key, measure: "revenue" })] : []),
          ...(has("category") && has("revenue") ? [mk({ type: "donut", title: "Revenue mix by category", dimension: "category", measure: "revenue" })] : []),
        ],
      },
      {
        id: "sp2", name: "Deep Dive",
        widgets: [
          ...(has("region") ? [mk({ type: "slicer", title: "Region", field: "region" })] : []),
          ...(has("product") && has("revenue") ? [mk({ type: "bar", title: "Top 10 products", dimension: "product", measure: "revenue", topN: 10 })] : []),
          ...(has("revenue") ? [mk({ type: "table", title: "Detail", dimension: has("region") ? "region" : ds.columns[0].key, measure: "revenue", topN: 15 })] : []),
        ],
      },
    ]);
    setActivePage(0);
    setSelectedId(null);
    setName("Sample Executive Report");
  };

  const save = () => {
    const d: SavedDashboard = {
      id: `dash_${Date.now()}`,
      name,
      datasetId,
      widgets: pages[0]?.widgets ?? [],
      pages: pages as unknown[],
      createdAt: new Date().toISOString(),
    };
    saveDashboard(d);
  };

  const loadSaved = (d: SavedDashboard) => {
    setDatasetId(d.datasetId);
    setName(d.name);
    if (Array.isArray(d.pages) && d.pages.length) {
      setPages(d.pages as Page[]);
      setActivePage(0);
    } else {
      setPages([{ id: "p1", name: "Page 1", widgets: (d.widgets as Widget[]) ?? [] }]);
      setActivePage(0);
    }
    setSelectedId(null);
    setView("report");
  };

  const exportJson = () => {
    downloadFile(
      `${name.replace(/\s+/g, "_").toLowerCase()}.json`,
      JSON.stringify({ name, datasetId, pages }, null, 2),
      "application/json"
    );
  };

  /* ---------------- visual rendering ---------------- */
  const renderChart = (w: Widget) => {
    const data = aggregate(ds, w, pageFilters);
    const measureCol = ds.columns.find((c) => c.key === w.measure);
    const money = measureCol?.type === "currency" && w.agg !== "count";
    const axis = (tick: number) => (money ? fmtMoney(tick) : fmtNum(tick));
    const color = PALETTE[(w.color ?? 0) % PALETTE.length];
    const tooltipStyle: React.CSSProperties = {
      background: "var(--tooltip-bg)",
      border: "1px solid var(--tooltip-border)",
      borderRadius: 8,
      fontSize: 12,
      color: "var(--tooltip-text)",
    };

    if (w.type === "pie" || w.type === "donut") {
      const outer = w.type === "donut" ? 95 : 100;
      const inner = w.type === "donut" ? 58 : 0;
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={inner} outerRadius={outer} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE_SOFT[i % PALETTE_SOFT.length]} stroke="var(--background)" strokeWidth={2} />)}
            </Pie>
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)" }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "line" || w.type === "area") {
      const tooltip = <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} />;
      return (
        <ResponsiveContainer width="100%" height={260}>
          {w.type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} width={56} />
              {tooltip}
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} width={56} />
              {tooltip}
              <Area type="monotone" dataKey="value" stroke={color} fill={`${color}33`} strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      );
    }
    if (w.type === "table") {
      return (
        <div className="max-h-64 overflow-auto scrollbar-thin">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="border-b border-border px-3 py-2">{ds.columns.find((c) => c.key === w.dimension)?.name}</th><th className="border-b border-border px-3 py-2 text-right">{w.agg} {measureCol?.name}</th></tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-3 py-1.5 text-foreground/85">{d.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-700 dark:text-emerald-300">{fmtVal(d.value, money)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (w.type === "scatter") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis type="number" dataKey="value" name={measureCol?.name ?? "X"} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} />
            <YAxis type="number" dataKey="value2" name={ds.columns.find((c) => c.key === w.measure2)?.name ?? "Y"} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} width={56} />
            <RTooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} formatter={(v: number, n: string) => [fmtVal(v, n === (measureCol?.name ?? "X") ? money : false), n]} labelFormatter={() => ""} />
            <Scatter data={data} fill={color} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "combo") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 50 : 30} />
            <YAxis yAxisId="left" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} width={56} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--chart-axis)" }} />
            <Bar yAxisId="left" dataKey="value" name={measureCol?.name ?? "Values"} radius={[4, 4, 0, 0]} fill={color} />
            <Line yAxisId="right" type="monotone" dataKey="value2" name={ds.columns.find((c) => c.key === w.measure2)?.name ?? "Series 2"} stroke={PALETTE[(w.color ?? 0) + 3 % PALETTE.length]} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "slicer") return null;
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 50 : 30} />
          <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={axis} width={56} />
          <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} cursor={{ fill: "var(--chart-grid)" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE_SOFT[i % PALETTE_SOFT.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const SlicerCard = ({ w }: { w: Widget }) => {
    const field = w.field ?? dimCols[0]?.key ?? ds.columns[0].key;
    const values = React.useMemo(() => {
      const set = new Set<string>();
      for (const r of ds.rows) {
        const v = String(r[field] ?? "").trim();
        if (v) set.add(v);
      }
      return [...set].sort().slice(0, 60);
    }, [ds, field]);
    const sel = w.selected ?? [];
    const toggle = (v: string) => {
      const next = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
      update(w.id, { selected: next });
    };
    return (
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <Select value={field} onValueChange={(v) => update(w.id, { field: v, selected: [] })}>
            <SelectTrigger className="h-7 w-32 border-border bg-card text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="border-border bg-popover">
              {dimCols.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {sel.length > 0 && (
            <button className="text-[11px] text-muted-foreground underline hover:text-foreground" onClick={() => update(w.id, { selected: [] })}>
              Clear ({sel.length})
            </button>
          )}
        </div>
        <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto scrollbar-thin">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => toggle(v)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                sel.includes(v)
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">Selected values filter every visual on this page.</p>
      </div>
    );
  };

  const KpiCard = ({ w }: { w: Widget }) => {
    const data = aggregate(ds, w, pageFilters);
    const total = data.reduce((s, d) => s + d.value, 0);
    const measureCol = ds.columns.find((c) => c.key === w.measure);
    const money = measureCol?.type === "currency" && w.agg !== "count";
    const shareBase = aggregate(ds, { ...w, filterCol: "", filterVal: "" }, pageFilters.filter((f) => f.col !== w.filterCol)).reduce((s, d) => s + d.value, 0);
    return (
      <div
        className={`${PANEL} group relative cursor-pointer p-4 transition-shadow hover:shadow-md ${selectedId === w.id ? "outline outline-2 outline-offset-0 outline-emerald-500" : ""}`}
        onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}
      >
        <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateWidget(w.id); }}><Copy className="h-3 w-3" /></button>
          <button className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500" title="Remove" onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
        <p className="truncate pr-8 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{w.showTitle === false ? "" : w.title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{fmtVal(total, money)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{w.agg.toUpperCase()} of {measureCol?.name}</span>
          {shareBase > 0 && Math.abs(shareBase - total) > 0.01 && (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              {Math.round((total / shareBase) * 100)}% of total
            </span>
          )}
        </div>
      </div>
    );
  };

  /* ---------------- panes ---------------- */
  const VisualizationsPane = () => (
    <div className={`${PANEL} flex w-full shrink-0 flex-col lg:w-56`}>
      <div className={PANEL_HEAD}>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Sigma className="h-3.5 w-3.5 text-emerald-500" /> Visualizations</span>
      </div>
      <div className="border-b border-border p-2">
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(WTYPE_META) as WType[]).map((t) => (
            <TooltipProvider key={t} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => addWidget(t)}
                    className={`flex h-9 w-full items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-300 ${selected?.type === t ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-border"}`}
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
        <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-muted-foreground">Click a visual type to add it to the page{selected ? ", or to convert nothing — visuals are added, Power BI-style" : ""}.</p>
      </div>

      {/* field wells for selected visual */}
      {selected && selected.type !== "slicer" ? (
        <div className="space-y-2.5 border-b border-border p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Field wells — {WTYPE_META[selected.type].label}</p>
          <Well label={selected.type === "kpi" ? "Field" : selected.type === "scatter" ? "X axis (measure)" : "Axis"} value={selected.dimension} onChange={(v) => update(selected.id, { dimension: v })} cols={ds.columns} />
          <Well label={selected.type === "scatter" ? "Y axis (measure)" : "Values"} value={selected.measure} onChange={(v) => update(selected.id, { measure: v })} cols={ds.columns} />
          {(selected.type === "scatter" || selected.type === "combo") && (
            <Well label={selected.type === "combo" ? "Line series" : "Y axis (second measure)"} value={selected.measure2 ?? ""} onChange={(v) => update(selected.id, { measure2: v })} cols={ds.columns} />
          )}
          <div>
            <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Aggregation</label>
            <div className="flex flex-wrap gap-1">
              {(["sum", "avg", "count", "min", "max"] as Agg[]).map((a) => (
                <button key={a} onClick={() => update(selected.id, { agg: a })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${selected.agg === a ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          {selected.type !== "kpi" && (
            <div>
              <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Top N</label>
              <div className="flex flex-wrap gap-1">
                {[3, 5, 7, 10, 0].map((n) => (
                  <button key={n} onClick={() => update(selected.id, { topN: n })}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${selected.topN === n ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted"}`}>
                    {n === 0 ? "All" : n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Size on canvas</label>
            <div className="flex flex-wrap gap-1">
              {(["sm", "md", "lg"] as WSize[]).map((s) => (
                <button key={s} onClick={() => update(selected.id, { size: s })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${(selected.size ?? "md") === s ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted"}`}>
                  {s === "sm" ? "Small" : s === "md" ? "Medium" : "Large (full width)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* format pane */}
      {selected ? (
        <div className="space-y-2.5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Format</p>
          {selected.type !== "slicer" && (
            <>
              <label className="flex items-center gap-2 text-[11.5px] text-foreground/85">
                <input type="checkbox" checked={selected.showTitle !== false} onChange={(e) => update(selected.id, { showTitle: e.target.checked })} className="accent-emerald-500" />
                Show title
              </label>
              {selected.type !== "kpi" && selected.type !== "table" && (
                <div>
                  <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Data color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PALETTE.map((c, i) => (
                      <button key={c} onClick={() => update(selected.id, { color: i })}
                        className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${(selected.color ?? 0) % PALETTE.length === i ? "border-foreground" : "border-transparent"}`}
                        style={{ background: c }} aria-label={`Color ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Visual-level filter</label>
                <div className="flex gap-1.5">
                  <Select value={selected.filterCol || "__none"} onValueChange={(v) => update(selected.id, { filterCol: v === "__none" ? "" : v, filterVal: "" })}>
                    <SelectTrigger className="h-7 flex-1 border-border bg-card text-[11px]"><SelectValue placeholder="No filter" /></SelectTrigger>
                    <SelectContent className="border-border bg-popover">
                      <SelectItem value="__none">No filter</SelectItem>
                      {dimCols.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selected.filterCol && (
                  <Select value={selected.filterVal || "__pick"} onValueChange={(v) => update(selected.id, { filterVal: v })}>
                    <SelectTrigger className="mt-1.5 h-7 w-full border-border bg-card text-[11px]"><SelectValue placeholder="Pick value" /></SelectTrigger>
                    <SelectContent className="max-h-48 border-border bg-popover">
                      {[...new Set(ds.rows.map((r) => String(r[selected.filterCol])))].slice(0, 40).map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}
          <div className="flex gap-1.5 border-t border-border pt-2">
            <Button size="sm" variant="ghost" className="h-7 flex-1 px-2 text-[11px]" onClick={() => moveWidget(selected.id, -1)}><ChevronLeft className="h-3 w-3" /> Move</Button>
            <Button size="sm" variant="ghost" className="h-7 flex-1 px-2 text-[11px]" onClick={() => moveWidget(selected.id, 1)}>Move <ChevronRight className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-red-600 hover:bg-red-500/10 dark:text-red-300" onClick={() => removeWidget(selected.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      ) : (
        <p className="p-3 text-[11px] leading-snug text-muted-foreground">Select a visual on the canvas to edit its fields and format — exactly like Power BI&apos;s panes.</p>
      )}
    </div>
  );

  const FieldsPane = () => {
    const filtered = ds.columns.filter((c) => c.name.toLowerCase().includes(fieldSearch.toLowerCase()));
    return (
      <div className={`${PANEL} flex w-full shrink-0 flex-col lg:w-56`}>
        <div className={PANEL_HEAD}>
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Columns3 className="h-3.5 w-3.5 text-emerald-500" /> Fields</span>
          <span className="text-[10px] text-muted-foreground">{ds.rows.length.toLocaleString()} rows</span>
        </div>
        <div className="p-2">
          <Input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder="Search fields…" className="h-7 border-border bg-background/60 text-xs" />
        </div>
        <div className="max-h-[46vh] overflow-y-auto px-2 pb-2 lg:max-h-none scrollbar-thin">
          <p className="mb-1.5 flex items-center gap-1.5 px-1 font-mono text-[11px] font-semibold text-foreground"><Table2 className="h-3 w-3 text-emerald-500" /> {ds.id.replace(/_/g, "_")}</p>
          {filtered.map((c) => {
            const isNum = c.type === "number" || c.type === "currency";
            const bound = selected && (selected.dimension === c.key || selected.measure === c.key);
            return (
              <TooltipProvider key={c.key} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (!selected) return;
                        if (isNum && selected.type !== "slicer") update(selected.id, { measure: c.key });
                        else if (!isNum) {
                          if (selected.type === "slicer") update(selected.id, { field: c.key, selected: [] });
                          else update(selected.id, { dimension: c.key });
                        }
                      }}
                      className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11.5px] transition-colors ${bound ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-foreground/80 hover:bg-muted"}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isNum ? "bg-orange-400" : "bg-sky-400"}`} />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">{isNum ? "123" : c.type === "date" ? "date" : "abc"}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-[11px]">
                    {selected ? `Click to bind as ${isNum ? "Values" : "Axis"} on the selected visual` : "Select a visual first, then click fields to bind them"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---------------- data view ---------------- */
  const DATA_PAGE = 100;
  const dataRows = ds.rows.slice(dataPageIdx * DATA_PAGE, (dataPageIdx + 1) * DATA_PAGE);
  const dataPagesTotal = Math.ceil(ds.rows.length / DATA_PAGE);

  const columnSummary = React.useMemo(() => {
    const out: { key: string; name: string; kind: string; detail: string }[] = [];
    for (const c of ds.columns) {
      const vals = ds.rows.map((r) => r[c.key]);
      const nums = vals.map((v) => (typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,\s]/g, "")))).filter((n) => !isNaN(n)) as number[];
      if (nums.length > ds.rows.length * 0.5) {
        const sum = nums.reduce((s, n) => s + n, 0);
        out.push({ key: c.key, name: c.name, kind: "numeric", detail: `sum ${fmtNum(sum)} · avg ${fmtNum(sum / Math.max(1, nums.length))} · min ${fmtNum(Math.min(...nums))} · max ${fmtNum(Math.max(...nums))}` });
      } else {
        const distinct = new Set(vals.map((v) => String(v))).size;
        const top = [...vals.reduce((m, v) => { const k = String(v); m.set(k, (m.get(k) ?? 0) + 1); return m; }, new Map<string, number>())].sort((a, b) => b[1] - a[1])[0];
        out.push({ key: c.key, name: c.name, kind: "categorical", detail: `${distinct.toLocaleString()} distinct · most: ${top ? top[0] : "—"} (${top ? top[1] : 0})` });
      }
    }
    return out;
  }, [ds]);

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />}
        title="Dashboard Studio"
        subtitle="Power BI-style report builder — Report / Data / Model views, slicers, multi-page canvases."
        actions={
          <>
            <DatasetPicker value={datasetId} onPick={setDatasetId} />
            <Button variant="outline" size="sm" className="border-border" onClick={sampleReport}><Sparkles className="h-4 w-4" /> Sample report</Button>
          </>
        }
      />

      {/* ribbon bar */}
      <div className={`${PANEL} flex flex-wrap items-center gap-2 px-3 py-2`}>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-52 border-border bg-background/60 text-sm" placeholder="Report name" aria-label="Report name" />
        <Button variant="outline" size="sm" className="h-8 border-border" onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
        <Button variant="outline" size="sm" className="h-8 border-border" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export JSON</Button>
        <Button variant="outline" size="sm" className="h-8 border-border" onClick={undo} title="Undo (Ctrl+Z)"><Undo2 className="h-3.5 w-3.5" /> Undo</Button>
        {dashboards.length > 0 && (
          <Select onValueChange={(id) => { const d = dashboards.find((x) => x.id === id); if (d) loadSaved(d); }}>
            <SelectTrigger className="h-8 w-[170px] border-border bg-card text-xs"><SelectValue placeholder="Open saved…" /></SelectTrigger>
            <SelectContent className="border-border bg-popover">
              {dashboards.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="flex items-center justify-between gap-2"><span className="max-w-[120px] truncate">{d.name}</span><button onClick={(e) => { e.stopPropagation(); deleteDashboard(d.id); }} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-3 w-3" /></button></span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">{page.widgets.length} visuals · {ds.name}</span>

        {/* view switcher — Power BI style */}
        <div className="flex overflow-hidden rounded-lg border border-border" role="tablist" aria-label="View mode">
          {([["report", "Report", LayoutDashboard], ["data", "Table view", Table2], ["model", "Model view", Link2]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === v ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= REPORT VIEW ================= */}
      {view === "report" && (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* canvas */}
          <div className="min-w-0 flex-1">
            <div className={`${PANEL} min-h-[480px] p-4`}>
              {page.widgets.length === 0 ? (
                <div className="flex h-[420px] flex-col items-center justify-center gap-2 text-center">
                  <Plus className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Empty canvas — click a visual type in the Visualizations pane</p>
                  <p className="max-w-md text-xs leading-relaxed text-muted-foreground/70">
                    The 5-second layer = 3–4 KPI cards. The 30-second layer = one trend + two decompositions.
                    Add a slicer so viewers can cut the page themselves. Titles should state the insight, not the topic.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {page.widgets.filter((w) => w.type === "kpi").map((w) => <KpiCard key={w.id} w={w} />)}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {page.widgets.filter((w) => w.type !== "kpi").map((w) =>
                      w.type === "slicer" ? (
                        <div key={w.id} className={`${PANEL} group ${selectedId === w.id ? "outline outline-2 outline-offset-0 outline-emerald-500" : ""}`} onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}>
                          <div className={PANEL_HEAD}>
                            <p className="flex-1 truncate text-sm font-semibold text-foreground">{w.title || "Slicer"}</p>
                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <button className="rounded p-1 text-muted-foreground hover:bg-muted" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateWidget(w.id); }}><Copy className="h-3 w-3" /></button>
                              <button className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500" title="Remove" onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                          <SlicerCard w={w} />
                        </div>
                      ) : (
                        <div key={w.id} className={`${PANEL} group ${SIZE_CLS[w.size ?? "md"]} ${selectedId === w.id ? "outline outline-2 outline-offset-0 outline-emerald-500" : ""}`}>
                          <div className={PANEL_HEAD}>
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{w.showTitle === false ? "" : w.title}</p>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                              <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit fields" onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}><SlidersHorizontal className="h-3.5 w-3.5" /></button>
                              <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Duplicate" onClick={() => duplicateWidget(w.id)}><Copy className="h-3 w-3" /></button>
                              <button className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500" title="Remove" onClick={() => removeWidget(w.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                          <div className="p-3" onClick={() => setSelectedId(w.id)}>{renderChart(w)}</div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            {/* page tabs — Power BI style */}
            <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {pages.map((p, i) => (
                <div key={p.id} className={`group flex shrink-0 items-center gap-1 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs transition-colors ${
                  i === activePage ? "border-border bg-card font-semibold text-foreground" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                  {renamingPage === p.id ? (
                    <input
                      autoFocus
                      value={p.name}
                      onChange={(e) => setPages((ps) => ps.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))}
                      onBlur={() => setRenamingPage(null)}
                      onKeyDown={(e) => e.key === "Enter" && setRenamingPage(null)}
                      className="w-24 bg-transparent outline-none"
                    />
                  ) : (
                    <button onClick={() => { setActivePage(i); setSelectedId(null); }} onDoubleClick={() => setRenamingPage(p.id)} title="Double-click to rename">
                      {p.name}
                    </button>
                  )}
                  {pages.length > 1 && (
                    <button onClick={() => deletePage(i)} className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100" aria-label={`Delete ${p.name}`}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addPage} className="flex shrink-0 items-center gap-1 rounded-t-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted" title="Add page">
                <Plus className="h-3.5 w-3.5" /> Page
              </button>
              {pageFilters.length > 0 && (
                <span className="ml-2 flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300">
                  <SlidersHorizontal className="h-3 w-3" /> {pageFilters.length} slicer{pageFilters.length > 1 ? "s" : ""} active
                </span>
              )}
            </div>
          </div>

          {/* right panes: visualizations + fields */}
          <div className="flex w-full shrink-0 flex-col gap-4 lg:w-auto lg:flex-row">
            <VisualizationsPane />
            <FieldsPane />
          </div>
        </div>
      )}

      {/* ================= DATA VIEW ================= */}
      {view === "data" && (
        <div className={PANEL}>
          <div className={PANEL_HEAD}>
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Table2 className="h-3.5 w-3.5 text-emerald-500" /> {ds.name} — table view</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button size="sm" variant="outline" className="h-7 gap-1 border-border px-2 text-[11px]" disabled={dataPageIdx === 0} onClick={() => setDataPageIdx((i) => Math.max(0, i - 1))}><ChevronLeft className="h-3 w-3" /> Prev</Button>
              <span className="font-mono">{dataPageIdx + 1} / {dataPagesTotal}</span>
              <Button size="sm" variant="outline" className="h-7 gap-1 border-border px-2 text-[11px]" disabled={dataPageIdx >= dataPagesTotal - 1} onClick={() => setDataPageIdx((i) => Math.min(dataPagesTotal - 1, i + 1))}>Next <ChevronRight className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]" onClick={() => downloadDatasetCSV(ds.id)}><Download className="h-3 w-3" /> CSV</Button>
            </div>
          </div>
          <div className="max-h-[58vh] overflow-auto scrollbar-thin">
            <table className="w-full text-left text-[12.5px]">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th className="border-b border-border px-2 py-2 text-[10px] font-medium text-muted-foreground">#</th>
                  {ds.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] font-semibold text-foreground/90">
                      {c.name} <span className="font-normal text-muted-foreground">· {c.type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((r, ri) => (
                  <tr key={ri} className="border-b border-border/40 hover:bg-muted/50">
                    <td className="px-2 py-1 text-right font-mono text-[10px] text-muted-foreground/60">{dataPageIdx * DATA_PAGE + ri + 1}</td>
                    {ds.columns.map((c) => {
                      const v = r[c.key];
                      const isNum = typeof v === "number" || (v !== "" && v !== undefined && !isNaN(parseFloat(String(v).replace(/[$,\s]/g, ""))) && /[\d]/.test(String(v)));
                      return (
                        <td key={c.key} className={`max-w-[220px] truncate whitespace-nowrap px-3 py-1 ${isNum ? "text-right font-mono text-foreground" : "text-muted-foreground"}`}>
                          {v === "" || v === undefined ? <span className="italic text-muted-foreground/40">(blank)</span> : typeof v === "number" ? v.toLocaleString("en-US") : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span>{ds.rows.length.toLocaleString()} rows · {ds.columns.length} columns · showing {dataPageIdx * DATA_PAGE + 1}–{Math.min(ds.rows.length, (dataPageIdx + 1) * DATA_PAGE)}</span>
            <span>Power BI&apos;s Data view shows the grain — always confirm the dataset is one row per event before building visuals.</span>
          </div>
        </div>
      )}

      {/* ================= MODEL VIEW ================= */}
      {view === "model" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8">
            <div className={`${PANEL} w-full max-w-sm p-4 shadow-sm`}>
              <p className="flex items-center gap-2 border-b border-border pb-2 font-mono text-sm font-bold text-foreground"><Table2 className="h-4 w-4 text-emerald-500" /> {ds.id}</p>
              <div className="space-y-1 pt-2 font-mono text-[12px]">
                {ds.columns.map((c) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground/85">
                      <span className={`h-1.5 w-1.5 rounded-full ${c.type === "number" || c.type === "currency" ? "bg-orange-400" : c.type === "date" ? "bg-violet-400" : "bg-sky-400"}`} />
                      {c.key}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
              This dataset is a single flat fact table at the <b className="text-foreground">order grain</b> (one row per order line/event).
              Real Power BI models split this into a <b className="text-foreground">star schema</b>: dimension tables (products, customers, dates) + a fact table with measures.
            </p>
          </div>
          <div className={PANEL}>
            <div className={PANEL_HEAD}><span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Link2 className="h-3.5 w-3.5 text-emerald-500" /> How a star schema would look</span></div>
            <div className="space-y-3 p-4 text-[12.5px] leading-relaxed text-muted-foreground">
              <p><b className="text-foreground">Dim_Product</b> — product, category, brand, unit price (one row per product).</p>
              <p><b className="text-foreground">Dim_Customer</b> — customer, city, region, segment (one row per customer).</p>
              <p><b className="text-foreground">Dim_Date</b> — date, month, quarter, year (one row per day; enables time intelligence).</p>
              <p><b className="text-foreground">Fact_Sales</b> — order_id, product_key, customer_key, date_key, units, revenue (the numbers).</p>
              <p className="border-t border-border pt-3">Why companies care: a clean star schema makes DAX measures simple, refreshes faster, and stops &quot;two totals that don&apos;t match&quot; arguments in meetings. Flat extracts like this one are where most self-service dashboards start — and that&apos;s fine.</p>
            </div>
          </div>
        </div>
      )}

      <Coach view="dashboard" mission={BI_MISSION} tips={[
        selected
          ? `You've selected the ${WTYPE_META[selected.type].label}. Use the field wells on the right to re-bind Axis/Values, or the format section to change color and title.`
          : page.widgets.length === 0
            ? "Start with 3 KPI cards, then one trend line. Click any visual type icon in the Visualizations pane."
            : "Click any visual to select it — then click fields in the Fields pane to re-bind them, Power BI style.",
        pageFilters.length === 0
          ? "No slicers yet. Add one (it filters the whole page) — stakeholders always ask to cut data by region, segment or date."
          : `${pageFilters.length} slicer${pageFilters.length > 1 ? "s" : ""} active — every visual on this page respects them. Check a KPI's “% of total” chip to see the filter working.`,
        view === "report"
          ? "Switch to **Table view** to sanity-check the grain (one row per what?), and **Model view** to learn how real BI teams shape data."
          : "Back in Report view, try the donut for category mix — but keep slices ≤5, or readers can't compare angles.",
      ]} why="Companies don't buy dashboards — they buy faster decisions. A good report answers the three questions leadership actually asks (how much, trending which way, where) in under 30 seconds, then lets each viewer filter to their own region or product line. That's exactly the interaction model you just built." />
    </div>
  );
}

/* field-well select used in the Visualizations pane */
function Well({ label, value, onChange, cols }: { label: string; value: string; onChange: (v: string) => void; cols: Dataset["columns"] }) {
  return (
    <div>
      <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-full border-border bg-card text-[11px]"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-56 border-border bg-popover">
          {cols.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
