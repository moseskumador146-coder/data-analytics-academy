"use client";

/* Home — progress overview, how-the-platform-works, and quick navigation. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAcademy, levelFromXp, LEVELS, type ViewId } from "@/lib/academy/store";
import { PATH_LEVELS, TOTAL_LESSONS } from "@/lib/academy/curriculum";
import { PROJECTS } from "@/lib/academy/projects";
import {
  ArrowRight, BookOpen, BrushCleaning, Database, FileSpreadsheet, FolderGit2, Github, GraduationCap,
  Package, Rocket, Sparkles, Target, Workflow, BarChart3, Zap,
} from "lucide-react";

const TOOLS: { id: ViewId; icon: React.ReactNode; name: string; desc: string; color: string }[] = [
  { id: "excel", icon: <FileSpreadsheet className="h-5 w-5" />, name: "Excel Studio", desc: "Formula engine, SUMIF, stats, sort & dedupe, CSV in/out", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { id: "dashboard", icon: <BarChart3 className="h-5 w-5" />, name: "Dashboard Studio", desc: "Power BI-style builder: KPIs, charts, filters, saved dashboards", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { id: "sql", icon: <Database className="h-5 w-5" />, name: "SQL Playground", desc: "Real SQL engine: JOINs, GROUP BY, HAVING, CTEs + 10 drills", color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  { id: "cleaner", icon: <BrushCleaning className="h-5 w-5" />, name: "Data Cleaner", desc: "Profile messy data, one-click fixes, professional cleaning log", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { id: "automation", icon: <Workflow className="h-5 w-5" />, name: "Automation Studio", desc: "Visual ETL pipelines, quality gates, run logs → Python export", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
];

export function HomeView() {
  const { xp, completedLessons, completedProjects, workspaceFiles, setView, setLastPathLevel } = useAcademy();
  const lvl = levelFromXp(xp);
  const lessonsDone = Object.keys(completedLessons).length;
  const projectsDone = Object.keys(completedProjects).length;

  const startLearning = () => {
    setLastPathLevel("beginner");
    setView("paths");
  };

  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.04] to-emerald-900/20 p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"><Zap className="mr-1 h-3 w-3" /> 100% free · runs in your browser · zero delays</Badge>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
          Data Analytics Academy — <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">beginner to master</span>, by building real work.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {TOTAL_LESSONS} detailed lessons across 4 levels, 5 professional tools (Excel, BI dashboards, SQL, cleaning, automation) with live sample data,
          and {PROJECTS.length} real company projects that compile into a GitHub portfolio folder you download and ship.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button size="lg" className="bg-emerald-500 font-bold text-black hover:bg-emerald-400" onClick={startLearning}>
            <GraduationCap className="h-4 w-4" /> Start learning path
          </Button>
          <Button size="lg" variant="outline" className="border-emerald-500/30 bg-transparent hover:bg-muted/50" onClick={() => setView("projects")}>
            <Package className="h-4 w-4" /> See the {PROJECTS.length} projects
          </Button>
          <Button size="lg" variant="ghost" className="text-emerald-300 hover:bg-emerald-500/10" onClick={() => setView("excel")}>
            <Rocket className="h-4 w-4" /> Try the tools now
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Current level</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-300">{lvl.name}</p>
          <Progress value={lvl.progress} className="mt-2 h-1.5" />
          <p className="mt-1.5 text-[11px] text-muted-foreground/80">{lvl.next ? `${lvl.toNext} XP to ${lvl.next}` : "Max level reached"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Lessons completed</p>
          <p className="mt-1 text-xl font-extrabold text-white">{lessonsDone}<span className="text-sm text-muted-foreground/80">/{TOTAL_LESSONS}</span></p>
          <Progress value={(lessonsDone / TOTAL_LESSONS) * 100} className="mt-2 h-1.5" />
          <p className="mt-1.5 text-[11px] text-muted-foreground/80">+10 XP each</p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Projects completed</p>
          <p className="mt-1 text-xl font-extrabold text-white">{projectsDone}<span className="text-sm text-muted-foreground/80">/{PROJECTS.length}</span></p>
          <Progress value={(projectsDone / PROJECTS.length) * 100} className="mt-2 h-1.5" />
          <p className="mt-1.5 text-[11px] text-muted-foreground/80">+100 XP + portfolio folder each</p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Portfolio files</p>
          <p className="mt-1 text-xl font-extrabold text-white">{workspaceFiles.length}</p>
          <p className="mt-2 text-[11px] text-muted-foreground/80">Ready to ZIP → GitHub</p>
          <Button variant="link" size="sm" className="mt-1 h-6 p-0 text-[12px] text-emerald-300" onClick={() => setView("workspace")}>
            Open workspace <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* how it works */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Target className="h-5 w-5 text-emerald-400" /> How the academy works</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "1", icon: <BookOpen className="h-4 w-4" />, title: "Learn a skill", desc: "Short, deep lessons with real-world examples and practice tasks — no fluff, no videos to sit through." },
            { n: "2", icon: <Sparkles className="h-4 w-4" />, title: "Practice in the tools", desc: "Apply it instantly in the Excel, Dashboard, SQL, Cleaner or Automation studio with included datasets." },
            { n: "3", icon: <Package className="h-4 w-4" />, title: "Build a real project", desc: "7 company scenarios with step-by-step tasks: cleaning, dashboards, reports, SQL, pipelines, automation." },
            { n: "4", icon: <Github className="h-4 w-4" />, title: "Ship your portfolio", desc: "Generate a complete project folder → download the ZIP → push to GitHub with our copy-paste guide." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card/70 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-[12px] font-bold text-emerald-300">{s.n}</span>
                <span className="text-emerald-400">{s.icon}</span>
                <p className="text-sm font-bold text-white">{s.title}</p>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* tools */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Workflow className="h-5 w-5 text-emerald-400" /> Your free tool studio</h2>
        <p className="mt-1 text-[13px] text-muted-foreground/80">Everything a data analyst uses — rebuilt for the browser, instant and free.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setView(t.id)} className="group rounded-xl border border-border bg-card/70 p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${t.color}`}>{t.icon}</div>
              <p className="mt-3 text-sm font-bold text-white group-hover:text-emerald-200">{t.name}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/80">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* roadmap */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><GraduationCap className="h-5 w-5 text-emerald-400" /> The path: {PATH_LEVELS.length} levels</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          {PATH_LEVELS.map((l) => {
            const lessons = l.modules.flatMap((m) => m.lessons);
            const done = lessons.filter((ls) => completedLessons[ls.id]).length;
            return (
              <button key={l.id} onClick={() => { setLastPathLevel(l.id); setView("paths"); }} className="rounded-xl border border-border bg-card/70 p-4 text-left transition-all hover:border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{l.title}</p>
                  <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{l.duration}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/80">{l.tagline}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Progress value={(done / lessons.length) * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground/80">{done}/{lessons.length}</span>
                </div>
                <p className="mt-2 text-[11px] text-emerald-300/80">{l.modules.length} modules · {lessons.length} lessons · view outcomes →</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* levels ladder */}
      <div className="rounded-xl border border-border bg-card/70 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-white"><Rocket className="h-4 w-4 text-emerald-400" /> Rank ladder — earn XP by learning and building</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LEVELS.map((L, i) => {
            const reached = xp >= L.xp;
            return (
              <div key={L.name} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors ${reached ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-border text-muted-foreground/80"}`}>
                <span className="font-mono text-[10px]">{i + 1}</span>
                <span className="font-semibold">{L.name}</span>
                <span className="font-mono text-[10px] opacity-60">{L.xp} XP</span>
                {reached && <span>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* projects teaser */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-white"><FolderGit2 className="h-4 w-4 text-emerald-400" /> Every finished project becomes a GitHub-ready folder</p>
          <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
            README with your write-up, raw + cleaned data, reproducible Python, SQL queries, dashboard definitions and executive summaries — structured exactly the way hiring managers expect.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400" onClick={() => setView("projects")}>Browse projects <ArrowRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="border-emerald-500/30" onClick={() => setView("workspace")}>My workspace</Button>
        </div>
      </div>
    </div>
  );
}
