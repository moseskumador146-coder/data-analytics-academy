"use client";

/* coach-bus — the live "hand-in-hand" coach engine.
   Tools emit real user actions (excel formula committed, PBI visual added, SQL query run…)
   and the LiveCoach pane reacts to every action: what you did, why it matters in real
   company work, what to watch out for, and what to try next — until the user pauses
   or stops it. Mode persists per browser; the action feed is session-live. */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CoachTool = "excel" | "dashboard" | "sql";
export type CoachMode = "on" | "paused" | "off";

export interface CoachAction {
  seq: number;
  kind: string; // dotted kind, e.g. "excel.formula", "pbi.visual", "sql.run"
  label: string; // short human summary of what the user did
  detail?: string; // payload: the formula text, visual type, SQL snippet…
  at: number;
}

const MAX_FEED = 40;

interface CoachBusState {
  mode: Record<CoachTool, CoachMode>;
  feed: Record<CoachTool, CoachAction[]>;
  seq: number;
  /** Record an action. Returns true if the coach is on (so narrations should render). */
  emit: (tool: CoachTool, kind: string, label: string, detail?: string) => boolean;
  setMode: (tool: CoachTool, mode: CoachMode) => void;
  clearFeed: (tool: CoachTool) => void;
}

export const useCoachBus = create<CoachBusState>()(
  persist(
    (set, get) => ({
      mode: { excel: "on", dashboard: "on", sql: "on" },
      feed: { excel: [], dashboard: [], sql: [] },
      seq: 1,
      emit: (tool, kind, label, detail) => {
        const n = get().seq;
        const action: CoachAction = { seq: n, kind, label, detail, at: Date.now() };
        const list = get().feed[tool] ?? [];
        const feed = { ...get().feed, [tool]: [...list.slice(-(MAX_FEED - 1)), action] };
        set({ seq: n + 1, feed });
        return get().mode[tool] === "on";
      },
      setMode: (tool, mode) => set({ mode: { ...get().mode, [tool]: mode } }),
      clearFeed: (tool) => set({ feed: { ...get().feed, [tool]: [] } }),
    }),
    {
      name: "aaa-coach-mode",
      partialize: (s) => ({ mode: s.mode }),
    }
  )
);

/** Fire-and-forget helper so tools can call it without reading state. */
export function coachSay(tool: CoachTool, kind: string, label: string, detail?: string) {
  try {
    useCoachBus.getState().emit(tool, kind, label, detail);
  } catch {
    /* never let coaching break the tool */
  }
}

/** Relative "just now / 2m ago" stamp for the live feed. */
export function agoLabel(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 8) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}
