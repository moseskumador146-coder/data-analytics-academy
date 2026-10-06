"use client";

/* Workspace — the user's portfolio folder: file tree, previews, ZIP download,
   and the step-by-step GitHub upload guide. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Md, PANEL, PANEL_HEAD } from "./shared";
import { useAcademy } from "@/lib/academy/store";
import { GITHUB_GUIDE, PORTFOLIO_ROOT } from "@/lib/academy/portfolio";
import { downloadFile } from "@/lib/academy/datasets";
import { toast } from "@/hooks/use-toast";
import {
  Braces, ChevronRight, Copy, Download, FileCode2, FileJson, FileText, FileSpreadsheet,
  Folder, FolderGit2, Github, Trash2, TriangleAlert,
} from "lucide-react";
import JSZip from "jszip";
import Papa from "papaparse";

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: { kind: string; size: number };
}

function buildTree(paths: { path: string; kind: string; content: string }[]): TreeNode {
  const root: TreeNode = { name: PORTFOLIO_ROOT, path: PORTFOLIO_ROOT, children: new Map() };
  for (const f of paths) {
    const parts = f.path.split("/");
    let node = root;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path: node.path + "/" + part, children: new Map() });
      }
      node = node.children.get(part)!;
      if (i === parts.length - 1) node.file = { kind: f.kind, size: f.content.length };
    }
  }
  return root;
}

const kindIcon = (kind: string) => {
  switch (kind) {
    case "md": return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    case "csv": return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />;
    case "json": return <FileJson className="h-3.5 w-3.5 text-amber-400" />;
    case "py": return <FileCode2 className="h-3.5 w-3.5 text-sky-400" />;
    case "sql": return <Braces className="h-3.5 w-3.5 text-violet-400" />;
    default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const fmtSize = (n: number) => (n > 10240 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

export function WorkspaceView() {
  const { workspaceFiles, removeWorkspaceFile, removeProjectFolder, clearWorkspace, completedProjects } = useAcademy();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set([PORTFOLIO_ROOT]));
  const [zipBusy, setZipBusy] = React.useState(false);

  const tree = React.useMemo(() => buildTree(workspaceFiles), [workspaceFiles]);
  const selectedFile = selected ? workspaceFiles.find((f) => f.path === selected) : null;

  const toggleExpand = (path: string) =>
    setExpanded((e) => { const n = new Set(e); if (n.has(path)) n.delete(path); else n.add(path); return n; });

  const downloadZip = async () => {
    if (!workspaceFiles.length) return;
    setZipBusy(true);
    try {
      const zip = new JSZip();
      for (const f of workspaceFiles) zip.file(f.path, f.content);
      zip.file(
        `${PORTFOLIO_ROOT}/START_HERE.md`,
        `# My Data Analytics Portfolio\n\nGenerated ${new Date().toLocaleDateString()} with the Data Analytics Academy.\n\n## Projects\n${Object.keys(completedProjects).length} completed.\n\n## What's inside\nEach folder is one end-to-end project: business problem → cleaned data → analysis → dashboard/report → reproducible code.\n\nSee the Workspace tab's GitHub guide to publish this folder.\n`
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${PORTFOLIO_ROOT}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Portfolio ZIP downloaded", description: `${workspaceFiles.length} files — ready to unzip and push to GitHub.` });
    } finally {
      setZipBusy(false);
    }
  };

  const copyCommands = async () => {
    try {
      await navigator.clipboard.writeText(GITHUB_GUIDE.commands);
      toast({ title: "Git commands copied", description: "Paste them in a terminal inside the unzipped folder." });
    } catch {
      toast({ title: "Copy failed", description: "Select the commands manually and copy." });
    }
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isFolder = node.children.size > 0 || (!node.file && node.path === PORTFOLIO_ROOT);
    const isOpen = expanded.has(node.path);
    const projectFolders = node.children.size === 0 && !node.file;
    if (projectFolders) return null;
    return (
      <div key={node.path}>
        <button
          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-muted/60 ${node.file ? "text-foreground/80" : "font-semibold text-foreground/90"}`}
          style={{ paddingLeft: depth * 14 + 8 }}
          onClick={() => (node.file ? setSelected(node.path) : toggleExpand(node.path))}
        >
          {isFolder ? <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform ${isOpen ? "rotate-90" : ""}`} /> : <span className="w-3" />}
          {isFolder ? <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/80" /> : kindIcon(node.file!.kind)}
          <span className="min-w-0 flex-1 truncate font-mono">{node.name}</span>
          {node.file && <span className="shrink-0 text-[10px] text-muted-foreground/60">{fmtSize(node.file.size)}</span>}
        </button>
        {isFolder && isOpen && [...node.children.values()].sort((a, b) => (a.children.size === b.children.size ? a.name.localeCompare(b.name) : b.children.size - a.children.size)).map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const projectFolders = React.useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const f of workspaceFiles) {
      const folder = f.path.split("/").slice(0, 2).join("/");
      if (!byId.has(folder)) byId.set(folder, { id: f.projectId ?? folder, name: folder, count: 0 });
      byId.get(folder)!.count++;
    }
    return [...byId.values()];
  }, [workspaceFiles]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"><FolderGit2 className="h-5 w-5 text-emerald-400" /></div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">My Portfolio Workspace</h1>
            <p className="text-[13px] text-muted-foreground">Your projects live here as a real folder — download as ZIP, upload to GitHub, share with recruiters.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400" disabled={!workspaceFiles.length || zipBusy} onClick={downloadZip}>
            <Download className="h-4 w-4" /> {zipBusy ? "Zipping…" : `Download ZIP (${workspaceFiles.length} files)`}
          </Button>
          {workspaceFiles.length > 0 && (
            <Button variant="outline" size="sm" className="border-border hover:border-red-500/40 hover:text-red-600 dark:text-red-300" onClick={() => { clearWorkspace(); setSelected(null); }}>
              <Trash2 className="h-4 w-4" /> Clear all
            </Button>
          )}
        </div>
      </div>

      {workspaceFiles.length === 0 ? (
        <div className={`${PANEL} flex flex-col items-center justify-center gap-3 py-16 text-center`}>
          <FolderGit2 className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Your workspace is empty — finish a project's steps and hit "Generate portfolio folder"</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground/60">
            Each project generates a complete folder: README.md with your write-up, raw + cleaned CSV data,
            reproducible Python scripts, SQL queries, dashboard definitions and executive reports.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* file tree */}
          <div className="space-y-3">
            <div className={`${PANEL} max-h-[60vh] overflow-auto p-2 scrollbar-thin`}>
              {renderNode(tree, 0)}
            </div>
            <div className={`${PANEL} p-3`}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">Project folders</p>
              <div className="space-y-1">
                {projectFolders.map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-muted/60">
                    <span className="min-w-0 flex-1 truncate font-mono text-foreground/80">{f.name.split("/")[1]}</span>
                    <Badge variant="outline" className="border-border text-[10px] text-muted-foreground/80">{f.count} files</Badge>
                    <button className="text-muted-foreground/60 hover:text-red-500" title="Remove folder" onClick={() => { removeProjectFolder(f.id); setSelected(null); }}><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* preview */}
          <div className="space-y-3">
            {selectedFile ? (
              <div className={PANEL}>
                <div className={PANEL_HEAD}>
                  <p className="flex min-w-0 items-center gap-2 font-mono text-[12.5px] text-foreground/80">{kindIcon(selectedFile.kind)}<span className="truncate">{selectedFile.path}</span></p>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 border-border px-2 text-[11px]" onClick={() => downloadFile(selectedFile.path.split("/").pop()!, selectedFile.content)}>
                      <Download className="h-3 w-3" /> File
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:bg-red-500/10" onClick={() => { removeWorkspaceFile(selectedFile.path); setSelected(null); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-[64vh] overflow-auto scrollbar-thin">
                  {selectedFile.kind === "csv" ? <CsvPreview content={selectedFile.content} /> :
                   selectedFile.kind === "md" ? <div className="px-5 py-4"><Md text={selectedFile.content} /></div> :
                   <pre className="whitespace-pre bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-emerald-100/85">{selectedFile.content}</pre>}
                </div>
              </div>
            ) : (
              <div className={`${PANEL} flex min-h-[300px] flex-col items-center justify-center gap-2 text-center`}>
                <FileText className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">Select a file to preview it</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground/60">READMEs render formatted, CSVs render as tables, code stays code — exactly how it will look on GitHub.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GitHub guide */}
      <div className={PANEL}>
        <div className={PANEL_HEAD}>
          <span className="flex items-center gap-2 text-sm font-semibold text-white"><Github className="h-4 w-4 text-emerald-400" /> Publish to GitHub — 10 minutes, zero cost</span>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ol className="space-y-3">
            {GITHUB_GUIDE.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-300">{i + 1}</span>
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground/90">{s.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80"><TriangleAlert className="h-3.5 w-3.5 text-amber-400" /> Git commands (run inside the unzipped folder)</p>
              <Button variant="outline" size="sm" className="h-7 border-border px-2 text-[11px]" onClick={copyCommands}><Copy className="h-3 w-3" /> Copy</Button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-black/50 p-4 font-mono text-[11.5px] leading-relaxed text-emerald-200/90 scrollbar-thin">{GITHUB_GUIDE.commands}</pre>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground/80">
              Public repos are your CV. Pin the portfolio, add a profile README, and post one short write-up per project on LinkedIn — that is what turns a folder into interviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CsvPreview({ content }: { content: string }) {
  const parsed = React.useMemo(() => {
    const res = Papa.parse<string[]>(content, { skipEmptyLines: true });
    return (res.data as string[][]).slice(0, 60);
  }, [content]);
  if (!parsed.length) return <p className="p-4 text-sm text-muted-foreground/80">Empty CSV.</p>;
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="sticky top-0 bg-card">
          <tr>{parsed[0].map((h, i) => <th key={i} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] text-emerald-300">{h}</th>)}</tr>
        </thead>
        <tbody>
          {parsed.slice(1).map((row, ri) => (
            <tr key={ri} className="border-b border-border/60 hover:bg-muted/40">
              {row.map((v, ci) => <td key={ci} className="max-w-[200px] truncate whitespace-nowrap px-3 py-1.5 font-mono text-muted-foreground">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-muted-foreground/60">First 60 rows of the CSV.</p>
    </div>
  );
}
