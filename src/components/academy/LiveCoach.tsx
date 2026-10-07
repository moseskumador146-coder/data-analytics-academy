"use client";

/* LiveCoach — the hand-in-hand coach that lives INSIDE Excel / Power BI / SQL.
   A docked pane (like an Office task pane) that reacts to every real action:
   narrates what you did, why it matters, what to watch out for, what to try next.
   Runs continuously until the learner pauses or stops it. Tabs: Live narration,
   auto-checked guided sessions, Ask-the-coach Q&A, real-company work briefs. */

import * as React from "react";
import {
  GraduationCap, Pause, Play, Square, Trash2, X, Lightbulb, Building2, MessageCircleQuestion,
  ListChecks, CheckCircle2, Circle, Radio, ChevronLeft, Send, Briefcase, HelpCircle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademy } from "@/lib/academy/store";
import { useCoachBus, agoLabel, type CoachTool, type CoachAction } from "@/lib/academy/coach-bus";
import { explainAction, GUIDE_SESSIONS, stepWatched } from "@/lib/academy/coach-kb";
import { askCoach, ASK_SUGGESTIONS, REAL_WORK } from "@/lib/academy/coach-help";
import { Md } from "./shared";

const KIND_ICON: Record<string, string> = {
  data: "📥", edit: "⌨️", formula: "ƒ", autosum: "Σ", format: "🎨", numfmt: "#", sort: "↕",
  filter: " funnel:", clean: "🧹", chart: "📊", freeze: "📌", merge: "⬒", table: "▦",
  style: "✨", sheet: "🗂", find: "🔍", pastespecial: "📋", pivot: "🔀", comment: "💬",
  save: "💾", undo: "↶", clearfmt: "🧽", visual: "📊", field: "🔌", agg: "Σ", format2: "🎨",
  crossfilter: "🔗", slicer: "🎛", page: "📄", measure: "𝒇𝒙", dataview: "🗄", focus: "🔎",
  drag: "✥", remove: "🗑", theme: "🎭", select: "🔍", where: "🔎", join: "🔗", group: "Σ",
  order: "↕", cte: "🧩", window: "🪟", union: "⊕", error: "❌", exercise: "✅", preview: "👁",
  import: "📥", template: "📋", export: "📤",
};
const kindIcon = (kind: string) => KIND_ICON[kind.split(".")[1] ?? ""] ?? "•";

type Tab = "live" | "guide" | "ask" | "real";

/* ---------------- status pill ---------------- */
function StatusPill({ mode }: { mode: "on" | "paused" | "off" }) {
  if (mode === "on")
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
        Watching
      </span>
    );
  if (mode === "paused")
    return <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400"><Pause className="h-3 w-3" /> Paused</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">Off</span>;
}

/* ---------------- narration card ---------------- */
function Narration({ tool, a, dim, tips }: { tool: CoachTool; a: CoachAction; dim: boolean; tips: string[] }) {
  const ex = explainAction(tool, a);
  return (
    <div key={a.seq} className="animate-in fade-in slide-in-from-bottom-1 duration-300 space-y-2">
      <div className={cn("rounded-lg border border-border/70 bg-muted/40 px-3 py-2 transition-opacity", dim && "opacity-40")}>
        <div className="flex items-start gap-2 text-[12.5px] font-semibold text-foreground">
          <span className="mt-0.5 text-base leading-none">{kindIcon(a.kind)}</span>
          <span className="min-w-0"><Md text={ex.did} /></span>
        </div>
        <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{agoLabel(a.at)}</p>
      </div>
      <div className={cn("space-y-2 transition-opacity", dim && "pointer-events-none opacity-30")}>
        <div className="rounded-lg border border-sky-500/25 bg-sky-500/[0.06] px-3 py-2">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Why this matters</p>
          <div className="text-[12.5px] leading-relaxed text-foreground/90"><Md text={ex.why} /></div>
        </div>
        {ex.watch && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Watch out</p>
            <div className="text-[12.5px] leading-relaxed text-foreground/90"><Md text={ex.watch} /></div>
          </div>
        )}
        {ex.next && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Try next</p>
            <div className="text-[12.5px] leading-relaxed text-foreground/90"><Md text={ex.next} /></div>
          </div>
        )}
      </div>
      {tips.length > 0 && (
        <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.05] px-3 py-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><Lightbulb className="h-3 w-3" /> Live read of your sheet</p>
          <div className="space-y-1">
            {tips.slice(0, 2).map((t, i) => (
              <div key={i} className="text-[12.5px] leading-relaxed text-foreground/90"><Md text={t} /></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- guide session ---------------- */
function Guide({ tool }: { tool: CoachTool }) {
  const session = GUIDE_SESSIONS[tool];
  const { coachSteps, toggleCoachStep } = useAcademy();
  const done = coachSteps[session.id] ?? [];
  const [openWhy, setOpenWhy] = React.useState<string | null>(null);
  const pct = Math.round((done.length / session.steps.length) * 100);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5">
        <p className="text-[13px] font-bold text-foreground">{session.title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{session.goal}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
          <span className="text-[10.5px] font-bold text-muted-foreground">{done.length}/{session.steps.length}</span>
        </div>
      </div>
      <ol className="space-y-2">
        {session.steps.map((s, i) => {
          const isDone = done.includes(s.id);
          const whyOpen = openWhy === s.id;
          return (
            <li key={s.id} className={cn("rounded-lg border px-3 py-2.5 transition-colors", isDone ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-border/70")}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[12.5px] font-semibold", isDone ? "text-muted-foreground line-through" : "text-foreground")}>{i + 1}. {s.title}</p>
                  <div className="mt-1 text-[12px] leading-relaxed text-foreground/85"><Md text={s.how} /></div>
                  <button onClick={() => setOpenWhy(whyOpen ? null : s.id)} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                    <HelpCircle className="h-3 w-3" /> Why this step matters
                  </button>
                  {whyOpen && <div className="mt-1 rounded-md border border-sky-500/20 bg-sky-500/[0.05] px-2.5 py-1.5 text-[12px] leading-relaxed text-foreground/90"><Md text={s.why} /></div>}
                </div>
                <button
                  onClick={() => toggleCoachStep(session.id, s.id)}
                  title={isDone ? "Uncheck" : "Mark done (the coach also auto-detects this)"}
                  className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold", isDone ? "border-emerald-500/40 text-emerald-600" : "border-border text-muted-foreground hover:bg-muted")}
                >
                  {isDone ? "✓ done" : "+8 XP"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">The coach <b>auto-checks</b> each step the moment it sees you do the real action in the tool — keep working and watch the ticks appear.</p>
    </div>
  );
}

/* ---------------- ask the coach ---------------- */
function Ask({ tool }: { tool: CoachTool }) {
  const [q, setQ] = React.useState("");
  const [history, setHistory] = React.useState<{ q: string; a: string }[]>([]);
  const send = (text?: string) => {
    const question = (text ?? q).trim();
    if (!question) return;
    const ans = askCoach(tool, question);
    setHistory((h) => [{ q: question, a: ans?.a ?? "" }, ...h].slice(0, 8));
    setQ("");
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything: why is my SUM 0? what is a measure?"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-[12.5px] outline-none placeholder:text-muted-foreground/60 focus:border-sky-500/50"
        />
        <button onClick={() => send()} title="Ask" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white hover:bg-sky-400"><Send className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(ASK_SUGGESTIONS[tool] ?? []).map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-sky-500/40 hover:bg-sky-500/[0.06]">{s}</button>
        ))}
      </div>
      {history.length === 0 && (
        <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          Ask the coach anything about the tool you're using — it answers from a library of the questions new analysts actually hit in their first weeks (formulas returning 0, JOIN confusion, which visual to pick…).
        </p>
      )}
      {history.map((h, i) => (
        <div key={i} className="space-y-1.5">
          <p className="flex items-start gap-1.5 text-[12.5px] font-semibold text-foreground"><MessageCircleQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />{h.q}</p>
          {h.a ? (
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90"><Md text={h.a} /></div>
          ) : (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90">
              I don't have this exact one in my pocket yet. Try the <b>Guide</b> tab for the next step, or rephrase — mention the function or button name (e.g. "SUMIF", "GROUP BY", "slicer").
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- real company work ---------------- */
function RealWork() {
  const [all, setAll] = React.useState<Record<string, boolean>>({});
  const briefs = [...REAL_WORK.excel, ...REAL_WORK.dashboard, ...REAL_WORK.sql];
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-sky-500/25 bg-sky-500/[0.06] px-3 py-2 text-[12px] leading-relaxed text-foreground/90">
        These are the briefs real companies hand analysts — the ask comes in, the deliverable is expected, and "good" has a definition. Pick one and produce it right here in this tool.
      </p>
      {briefs.map((b) => {
        const open = all[b.id] ?? false;
        return (
          <div key={b.id} className="overflow-hidden rounded-lg border border-border/70">
            <button onClick={() => setAll((s) => ({ ...s, [b.id]: !open }))} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-foreground">{b.company}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{b.role}</span>
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div className="space-y-2.5 border-t border-border/60 px-3 py-2.5">
                <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-[12.5px] italic leading-relaxed text-foreground/90">{b.ask}</p>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">The deliverable</p>
                  <ul className="space-y-1">{b.deliverable.map((d, i) => <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-foreground/85"><span className="text-sky-500">▸</span><Md text={d} /></li>)}</ul>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How to build it in this tool</p>
                  <ol className="space-y-1">{b.how.map((d, i) => <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-foreground/85"><span className="shrink-0 font-bold text-sky-500">{i + 1}.</span><Md text={d} /></li>)}</ol>
                </div>
                <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.05] px-2.5 py-1.5">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">What "good" looks like</p>
                  <p className="text-[12px] leading-relaxed text-foreground/85">{b.good}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- body (shared by dock + overlay) ---------------- */
function CoachBody({ tool, accent, office, tips, onClose }: {
  tool: CoachTool; accent: string; office?: boolean; tips: string[]; onClose?: () => void;
}) {
  const { mode, feed, setMode, clearFeed } = useCoachBus();
  const [tab, setTab] = React.useState<Tab>("live");
  const actions = feed[tool] ?? [];
  const latest = actions[actions.length - 1];
  const m = mode[tool];

  // auto-advance the guided session on every real action
  const { coachSteps, toggleCoachStep, addXp } = useAcademy();
  const session = GUIDE_SESSIONS[tool];
  const [flash, setFlash] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!latest || m !== "on") return;
    const done = coachSteps[session.id] ?? [];
    const idx = session.steps.findIndex((s) => !done.includes(s.id));
    if (idx >= 0 && stepWatched(session.steps[idx], latest.kind)) {
      toggleCoachStep(session.id, session.steps[idx].id);
      addXp(8);
      setFlash(session.steps[idx].title);
      const t = setTimeout(() => setFlash(null), 2600);
      return () => clearTimeout(t);
    }
  }, [latest?.seq]);

  const TABS: [Tab, string, React.ReactNode][] = [
    ["live", "Live", <Radio key="l" className="h-3 w-3" />],
    ["guide", "Guide", <ListChecks key="g" className="h-3 w-3" />],
    ["ask", "Ask", <MessageCircleQuestion key="a" className="h-3 w-3" />],
    ["real", "Real work", <Building2 key="r" className="h-3 w-3" />],
  ];

  return (
    <div className={cn("flex h-full min-h-0 flex-col", office ? "bg-white text-[#252423]" : "bg-card")}>
      {/* header */}
      <div className={cn("shrink-0 border-b px-3.5 py-3", office ? "border-[#edebe9]" : "border-border")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: accent, background: `${accent}14` }}>
            <GraduationCap className="h-4.5 w-4.5" style={{ color: accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[13px] font-bold"><span style={office ? { color: "#252423" } : undefined}>Live Coach</span> <StatusPill mode={m} /></p>
            <p className="text-[10.5px]" style={{ color: office ? "#605e5c" : undefined }}>Works alongside you — narrates the why behind every move</p>
          </div>
          {onClose && <button onClick={onClose} title="Collapse the coach" className={cn("rounded p-1", office ? "hover:bg-[#f3f2f1]" : "hover:bg-muted")}><ChevronLeft className="h-4 w-4" style={{ color: office ? "#605e5c" : undefined }} /></button>}
        </div>
        {/* controls */}
        <div className="mt-2.5 flex items-center gap-1.5">
          {m === "on" ? (
            <button onClick={() => setMode(tool, "paused")} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold", office ? "border-[#d2d0ce] hover:bg-[#f3f2f1]" : "border-border hover:bg-muted")}>
              <Pause className="h-3 w-3" /> Pause
            </button>
          ) : (
            <button onClick={() => setMode(tool, "on")} disabled={m === "off"} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold disabled:opacity-40", office ? "border-[#d2d0ce] hover:bg-[#f3f2f1]" : "border-border hover:bg-muted")}>
              <Play className="h-3 w-3" /> Resume
            </button>
          )}
          <button
            onClick={() => setMode(tool, "off")}
            title="Stop the coach — you can bring it back with the Coach button"
            className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold", office ? "border-[#d2d0ce] hover:bg-[#f3f2f1]" : "border-border hover:bg-muted")}
          >
            <Square className="h-3 w-3" /> Stop
          </button>
          <button onClick={() => clearFeed(tool)} title="Clear the activity feed" className={cn("ml-auto rounded-md border px-2 py-1", office ? "border-[#d2d0ce] hover:bg-[#f3f2f1]" : "border-border hover:bg-muted")}>
            <Trash2 className="h-3 w-3" style={{ color: office ? "#605e5c" : undefined }} />
          </button>
        </div>
        {/* tabs */}
        <div className={cn("mt-2.5 flex gap-1 border-b pb-0", office ? "border-[#edebe9]" : "border-border")}>
          {TABS.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn("flex items-center gap-1 rounded-t px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors", tab === id ? "" : office ? "text-[#605e5c] hover:bg-[#f3f2f1]" : "text-muted-foreground hover:bg-muted")}
              style={tab === id ? { color: accent, borderBottom: `2px solid ${accent}`, marginBottom: "-1px" } : undefined}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* flash */}
      {flash && (
        <div className="shrink-0 animate-in fade-in slide-in-from-top-1 border-b border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
          ✓ Guide step done — {flash} (+8 XP)
        </div>
      )}

      {/* paused banner */}
      {m === "paused" && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11.5px] text-amber-700 dark:text-amber-400">
          Coach paused — actions still tracked, narration muted. Resume anytime.
        </div>
      )}

      {/* content */}
      <div className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3 scrollbar-thin", office ? "[&::-webkit-scrollbar-thumb]:bg-[#c8c6c4]" : "")}>
        {tab === "live" && (
          <>
            {latest ? (
              <>
                {m === "paused" && <p className="text-[11.5px] italic text-muted-foreground">Latest action ({actions.length} tracked) — narration paused:</p>}
                <Narration tool={tool} a={latest} dim={m === "paused"} tips={m === "on" ? tips : []} />
              </>
            ) : (
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                I'm watching your work live. Do <b>anything</b> — load data, type a formula, add a visual, run a query — and I'll explain what just happened, why analysts do it, and what to try next. Nothing to configure.
              </div>
            )}
            {actions.length > 1 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your session so far</p>
                <div className="space-y-1">
                  {[...actions].slice(0, -1).reverse().slice(0, 12).map((a) => (
                    <p key={a.seq} className="flex items-baseline gap-2 rounded-md px-2 py-1 text-[11.5px] text-foreground/80 odd:bg-muted/30">
                      <span className="w-4 shrink-0 text-center text-[12px]">{kindIcon(a.kind)}</span>
                      <span className="min-w-0 flex-1 truncate">{a.label}</span>
                      <span className="shrink-0 text-[9.5px] text-muted-foreground">{agoLabel(a.at)}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {tab === "guide" && <Guide tool={tool} />}
        {tab === "ask" && <Ask tool={tool} />}
        {tab === "real" && <RealWork />}
      </div>
    </div>
  );
}

/* ---------------- shells ---------------- */
export function LiveCoach({ tool, accent, office, tips = [] }: { tool: CoachTool; accent: string; office?: boolean; tips?: string[] }) {
  const mode = useCoachBus((s) => s.mode[tool]);
  const [open, setOpen] = React.useState(true);
  const [overlay, setOverlay] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);

  React.useEffect(() => {
    try { setOpen(localStorage.getItem(`aaa-lc-${tool}`) !== "0"); } catch {}
    const mq = window.matchMedia("(max-width: 1180px)");
    const upd = () => setMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, [tool]);

  const setOpenPersist = (v: boolean) => {
    setOpen(v);
    try { localStorage.setItem(`aaa-lc-${tool}`, v ? "1" : "0"); } catch {}
  };

  if (mode === "off") {
    return (
      <div className={cn("shrink-0", mobile ? "hidden" : "flex")}>
        <button
          onClick={() => { useCoachBus.getState().setMode(tool, "on"); setOpenPersist(true); }}
          title="Bring the coach back"
          className="sticky top-4 m-2 flex items-center gap-1.5 self-start rounded-full border px-3 py-2 text-[12px] font-semibold shadow-sm"
          style={{ borderColor: accent, color: accent, background: `${accent}0d` }}
        >
          <GraduationCap className="h-4 w-4" /> Coach is off — restart
        </button>
      </div>
    );
  }

  if (mobile || overlay) {
    return (
      <>
        {/* floating bubble (mobile or when overlay requested) */}
        <button
          onClick={() => setOverlay(true)}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-[12.5px] font-bold shadow-lg lg:hidden"
          style={{ borderColor: accent, color: accent, background: "var(--background, #fff)" }}
        >
          <GraduationCap className="h-4 w-4" /> Coach
        </button>
        {overlay && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOverlay(false)} />
            <aside className="relative h-full w-full max-w-md border-l shadow-2xl" style={{ borderColor: accent }}>
              <CoachBody tool={tool} accent={accent} office={office} tips={tips} onClose={() => setOverlay(false)} />
            </aside>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="hidden shrink-0 lg:flex" style={{ width: open ? 352 : 44, transition: "width .18s ease" }}>
      {open ? (
        <div className="h-full w-full border-l" style={{ borderColor: office ? "#edebe9" : undefined }}>
          <CoachBody tool={tool} accent={accent} office={office} tips={tips} onClose={() => setOpenPersist(false)} />
        </div>
      ) : (
        <button
          onClick={() => setOpenPersist(true)}
          title="Open the Live Coach"
          className="flex h-full w-11 flex-col items-center gap-2 border-l py-3"
          style={{ borderColor: office ? "#edebe9" : undefined, background: office ? "#faf9f8" : undefined }}
        >
          <GraduationCap className="h-4.5 w-4.5" style={{ color: accent }} />
          <span className="text-[10.5px] font-bold" style={{ color: accent, writingMode: "vertical-rl" }}>Live Coach</span>
        </button>
      )}
    </div>
  );
}
