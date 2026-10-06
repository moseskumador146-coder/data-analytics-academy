"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewId =
  | "home"
  | "paths"
  | "functions"
  | "excel"
  | "dashboard"
  | "sql"
  | "cleaner"
  | "automation"
  | "projects"
  | "workspace";

export interface SavedDaxMeasure {
  name: string;
  formula: string;
  createdAt: string;
}

export interface WorkspaceFile {
  path: string;
  content: string;
  kind: "md" | "csv" | "json" | "py" | "sql" | "txt";
  createdAt: string;
  projectId?: string;
}

export interface SavedDashboard {
  id: string;
  name: string;
  datasetId: string;
  widgets: unknown[];
  pages?: unknown[];
  createdAt: string;
}

export interface SavedSheet {
  name: string;
  cells: Record<string, string>;
  savedAt: string;
}

export const LEVELS = [
  { xp: 0, name: "Data Rookie" },
  { xp: 100, name: "Spreadsheet Scout" },
  { xp: 250, name: "Query Crafter" },
  { xp: 450, name: "Chart Champion" },
  { xp: 700, name: "Clean Machine" },
  { xp: 1000, name: "Pipeline Pro" },
  { xp: 1400, name: "Insight Architect" },
  { xp: 2000, name: "Analytics Master" },
];

export function levelFromXp(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const span = next ? next.xp - cur.xp : 1;
  const into = xp - cur.xp;
  return {
    level: idx + 1,
    name: cur.name,
    next: next?.name ?? null,
    progress: next ? Math.round((into / span) * 100) : 100,
    toNext: next ? next.xp - xp : 0,
  };
}

interface AcademyState {
  view: ViewId;
  theme: "dark" | "light";
  completedLessons: Record<string, boolean>;
  projectSteps: Record<string, boolean>;
  completedProjects: Record<string, boolean>;
  xp: number;
  sheets: Record<string, SavedSheet>;
  dashboards: SavedDashboard[];
  daxMeasures: SavedDaxMeasure[];
  workspaceFiles: WorkspaceFile[];
  lastPathLevel: string;
  coachSteps: Record<string, string[]>;
  setView: (v: ViewId) => void;
  setTheme: (t: "dark" | "light") => void;
  toggleTheme: () => void;
  setLastPathLevel: (l: string) => void;
  toggleLesson: (id: string) => void;
  toggleStep: (projectId: string, stepIdx: number) => void;
  completeProject: (projectId: string) => void;
  addXp: (n: number) => void;
  toggleCoachStep: (view: string, stepId: string) => void;
  saveSheet: (name: string, cells: Record<string, string>) => void;
  deleteSheet: (name: string) => void;
  saveDashboard: (d: SavedDashboard) => void;
  deleteDashboard: (id: string) => void;
  saveDaxMeasure: (name: string, formula: string) => void;
  deleteDaxMeasure: (name: string) => void;
  addWorkspaceFiles: (files: Omit<WorkspaceFile, "createdAt">[], projectId?: string) => number;
  upsertWorkspaceFiles: (files: Omit<WorkspaceFile, "createdAt">[], projectId?: string) => { added: number; updated: number };
  removeWorkspaceFile: (path: string) => void;
  removeProjectFolder: (projectId: string) => void;
  clearWorkspace: () => void;
  resetProgress: () => void;
}

export const useAcademy = create<AcademyState>()(
  persist(
    (set, get) => ({
      view: "home",
      theme: "light",
      completedLessons: {},
      projectSteps: {},
      completedProjects: {},
      xp: 0,
      sheets: {},
      dashboards: [],
      daxMeasures: [],
      workspaceFiles: [],
      lastPathLevel: "beginner",
      coachSteps: {},
      setView: (v) => set({ view: v }),
      setTheme: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", t === "dark");
          try { localStorage.setItem("aaa-theme", t); } catch {}
        }
      },
      toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
      setLastPathLevel: (l) => set({ lastPathLevel: l }),
      toggleLesson: (id) => {
        const done = { ...get().completedLessons };
        if (done[id]) {
          delete done[id];
          set({ completedLessons: done, xp: Math.max(0, get().xp - 10) });
        } else {
          done[id] = true;
          set({ completedLessons: done, xp: get().xp + 10 });
        }
      },
      toggleStep: (projectId, stepIdx) => {
        const key = `${projectId}:${stepIdx}`;
        const steps = { ...get().projectSteps };
        if (steps[key]) {
          delete steps[key];
          set({ projectSteps: steps, xp: Math.max(0, get().xp - 5) });
        } else {
          steps[key] = true;
          set({ projectSteps: steps, xp: get().xp + 5 });
        }
      },
      completeProject: (projectId) => {
        if (!get().completedProjects[projectId]) {
          set({
            completedProjects: { ...get().completedProjects, [projectId]: true },
            xp: get().xp + 100,
          });
        }
      },
      addXp: (n) => set({ xp: get().xp + n }),
      toggleCoachStep: (view, stepId) => {
        const all = { ...get().coachSteps };
        const done = new Set(all[view] ?? []);
        if (done.has(stepId)) done.delete(stepId);
        else { done.add(stepId); set({ xp: get().xp + 8 }); }
        all[view] = [...done];
        set({ coachSteps: all });
      },
      saveSheet: (name, cells) =>
        set({
          sheets: {
            ...get().sheets,
            [name]: { name, cells, savedAt: new Date().toISOString() },
          },
        }),
      deleteSheet: (name) => {
        const s = { ...get().sheets };
        delete s[name];
        set({ sheets: s });
      },
      saveDashboard: (d) =>
        set({ dashboards: [d, ...get().dashboards.filter((x) => x.id !== d.id)].slice(0, 30) }),
      deleteDashboard: (id) =>
        set({ dashboards: get().dashboards.filter((x) => x.id !== id) }),
      saveDaxMeasure: (name, formula) =>
        set({
          daxMeasures: [
            { name, formula, createdAt: new Date().toISOString() },
            ...get().daxMeasures.filter((m) => m.name.toLowerCase() !== name.toLowerCase()),
          ].slice(0, 40),
        }),
      deleteDaxMeasure: (name) =>
        set({ daxMeasures: get().daxMeasures.filter((m) => m.name.toLowerCase() !== name.toLowerCase()) }),
      addWorkspaceFiles: (files, projectId) => {
        const existing = new Set(get().workspaceFiles.map((f) => f.path));
        const fresh = files
          .filter((f) => !existing.has(f.path))
          .map<WorkspaceFile>((f) => ({
            ...f,
            createdAt: new Date().toISOString(),
            projectId,
          }));
        if (fresh.length) set({ workspaceFiles: [...get().workspaceFiles, ...fresh] });
        return fresh.length;
      },
      /** Pull support: insert new files and overwrite existing ones by path. */
      upsertWorkspaceFiles: (files, projectId) => {
        let added = 0;
        let updated = 0;
        const map = new Map(get().workspaceFiles.map((f) => [f.path, f]));
        for (const f of files) {
          if (map.has(f.path)) updated++;
          else added++;
          map.set(f.path, { ...f, createdAt: new Date().toISOString(), projectId });
        }
        set({ workspaceFiles: [...map.values()] });
        return { added, updated };
      },
      removeWorkspaceFile: (path) =>
        set({ workspaceFiles: get().workspaceFiles.filter((f) => f.path !== path) }),
      removeProjectFolder: (projectId) =>
        set({
          workspaceFiles: get().workspaceFiles.filter((f) => f.projectId !== projectId),
          completedProjects: Object.fromEntries(
            Object.entries(get().completedProjects).filter(([k]) => k !== projectId)
          ),
        }),
      clearWorkspace: () => set({ workspaceFiles: [], completedProjects: {} }),
      resetProgress: () =>
        set({
          completedLessons: {},
          projectSteps: {},
          completedProjects: {},
          xp: 0,
          workspaceFiles: [],
          sheets: {},
          dashboards: [],
          daxMeasures: [],
          coachSteps: {},
        }),
    }),
    { name: "data-analytics-academy" }
  )
);
