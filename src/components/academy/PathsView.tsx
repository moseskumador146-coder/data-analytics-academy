"use client";

/* Learning Paths — a clear, well-defined roadmap from beginner to master.
   Every lesson carries an EMBEDDED practice lab; a lesson only counts as
   complete (and the next one only unlocks) after its practice is passed.
   One restrained palette: emerald = progress, neutral = structure. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Md, PANEL } from "./shared";
import { PracticeLab } from "./PracticeLab";
import { PATH_LEVELS, type Lesson, type Module, type PathLevel } from "@/lib/academy/curriculum";
import { practiceFor } from "@/lib/academy/practices";
import { useAcademy } from "@/lib/academy/store";
import {
  Award, BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, Clock,
  FlaskConical, GraduationCap, Lock, PlayCircle, Sparkles, Target,
} from "lucide-react";

/* flattened view of the whole path — the backbone of gating */
interface FlatEntry { lesson: Lesson; level: PathLevel; module: Module; globalIndex: number; }
const FLAT: FlatEntry[] = PATH_LEVELS.flatMap((level) =>
  level.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, level, module, globalIndex: 0 })))
);
FLAT.forEach((e, i) => (e.globalIndex = i));

const HOW_IT_WORKS = [
  { title: "Read the lesson", desc: "Short, practical, example-driven" },
  { title: "Do the practice lab", desc: "Real data & real tools, right here" },
  { title: "Pass the check", desc: "Auto-graded — +25 XP, lesson completes" },
  { title: "Unlock the next", desc: "Progress only counts when you can DO it" },
];

export function PathsView() {
  const { completedLessons, completedPractices, lastPathLevel, setLastPathLevel } = useAcademy();
  const [lessonId, setLessonId] = React.useState<string | null>(null);

  const isDone = (id: string) => !!completedLessons[id] || !!completedPractices[id];
  const doneCount = FLAT.filter((e) => isDone(e.lesson.id)).length;
  const labCount = FLAT.filter((e) => completedPractices[e.lesson.id]).length;
  const totalMin = FLAT.reduce((s, e) => s + e.lesson.minutes, 0);

  /* the next lesson you haven't completed yet — powers the Continue card */
  const nextUp = FLAT.find((e) => !isDone(e.lesson.id)) ?? FLAT[0];
  const started = doneCount > 0;

  /** a lesson is openable when it is done, or every lesson before it is done */
  const unlocked = (e: FlatEntry) => e.globalIndex === 0 || isDone(FLAT[e.globalIndex - 1].lesson.id) || isDone(e.lesson.id);

  const openLesson = (id: string) => {
    const entry = FLAT.find((f) => f.lesson.id === id);
    if (entry) {
      setLastPathLevel(entry.level.id);
      setLessonId(id);
      requestAnimationFrame(() => document.getElementById("lesson-top")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  /* ------------------------------ lesson view ------------------------------ */
  if (lessonId) {
    return <LessonView lessonId={lessonId} onBack={() => setLessonId(null)} onOpen={openLesson} isDone={isDone} unlocked={unlocked} />;
  }

  /* ------------------------------ roadmap view ----------------------------- */
  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"><GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">The Learning Path</h1>
            <p className="text-[13px] text-muted-foreground">Beginner → Master · {PATH_LEVELS.length} levels · {FLAT.length} lessons · every lesson ends in a hands-on practice lab · ~{Math.round(totalMin / 60)} hours</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Your progress</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{doneCount}/{FLAT.length} lessons · {labCount} labs passed</p>
          </div>
          <div className="w-32"><Progress value={(doneCount / FLAT.length) * 100} className="h-2" /></div>
        </div>
      </div>

      {/* how the path works — the contract, in one glance */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold leading-tight text-foreground">{s.title}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* continue / start card */}
      {nextUp && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.08] to-transparent px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"><BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{started ? "Continue where you left off" : "Start here — lesson 1"}</p>
            <p className="truncate text-[15px] font-bold text-foreground">{nextUp.lesson.title}</p>
            <p className="text-[12px] text-muted-foreground">
              {nextUp.level.title} · {nextUp.module.title} · {nextUp.lesson.minutes} min {started ? "" : "· no experience needed — this is the true beginning"}
            </p>
          </div>
          <Button size="sm" className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400" onClick={() => openLesson(nextUp.lesson.id)}>
            {started ? "Resume" : "Begin the path"} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* the roadmap — 4 levels, vertical, always visible */}
      <div className="space-y-4">
        {PATH_LEVELS.map((level, li) => {
          const lessons = level.modules.flatMap((m) => m.lessons);
          const done = lessons.filter((l) => isDone(l.id)).length;
          const labs = lessons.filter((l) => completedPractices[l.id]).length;
          const complete = done === lessons.length;
          const isCurrentLevel = level.id === lastPathLevel;
          return (
            <div key={level.id} className={cn(PANEL, "overflow-hidden", isCurrentLevel && "border-emerald-500/40")}>
              {/* level head */}
              <div className="flex gap-4 p-5">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-black",
                  complete ? "border-emerald-500 bg-emerald-500 text-black" : isCurrentLevel ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground"
                )}>
                  {complete ? <CheckCircle2 className="h-5 w-5" /> : li + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-bold tracking-tight text-foreground">{level.title}</h2>
                    <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{level.duration}</Badge>
                    {complete && <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">level complete</Badge>}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{level.tagline}</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <Progress value={(done / lessons.length) * 100} className="h-1.5 max-w-xs" />
                    <span className="shrink-0 text-[11.5px] font-semibold text-muted-foreground">{done}/{lessons.length} lessons · {labs} labs</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {level.outcomes.slice(0, 3).map((o, i) => (
                      <span key={i} className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/75">{o}</span>
                    ))}
                    {level.outcomes.length > 3 && <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{level.outcomes.length - 3} more outcomes</span>}
                  </div>
                </div>
              </div>

              {/* modules */}
              <div className="border-t border-border bg-muted/20 px-3 py-3 sm:px-4">
                {level.modules.map((m, mi) => (
                  <ModuleRow
                    key={m.id}
                    module={m}
                    number={`${li + 1}.${mi + 1}`}
                    levelTitle={level.title}
                    isDone={isDone}
                    completedPractices={completedPractices}
                    unlocked={unlocked}
                    onOpen={openLesson}
                    nextUpId={nextUp?.lesson.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ module row ------------------------------ */

function ModuleRow({ module, number, levelTitle, isDone, completedPractices, unlocked, onOpen, nextUpId }: {
  module: Module;
  number: string;
  levelTitle: string;
  isDone: (id: string) => boolean;
  completedPractices: Record<string, boolean>;
  unlocked: (e: FlatEntry) => boolean;
  onOpen: (id: string) => void;
  nextUpId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const done = module.lessons.filter((l) => isDone(l.id)).length;
  const minutes = module.lessons.reduce((s, l) => s + l.minutes, 0);
  const allDone = done === module.lessons.length;

  return (
    <div className="mb-2 last:mb-0 overflow-hidden rounded-xl border border-border bg-card">
      <button className="flex w-full items-center gap-3 px-3.5 py-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10.5px] font-black", allDone ? "bg-emerald-500 text-black" : "bg-muted text-muted-foreground")}>{number}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-bold text-foreground">{module.title}</span>
          <span className="block truncate text-[11.5px] text-muted-foreground">{module.summary}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 text-[11px] text-muted-foreground sm:flex">
          <span className={cn("font-semibold", allDone ? "text-emerald-700 dark:text-emerald-300" : "")}>{done}/{module.lessons.length}</span>
          <span>· {minutes} min</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border px-2 pb-2.5 pt-1.5">
          {module.lessons.map((ls, idx) => {
            const entry = FLAT.find((f) => f.lesson.id === ls.id)!;
            const doneL = isDone(ls.id);
            const labPassed = !!completedPractices[ls.id];
            const hasLab = !!practiceFor(ls.id);
            const isOpenable = unlocked(entry);
            const isNext = ls.id === nextUpId;
            return (
              <button
                key={ls.id}
                onClick={() => isOpenable ? onOpen(ls.id) : undefined}
                className={cn(
                  "mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  !isOpenable && "cursor-not-allowed opacity-60",
                  isOpenable && "hover:bg-muted/60",
                  isNext && "bg-emerald-500/[0.07]"
                )}
                title={isOpenable ? `${levelTitle} · ${module.title}` : `Complete the previous lesson's practice lab to unlock this`}
              >
                {doneL ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : !isOpenable ? (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                ) : isNext ? (
                  <PlayCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                )}
                <span className={cn("min-w-0 flex-1 truncate text-[13px]", doneL ? "text-muted-foreground" : isNext ? "font-bold text-foreground" : "text-foreground/85")}>
                  {idx + 1}. {ls.title}
                </span>
                {hasLab && (
                  <span className={cn("flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase",
                    labPassed ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
                    <FlaskConical className="h-2.5 w-2.5" /> {labPassed ? "lab passed" : "lab"}
                  </span>
                )}
                <span className="shrink-0 text-[10.5px] text-muted-foreground/70">{ls.minutes}m</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ lesson view ------------------------------ */

function LessonView({ lessonId, onBack, onOpen, isDone, unlocked }: {
  lessonId: string;
  onBack: () => void;
  onOpen: (id: string) => void;
  isDone: (id: string) => boolean;
  unlocked: (e: FlatEntry) => boolean;
}) {
  const { completedPractices, toggleLesson } = useAcademy();
  const entry = FLAT.find((f) => f.lesson.id === lessonId)!;
  const lesson = entry.lesson;
  const practice = practiceFor(lesson.id);
  const done = isDone(lesson.id);
  const labPassed = !!completedPractices[lesson.id];
  const prev = entry.globalIndex > 0 ? FLAT[entry.globalIndex - 1] : null;
  const next = entry.globalIndex < FLAT.length - 1 ? FLAT[entry.globalIndex + 1] : null;
  const nextOpen = next ? unlocked(next) : false;
  const lessonIdxInModule = entry.module.lessons.findIndex((l) => l.id === lesson.id);

  return (
    <div className="space-y-4">
      {/* breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-muted-foreground">
          <button className="flex shrink-0 items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-300" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" /> Roadmap
          </button>
          <span className="text-muted-foreground/50">/</span>
          <span className="truncate">{entry.level.title.split("—")[0].trim()}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="truncate">{entry.module.title}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="shrink-0 font-semibold text-foreground">Lesson {lessonIdxInModule + 1} of {entry.module.lessons.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {done ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11.5px] font-bold text-amber-700 dark:text-amber-300"><FlaskConical className="h-3.5 w-3.5" /> Pass the lab to complete</span>
          )}
        </div>
      </div>

      <div id="lesson-top" className={cn(PANEL, "scroll-mt-20")}>
        {/* head */}
        <div className="border-b border-border px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">{entry.level.title}</Badge>
            <span className="flex items-center gap-1 text-muted-foreground/80"><Clock className="h-3 w-3" />{lesson.minutes} min read</span>
            {practice && <span className="flex items-center gap-1 text-muted-foreground/80"><FlaskConical className="h-3 w-3" />practice lab: {practice.kind}</span>}
            <span className="text-muted-foreground/80">+35 XP total</span>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{lesson.title}</h2>
        </div>

        {/* objectives */}
        <div className="border-b border-border px-5 pt-4 sm:px-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"><Target className="h-4 w-4" /> In this lesson you will learn</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-1">
            {lesson.takeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-[13.5px] text-foreground/85"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />{t}</li>
            ))}
          </ul>
        </div>

        {/* content */}
        <div className="px-5 py-4 sm:px-7">
          <Md text={lesson.content} />
        </div>

        {/* the embedded practice lab */}
        {practice && (
          <div className="border-t border-border px-5 py-5 sm:px-7">
            <PracticeLab lessonId={lesson.id} practice={practice} />
          </div>
        )}

        {/* completion + navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-2">
            {prev && (
              <Button variant="outline" size="sm" className="border-border" onClick={() => onOpen(prev.lesson.id)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
            )}
            {done && !labPassed && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-[11.5px] text-muted-foreground"
                onClick={() => toggleLesson(lesson.id)}
                title="Remove the completion tick (e.g. to redo the lesson properly with its lab)"
              >
                Reset completion
              </Button>
            )}
            {done && labPassed && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> Lesson + lab both done — nice work.</span>
            )}
            {!done && (
              <span className="text-[12px] text-muted-foreground">Complete the practice lab above — the lesson then ticks itself and unlocks the next.</span>
            )}
          </div>
          {next ? (
            nextOpen ? (
              <Button size="sm" className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400" onClick={() => onOpen(next.lesson.id)}>
                Next lesson <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground" title="Pass this lesson's practice lab to unlock">
                <Lock className="h-3.5 w-3.5" /> Next lesson locked — pass the lab first
              </span>
            )
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Award className="mr-1 h-3 w-3" /> Final lesson of the entire path — congratulations!</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
