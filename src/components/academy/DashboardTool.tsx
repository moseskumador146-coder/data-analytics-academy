"use client";

/* Dashboard Studio — Power BI-style builder: KPI cards, bar/line/area/pie charts,
   group-by aggregations, filters, top-N, saved dashboards, JSON export. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ToolHeader, PANEL, PANEL_HEAD, fmtMoney, fmtNum, levelBadgeCls } from "./shared";
import { useAcademy, type SavedDashboard } from "@/lib/academy/store";
import { getAllDatasets, getDatasetById, downloadFile, type Dataset, type Row } from "@/lib/academy/datasets";
import {
  BarChart3, ChartPie, Download, LayoutDashboard, LineChart as LineIcon, Plus, Save, Sparkles, Trash2, TrendingUp, Gauge,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from "recharts";

type Agg = "sum" | "avg" | "count" | "min" | "max";
type WType = "kpi" | "bar" | "line" | "area" | "pie" | "table";

interface Widget {
  id: string;
  type: WType;
  title: string;
  dimension: string;
  measure: string;
  agg: Agg;
  topN: number;
  filterCol: string;
  filterVal: string;
}

const PALETTE = ["#34d399", "#fbbf24", "#38bdf8", "#f472b6", "#a78bfa", "#fb923c", "#4ade80", "#f87171"];

const WTYPE_META: Record<WType, { label: string; icon: React.ReactNode; blurb: string }> = {
  kpi: { label: "KPI card", icon: <Gauge className="h-4 w-4" />, blurb: "One big number — the 5-second layer" },
  bar: { label: "Bar chart", icon: <BarChart3 className="h-4 w-4" />, blurb: "Compare categories" },
  line: { label: "Line chart", icon: <LineIcon className="h-4 w-4" />, blurb: "Trend over time" },
  area: { label: "Area chart", icon: <TrendingUp className="h-4 w-4" />, blurb: "Cumulative / volume over time" },
  pie: { label: "Pie / donut", icon: <ChartPie className="h-4 w-4" />, blurb: "Parts of a whole (≤5 slices)" },
  table: { label: "Table", icon: <LayoutDashboard className="h-4 w-4" />, blurb: "The 5-minute detail layer" },
};

function aggregate(ds: Dataset, w: Widget): { label: string; value: number }[] {
  let rows: Row[] = ds.rows;
  if (w.filterCol && w.filterVal) {
    rows = rows.filter((r) => String(r[w.filterCol] ?? "").trim().toLowerCase() === w.filterVal.trim().toLowerCase());
  }
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
  // KPI cards aggregate across ALL rows — no grouping
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
    return { label, value: +value.toFixed(2) };
  });
  if (w.type !== "line" && w.type !== "area") out.sort((a, b) => b.value - a.value);
  else out.sort((a, b) => a.label.localeCompare(b.label));
  if (w.topN > 0 && w.type !== "kpi") out = out.slice(0, w.topN);
  return out;
}

const fmtVal = (v: number, money: boolean) => (money ? fmtMoney(v) : fmtNum(v));

export function DashboardTool() {
  const { dashboards, saveDashboard, deleteDashboard } = useAcademy();
  const [datasetId, setDatasetId] = React.useState("clean_sales");
  const [name, setName] = React.useState("My Executive Dashboard");
  const [widgets, setWidgets] = React.useState<Widget[]>([]);
  const [editing, setEditing] = React.useState<string | null>(null);
  const ds = getDatasetById(datasetId)!;

  React.useEffect(() => { setWidgets([]); setEditing(null); }, [datasetId]);

  const numericCols = ds.columns.filter((c) => c.type === "number" || c.type === "currency");
  const dimCols = ds.columns.filter((c) => c.type === "text" || c.type === "date");

  const addWidget = (type: WType) => {
    const w: Widget = {
      id: Math.random().toString(36).slice(2),
      type,
      title: WTYPE_META[type].label,
      dimension: dimCols[0]?.key ?? ds.columns[0].key,
      measure: numericCols[0]?.key ?? ds.columns[0].key,
      agg: type === "kpi" ? "sum" : "sum",
      topN: type === "pie" ? 5 : type === "kpi" ? 0 : 7,
      filterCol: "",
      filterVal: "",
    };
    if (type === "kpi") { w.title = `${numericCols[0]?.name ?? "Total"}`; w.agg = "sum"; }
    if (type === "line" || type === "area") {
      const dateCol = ds.columns.find((c) => c.type === "date");
      if (dateCol) w.dimension = dateCol.key;
    }
    setWidgets((ws) => [...ws, w]);
    setEditing(w.id);
  };

  const sampleDashboard = () => {
    setWidgets([
      { id: "s1", type: "kpi", title: "Total Revenue", dimension: "region", measure: "revenue", agg: "sum", topN: 0, filterCol: "", filterVal: "" },
      { id: "s2", type: "kpi", title: "Orders", dimension: "region", measure: "order_id", agg: "count", topN: 0, filterCol: "", filterVal: "" },
      { id: "s3", type: "kpi", title: "Avg Order Value", dimension: "region", measure: "revenue", agg: "avg", topN: 0, filterCol: "", filterVal: "" },
      { id: "s4", type: "line", title: "Monthly revenue — watch the mid-year dip", dimension: "order_date", measure: "revenue", agg: "sum", topN: 0, filterCol: "", filterVal: "" },
      { id: "s5", type: "bar", title: "Revenue by region", dimension: "region", measure: "revenue", agg: "sum", topN: 7, filterCol: "", filterVal: "" },
      { id: "s6", type: "bar", title: "Revenue by category", dimension: "category", measure: "revenue", agg: "sum", topN: 7, filterCol: "", filterVal: "" },
    ]);
  };

  const update = (id: string, patch: Partial<Widget>) =>
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const save = () => {
    const d: SavedDashboard = {
      id: `dash_${Date.now()}`,
      name,
      datasetId,
      widgets: widgets as unknown[],
      createdAt: new Date().toISOString(),
    };
    saveDashboard(d);
  };

  const loadSaved = (d: SavedDashboard) => {
    setDatasetId(d.datasetId);
    setWidgets(d.widgets as Widget[]);
    setName(d.name);
  };

  const exportJson = () => {
    downloadFile(
      `${name.replace(/\s+/g, "_").toLowerCase()}.json`,
      JSON.stringify({ name, datasetId, widgets }, null, 2),
      "application/json"
    );
  };

  const kpis = widgets.filter((w) => w.type === "kpi");
  const charts = widgets.filter((w) => w.type !== "kpi");

  const renderChart = (w: Widget) => {
    const data = aggregate(ds, w);
    const measureCol = ds.columns.find((c) => c.key === w.measure);
    const money = measureCol?.type === "currency" && w.agg !== "count";
    const axis = (tick: number) => (money ? fmtMoney(tick) : fmtNum(tick));

    if (w.type === "pie") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#09090b" strokeWidth={2} />)}
            </Pie>
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "line" || w.type === "area") {
      const Chart = w.type === "line" ? LineChart : AreaChart;
      const Mark = w.type === "line" ? Line : Area;
      return (
        <ResponsiveContainer width="100%" height={260}>
          <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={axis} width={56} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} />
            <Mark type="monotone" dataKey="value" stroke="#34d399" fill="#34d39922" strokeWidth={2} dot={false} />
          </Chart>
        </ResponsiveContainer>
      );
    }
    if (w.type === "table") {
      return (
        <div className="max-h-64 overflow-auto scrollbar-thin">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr><th className="px-3 py-2">{ds.columns.find((c) => c.key === w.dimension)?.name}</th><th className="px-3 py-2 text-right">{w.agg} {measureCol?.name}</th></tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-3 py-1.5 text-zinc-300">{d.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{fmtVal(d.value, money)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 50 : 30} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={axis} width={56} />
          <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtVal(v, money)} cursor={{ fill: "#ffffff08" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const WidgetEditor = ({ w }: { w: Widget }) => (
    <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
      <Input value={w.title} onChange={(e) => update(w.id, { title: e.target.value })} placeholder="Chart title — write the INSIGHT" className="border-white/15 bg-black/30 text-sm" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SelectField label="Group by" value={w.dimension} onChange={(v) => update(w.id, { dimension: v })}>
          {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
        </SelectField>
        {w.type !== "kpi" && w.agg !== "count" ? (
          <SelectField label="Measure" value={w.measure} onChange={(v) => update(w.id, { measure: v })}>
            {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
          </SelectField>
        ) : (
          <SelectField label="Measure" value={w.measure} onChange={(v) => update(w.id, { measure: v })}>
            {ds.columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
          </SelectField>
        )}
        <SelectField label="Aggregation" value={w.agg} onChange={(v) => update(w.id, { agg: v as Agg })}>
          {(["sum", "avg", "count", "min", "max"] as Agg[]).map((a) => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
        </SelectField>
        <SelectField label="Filter (optional)" value={w.filterCol || "__none"} onChange={(v) => update(w.id, { filterCol: v === "__none" ? "" : v, filterVal: "" })}>
          <SelectItem value="__none">No filter</SelectItem>
          {dimCols.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
        </SelectField>
      </div>
      {w.filterCol && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Filter value:</span>
          <Select value={w.filterVal || "__pick"} onValueChange={(v) => update(w.id, { filterVal: v })}>
            <SelectTrigger className="h-8 w-52 border-white/15 bg-zinc-900 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900">
              {[...new Set(ds.rows.map((r) => String(r[w.filterCol])))].slice(0, 40).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {w.type !== "kpi" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Top N:</span>
          {[3, 5, 7, 10, 0].map((n) => (
            <button key={n} onClick={() => update(w.id, { topN: n })}
              className={`rounded-md px-2 py-0.5 text-xs transition-colors ${w.topN === n ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-500 hover:bg-white/5"}`}>
              {n === 0 ? "All" : n}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-zinc-500">{WTYPE_META[w.type].blurb}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
        title="Dashboard Studio"
        subtitle="Power BI-style builder — KPIs, charts, filters. Everything recalculates instantly."
        actions={
          <>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="w-[200px] border-white/15 bg-zinc-900 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900">
                {getAllDatasets().map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent hover:bg-white/10" onClick={sampleDashboard}><Sparkles className="h-4 w-4" /> Sample exec dashboard</Button>
          </>
        }
      />

      <div className={`${PANEL} flex flex-wrap items-center gap-2 px-3 py-2`}>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-56 border-white/15 bg-black/30 text-sm" placeholder="Dashboard name" />
        <Button variant="outline" size="sm" className="h-8 border-white/15" onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
        <Button variant="outline" size="sm" className="h-8 border-white/15" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export JSON</Button>
        {dashboards.length > 0 && (
          <Select onValueChange={(id) => { const d = dashboards.find((x) => x.id === id); if (d) loadSaved(d); }}>
            <SelectTrigger className="h-8 w-[170px] border-white/15 bg-zinc-900 text-xs"><SelectValue placeholder="Open saved…" /></SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900">
              {dashboards.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="flex items-center justify-between gap-2"><span className="max-w-[120px] truncate">{d.name}</span><button onClick={(e) => { e.stopPropagation(); deleteDashboard(d.id); }} className="text-zinc-500 hover:text-red-400"><Trash2 className="h-3 w-3" /></button></span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-xs text-zinc-500">{widgets.length} widgets · {ds.name}</span>
      </div>

      {/* add widget palette */}
      <div className={`${PANEL} flex flex-wrap items-center gap-1.5 px-3 py-2`}>
        <span className="mr-1 text-xs font-medium text-zinc-400">Add widget:</span>
        {(Object.keys(WTYPE_META) as WType[]).map((t) => (
          <Button key={t} variant="outline" size="sm" className="h-7 border-white/10 bg-transparent px-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-300" onClick={() => addWidget(t)}>
            {WTYPE_META[t].icon}<span className="ml-1">{WTYPE_META[t].label}</span>
          </Button>
        ))}
        {widgets.length === 0 && (
          <span className="ml-2 text-xs text-zinc-500">← Start with 3 KPI cards, then a line chart of revenue by month. Or load the sample exec dashboard.</span>
        )}
      </div>

      {/* KPI row */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((w) => {
            const data = aggregate(ds, w);
            const total = data.reduce((s, d) => s + d.value, 0);
            const measureCol = ds.columns.find((c) => c.key === w.measure);
            const money = measureCol?.type === "currency" && w.agg !== "count";
            const shareBase = aggregate(ds, { ...w, filterCol: "", filterVal: "" }).reduce((s, d) => s + d.value, 0);
            return (
              <div key={w.id} className={`${PANEL} group relative p-4`} onClick={() => setEditing(editing === w.id ? null : w.id)}>
                <button className="absolute right-2 top-2 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setWidgets((ws) => ws.filter((x) => x.id !== w.id)); }}><Trash2 className="h-3.5 w-3.5" /></button>
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">{w.title}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">{fmtVal(total, money)}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">{w.agg.toUpperCase()} of {measureCol?.name}</span>
                  {shareBase > 0 && Math.abs(shareBase - total) > 0.01 && (
                    <span className={`rounded border px-1.5 text-[10px] font-medium ${levelBadgeCls("Beginner")}`}>{Math.round((total / shareBase) * 100)}% of total</span>
                  )}
                </div>
                {editing === w.id && <div className="mt-3" onClick={(e) => e.stopPropagation()}><WidgetEditor w={w} /></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* chart grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {charts.map((w) => (
          <div key={w.id} className={`${PANEL} group`}>
            <div className={PANEL_HEAD}>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{w.title}</p>
              <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <button className="rounded p-1 text-zinc-400 hover:bg-white/10" title="Edit" onClick={() => setEditing(editing === w.id ? null : w.id)}><LayoutDashboard className="h-3.5 w-3.5" /></button>
                <button className="rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400" title="Remove" onClick={() => setWidgets((ws) => ws.filter((x) => x.id !== w.id))}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="p-3">{renderChart(w)}</div>
            {editing === w.id && <div className="border-t border-white/10 p-3"><WidgetEditor w={w} /></div>}
          </div>
        ))}
      </div>

      {widgets.length === 0 && (
        <div className={`${PANEL} flex flex-col items-center justify-center gap-2 py-14 text-center`}>
          <Plus className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">Empty canvas — add KPI cards and charts above</p>
          <p className="max-w-md text-xs leading-relaxed text-zinc-600">
            The 5-second layer = 3–4 KPI cards. The 30-second layer = trend + two decompositions.
            Titles should state the insight, not the topic.
          </p>
        </div>
      )}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e4e4e7",
};

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 border-white/15 bg-zinc-900 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent className="border-white/10 bg-zinc-900">{children}</SelectContent>
      </Select>
    </div>
  );
}
