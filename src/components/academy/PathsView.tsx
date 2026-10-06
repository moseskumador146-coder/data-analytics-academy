"use client";

/* Learning Paths — Beginner → Intermediate → Advanced → Master.
   Sidebar curriculum browser + detailed lesson viewer with progress tracking. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Md, PANEL } from "./shared";
import { PATH_LEVELS, findLesson } from "@/lib/academy/curriculum";
import { useAcademy } from "@/lib/academy/store";
import {
  Award, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, GraduationCap, Layers3, Lightbulb, ListChecks, Target,
} from "lucide-react";

const LEVEL_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  beginner: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-400" },
  intermediate: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-400" },
  advanced: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-300", dot: "bg-orange-400" },
  master: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-300", dot: "bg-rose-400" },
};

export function PathsView() {
  const { completedLessons, toggleLesson, lastPathLevel, setLastPathLevel } = useAcademy();
  const [openLevel, setOpenLevel] = React.useState(lastPathLevel);
  const [lessonId, setLessonId] = React.useState<string | null>(PATH_LEVELS[0].modules[0].lessons[0].id);

  const flat = PATH_LEVELS.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((ls) => ({ id: ls.id, level: l.id }))));
  const doneCount = flat.filter((l) => completedLessons[l.id]).length;
  const totalMin = PATH_LEVELS.flatMap((l) => l.modules).flatMap((m) => m.lessons).reduce((s, ls) => s + ls.minutes, 0);

  const lesson = lessonId ? findLesson(lessonId) : null;
  const lessonIdx = lessonId ? flat.findIndex((l) => l.id === lessonId) : -1;
  const prev = lessonIdx > 0 ? flat[lessonIdx - 1] : null;
  const next = lessonIdx >= 0 && lessonIdx < flat.length - 1 ? flat[lessonIdx + 1] : null;
  const isDone = lessonId ? !!completedLessons[lessonId] : false;

  const openLesson = (id: string) => {
    const l = flat.find((f) => f.id === id);
    if (l) setLastPathLevel(l.level);
    setOpenLevel(l?.level ?? openLevel);
    setLessonId(id);
    if (typeof window !== "undefined") document.getElementById("lesson-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const levelProgress = (levelId: string) => {
    const ls = PATH_LEVELS.find((l) => l.id === levelId)!.modules.flatMap((m) => m.lessons);
    const done = ls.filter((l) => completedLessons[l.id]).length;
    return { done, total: ls.length, pct: Math.round((done / ls.length) * 100) };
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"><GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Learning Paths</h1>
            <p className="text-[13px] text-muted-foreground">Beginner → Master · {PATH_LEVELS.length} levels · {flat.length} lessons · ~{Math.round(totalMin / 60)} hours of material</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Your progress</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{doneCount}/{flat.length} lessons</p>
          </div>
          <div className="w-32"><Progress value={(doneCount / flat.length) * 100} className="h-2" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* curriculum browser */}
        <div className="space-y-2.5">
          {PATH_LEVELS.map((level) => {
            const prog = levelProgress(level.id);
            const c = LEVEL_COLORS[level.id];
            const open = openLevel === level.id;
            return (
              <div key={level.id} className={`${PANEL} overflow-hidden ${open ? c.border : ""}`}>
                <button className="w-full px-4 py-3 text-left" onClick={() => setOpenLevel(open ? "" : level.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`flex items-center gap-2 text-sm font-bold ${open ? c.text : "text-foreground/90"}`}>
                        <span className={`h-2 w-2 rounded-full ${c.dot}`} />{level.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{level.duration} · {level.modules.length} modules</p>
                    </div>
                    <Badge variant="outline" className={`${c.bg} border-0 text-[10px] ${c.text}`}>{prog.done}/{prog.total}</Badge>
                  </div>
                  {open && <Progress value={prog.pct} className="mt-2 h-1" />}
                </button>
                {open && (
                  <div className="border-t border-border/60 px-2 pb-2">
                    {level.modules.map((m) => (
                      <div key={m.id} className="mt-2">
                        <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{m.title}</p>
                        {m.lessons.map((ls, li) => {
                          const done = !!completedLessons[ls.id];
                          const active = lessonId === ls.id;
                          return (
                            <button
                              key={ls.id}
                              onClick={() => openLesson(ls.id)}
                              className={`mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors ${
                                active ? "bg-emerald-500/15 text-emerald-200" : done ? "text-muted-foreground/80 hover:bg-muted/60" : "text-foreground/80 hover:bg-muted/60"
                              }`}
                            >
                              {done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> : active ? <BookOpen className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" /> : <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
                              <span className="min-w-0 flex-1 truncate">{li + 1}. {ls.title}</span>
                              <span className="shrink-0 text-[10px] text-muted-foreground/60">{ls.minutes}m</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* lesson viewer */}
        <div id="lesson-content">
          {lesson && (
            <div className={`${PANEL} scroll-mt-20`}>
              <div className="border-b border-border px-5 py-4 sm:px-7">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <Badge variant="outline" className={`${LEVEL_COLORS[flat[lessonIdx].level].bg} border-0 text-[10px] ${LEVEL_COLORS[flat[lessonIdx].level].text}`}>
                    {PATH_LEVELS.find((l) => l.id === flat[lessonIdx].level)?.title}
                  </Badge>
                  <span className="flex items-center gap-1 text-muted-foreground/80"><Clock className="h-3 w-3" />{lesson.minutes} min read</span>
                  <span className="text-muted-foreground/80">+10 XP</span>
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{lesson.title}</h2>
              </div>

              <div className="px-5 py-4 sm:px-7">
                <Md text={lesson.content} />
              </div>

              <div className="space-y-4 border-t border-border px-5 py-4 sm:px-7">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300"><ListChecks className="h-4 w-4" /> Key takeaways</p>
                  <ul className="mt-2 space-y-1.5">
                    {lesson.takeaways.map((t, i) => (
                      <li key={i} className="flex gap-2 text-[14px] text-foreground/90"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />{t}</li>
                    ))}
                  </ul>
                </div>
                {lesson.practice && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300"><Lightbulb className="h-4 w-4" /> Practice now</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-amber-100/90">{lesson.practice}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 sm:px-7">
                <div className="flex gap-2">
                  {prev && (
                    <Button variant="outline" size="sm" className="border-border" onClick={() => openLesson(prev.id)}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={isDone ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20" : "bg-emerald-500 font-semibold text-black hover:bg-emerald-400"}
                    onClick={() => toggleLesson(lesson.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {isDone ? "Completed" : "Mark complete"}
                  </Button>
                </div>
                {next ? (
                  <Button variant="outline" size="sm" className="border-border" onClick={() => { if (!isDone) toggleLesson(lesson.id); openLesson(next.id); }}>
                    Next lesson <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300"><Award className="mr-1 h-3 w-3" /> Final lesson of the path!</Badge>
                )}
              </div>
            </div>
          )}

          {/* level outcomes */}
          {lesson && (
            <div className={`${PANEL} mt-4 p-5`}>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> What you will be able to do after this level</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PATH_LEVELS.find((l) => l.id === flat[lessonIdx].level)?.outcomes.map((o, i) => (
                  <div key={i} className="flex gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[13px] text-foreground/80">
                    <Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400/70" />{o}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
