"use client";

/* Projects — 7 real company scenarios. Step-by-step tasks, hints, rubrics,
   and one-click generation of a complete GitHub-ready project folder. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolHeader, PANEL, PANEL_HEAD, levelBadgeCls } from "./shared";
import { PROJECTS, type ProjectDef } from "@/lib/academy/projects";
import { generateProjectFiles } from "@/lib/academy/portfolio";
import { useAcademy } from "@/lib/academy/store";
import { getDatasetById } from "@/lib/academy/datasets";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Boxes, Briefcase, CheckCircle2, ChevronDown, Circle, Clock, FolderOutput, Lightbulb,
  ListChecks, Package, ScrollText, Target, Timer,
} from "lucide-react";

export function ProjectsView() {
  const { projectSteps, toggleStep, completedProjects, completeProject, addWorkspaceFiles, setView } = useAcademy();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [hints, setHints] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const project = openId ? PROJECTS.find((p) => p.id === openId) : null;

  const progressOf = (p: ProjectDef) => {
    const done = p.steps.filter((_, i) => projectSteps[`${p.id}:${i}`]).length;
    return { done, total: p.steps.length, pct: Math.round((done / p.steps.length) * 100) };
  };

  const toggleHint = (key: string) =>
    setHints((h) => { const n = new Set(h); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const generate = (p: ProjectDef) => {
    setBusy(true);
    try {
      const files = generateProjectFiles(p);
      const added = addWorkspaceFiles(files, p.id);
      completeProject(p.id);
      toast({
        title: "Portfolio folder generated 🎉",
        description: `${added} files added to Workspace → data-analytics-portfolio/${p.folder}. +100 XP`,
      });
    } finally {
      setBusy(false);
    }
  };

  /* ---------- project detail ---------- */
  if (project) {
    const prog = progressOf(project);
    const isDone = !!completedProjects[project.id];
    const ds = project.datasetId !== "sql" ? getDatasetById(project.datasetId) : null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-border" onClick={() => setOpenId(null)}><ArrowLeft className="h-4 w-4" /> All projects</Button>
        </div>

        <div className={`${PANEL} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl">{project.emoji}</span>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{project.title}</h1>
                <Badge variant="outline" className={levelBadgeCls(project.level)}>{project.level}</Badge>
                {isDone && <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Badge>}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Briefcase className="h-3.5 w-3.5" />{project.company} <span className="mx-1 text-muted-foreground/60">·</span> <Timer className="h-3.5 w-3.5" />{project.hours}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Steps</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{prog.done}/{prog.total}</p>
              </div>
              <div className="w-28"><Progress value={prog.pct} className="h-2" /></div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground/80">The scenario</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/80">{project.scenario}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"><Target className="h-3.5 w-3.5" /> Your task</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/80">{project.problem}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.skills.map((s) => <Badge key={s} variant="outline" className="border-border text-[10px] text-muted-foreground">{s}</Badge>)}
          </div>
        </div>

        <Tabs defaultValue="steps">
          <TabsList className="border border-border bg-card">
            <TabsTrigger value="steps" className="text-xs"><ListChecks className="mr-1 h-3.5 w-3.5" /> Steps</TabsTrigger>
            <TabsTrigger value="data" className="text-xs"><Boxes className="mr-1 h-3.5 w-3.5" /> Dataset</TabsTrigger>
            <TabsTrigger value="deliver" className="text-xs"><Package className="mr-1 h-3.5 w-3.5" /> Deliverables</TabsTrigger>
            <TabsTrigger value="rubric" className="text-xs"><ScrollText className="mr-1 h-3.5 w-3.5" /> Rubric</TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="mt-3 space-y-2">
            {project.steps.map((step, i) => {
              const done = !!projectSteps[`${project.id}:${i}`];
              const hintKey = `${project.id}:${i}`;
              return (
                <div key={i} className={`${PANEL} p-4`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleStep(project.id, i)} className={`mt-0.5 shrink-0 transition-colors ${done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60 hover:text-emerald-600 dark:hover:text-emerald-300"}`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14.5px] font-semibold ${done ? "text-muted-foreground/80 line-through" : "text-foreground"}`}>
                        <span className="mr-2 font-mono text-[11px] text-emerald-600/80 dark:text-emerald-400/80">STEP {i + 1}</span>
                        {step.title}
                      </p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{step.detail}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {step.tool && <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-300">🛠 {step.tool}</Badge>}
                        {step.hint && (
                          <button className="flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300" onClick={() => toggleHint(hintKey)}>
                            <Lightbulb className="h-3 w-3" /> {hints.has(hintKey) ? "Hide hint" : "Show hint"}
                          </button>
                        )}
                      </div>
                      {step.hint && hints.has(hintKey) && (
                        <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[12.5px] text-amber-100/90">💡 {step.hint}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className={`${PANEL} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><FolderOutput className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Generate portfolio folder</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground/80">
                  Creates the complete project folder (README, data, scripts, reports) in your Workspace — ready for GitHub. {prog.done < prog.total && "You can generate now and refine later."}
                </p>
              </div>
              <Button className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400" disabled={busy} onClick={() => generate(project)}>
                <FolderOutput className="h-4 w-4" /> {busy ? "Generating…" : `Generate ${project.folder}`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-3">
            {ds ? (
              <div className={PANEL}>
                <div className={PANEL_HEAD}>
                  <p className="text-sm font-semibold text-foreground">{ds.name}</p>
                  <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{ds.rows.length} rows</Badge>
                </div>
                <div className="p-4">
                  <p className="text-[13px] text-muted-foreground">{ds.description}</p>
                  <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-border scrollbar-thin">
                    <table className="w-full text-left text-[12px]">
                      <thead className="sticky top-0 bg-card">
                        <tr>{ds.columns.map((c) => <th key={c.key} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-300">{c.name}</th>)}</tr>
                      </thead>
                      <tbody>
                        {ds.rows.slice(0, 30).map((r, i) => (
                          <tr key={i} className="border-b border-border/60">
                            {ds.columns.map((c) => <td key={c.key} className="max-w-[160px] truncate whitespace-nowrap px-3 py-1.5 text-muted-foreground">{String(r[c.key] ?? "")}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground/60">First 30 rows — open the suggested tool to work with the full dataset.</p>
                </div>
              </div>
            ) : (
              <div className={`${PANEL} p-5`}>
                <p className="text-sm font-semibold text-foreground">🗄 SQL store database</p>
                <p className="mt-1 text-[13px] text-muted-foreground">This project uses the SQL Playground's store database: customers, orders, order_items, products, employees. Open the SQL Playground and browse the schema to start.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliver" className="mt-3">
            <div className={`${PANEL} p-4`}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground/80">Your folder will contain</p>
              <div className="space-y-1.5">
                {project.deliverables.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-[12.5px] text-emerald-800 dark:text-emerald-200/90">
                    <ChevronDown className="h-3 w-3 text-muted-foreground/60" />{d}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rubric" className="mt-3">
            <div className={`${PANEL} p-4`}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground/80">Definition of done — grade yourself honestly</p>
              <div className="space-y-1.5">
                {project.rubric.map((r, i) => (
                  <div key={i} className="flex gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[13.5px] text-foreground/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400/70" />{r}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  /* ---------- project grid ---------- */
  return (
    <div className="space-y-4">
      <ToolHeader
        icon={<Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        title="Real-World Projects"
        subtitle="7 company scenarios, step-by-step. Finish → generate the folder → push to GitHub. This IS your portfolio."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {PROJECTS.filter((p) => completedProjects[p.id]).length}/{PROJECTS.length} completed
          </div>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PROJECTS.map((p) => {
          const prog = progressOf(p);
          const isDone = !!completedProjects[p.id];
          return (
            <button key={p.id} onClick={() => setOpenId(p.id)} className={`${PANEL} group p-5 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.03]`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl">{p.emoji}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={levelBadgeCls(p.level)}>{p.level}</Badge>
                  {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-200">{p.title}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground/80"><Briefcase className="h-3 w-3" />{p.company.split("(")[0]}</p>
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">{p.problem}</p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground/80">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.hours}</span>
                <span>{p.steps.length} steps</span>
                <span>{p.skills.slice(0, 2).join(" · ")}…</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={prog.pct} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground/80">{prog.done}/{prog.total}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
