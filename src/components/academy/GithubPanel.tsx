"use client";

/* GitHub Sync — real push & pull for the portfolio workspace.
   Connect with a Personal Access Token, pick or create a repo, then push
   your whole portfolio as one commit or pull it back onto any device. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PANEL, PANEL_HEAD } from "./shared";
import { useAcademy } from "@/lib/academy/store";
import { PORTFOLIO_ROOT } from "@/lib/academy/portfolio";
import {
  GhError, createRepo, getAuthenticatedUser, getRepo, isRepoNameValid, listRepos, loadConnection,
  loadRepoChoice, parseRepoInput, pullFiles, pushFiles, saveConnection, saveRepoChoice,
  type GhRepo, type GhUser,
} from "@/lib/academy/github";
import {
  CheckCircle2, ChevronDown, CloudUpload, DownloadCloud, ExternalLink, Github, KeyRound,
  Loader2, LogOut, PlusCircle, RefreshCw, XCircle,
} from "lucide-react";

const TOKEN_HELP_URL = "https://github.com/settings/tokens?type=beta";

type GhConnectionLite = { token: string; user: GhUser };

export function GithubPanel() {
  const { workspaceFiles, upsertWorkspaceFiles } = useAcademy();
  const [conn, setConn] = React.useState<GhConnectionLite | null>(null);
  const [booted, setBooted] = React.useState(false);

  /* connect form */
  const [tokenInput, setTokenInput] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | null>(null);

  /* repo state */
  const [repos, setRepos] = React.useState<GhRepo[] | null>(null);
  const [reposLoading, setReposLoading] = React.useState(false);
  const [repoChoice, setRepoChoice] = React.useState<string>(""); // "owner/name"
  const [branch, setBranch] = React.useState("main");
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("data-analytics-portfolio");
  const [newDesc, setNewDesc] = React.useState("My data analytics portfolio — projects in SQL, Excel, Python & BI");
  const [newPrivate, setNewPrivate] = React.useState(false);
  const [manualInput, setManualInput] = React.useState("");

  /* push / pull */
  const [message, setMessage] = React.useState("Update portfolio from Data Analytics Academy");
  const [busy, setBusy] = React.useState<"push" | "pull" | null>(null);
  const [log, setLog] = React.useState<{ kind: "info" | "ok" | "err"; text: string }[]>([]);
  const [lastSha, setLastSha] = React.useState<string | null>(null);
  const [pullScope, setPullScope] = React.useState(PORTFOLIO_ROOT);

  React.useEffect(() => {
    const saved = loadConnection();
    if (saved) {
      setConn({ token: saved.token, user: saved.user });
      const choice = loadRepoChoice();
      if (choice) { setRepoChoice(choice.fullName); setBranch(choice.branch); }
    }
    setBooted(true);
  }, []);

  const addLog = (kind: "info" | "ok" | "err", text: string) =>
    setLog((l) => [...l.slice(-40), { kind, text }]);

  /* ---------- connect / disconnect ---------- */
  const connect = async () => {
    const token = tokenInput.trim();
    if (!token) { setConnectError("Paste a Personal Access Token first — see the steps on the right."); return; }
    setConnecting(true);
    setConnectError(null);
    try {
      const user = await getAuthenticatedUser(token);
      setConn({ token, user });
      saveConnection({ token, user, savedAt: new Date().toISOString() });
      setTokenInput("");
      addLog("ok", `Connected as ${user.login}. Token verified with GitHub.`);
    } catch (e) {
      setConnectError(e instanceof GhError ? e.message : "Could not verify the token with GitHub.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setConn(null);
    setRepos(null);
    setRepoChoice("");
    saveConnection(null);
    saveRepoChoice(null);
    addLog("info", "Disconnected — token removed from this browser.");
  };

  /* ---------- repos ---------- */
  const refreshRepos = async () => {
    if (!conn) return;
    setReposLoading(true);
    try {
      const list = await listRepos(conn.token);
      setRepos(list);
      addLog("info", `Found ${list.length} repo${list.length === 1 ? "" : "s"} on the account.`);
    } catch (e) {
      addLog("err", e instanceof GhError ? e.message : "Could not list repositories.");
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  };

  React.useEffect(() => {
    if (conn && repos === null) refreshRepos();
  }, [conn]);

  const chooseRepo = (fullName: string) => {
    setRepoChoice(fullName);
    const r = repos?.find((x) => x.full_name === fullName);
    const b = r?.default_branch || "main";
    setBranch(b);
    saveRepoChoice({ fullName, branch: b });
  };

  const doCreateRepo = async () => {
    if (!conn) return;
    if (!isRepoNameValid(newName.trim())) {
      addLog("err", "Repo name may only contain letters, numbers, dots, dashes and underscores.");
      return;
    }
    setCreating(true);
    try {
      const r = await createRepo(conn.token, {
        name: newName.trim(),
        description: newDesc.trim(),
        isPrivate: newPrivate,
        autoInit: true,
      });
      setRepos((prev) => [r, ...(prev ?? [])]);
      chooseRepo(r.full_name);
      addLog("ok", `Repository ${r.full_name} created${r.private ? " (private)" : " (public)"}.`);
    } catch (e) {
      addLog("err", e instanceof GhError ? e.message : "Creating the repository failed.");
    } finally {
      setCreating(false);
    }
  };

  const applyManualRepo = async () => {
    const parsed = parseRepoInput(manualInput);
    if (!parsed) { addLog("err", "Use the form owner/repo or a full GitHub URL."); return; }
    const full = `${parsed.owner}/${parsed.repo}`;
    if (!conn) { chooseRepo(full); addLog("info", `Target set to ${full} (public pull only — connect a token to push).`); return; }
    try {
      const r = await getRepo(conn.token, parsed.owner, parsed.repo);
      setRepos((prev) => (prev?.some((x) => x.id === r.id) ? prev : [r, ...(prev ?? [])]));
      chooseRepo(r.full_name);
      addLog("ok", `Target set to ${r.full_name} (default branch ${r.default_branch}).`);
    } catch (e) {
      addLog("err", e instanceof GhError ? e.message : `Could not open ${full}.`);
    }
  };

  /* ---------- push ---------- */
  const doPush = async () => {
    if (!conn || !repoChoice) return;
    const [owner, repo] = repoChoice.split("/");
    const files = workspaceFiles.map((f) => ({ path: f.path, content: f.content }));
    if (!files.length) { addLog("err", "Workspace is empty — generate a project folder first."); return; }
    setBusy("push");
    try {
      const res = await pushFiles(conn.token, {
        name: repo, owner: { login: owner }, html_url: `https://github.com/${repo}`, private: false, id: 0, full_name: repoChoice, default_branch: branch,
      } as GhRepo, branch, files, message.trim() || "Update portfolio from Data Analytics Academy", (l) => {
        addLog(l.startsWith("⚠") ? "err" : l.startsWith("✓") ? "ok" : "info", l);
      });
      setLastSha(res.commitSha);
      addLog("ok", `Done — ${res.fileCount} files are live at github.com/${repoChoice}.`);
    } catch (e) {
      if (e instanceof GhError && (e.status === 422 || e.status === 409)) {
        addLog("err", "GitHub says the branch moved (someone/something else pushed). Hit Pull to sync first, then Push again.");
      } else {
        addLog("err", e instanceof GhError ? e.message : "Push failed — see the log above.");
      }
    } finally {
      setBusy(null);
    }
  };

  /* ---------- pull ---------- */
  const doPull = async () => {
    const scope = pullScope.trim().replace(/\/+$/, "");
    if (!repoChoice) { addLog("err", "Choose a repository first."); return; }
    const [owner, repo] = repoChoice.split("/");
    setBusy("pull");
    try {
      const res = await pullFiles(conn?.token, owner, repo, branch, scope || undefined, (l) =>
        addLog(l.startsWith("✓") ? "ok" : "info", l)
      );
      const kindFor = (p: string) =>
        p.endsWith(".csv") ? "csv" : p.endsWith(".json") ? "json" : p.endsWith(".py") ? "py" : p.endsWith(".sql") ? "sql" : p.endsWith(".md") ? "md" : "txt";
      const files = res.files
        .filter((f) => !f.path.endsWith("/"))
        .map((f) => ({ path: f.path, content: f.content, kind: kindFor(f.path) as "csv" | "json" | "py" | "sql" | "md" | "txt" }));
      if (!files.length) {
        addLog("err", scope ? `No text files found under "${scope}/" in this repo.` : "No text files found in this repo.");
        return;
      }
      const { added, updated } = upsertWorkspaceFiles(files);
      setLastSha(res.headSha);
      addLog("ok", `Workspace updated — ${added} new, ${updated} refreshed (${res.branch}).`);
    } catch (e) {
      addLog("err", e instanceof GhError ? e.message : "Pull failed — see the log above.");
    } finally {
      setBusy(null);
    }
  };

  const selectedRepoMeta = repos?.find((r) => r.full_name === repoChoice);

  return (
    <div className={PANEL}>
      <div className={PANEL_HEAD}>
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Github className="h-4 w-4 text-emerald-500" /> GitHub Sync — push &amp; pull for real
        </span>
        {conn && (
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            {lastSha && <span className="font-mono">last commit {lastSha.slice(0, 7)}</span>}
            <img src={conn.user.avatar_url} alt="" className="h-6 w-6 rounded-full border border-border" />
            <a href={conn.user.html_url} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:underline">{conn.user.login}</a>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={disconnect}><LogOut className="h-3 w-3" /> Disconnect</Button>
          </div>
        )}
      </div>

      {!booted ? null : !conn ? (
        /* ---------- connect view ---------- */
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground"><KeyRound className="h-3.5 w-3.5" /> Step 1 — Connect a Personal Access Token</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              The token stays <b className="text-foreground">only in this browser</b> (localStorage) — nothing is sent anywhere except straight to api.github.com.
            </p>
            <ol className="mt-2.5 space-y-1.5 text-[12.5px] text-muted-foreground">
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-300">1</span>Open <a className="font-medium text-emerald-600 underline dark:text-emerald-300" href={TOKEN_HELP_URL} target="_blank" rel="noreferrer">github.com/settings/tokens <ExternalLink className="mb-0.5 inline h-3 w-3" /></a></li>
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-300">2</span><span><b className="text-foreground">Generate new token (fine-grained)</b> → Repository access: <b className="text-foreground">All repos</b> (or pick one)</span></li>
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-300">3</span><span>Permissions → <b className="text-foreground">Contents: Read and write</b> (that is the only one needed)</span></li>
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-300">4</span>Generate &amp; copy the token, paste it below</li>
            </ol>
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              placeholder="github_pat_… or ghp_…"
              className="border-border bg-background font-mono text-[12.5px]"
              autoComplete="off"
            />
            <Button className="bg-emerald-500 font-semibold text-white hover:bg-emerald-400" disabled={connecting} onClick={connect}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} {connecting ? "Verifying with GitHub…" : "Connect to GitHub"}
            </Button>
            {connectError && (
              <p className="flex items-start gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-600 dark:text-red-300">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {connectError}
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Classic tokens (ghp_…) need the <b>repo</b> scope. Fine-grained tokens (github_pat_…) need <b>Contents: Read and write</b>. Pull from public repos works without any token at all.
            </p>
          </div>
        </div>
      ) : (
        /* ---------- connected view ---------- */
        <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-3.5">
            {/* repo picker */}
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Step 2 — Choose the repository</p>
            <div className="flex gap-2">
              <Select value={repoChoice || undefined} onValueChange={chooseRepo}>
                <SelectTrigger className="h-9 flex-1 border-border bg-card text-[13px]">
                  <SelectValue placeholder={reposLoading ? "Loading repositories…" : "Pick a repository"} />
                </SelectTrigger>
                <SelectContent className="max-h-64 border-border bg-popover">
                  {(repos ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.full_name}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{r.full_name}</span>
                        {r.private ? <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[9px] font-bold uppercase text-amber-600 dark:text-amber-300">private</span> : <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-300">public</span>}
                      </span>
                    </SelectItem>
                  ))}
                  {!reposLoading && !(repos ?? []).length && <div className="px-3 py-2 text-xs text-muted-foreground">No repos found — create one below.</div>}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 border-border px-2.5" disabled={reposLoading} onClick={refreshRepos} title="Refresh repo list">
                {reposLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {/* create repo */}
            <details className="rounded-lg border border-border bg-muted/30">
              <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-[12.5px] font-semibold text-foreground/85">
                <PlusCircle className="h-3.5 w-3.5 text-emerald-500" /> Create a new repository <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </summary>
              <div className="space-y-2 border-t border-border p-3">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="repository-name" className="h-8 border-border bg-card font-mono text-[12px]" />
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="h-8 border-border bg-card text-[12px]" />
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Checkbox checked={newPrivate} onCheckedChange={(v) => setNewPrivate(!!v)} className="accent-emerald-500" />
                  Private (public is better for recruiters)
                </label>
                <Button size="sm" className="h-8 bg-emerald-500 font-semibold text-white hover:bg-emerald-400" disabled={creating || !newName.trim()} onClick={doCreateRepo}>
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />} Create repository
                </Button>
              </div>
            </details>

            {/* manual repo */}
            <details className="rounded-lg border border-border bg-muted/30">
              <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-[12.5px] font-semibold text-foreground/85">
                <ExternalLink className="h-3.5 w-3.5 text-sky-500" /> Or open an existing repo by URL <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </summary>
              <div className="flex gap-2 border-t border-border p-3">
                <Input value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyManualRepo()} placeholder="octocat/data-portfolio or a github.com URL" className="h-8 flex-1 border-border bg-card font-mono text-[12px]" />
                <Button size="sm" variant="outline" className="h-8 border-border" onClick={applyManualRepo}>Use</Button>
              </div>
            </details>

            {selectedRepoMeta && (
              <p className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Pushing to <b className="text-foreground">{selectedRepoMeta.full_name}</b>, branch <b className="font-mono text-foreground">{branch}</b> ·{" "}
                <a className="inline-flex items-center gap-0.5 text-emerald-600 underline dark:text-emerald-300" href={selectedRepoMeta.html_url} target="_blank" rel="noreferrer">open repo <ExternalLink className="h-3 w-3" /></a>
              </p>
            )}
          </div>

          {/* push / pull actions */}
          <div className="space-y-3.5">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Step 3 — Push or pull</p>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Commit message"
              className="h-9 border-border bg-card text-[13px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button className="h-10 bg-emerald-500 font-semibold text-white hover:bg-emerald-400" disabled={busy !== null || !repoChoice || !workspaceFiles.length} onClick={doPush}>
                {busy === "push" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                {busy === "push" ? "Pushing…" : `Push ${workspaceFiles.length} files`}
              </Button>
              <Button variant="outline" className="h-10 border-border font-semibold" disabled={busy !== null || !repoChoice} onClick={doPull}>
                {busy === "pull" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                {busy === "pull" ? "Pulling…" : "Pull to workspace"}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span>Pull folder:</span>
              <Input value={pullScope} onChange={(e) => setPullScope(e.target.value)} className="h-7 w-44 border-border bg-card font-mono text-[11.5px]" placeholder="(whole repo)" />
            </div>
            {!workspaceFiles.length && <p className="text-[11.5px] leading-relaxed text-amber-600 dark:text-amber-300">Workspace is empty — finish a project and hit “Generate portfolio folder” first, or pull an existing repo.</p>}
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Push commits every file in your workspace (folder structure preserved). Pull imports a repo back here — great for moving between computers. Nothing is deleted on GitHub by push; it only adds/updates files.
            </p>
          </div>
        </div>
      )}

      {/* activity log */}
      {log.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Activity log</p>
          <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-[11.5px] leading-relaxed scrollbar-thin">
            {log.map((l, i) => (
              <p key={i} className={l.kind === "ok" ? "text-emerald-600 dark:text-emerald-300" : l.kind === "err" ? "text-red-600 dark:text-red-300" : "text-muted-foreground"}>
                {l.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
