"use client";

/* Coach — contextual teaching panel available in every tool.
   - "Your mission": a step-by-step checklist the learner works through (XP for each step)
   - "Try this now": dynamic tips computed from the tool's live state
   - "Why this matters": real-world framing
   The panel persists open/closed per session; step progress persists via the store. */

import * as React from "react";
import { GraduationCap, ChevronDown, Lightbulb, CheckCircle2, Circle, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademy } from "@/lib/academy/store";
import { Md } from "./shared";

export interface CoachStep {
  id: string;
  label: string;
  detail: string;
}

export interface CoachProps {
  view: string;
  mission: CoachStep[];
  tips: string[];
  why: string;
  /** dark-emerald by default; each tool can pick its accent */
  accent?: "emerald" | "sky" | "amber" | "violet";
}

const ACCENT = {
  emerald: { ring: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500" },
  sky: { ring: "border-sky-500/30", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-300", dot: "bg-sky-500" },
  amber: { ring: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", dot: "bg-amber-500" },
  violet: { ring: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-300", dot: "bg-violet-500" },
};

export function Coach({ view, mission, tips, why, accent = "emerald" }: CoachProps) {
  const { coachSteps, toggleCoachStep } = useAcademy();
  const [open, setOpen] = React.useState(false);
  const [nudgeSeen, setNudgeSeen] = React.useState(false);
  const done = coachSteps[view] ?? [];
  const pct = mission.length ? Math.round((done.length / mission.length) * 100) : 0;
  const a = ACCENT[accent];

  // Gentle nudge: if the learner hasn't started the mission, bounce the button once
  const unfinished = done.length < mission.length;
  React.useEffect(() => {
    if (!nudgeSeen && unfinished) {
      const t = setTimeout(() => setNudgeSeen(true), 4000);
      return () => clearTimeout(t);
    }
  }, [nudgeSeen, unfinished]);

  return (
    <>
      {/* floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open coach"
        className={cn(
          "fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-lg backdrop-blur transition-all hover:scale-[1.03] sm:bottom-6 sm:right-6",
          a.ring, a.bg, "bg-background/90",
          !nudgeSeen && unfinished && "animate-bounce"
        )}
        style={{ animationDuration: "1.6s", animationIterationCount: nudgeSeen ? 0 : 4 }}
      >
        <GraduationCap className={cn("h-4.5 w-4.5", a.text)} />
        <span className="text-foreground">Coach</span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white", a.dot)}>
          {done.length}/{mission.length}
        </span>
      </button>

      {/* drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
            <div className={cn("flex items-center justify-between gap-2 border-b border-border px-5 py-4")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", a.ring, a.bg)}>
                  <GraduationCap className={cn("h-5 w-5", a.text)} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Your coach</p>
                  <p className="text-[11px] text-muted-foreground">Working through it with you, step by step</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close coach" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* progress */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium">
                  <span className="text-muted-foreground">Mission progress</span>
                  <span className={a.text}>{pct}% · +{done.length * 8} XP earned</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", a.dot)} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* mission steps */}
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your mission — do these in order</h3>
                <ol className="space-y-2">
                  {mission.map((s, i) => {
                    const isDone = done.includes(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => toggleCoachStep(view, s.id)}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                            isDone ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-border hover:bg-muted/60"
                          )}
                        >
                          <span className="mt-0.5 shrink-0">
                            {isDone ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> : <Circle className="h-4.5 w-4.5 text-muted-foreground/50" />}
                          </span>
                          <span className="min-w-0">
                            <span className={cn("block text-[13px] font-semibold", isDone ? "text-muted-foreground line-through" : "text-foreground")}>
                              {i + 1}. {s.label}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                              <Md text={s.detail} />
                            </span>
                          </span>
                          <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-bold text-muted-foreground">+8 XP</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* live tips */}
              {tips.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Try this now — based on what you&apos;re doing
                  </h3>
                  <div className="space-y-2">
                    {tips.map((t, i) => (
                      <div key={i} className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/90">
                        <Md text={t} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* why it matters */}
              <section className="mb-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-sky-500" /> Why companies pay for this
                </h3>
                <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/90">
                  <Md text={why} />
                </div>
              </section>
            </div>

            <div className="border-t border-border px-5 py-3">
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-lg bg-emerald-500 py-2 text-[13px] font-bold text-black transition-colors hover:bg-emerald-400"
              >
                Back to work — I&apos;ve got this
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/** Small helper: inline collapsible "teach me" strip used inside tools */
export function TeachStrip({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <GraduationCap className="h-4 w-4 text-emerald-500" />
          {title}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}
