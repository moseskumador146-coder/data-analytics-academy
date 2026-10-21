"use client";

/* PracticeLab — the hands-on practice test embedded INSIDE every lesson.
   Real data preview, real tool interfaces (Excel formulas / SQL editor /
   DAX measure studio / fix-picking / quiz), progressive hints, function help,
   and auto-checking by the real engines. Passing awards +25 XP and marks the
   lesson complete (gated progression). */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAcademy } from "@/lib/academy/store";
import { getDatasetById, getSqlTables, type Row } from "@/lib/academy/datasets";
import { evalSheetFormula, FormulaError } from "@/lib/academy/formula-engine";
import { createDaxEngine, daxDisplay } from "@/lib/academy/dax-engine";
import { runSql } from "@/lib/academy/sql-engine";
import { EXCEL_SHEET_NOTE, SQL_TABLES_NOTE, DAX_MODEL_NOTE, type Practice } from "@/lib/academy/practices";
import {
  Award, CheckCircle2, ChevronDown, Database, Eye, FlaskConical, Lightbulb, Lock,
  Play, Sigma, Sparkles, Table2, XCircle,
} from "lucide-react";

const FULL_TOOL: Record<string, { view: "excel" | "sql" | "dashboard"; label: string }> = {
  excel: { view: "excel", label: "Open Excel Studio" },
  sql: { view: "sql", label: "Open SQL Playground" },
  dax: { view: "dashboard", label: "Open Dashboard Studio" },
};

/* ---------- data previews ---------- */

function ExcelPreview({ datasetId }: { datasetId: string }) {
  const ds = getDatasetById(datasetId);
  const rows = React.useMemo(() => (ds?.rows ?? []).slice(0, 6), [ds]);
  const cols = React.useMemo(() => (ds ? Object.keys(ds.rows[0] ?? {}) : []), [ds]);
  if (!ds) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="max-h-56 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="bg-muted/70">
              <th className="sticky left-0 z-10 border-b border-r border-border bg-muted/90 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">#</th>
              {cols.map((c, i) => (
                <th key={c} className="border-b border-r border-border px-2 py-1 text-left font-semibold whitespace-nowrap text-foreground/90">
                  <span className="mr-1 font-mono text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400">{String.fromCharCode(65 + i)}</span>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="even:bg-muted/25">
                <td className="sticky left-0 z-10 border-b border-r border-border bg-background/95 px-2 py-1 text-center font-mono text-[10px] font-bold text-muted-foreground">{ri + 2}</td>
                {cols.map((c) => (
                  <td key={c} className="max-w-[130px] truncate border-b border-r border-border/60 px-2 py-1 text-foreground/80">{String(r[c] ?? "")}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="border-r border-border bg-muted/30 px-2 py-1 text-center font-mono text-[10px] text-muted-foreground">…</td>
              {cols.map((c) => <td key={c} className="border-r border-border/60 bg-muted/30 px-2 py-1 text-muted-foreground/50">…</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">{EXCEL_SHEET_NOTE}</p>
    </div>
  );
}

function MessyPreview({ datasetId }: { datasetId: string }) {
  const ds = getDatasetById(datasetId);
  const rows = React.useMemo(() => (ds?.rows ?? []).slice(0, 5), [ds]);
  const cols = React.useMemo(() => (ds ? Object.keys(ds.rows[0] ?? {}) : []), [ds]);
  if (!ds) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="max-h-52 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-muted/70">
              {cols.map((c) => <th key={c} className="border-b border-r border-border px-2 py-1 text-left font-semibold whitespace-nowrap text-foreground/90">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Row, ri: number) => (
              <tr key={ri} className="even:bg-muted/25">
                {cols.map((c) => <td key={c} className="max-w-[120px] truncate border-b border-r border-border/60 px-2 py-1 text-foreground/80">{String(r[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">{ds.rows.length.toLocaleString()} rows — this is the messy file the situations below come from.</p>
    </div>
  );
}

function SqlPreview() {
  const tables = React.useMemo(() => getSqlTables(), []);
  return (
    <div className="rounded-lg border border-border bg-muted/25 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><Database className="h-3.5 w-3.5" /> Tables you can query</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(tables).map(([name, t]) => (
          <span key={name} className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground/85">
            {name} <span className="text-muted-foreground">· {t.rows.length} rows</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{SQL_TABLES_NOTE}</p>
    </div>
  );
}

/* ---------- main component ---------- */

export function PracticeLab({ lessonId, practice }: { lessonId: string; practice: Practice }) {
  const { completedPractices, completePractice, setView } = useAcademy();
  const passedBefore = !!completedPractices[lessonId];

  const [hintsShown, setHintsShown] = React.useState(0);
  const [solutionsShown, setSolutionsShown] = React.useState(passedBefore);
  const [done, setDone] = React.useState(passedBefore);
  const [justPassed, setJustPassed] = React.useState(false);
  const [openData, setOpenData] = React.useState(false);

  const finish = () => {
    if (!done) {
      completePractice(lessonId); // +25 XP, marks lesson complete
      setJustPassed(true);
      setDone(true);
      setSolutionsShown(true);
    }
  };

  const allHintsShown = hintsShown >= practice.hints.length;
  const showSolutions = solutionsShown && allHintsShown;
  const fullTool = FULL_TOOL[practice.kind];

  return (
    <section className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/[0.04]" aria-label="Practice lab">
      {/* head */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <FlaskConical className="h-4 w-4" /> Practice lab — do it to complete this lesson
          {done && <span className="ml-1 flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> passed</span>}
        </p>
        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">+25 XP</span>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[14.5px] font-bold text-foreground">{practice.title}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/80">{practice.brief}</p>
        </div>

        {/* data — collapsible so the interface stays tight */}
        {(practice.dataset || practice.kind === "sql") && (
          <div className="rounded-lg border border-border bg-card">
            <button className="flex w-full items-center justify-between px-3 py-2 text-left" onClick={() => setOpenData(!openData)} aria-expanded={openData}>
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground"><Table2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Your data {practice.dataset ? `· ${getDatasetById(practice.dataset)?.name ?? practice.dataset}` : "· store database"}</span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openData && "rotate-180")} />
            </button>
            {openData && (
              <div className="px-3 pb-3">
                {practice.kind === "sql" ? <SqlPreview /> : practice.kind === "clean" ? <MessyPreview datasetId={practice.dataset ?? "messy_sales"} /> : <ExcelPreview datasetId={practice.dataset ?? "clean_sales"} />}
              </div>
            )}
          </div>
        )}

        {/* the interface */}
        {practice.kind === "quiz" && practice.questions && <QuizRun questions={practice.questions} onPass={finish} done={done} />}
        {practice.kind === "clean" && practice.issues && <CleanRun issues={practice.issues} onPass={finish} done={done} />}
        {practice.kind === "excel" && practice.tasks && <ExcelRun tasks={practice.tasks} onPass={finish} done={done} />}
        {practice.kind === "sql" && practice.sqlTasks && <SqlRun tasks={practice.sqlTasks} onPass={finish} done={done} />}
        {practice.kind === "dax" && practice.daxTasks && <DaxRun tasks={practice.daxTasks} onPass={finish} done={done} />}

        {/* hints + solutions */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            {hintsShown < practice.hints.length && (
              <Button variant="outline" size="sm" className="h-7 border-amber-500/40 text-[11.5px] text-amber-700 hover:bg-amber-500/10 dark:text-amber-300" onClick={() => setHintsShown((h) => h + 1)}>
                <Lightbulb className="h-3.5 w-3.5" /> Show hint ({hintsShown + 1}/{practice.hints.length})
              </Button>
            )}
            {allHintsShown && !showSolutions && practice.kind !== "quiz" && (
              <Button variant="outline" size="sm" className="h-7 text-[11.5px]" onClick={() => setSolutionsShown(true)}>
                <Eye className="h-3.5 w-3.5" /> Show model answers
              </Button>
            )}
            {!done && <span className="text-[11px] text-muted-foreground">Stuck? Hints first — the answers unlock after all hints.</span>}
          </div>
          {hintsShown > 0 && (
            <ol className="mt-2 space-y-1">
              {practice.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-100/90">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-500/20 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">{i + 1}</span>{h}
                </li>
              ))}
            </ol>
          )}
          {showSolutions && (
            <div className="mt-2 space-y-2">
              {practice.tasks?.map((t) => (
                <p key={t.cell} className="font-mono text-[12px] text-foreground/90"><span className="text-muted-foreground">{t.cell}:</span> {t.solution}</p>
              ))}
              {practice.sqlTasks?.map((t, i) => (
                <pre key={i} className="code-surface overflow-x-auto rounded-md border border-border p-2 font-mono text-[11.5px] text-foreground/90 scrollbar-thin">{t.solution}</pre>
              ))}
              {practice.daxTasks?.map((t, i) => (
                <p key={i} className="font-mono text-[12px] text-foreground/90">= {t.solution}</p>
              ))}
              {practice.issues?.map((iss, i) => (
                <p key={i} className="text-[12.5px] text-foreground/90"><span className="font-semibold">#{i + 1}</span> → {iss.options[iss.correct]}</p>
              ))}
            </div>
          )}
        </div>

        {/* help */}
        <div className="flex flex-wrap items-center gap-2">
          {practice.functions?.map((f) => (
            <span key={f} className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{f}</span>
          ))}
          {(practice.functions?.length || fullTool) && <span className="text-[11px] text-muted-foreground">need the full reference?</span>}
          <button className="text-[11.5px] font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300" onClick={() => setView("functions")}>Open Functions Lab</button>
          {fullTool && (
            <button className="flex items-center gap-1 text-[11.5px] font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300" onClick={() => setView(fullTool.view)}>
              <Sigma className="h-3 w-3" /> {fullTool.label}
            </button>
          )}
        </div>

        {/* pass banner */}
        {(done || justPassed) && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
            {done ? <Award className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {justPassed ? "Practice passed — +25 XP and this lesson is marked complete. Next lesson unlocked!" : "You already passed this lab. Replay freely — no double XP."}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- quiz ---------- */

function QuizRun({ questions, onPass, done }: { questions: NonNullable<Practice["questions"]>; onPass: () => void; done: boolean }) {
  const [picked, setPicked] = React.useState<Record<number, number>>({});
  const [wrong, setWrong] = React.useState<Record<number, boolean>>({});
  const solvedCount = questions.filter((q, i) => picked[i] === q.correct).length;
  const allSolved = solvedCount === questions.length;

  React.useEffect(() => { if (allSolved) onPass(); }, [allSolved]);

  const pick = (qi: number, oi: number) => {
    if (picked[qi] === questions[qi].correct || done) return;
    setPicked((p) => ({ ...p, [qi]: oi }));
    setWrong((w) => ({ ...w, [qi]: oi !== questions[qi].correct }));
  };

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => {
        const ok = picked[qi] === q.correct;
        return (
          <div key={qi} className={cn("rounded-lg border bg-card p-3", ok ? "border-emerald-500/40" : wrong[qi] ? "border-red-500/40" : "border-border")}>
            <p className="text-[13.5px] font-semibold text-foreground"><span className="mr-1.5 text-muted-foreground">Q{qi + 1}.</span>{q.q}</p>
            <div className="mt-2 grid gap-1.5">
              {q.options.map((o, oi) => {
                const isPicked = picked[qi] === oi;
                const isCorrect = ok && isPicked;
                return (
                  <button
                    key={oi}
                    onClick={() => pick(qi, oi)}
                    disabled={ok}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors",
                      isCorrect ? "border-emerald-500/50 bg-emerald-500/[0.08] text-foreground" : isPicked ? "border-red-500/50 bg-red-500/[0.06] text-foreground" : "border-border text-foreground/80 hover:bg-muted/60",
                      ok && !isPicked && "opacity-55"
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[9.5px] font-bold", isCorrect ? "border-emerald-500 bg-emerald-500 text-black" : isPicked ? "border-red-500 bg-red-500 text-white" : "border-border text-muted-foreground")}>{String.fromCharCode(65 + oi)}</span>
                    <span className="min-w-0 flex-1">{o}</span>
                    {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                  </button>
                );
              })}
            </div>
            {(ok || wrong[qi]) && (
              <p className={cn("mt-2 rounded-md px-2.5 py-1.5 text-[12px] leading-relaxed", ok ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200/90" : "bg-red-500/10 text-red-700 dark:text-red-300/90")}>
                {ok ? "✓ " : "✗ Not quite — try another option. "}{q.explain}
              </p>
            )}
          </div>
        );
      })}
      <p className="text-[11.5px] text-muted-foreground">{solvedCount}/{questions.length} answered correctly — wrong picks can be retried.</p>
    </div>
  );
}

/* ---------- clean (fix picking) ---------- */

function CleanRun({ issues, onPass, done }: { issues: NonNullable<Practice["issues"]>; onPass: () => void; done: boolean }) {
  const [picked, setPicked] = React.useState<Record<number, number>>({});
  const [checked, setChecked] = React.useState(false);
  const allCorrect = issues.every((iss, i) => picked[i] === iss.correct);

  React.useEffect(() => { if (checked && allCorrect) onPass(); }, [checked, allCorrect]);

  return (
    <div className="space-y-3">
      {issues.map((iss, i) => {
        const ok = checked && picked[i] === iss.correct;
        return (
          <div key={i} className={cn("rounded-lg border bg-card p-3", checked ? (ok ? "border-emerald-500/40" : "border-red-500/40") : "border-border")}>
            <p className="text-[13px] font-semibold text-foreground"><span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">SITUATION {i + 1}</span>{iss.situation}</p>
            <div className="mt-2 grid gap-1.5">
              {iss.options.map((o, oi) => (
                <button
                  key={oi}
                  onClick={() => { if (!done) { setPicked((p) => ({ ...p, [i]: oi })); setChecked(false); } }}
                  disabled={done && ok}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-[12.5px] transition-colors",
                    picked[i] === oi ? "border-emerald-500/50 bg-emerald-500/[0.07] text-foreground" : "border-border text-foreground/80 hover:bg-muted/60"
                  )}
                >
                  <span className={cn("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[9.5px] font-bold", picked[i] === oi ? "border-emerald-500 bg-emerald-500 text-black" : "border-border text-muted-foreground")}>{String.fromCharCode(65 + oi)}</span>
                  {o}
                </button>
              ))}
            </div>
            {checked && (
              <p className={cn("mt-2 rounded-md px-2.5 py-1.5 text-[12px] leading-relaxed", ok ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200/90" : "bg-red-500/10 text-red-700 dark:text-red-300/90")}>
                {ok ? "✓ Correct call. " : "✗ Wrong call. "}{iss.explain}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 bg-amber-500 font-semibold text-black hover:bg-amber-400" disabled={Object.keys(picked).length < issues.length} onClick={() => setChecked(true)}>
          <Play className="h-3.5 w-3.5" /> Check my calls
        </Button>
        {!checked && Object.keys(picked).length < issues.length && <span className="text-[11.5px] text-muted-foreground">pick an action for every situation</span>}
        {checked && !allCorrect && <span className="text-[11.5px] text-red-600 dark:text-red-400">Some calls are wrong — read the feedback and adjust.</span>}
      </div>
    </div>
  );
}

/* ---------- excel ---------- */

const EXCEL_COL_KEYS = ["order_id", "order_date", "customer", "region", "category", "product", "units", "unit_price", "revenue", "channel", "payment_method"];

function buildCells(): Record<string, string> {
  const ds = getDatasetById("clean_sales");
  const cells: Record<string, string> = {};
  EXCEL_COL_KEYS.forEach((c, i) => { cells[`${String.fromCharCode(65 + i)}1`] = c; });
  ds?.rows.slice(0, 198).forEach((row: Row, r) => {
    EXCEL_COL_KEYS.forEach((c, ci) => {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "") cells[`${String.fromCharCode(65 + ci)}${r + 2}`] = String(v);
    });
  });
  return cells;
}

function ExcelRun({ tasks, onPass, done }: { tasks: NonNullable<Practice["tasks"]>; onPass: () => void; done: boolean }) {
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [verdicts, setVerdicts] = React.useState<Record<number, { ok: boolean; msg: string } | undefined>>({});
  const cells = React.useMemo(() => buildCells(), []);

  const checkAll = () => {
    const userCells = { ...cells };
    tasks.forEach((t, i) => { if (answers[i]) userCells[t.cell] = answers[i]; });
    const solCells = { ...cells };
    tasks.forEach((t) => { solCells[t.cell] = t.solution; });
    const v: Record<number, { ok: boolean; msg: string }> = {};
    let allOk = true;
    tasks.forEach((t, i) => {
      const src = (answers[i] ?? "").trim();
      if (!src) { v[i] = { ok: false, msg: `empty — ${t.cell} needs a formula` }; allOk = false; return; }
      try {
        const uv = evalSheetFormula(src.replace(/^=/, ""), userCells, new Set());
        const sv = evalSheetFormula(t.solution.replace(/^=/, ""), solCells, new Set());
        const ok = typeof sv === "number"
          ? typeof uv === "number" && Math.abs(uv - sv) <= Math.max(0.02, Math.abs(sv) * 1e-6)
          : String(uv).toLowerCase() === String(sv).toLowerCase();
        v[i] = ok
          ? { ok: true, msg: typeof uv === "number" ? `= ${uv.toLocaleString("en-US", { maximumFractionDigits: 2 })} ✓` : `${uv} ✓` }
          : { ok: false, msg: `got ${typeof uv === "number" ? uv.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(uv)} — expected ${typeof sv === "number" ? sv.toLocaleString("en-US", { maximumFractionDigits: 2 }) : sv}. Hint: ${t.hint}` };
        if (!ok) allOk = false;
      } catch (e) {
        allOk = false;
        v[i] = { ok: false, msg: e instanceof FormulaError ? `formula error: ${e.message}` : (e as Error).message };
      }
    });
    setVerdicts(v);
    if (allOk) onPass();
  };

  return (
    <div className="space-y-3">
      {tasks.map((t, i) => {
        const live = answers[i]?.trim().startsWith("=") ? tryEval(answers[i], cells) : null;
        const v = verdicts[i];
        return (
          <div key={t.cell} className={cn("rounded-lg border bg-card p-3", v ? (v.ok ? "border-emerald-500/40" : "border-red-500/40") : "border-border")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">{t.cell}</span>
              <p className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">{t.prompt}</p>
            </div>
            <div className="mt-2 flex items-stretch gap-2">
              <span className="flex items-center rounded-md border border-r-0 border-border bg-muted/60 px-2 font-mono text-[12px] font-bold text-muted-foreground">fx</span>
              <input
                value={answers[i] ?? ""}
                onChange={(e) => { setAnswers((a) => ({ ...a, [i]: e.target.value })); setVerdicts((vv) => ({ ...vv, [i]: undefined })); }}
                placeholder="=SUM(...)"
                disabled={v?.ok}
                spellCheck={false}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[12.5px] text-foreground outline-none focus:border-emerald-500/60 disabled:opacity-60"
                aria-label={`Answer cell ${t.cell}`}
              />
            </div>
            {live !== null && !v && <p className="mt-1 text-[11px] text-muted-foreground">live: {live}</p>}
            {v && <p className={cn("mt-1.5 text-[12px] leading-relaxed", v.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>{v.msg}</p>}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 bg-amber-500 font-semibold text-black hover:bg-amber-400" onClick={checkAll} disabled={done}>
          <Play className="h-3.5 w-3.5" /> Check formulas
        </Button>
        <span className="text-[11.5px] text-muted-foreground">the real formula engine evaluates your cells</span>
      </div>
    </div>
  );
}

function tryEval(src: string, cells: Record<string, string>): string {
  try {
    const v = evalSheetFormula(src.replace(/^=/, ""), cells, new Set());
    return typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(v);
  } catch {
    return "…";
  }
}

/* ---------- sql ---------- */

function SqlRun({ tasks, onPass, done }: { tasks: NonNullable<Practice["sqlTasks"]>; onPass: () => void; done: boolean }) {
  const tables = React.useMemo(() => getSqlTables(), []);
  const [queries, setQueries] = React.useState<Record<number, string>>({});
  const [results, setResults] = React.useState<Record<number, { cols: string[]; rows: string[][]; n: number }>>({});
  const [verdicts, setVerdicts] = React.useState<Record<number, { ok: boolean; msg: string } | undefined>>({});

  /** Runs task i against the engine; returns true when it matches the model. */
  const runTask = (i: number): boolean => {
    const q = (queries[i] ?? "").trim();
    if (!q) { setVerdicts((v) => ({ ...v, [i]: { ok: false, msg: "write a query first" } })); return false; }
    try {
      const mine = runSql(q, tables);
      const model = runSql(tasks[i].solution, tables);
      const disp = { cols: mine.columns, rows: mine.rows.slice(0, 5).map((r) => r.map((c) => String(c ?? ""))), n: mine.rows.length };
      setResults((r) => ({ ...r, [i]: disp }));
      const sameShape = mine.columns.length === model.columns.length;
      const norm = (rows: unknown[][]) => rows.map((r) => r.map((c) => String(c ?? "")).join("\u0001")).sort();
      const sameRows = tasks[i].orderInsensitive
        ? JSON.stringify(norm(mine.rows as unknown[][])) === JSON.stringify(norm(model.rows as unknown[][]))
        : JSON.stringify(mine.rows) === JSON.stringify(model.rows);
      const ok = sameShape && sameRows && mine.rows.length === model.rows.length;
      setVerdicts((v) => ({
        ...v,
        [i]: ok
          ? { ok: true, msg: `${mine.rows.length} rows — matches the expected result ✓` }
          : { ok: false, msg: `returned ${mine.rows.length} rows × ${mine.columns.length} cols — expected ${model.rows.length} rows × ${model.columns.length} cols. Re-check the task.` },
      }));
      return ok;
    } catch (e) {
      setVerdicts((v) => ({ ...v, [i]: { ok: false, msg: (e as Error).message } }));
      return false;
    }
  };

  const checkAll = () => {
    const oks = tasks.map((_, i) => runTask(i));
    if (oks.every(Boolean)) onPass();
  };

  const runOne = (i: number) => {
    if (runTask(i)) {
      // this task passes — re-run the others so an all-pass finishes the lab
      const oks = tasks.map((_, j) => (j === i ? true : runTask(j)));
      if (oks.every(Boolean)) onPass();
    }
  };

  return (
    <div className="space-y-3">
      {tasks.map((t, i) => {
        const v = verdicts[i];
        const r = results[i];
        return (
          <div key={i} className={cn("rounded-lg border bg-card p-3", v ? (v.ok ? "border-emerald-500/40" : "border-red-500/40") : "border-border")}>
            <p className="text-[13px] font-semibold text-foreground"><span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">TASK {i + 1}</span>{t.prompt}</p>
            <textarea
              value={queries[i] ?? ""}
              onChange={(e) => setQueries((qs) => ({ ...qs, [i]: e.target.value }))}
              rows={3}
              spellCheck={false}
              placeholder="SELECT ..."
              className="mt-2 w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 font-mono text-[12.5px] leading-relaxed text-foreground outline-none focus:border-sky-500/60"
              aria-label={`SQL task ${i + 1}`}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[11.5px]" onClick={() => runOne(i)}><Play className="h-3 w-3" /> Run &amp; check</Button>
              {r && <span className="text-[11px] text-muted-foreground">{r.n} rows returned{r.n > 5 ? " · showing first 5" : ""}</span>}
            </div>
            {r && (
              <div className="mt-2 max-h-44 overflow-auto rounded-md border border-border scrollbar-thin">
                <table className="w-full border-collapse text-[11px]">
                  <thead><tr className="bg-muted/70">{r.cols.map((c) => <th key={c} className="border-b border-border px-2 py-1 text-left font-semibold text-foreground/85">{c}</th>)}</tr></thead>
                  <tbody>{r.rows.map((row, ri) => <tr key={ri} className="even:bg-muted/25">{row.map((cell, ci) => <td key={ci} className="max-w-[150px] truncate border-b border-border/50 px-2 py-1 text-foreground/80">{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {v && <p className={cn("mt-1.5 text-[12px] leading-relaxed", v.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>{v.msg}</p>}
          </div>
        );
      })}
      {tasks.length > 1 && (
        <Button size="sm" className="h-8 bg-amber-500 font-semibold text-black hover:bg-amber-400" onClick={checkAll} disabled={done}><Play className="h-3.5 w-3.5" /> Check all tasks</Button>
      )}
    </div>
  );
}

/* ---------- dax ---------- */

function DaxRun({ tasks, onPass, done }: { tasks: NonNullable<Practice["daxTasks"]>; onPass: () => void; done: boolean }) {
  const dax = React.useMemo(() => createDaxEngine("Sales", getDatasetById("clean_sales")!.rows, []), []);
  const [exprs, setExprs] = React.useState<Record<number, string>>({});
  const [verdicts, setVerdicts] = React.useState<Record<number, { ok: boolean; msg: string }>>({});

  const checkAll = () => {
    const v: Record<number, { ok: boolean; msg: string }> = {};
    let allOk = true;
    tasks.forEach((t, i) => {
      const src = (exprs[i] ?? "").trim();
      if (!src) { v[i] = { ok: false, msg: "write the measure first" }; allOk = false; return; }
      try {
        const mine = dax.evaluate(stripName(src));
        const model = dax.evaluate(t.solution);
        const ok = typeof model.value === "number"
          ? typeof mine.value === "number" && Math.abs(mine.value - model.value) <= Math.max(0.02, Math.abs(model.value) * 1e-6)
          : String(mine.value).toLowerCase() === String(model.value).toLowerCase();
        v[i] = ok
          ? { ok: true, msg: `= ${daxDisplay(mine.value)} ✓` }
          : { ok: false, msg: `evaluated to ${daxDisplay(mine.value)} — expected ${daxDisplay(model.value)}. Check the hint.` };
        if (!ok) allOk = false;
      } catch (e) {
        allOk = false;
        v[i] = { ok: false, msg: (e as Error).message };
      }
    });
    setVerdicts(v);
    if (allOk) onPass();
  };

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-border bg-muted/25 px-3 py-2 text-[11.5px] text-muted-foreground">{DAX_MODEL_NOTE}</p>
      {tasks.map((t, i) => {
        const v = verdicts[i];
        return (
          <div key={i} className={cn("rounded-lg border bg-card p-3", v ? (v.ok ? "border-emerald-500/40" : "border-red-500/40") : "border-border")}>
            <p className="text-[13px] font-semibold text-foreground"><span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">MEASURE {i + 1}</span>{t.prompt}</p>
            <div className="mt-2 flex items-stretch gap-2">
              <span className="flex items-center rounded-md border border-r-0 border-border bg-muted/60 px-2 font-mono text-[12px] font-bold text-muted-foreground">=</span>
              <input
                value={exprs[i] ?? ""}
                onChange={(e) => setExprs((x) => ({ ...x, [i]: e.target.value }))}
                placeholder="SUM('Sales'[revenue])"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[12.5px] text-foreground outline-none focus:border-sky-500/60"
                aria-label={`DAX measure ${i + 1}`}
              />
            </div>
            {v && <p className={cn("mt-1.5 font-mono text-[12px] leading-relaxed", v.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>{v.msg}</p>}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 bg-amber-500 font-semibold text-black hover:bg-amber-400" onClick={checkAll} disabled={done}><Play className="h-3.5 w-3.5" /> Evaluate &amp; check</Button>
        <span className="text-[11.5px] text-muted-foreground">the mini-DAX engine runs your measure on the Sales model</span>
      </div>
    </div>
  );
}

/** Accept "Measure Name = expression" — strip the name when it's a plain name. */
function stripName(src: string): string {
  const named = src.match(/^[A-Za-z][A-Za-z0-9 _'%-]*\s*=(?![=>])\s*([\s\S]+)$/);
  return named ? named[1].trim() : src;
}
