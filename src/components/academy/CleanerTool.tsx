"use client";

/* Data Cleaner — profile any CSV, detect the 7 horsemen of messy data,
   apply one-click fixes, keep a professional cleaning log, export clean CSV. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolHeader, PANEL, PANEL_HEAD } from "./shared";
import { getDatasetById, downloadFile, type Row } from "@/lib/academy/datasets";
import Papa from "papaparse";
import { useAcademy } from "@/lib/academy/store";
import {
  AlertTriangle, BrushCleaning, CheckCheck, Download, FileWarning, ScanSearch, Sparkles, Trash2, Upload,
} from "lucide-react";

interface ColProfile {
  col: string;
  missing: number;
  distinct: number;
  issues: string[];
}

const CANON_REGIONS: Record<string, string> = {
  north: "North", south: "South", east: "East", west: "West",
};

export function CleanerTool() {
  const { addXp } = useAcademy();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [cols, setCols] = React.useState<string[]>([]);
  const [log, setLog] = React.useState<string[]>([]);
  const [originalCount, setOriginalCount] = React.useState(0);
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadSample = () => {
    const ds = getDatasetById("messy_sales")!;
    setRows(ds.rows.map((r) => ({ ...r })));
    setCols(Object.keys(ds.rows[0]));
    setLog([]);
    setOriginalCount(ds.rows.length);
    setDone(new Set());
  };

  const importCsv = (file: File) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.data.length) return;
        setRows(res.data);
        setCols(Object.keys(res.data[0]));
        setLog([]);
        setOriginalCount(res.data.length);
        setDone(new Set());
      },
    });
  };

  const addLog = (action: string, detail: string) =>
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${action}: ${detail}`]);

  /* ---------- profiling ---------- */
  const profiles: ColProfile[] = React.useMemo(() => {
    if (!rows) return [];
    return cols.map((col) => {
      const vals = rows.map((r) => String(r[col] ?? "")).filter((v) => v !== "");
      const missing = rows.length - vals.length;
      const distinct = new Set(vals.map((v) => v.trim())).size;
      const issues: string[] = [];
      if (vals.some((v) => v !== v.trim())) issues.push("whitespace");
      const caseMap = new Map<string, Set<string>>();
      for (const v of vals) {
        const k = v.toLowerCase().replace(/\s+/g, " ").trim();
        if (!caseMap.has(k)) caseMap.set(k, new Set());
        caseMap.get(k)!.add(v.trim());
      }
      if ([...caseMap.values()].some((s) => s.size > 1)) issues.push("case/format variants");
      if (vals.some((v) => /^\s*["'].*["']\s*$/.test(v) || /^\s*\$/.test(v))) issues.push("numbers as text");
      if (vals.some((v) => v.includes("/")) && vals.some((v) => v.includes("-")) && /\d{4}/.test(vals[0] ?? "")) issues.push("mixed date formats");
      const nums = vals.map((v) => parseFloat(v.replace(/[$,""\s]/g, ""))).filter((n) => !isNaN(n));
      if (nums.some((n) => n < 0)) issues.push("negative values");
      if (vals.some((v) => parseFloat(v.replace(/[$,""\s]/g, "")) === 0)) issues.push("zeros");
      if (missing > 0) issues.push(`${missing} missing`);
      return { col, missing, distinct, issues };
    });
  }, [rows, cols]);

  const dupCount = React.useMemo(() => {
    if (!rows) return 0;
    const seen = new Set<string>();
    let d = 0;
    for (const r of rows) {
      const k = JSON.stringify(r);
      if (seen.has(k)) d++;
      else seen.add(k);
    }
    return d;
  }, [rows]);

  const totalIssues = profiles.reduce((s, p) => s + p.issues.length, 0) + dupCount;

  /* ---------- fixes ---------- */
  const apply = (id: string, label: string, fn: (rows: Row[]) => { rows: Row[]; detail: string }) => {
    if (!rows) return;
    const res = fn(rows);
    setRows(res.rows);
    addLog(label, res.detail);
    setDone((d) => new Set(d).add(id));
    addXp(5);
  };

  const median = (nums: number[]) => {
    const s = nums.filter((n) => !isNaN(n)).sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };

  const FIXES: { id: string; label: string; desc: string; run: () => void }[] = [
    {
      id: "dedupe", label: "Remove duplicate rows", desc: "Exact copies from double-scans / re-exports",
      run: () => apply("dedupe", "Removed duplicates", (rs) => {
        const seen = new Set<string>();
        const out = rs.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
        return { rows: out, detail: `${rs.length - out.length} rows removed (${(((rs.length - out.length) / rs.length) * 100).toFixed(1)}% of data)` };
      }),
    },
    {
      id: "trim", label: "Trim whitespace", desc: "Kill invisible leading/trailing spaces in all text",
      run: () => apply("trim", "Trimmed whitespace", (rs) => {
        let n = 0;
        const out = rs.map((r) => {
          const c = { ...r };
          for (const col of cols) {
            if (typeof c[col] === "string" && c[col] !== (c[col] as string).trim()) { c[col] = (c[col] as string).trim().replace(/\s+/g, " "); n++; }
          }
          return c;
        });
        return { rows: out, detail: `${n} cells cleaned` };
      }),
    },
    {
      id: "case", label: "Standardize case", desc: "customer → Title Case, order_id → UPPER",
      run: () => apply("case", "Standardized case", (rs) => {
        const out = rs.map((r) => ({
          ...r,
          customer: String(r.customer ?? "").toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase()),
          order_id: String(r.order_id ?? "").toUpperCase(),
          region: String(r.region ?? "").toUpperCase(),
        }));
        return { rows: out, detail: "customer → Title Case, order_id/region → UPPER" };
      }),
    },
    {
      id: "regions", label: "Standardize regions", desc: "Map 'north'/' SOUTH'/'east ' → 4 canonical regions",
      run: () => apply("regions", "Standardized regions", (rs) => {
        let n = 0;
        const out = rs.map((r) => {
          const canon = CANON_REGIONS[String(r.region ?? "").trim().toLowerCase()];
          if (canon && canon !== r.region) n++;
          return { ...r, region: canon ?? r.region };
        });
        return { rows: out, detail: `${n} values mapped to 4 canonical regions` };
      }),
    },
    {
      id: "dates", label: "Normalize dates → ISO", desc: "Unify YYYY-MM-DD / YYYY/MM/DD into ISO 8601",
      run: () => apply("dates", "Normalized dates", (rs) => {
        let bad = 0;
        const out = rs.map((r) => {
          const v = String(r.order_date ?? "").trim();
          if (!v) return r;
          const iso = v.replaceAll("/", "-");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) bad++;
          return { ...r, order_date: iso };
        });
        return { rows: out, detail: `all dates ISO-formatted${bad ? `, ${bad} unparseable flagged` : ""}` };
      }),
    },
    {
      id: "prices", label: "Strip $ & cast numbers", desc: 'unit_price "$89.50" → 89.5 · units "3" → 3',
      run: () => apply("prices", "Cast numerics", (rs) => {
        let n = 0;
        const out = rs.map((r) => {
          const p = parseFloat(String(r.unit_price ?? "").replace(/[$\s]/g, ""));
          const u = parseInt(String(r.units ?? "").replace(/["\s]/g, ""), 10);
          const c = { ...r };
          if (!isNaN(p) && String(r.unit_price) !== String(p)) { c.unit_price = p; n++; }
          if (!isNaN(u) && String(r.units) !== String(u)) { c.units = u; n++; }
          return c;
        });
        return { rows: out, detail: `${n} cells converted to real numbers` };
      }),
    },
    {
      id: "invalid", label: "Drop impossible values", desc: "units ≤ 0 or price ≤ 0 — errors, not signal",
      run: () => apply("invalid", "Dropped impossible values", (rs) => {
        const out = rs.filter((r) => {
          const u = parseFloat(String(r.units ?? "").replace(/["\s]/g, ""));
          const p = parseFloat(String(r.unit_price ?? "").replace(/[$\s]/g, ""));
          return !(isNaN(u) || isNaN(p) || u <= 0 || p <= 0);
        });
        return { rows: out, detail: `${rs.length - out.length} rows dropped (0/negative units or prices)` };
      }),
    },
    {
      id: "missing", label: "Handle missing values", desc: "Drop rows missing customer/date; fill text gaps with 'Unknown'",
      run: () => apply("missing", "Handled missing values", (rs) => {
        const before = rs.length;
        const out = rs
          .filter((r) => String(r.customer ?? "").trim() !== "" && String(r.order_date ?? "").trim() !== "")
          .map((r) => (String(r.channel ?? "").trim() === "" ? { ...r, channel: "Unknown" } : r));
        return { rows: out, detail: `${before - out.length} unjoinable rows dropped, text gaps → 'Unknown'` };
      }),
    },
    {
      id: "revenue", label: "Recompute revenue", desc: "revenue = units × unit_price on every row",
      run: () => apply("revenue", "Recomputed revenue", (rs) => {
        const out = rs.map((r) => {
          const u = parseFloat(String(r.units ?? "").replace(/["\s]/g, ""));
          const p = parseFloat(String(r.unit_price ?? "").replace(/[$\s]/g, ""));
          return { ...r, revenue: !isNaN(u) && !isNaN(p) ? +(u * p).toFixed(2) : "" };
        });
        return { rows: out, detail: `revenue derived on ${out.length} rows` };
      }),
    },
  ];

  const exportClean = () => {
    if (!rows) return;
    const csv = Papa.unparse(rows);
    downloadFile("cleaned_sales_data.csv", csv, "text/csv");
  };

  const exportLog = () => {
    const md = `# Cleaning Log\n\nDate: ${new Date().toISOString().slice(0, 10)}\nGrain: one row = one order line\nRows: ${originalCount} raw → ${rows?.length ?? 0} clean\n\n${log.map((l) => `- ${l}`).join("\n")}\n`;
    downloadFile("cleaning_log.md", md, "text/markdown");
  };

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<BrushCleaning className="h-5 w-5 text-amber-400" />}
        title="Data Cleaner"
        subtitle="Profile → fix → log → export. The 60–80% skill of real analytics, practiced on real mess."
        accent="amber"
        actions={
          <>
            <Button size="sm" className="bg-amber-500 font-semibold text-black hover:bg-amber-400" onClick={loadSample}><Sparkles className="h-4 w-4" /> Load messy dataset</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent hover:bg-white/10" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
          </>
        }
      />

      {!rows ? (
        <div className={`${PANEL} flex flex-col items-center justify-center gap-3 py-20 text-center`}>
          <ScanSearch className="h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">Load the messy retail dataset (or any CSV) to start profiling</p>
          <p className="max-w-md text-xs leading-relaxed text-zinc-600">
            You will find: whitespace & case chaos, 2 date formats, $-prefixed text prices,
            quoted numbers, duplicate rows, impossible values and missing fields — the seven horsemen.
          </p>
        </div>
      ) : (
        <>
          {/* status bar */}
          <div className={`${PANEL} flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm`}>
            <div><span className="text-2xl font-bold text-white">{originalCount}</span><span className="ml-1.5 text-xs text-zinc-500">raw rows</span></div>
            <div><span className="text-2xl font-bold text-emerald-300">{rows.length}</span><span className="ml-1.5 text-xs text-zinc-500">clean rows</span></div>
            <div><span className="text-2xl font-bold text-amber-300">{totalIssues}</span><span className="ml-1.5 text-xs text-zinc-500">issues detected</span></div>
            <div><span className="text-2xl font-bold text-sky-300">{done.size}</span><span className="ml-1.5 text-xs text-zinc-500">fixes applied</span></div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-8 border-white/15" onClick={exportClean}><Download className="h-3.5 w-3.5" /> Clean CSV</Button>
              <Button size="sm" variant="outline" className="h-8 border-white/15" onClick={exportLog}><FileWarning className="h-3.5 w-3.5" /> Cleaning log</Button>
            </div>
          </div>

          <Tabs defaultValue="issues">
            <TabsList className="bg-zinc-900 border border-white/10">
              <TabsTrigger value="issues" className="text-xs data-[state=active]:text-emerald-300"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Issues found</TabsTrigger>
              <TabsTrigger value="fixes" className="text-xs data-[state=active]:text-emerald-300"><BrushCleaning className="mr-1 h-3.5 w-3.5" /> Fix actions</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs data-[state=active]:text-emerald-300">Data preview</TabsTrigger>
              <TabsTrigger value="log" className="text-xs data-[state=active]:text-emerald-300">Cleaning log</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="mt-3">
              {dupCount > 0 && (
                <div className={`${PANEL} mb-3 flex items-center gap-3 border-amber-500/20 bg-amber-500/[0.05] px-4 py-3`}>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-[13px] text-amber-200/90"><b>{dupCount} exact duplicate rows</b> detected — inflating every total. Remove them first.</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((p) => (
                  <div key={p.col} className={`${PANEL} p-3`}>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[13px] font-semibold text-zinc-200">{p.col}</p>
                      <span className="text-[11px] text-zinc-500">{p.distinct} distinct</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.issues.length === 0 ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300"><CheckCheck className="mr-1 h-3 w-3" /> clean</Badge>
                      ) : (
                        p.issues.map((i) => (
                          <Badge key={i} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">{i}</Badge>
                        ))
                      )}
                    </div>
                    {p.missing > 0 && <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-amber-400/60" style={{ width: `${(p.missing / rows.length) * 100}%` }} /></div>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fixes" className="mt-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {FIXES.map((f) => (
                  <div key={f.id} className={`${PANEL} flex items-center justify-between gap-2 p-3`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-200">{f.label}</p>
                      <p className="truncate text-[11px] text-zinc-500">{f.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={done.has(f.id) ? "outline" : "default"}
                      className={`h-8 shrink-0 ${done.has(f.id) ? "border-emerald-500/40 text-emerald-300" : "bg-amber-500 text-black hover:bg-amber-400"}`}
                      onClick={f.run}
                    >
                      {done.has(f.id) ? <><CheckCheck className="h-3.5 w-3.5" /> Re-run</> : "Apply"}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Recommended order: <b className="text-zinc-300">duplicates → trim → case → regions → dates → numbers → impossible values → missing → revenue</b>.
                Every action is logged (Cleaning log tab) — that log ships with the project as evidence.
              </p>
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className={`${PANEL} overflow-auto scrollbar-thin`} style={{ maxHeight: "60vh" }}>
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr>{cols.map((c) => <th key={c} className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-mono text-[11px] text-emerald-300">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03]">
                        {cols.map((c) => (
                          <td key={c} className={`max-w-[180px] truncate whitespace-nowrap px-3 py-1.5 font-mono ${String(r[c] ?? "") === "" ? "italic text-red-400/50" : "text-zinc-300"}`}>
                            {String(r[c] ?? "") === "" ? "∅" : String(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">First 100 rows · empty cells shown as ∅</p>
            </TabsContent>

            <TabsContent value="log" className="mt-3">
              <div className={`${PANEL} p-4`}>
                {log.length === 0 ? (
                  <p className="text-sm text-zinc-500">No actions yet. The log records every fix with counts — it becomes <span className="font-mono text-emerald-300">analysis/cleaning_log.md</span> in your portfolio.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {log.map((l, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-zinc-300">
                        <span className="font-mono text-[11px] text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
