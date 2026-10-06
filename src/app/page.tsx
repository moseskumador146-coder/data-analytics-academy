"use client";

import * as React from "react";
import { useAcademy, levelFromXp, type ViewId } from "@/lib/academy/store";
import { HomeView } from "@/components/academy/HomeView";
import { PathsView } from "@/components/academy/PathsView";
import { ExcelTool } from "@/components/academy/ExcelTool";
import { DashboardTool } from "@/components/academy/DashboardTool";
import { SqlTool } from "@/components/academy/SqlTool";
import { CleanerTool } from "@/components/academy/CleanerTool";
import { AutomationTool } from "@/components/academy/AutomationTool";
import { ProjectsView } from "@/components/academy/ProjectsView";
import { WorkspaceView } from "@/components/academy/WorkspaceView";
import {
  BarChart3, BookOpen, BrushCleaning, Database, FileSpreadsheet, FolderGit2, Home as HomeIcon, Package, Workflow, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <HomeIcon className="h-4 w-4" /> },
  { id: "paths", label: "Learning Paths", icon: <BookOpen className="h-4 w-4" /> },
  { id: "excel", label: "Excel Studio", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: "dashboard", label: "Dashboards", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "sql", label: "SQL Playground", icon: <Database className="h-4 w-4" /> },
  { id: "cleaner", label: "Data Cleaner", icon: <BrushCleaning className="h-4 w-4" /> },
  { id: "automation", label: "Automation", icon: <Workflow className="h-4 w-4" /> },
  { id: "projects", label: "Projects", icon: <Package className="h-4 w-4" /> },
  { id: "workspace", label: "Workspace", icon: <FolderGit2 className="h-4 w-4" /> },
];

export default function Page() {
  const { view, setView, xp } = useAcademy();
  const lvl = levelFromXp(xp);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0b] text-zinc-100">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <button className="flex shrink-0 items-center gap-2.5" onClick={() => setView("home")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-black">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[13.5px] font-extrabold leading-tight tracking-tight text-white">Data Analytics Academy</p>
              <p className="text-[10.5px] leading-tight text-zinc-500">Beginner → Master · Free forever</p>
            </div>
          </button>

          <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Main navigation">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  view === n.id ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
                aria-current={view === n.id ? "page" : undefined}
              >
                {n.icon}
                <span className={n.id === "home" ? "" : "hidden lg:inline"}>{n.label}</span>
              </button>
            ))}
          </nav>

          <div className="shrink-0 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-right">
            <p className="font-mono text-[12px] font-bold leading-none text-emerald-300">{xp.toLocaleString()} XP</p>
            <p className="mt-0.5 text-[9.5px] leading-none text-emerald-500/70">{lvl.name}</p>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {view === "home" && <HomeView />}
        {view === "paths" && <PathsView />}
        {view === "excel" && <ExcelTool />}
        {view === "dashboard" && <DashboardTool />}
        {view === "sql" && <SqlTool />}
        {view === "cleaner" && <CleanerTool />}
        {view === "automation" && <AutomationTool />}
        {view === "projects" && <ProjectsView />}
        {view === "workspace" && <WorkspaceView />}
      </main>

      {/* sticky footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#0a0a0b]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-[11.5px] text-zinc-500 sm:px-6" style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}>
          <p>Data Analytics Academy — learn, practice, build, ship. Everything runs locally in your browser; your progress saves automatically.</p>
          <p className="font-mono">Excel · Power BI · SQL · Cleaning · ETL · Automation · GitHub</p>
        </div>
      </footer>
    </div>
  );
}
