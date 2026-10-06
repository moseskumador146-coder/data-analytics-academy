"use client";

/* Data Cleaner — profile any CSV or sample file, detect the classic mess
   (duplicates, whitespace, case chaos, text numbers, mixed dates, impossible
   values, missing fields), apply one-click fixes that adapt to the columns
   actually present, keep a professional cleaning log, export clean CSV. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolHeader, PANEL, PANEL_HEAD, DatasetPicker, downloadDatasetCSV } from "./shared";
import { Coach } from "./Coach";
import { getDatasetById, downloadFile, type Row } from "@/lib/academy/datasets";
import Papa from "papaparse";
import { useAcademy } from "@/lib/academy/store";
import {
  AlertTriangle, BrushCleaning, CheckCheck, Download, FileWarning, ScanSearch, Sparkles, Upload,
} from "lucide-react";

interface ColProfile {
  col: string;
  missing: number;
  distinct: number;
  issues: string[];
}

const CANON_REGIONS: Record<string, string> = {
  north: "North", south: "South", east: "East", west: "West",
  "us-east": "us-east", "us-west": "us-west", "eu-central": "eu-central", "ap-south": "ap-south", "sa-east": "sa-east",
};

const numParse = (v: unknown): number => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[$,""\s]/g, ""));
  return isNaN(n) ? NaN : n;
};

/* column role detection — lets fixes adapt to any dataset */
function detectRoles(cols: string[], rows: Row[]) {
  const find = (re: RegExp) => cols.find((c) => re.test(c.toLowerCase()));
  const roles = {
    id: find(/\b(id|no|sku|code)$|\bid\b|\bemp_no\b|\bentry_id\b/),
    name: find(/customer|name|company/),
    region: find(/region|warehouse|zone|city/),
    qty: find(/units|quantity|on_hand|qty/),
    price: find(/unit_price|price|unit_cost|amount|annual_salary/),
    date: cols.filter((c) => /date|counted|review|posted|created|opened/i.test(c)),
  };
  // numeric-as-text columns: >60% of non-empty values parse after stripping $ , quotes
  const numericText = cols.filter((c) => {
    if (c === roles.id) return false;
    const vals = rows.map((r) => String(r[c] ?? "")).filter((v) => v !== "");
    if (!vals.length) return false;
    const parseable = vals.filter((v) => !isNaN(parseFloat(v.replace(/[$,""\s]/g, "")))).length;
    const hasTextCruft = vals.some((v) => /[$"]/.test(v) || v !== v.trim());
    return hasTextCruft && parseable / vals.length > 0.6;
  });
  return { ...roles, numericText };
}

const CLEANER_MISSION = [
  { id: "load", label: "Load a messy file", detail: "Pick **Retail Sales H2-2024 (Messy)** — or go bigger with **Finance GL Export** / **HR Export (Messy)**." },
  { id: "profile", label: "Read the profile", detail: "The **Issues found** tab lists every column's problems. Always profile before fixing — never touch data blind." },
  { id: "dedupe", label: "Remove duplicates first", detail: "Duplicates inflate every total. Fix them **before** any math — that's the professional order." },
  { id: "types", label: "Fix types & formats", detail: "Trim, standardize case, strip `$` from numbers, normalize dates — the boring 60% of the job." },
  { id: "impossible", label: "Drop impossible values", detail: "Zero/negative units, junk ages like 999 — errors, not signal. Delete with a log entry." },
  { id: "derive", label: "Recompute derived fields", detail: "Revenue = units × price on every row. Derived columns must be consistent, never half-filled." },
  { id: "log", label: "Export the evidence", detail: "Download the **Clean CSV** + **Cleaning log** — the log is what makes your work auditable." },
];

export function CleanerTool() {
  const { addXp } = useAcademy();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [cols, setCols] = React.useState<string[]>([]);
  const [log, setLog] = React.useState<string[]>([]);
  const [originalCount, setOriginalCount] = React.useState(0);
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const [loadedName, setLoadedName] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadSample = (id?: string) => {
    const ds = getDatasetById(id && id !== "messy_sales" ? id : "messy_sales") ?? getDatasetById("messy_sales")!;
    setRows(ds.rows.map((r) => ({ ...r })));
    setCols(Object.keys(ds.rows[0]));
    setLog([]);
    setOriginalCount(ds.rows.length);
    setDone(new Set());
    setLoadedName(ds.name);
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
        setLoadedName(file.name);
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
      const nums = vals.map((v) => numParse(v)).filter((n) => !isNaN(n));
      if (nums.some((n) => n < 0)) issues.push("negative values");
      if (nums.some((n) => n === 0)) issues.push("zeros");
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

  const roles = React.useMemo(() => (rows ? detectRoles(cols, rows) : null), [rows, cols]);

  const FIXES: { id: string; label: string; desc: string; run: () => void }[] = React.useMemo(() => {
    if (!rows || !roles) return [];
    const R = roles;
    return [
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
        id: "case", label: "Standardize case", desc: R.name ? `Title Case ${R.name}, UPPER ${R.id ?? "ids"}` : "Title Case names, UPPER ids",
        run: () => apply("case", "Standardized case", (rs) => {
          let n = 0;
          const out = rs.map((r) => {
            const c = { ...r };
            if (R.name && typeof c[R.name] === "string" && String(c[R.name]) !== "") {
              const t = String(c[R.name]).toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
              if (t !== c[R.name]) { c[R.name] = t; n++; }
            }
            if (R.id && typeof c[R.id] === "string") {
              const t = String(c[R.id]).toUpperCase();
              if (t !== c[R.id]) { c[R.id] = t; n++; }
            }
            return c;
          });
          return { rows: out, detail: `${n} cells re-cased to standards` };
        }),
      },
      {
        id: "regions", label: "Standardize categories", desc: R.region ? `Map ${R.region} variants → canonical values` : "Map region variants → canonical",
        run: () => apply("regions", "Standardized categories", (rs) => {
          if (!R.region) return { rows: rs, detail: "no category-like column found" };
          let n = 0;
          const out = rs.map((r) => {
            const raw = String(r[R.region] ?? "");
            const canon = CANON_REGIONS[raw.trim().toLowerCase()] ?? raw.trim().toUpperCase();
            if (canon && canon !== raw) n++;
            return { ...r, [R.region]: raw.trim() === "" ? raw : canon };
          });
          return { rows: out, detail: `${n} values mapped to canonical categories` };
        }),
      },
      {
        id: "dates", label: "Normalize dates → ISO", desc: R.date.length ? `Unify ${R.date.join(", ")} into ISO 8601` : "Unify dates into ISO 8601",
        run: () => apply("dates", "Normalized dates", (rs) => {
          let n = 0, bad = 0;
          const out = rs.map((r) => {
            const c = { ...r };
            for (const dc of R.date) {
              const v = String(c[dc] ?? "").trim();
              if (!v) continue;
              const iso = v.replaceAll("/", "-");
              if (iso !== v) n++;
              if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) bad++;
              c[dc] = iso;
            }
            return c;
          });
          return { rows: out, detail: `${n} dates reformatted${bad ? `, ${bad} unparseable flagged` : ", all valid"}` };
        }),
      },
      {
        id: "prices", label: "Strip $ & cast numbers", desc: R.numericText.length ? `Convert ${R.numericText.slice(0, 3).join(", ")} to real numbers` : "Text numbers → real numbers",
        run: () => apply("prices", "Cast numerics", (rs) => {
          let n = 0;
          const out = rs.map((r) => {
            const c = { ...r };
            for (const col of R.numericText) {
              const parsed = numParse(c[col]);
              if (!isNaN(parsed) && String(c[col]) !== String(parsed)) { c[col] = parsed; n++; }
            }
            return c;
          });
          return { rows: out, detail: `${n} cells converted to real numbers` };
        }),
      },
      {
        id: "invalid", label: "Drop impossible values", desc: "≤0 quantities/prices, junk sentinels (age 999)",
        run: () => apply("invalid", "Dropped impossible values", (rs) => {
          const out = rs.filter((r) => {
            if (R.qty) { const q = numParse(r[R.qty]); if (!isNaN(q) && q <= 0) return false; }
            if (R.price) { const p = numParse(r[R.price]); if (!isNaN(p) && p <= 0) return false; }
            const ageCol = cols.find((c) => /^age$/i.test(c));
            if (ageCol) { const a = numParse(r[ageCol]); if (!isNaN(a) && (a <= 0 || a > 100)) return false; }
            return true;
          });
          return { rows: out, detail: `${rs.length - out.length} rows dropped (impossible values)` };
        }),
      },
      {
        id: "missing", label: "Handle missing values", desc: R.id ? `Drop rows missing ${R.id}; fill text gaps 'Unknown'` : "Drop unjoinable rows; fill text gaps",
        run: () => apply("missing", "Handled missing values", (rs) => {
          const before = rs.length;
          const keyCol = R.id ?? cols[0];
          const out = rs
            .filter((r) => String(r[keyCol] ?? "").trim() !== "")
            .map((r) => {
              const c = { ...r };
              for (const col of cols) {
                const v = String(c[col] ?? "").trim();
                if (v === "" && col !== R.id && !R.date.includes(col) && typeof c[col] !== "number") c[col] = "Unknown";
              }
              return c;
            });
          return { rows: out, detail: `${before - out.length} unjoinable rows dropped, text gaps → 'Unknown'` };
        }),
      },
      {
        id: "revenue", label: "Recompute derived fields", desc: R.qty && R.price ? `revenue = ${R.qty} × ${R.price}` : "Derive revenue / availability",
        run: () => apply("revenue", "Recomputed derived fields", (rs) => {
          if (R.qty && R.price) {
            let n = 0;
            const out = rs.map((r) => {
              const u = numParse(r[R.qty!]);
              const p = numParse(r[R.price!]);
              const ok = !isNaN(u) && !isNaN(p);
              if (ok) n++;
              return { ...r, revenue: ok ? +(u * p).toFixed(2) : "" };
            });
            return { rows: out, detail: `revenue derived on ${n} rows` };
          }
          const onHand = cols.find((c) => /on_hand/i.test(c));
          const reserved = cols.find((c) => /reserved/i.test(c));
          if (onHand && reserved) {
            const out = rs.map((r) => ({ ...r, available: numParse(r[onHand]) - numParse(r[reserved]) }));
            return { rows: out, detail: `available = on_hand − reserved on ${out.length} rows` };
          }
          return { rows: rs, detail: "no derivable pair found in this file" };
        }),
      },
    ];
  }, [rows, cols, roles]);

  const exportClean = () => {
    if (!rows) return;
    const csv = Papa.unparse(rows);
    downloadFile("cleaned_data.csv", csv, "text/csv");
  };

  const exportLog = () => {
    const md = `# Cleaning Log\n\nDate: ${new Date().toISOString().slice(0, 10)}\nSource: ${loadedName ?? "imported CSV"}\nGrain: one row = one record\nRows: ${originalCount} raw → ${rows?.length ?? 0} clean\n\n## Actions taken\n${log.map((l) => `- ${l}`).join("\n")}\n`;
    downloadFile("cleaning_log.md", md, "text/markdown");
  };

  /* dynamic tips */
  const tips: string[] = React.useMemo(() => {
    if (!rows) return ["Load a messy sample (or your own CSV) — then read the profile **before** touching anything."];
    const t: string[] = [];
    if (dupCount > 0) t.push(`**${dupCount} duplicate rows** detected. Dedupe first — every total you compute before this is inflated.`);
    if (done.size === 0) t.push("Follow the recommended order shown under **Fix actions**. Cleaning is a pipeline, not a random walk.");
    if (done.size >= 3 && done.size < FIXES.length) t.push(`${done.size}/${FIXES.length} fixes applied. Re-check the **Issues found** tab — good cleaning shrinks it toward zero.`);
    if (totalIssues === 0 && done.size > 0) t.push("Profile is clean — export the **Clean CSV** and **Cleaning log**, then rebuild a dashboard on the trustworthy numbers.");
    return t.slice(0, 3);
  }, [rows, dupCount, done, totalIssues, FIXES.length]);

  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<BrushCleaning className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
        title="Data Cleaner"
        subtitle="Profile → fix → log → export. The 60–80% skill of real analytics, practiced on real mess."
        accent="amber"
        actions={
          <>
            <DatasetPicker onPick={(id) => loadSample(id)} />
            <Button size="sm" className="bg-amber-500 font-semibold text-black hover:bg-amber-400" onClick={() => loadSample("messy_sales")}><Sparkles className="h-4 w-4" /> Quick messy file</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button variant="outline" size="sm" className="border-border" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
          </>
        }
      />

      {!rows ? (
        <div className={`${PANEL} flex flex-col items-center justify-center gap-3 py-20 text-center`}>
          <ScanSearch className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Load a messy dataset (or any CSV) to start profiling</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground/70">
            You will find: whitespace & case chaos, mixed date formats, $-prefixed text prices,
            quoted numbers, duplicate rows, impossible values and missing fields — the seven horsemen.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {["messy_sales", "finance_gl", "messy_hr", "inventory"].map((id) => (
              <button key={id} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onClick={() => loadSample(id)}>
                {getDatasetById(id)!.name}
              </button>
            ))}
            <button className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onClick={() => downloadDatasetCSV("messy_sales")}>
              ⬇ messy_sales.csv
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* status bar */}
          <div className={`${PANEL} flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm`}>
            <div><span className="text-2xl font-bold text-foreground">{originalCount}</span><span className="ml-1.5 text-xs text-muted-foreground">raw rows</span></div>
            <div><span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{rows.length}</span><span className="ml-1.5 text-xs text-muted-foreground">clean rows</span></div>
            <div><span className="text-2xl font-bold text-amber-600 dark:text-amber-300">{totalIssues}</span><span className="ml-1.5 text-xs text-muted-foreground">issues detected</span></div>
            <div><span className="text-2xl font-bold text-sky-600 dark:text-sky-300">{done.size}</span><span className="ml-1.5 text-xs text-muted-foreground">fixes applied</span></div>
            {loadedName && <span className="hidden text-[11px] text-muted-foreground md:inline">source: {loadedName}</span>}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-8 border-border" onClick={exportClean}><Download className="h-3.5 w-3.5" /> Clean CSV</Button>
              <Button size="sm" variant="outline" className="h-8 border-border" onClick={exportLog}><FileWarning className="h-3.5 w-3.5" /> Cleaning log</Button>
            </div>
          </div>

          <Tabs defaultValue="issues">
            <TabsList className="border border-border bg-muted/50">
              <TabsTrigger value="issues" className="text-xs"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Issues found</TabsTrigger>
              <TabsTrigger value="fixes" className="text-xs"><BrushCleaning className="mr-1 h-3.5 w-3.5" /> Fix actions</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Data preview</TabsTrigger>
              <TabsTrigger value="log" className="text-xs">Cleaning log</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="mt-3">
              {dupCount > 0 && (
                <div className={`${PANEL} mb-3 flex items-center gap-3 border-amber-500/20 bg-amber-500/[0.05] px-4 py-3`}>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-[13px] text-amber-900 dark:text-amber-200/90"><b>{dupCount} exact duplicate rows</b> detected — inflating every total. Remove them first.</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((p) => (
                  <div key={p.col} className={`${PANEL} p-3`}>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[13px] font-semibold text-foreground">{p.col}</p>
                      <span className="text-[11px] text-muted-foreground">{p.distinct} distinct</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.issues.length === 0 ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"><CheckCheck className="mr-1 h-3 w-3" /> clean</Badge>
                      ) : (
                        p.issues.map((i) => (
                          <Badge key={i} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">{i}</Badge>
                        ))
                      )}
                    </div>
                    {p.missing > 0 && <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500/60" style={{ width: `${(p.missing / rows.length) * 100}%` }} /></div>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fixes" className="mt-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {FIXES.map((f) => (
                  <div key={f.id} className={`${PANEL} flex items-center justify-between gap-2 p-3`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{f.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{f.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={done.has(f.id) ? "outline" : "default"}
                      className={`h-8 shrink-0 ${done.has(f.id) ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-500 text-black hover:bg-amber-400"}`}
                      onClick={f.run}
                    >
                      {done.has(f.id) ? <><CheckCheck className="h-3.5 w-3.5" /> Re-run</> : "Apply"}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Recommended order: <b className="text-foreground">duplicates → trim → case → categories → dates → numbers → impossible values → missing → derived</b>.
                Every action is logged (Cleaning log tab) — that log ships with the project as evidence.
              </p>
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className={`${PANEL} overflow-auto scrollbar-thin`} style={{ maxHeight: "60vh" }}>
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-card">
                    <tr>{cols.map((c) => <th key={c} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/50">
                        {cols.map((c) => (
                          <td key={c} className={`max-w-[180px] truncate whitespace-nowrap px-3 py-1.5 font-mono ${String(r[c] ?? "") === "" ? "italic text-red-500/60 dark:text-red-400/50" : "text-foreground/85"}`}>
                            {String(r[c] ?? "") === "" ? "∅" : String(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">First 100 rows · empty cells shown as ∅</p>
            </TabsContent>

            <TabsContent value="log" className="mt-3">
              <div className={`${PANEL} p-4`}>
                {log.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actions yet. The log records every fix with counts — it becomes <span className="font-mono text-emerald-700 dark:text-emerald-300">analysis/cleaning_log.md</span> in your portfolio.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {log.map((l, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-foreground/85">
                        <span className="font-mono text-[11px] text-muted-foreground/60">{String(i + 1).padStart(2, "0")}</span>
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

      <Coach view="cleaner" accent="amber" mission={CLEANER_MISSION} tips={tips} why="Data scientists spend 60–80% of their time cleaning data, and companies feel it: one duplicated customer row can misprice a contract; one mixed date format can break a monthly close. The cleaning log you build here is exactly what auditors and teammates ask for." />
    </div>
  );
}
