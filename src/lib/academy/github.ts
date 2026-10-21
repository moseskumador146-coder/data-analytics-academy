/* GitHub integration — real push & pull against api.github.com from the browser.
   Auth: a Personal Access Token (classic or fine-grained, needs "Contents: Read & write"
   for private repos or pushes; public read-only pulls work without any token).
   Push implements the Git Data API flow: blobs → tree → commit → update ref.
   Pull reads the repo tree recursively and downloads blob contents. All client-side. */

export interface GhUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string | null;
}

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner: { login: string };
  description?: string | null;
  updated_at?: string;
  pushed_at?: string;
}

export class GhError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API = "https://api.github.com";
const MAX_FILE_BYTES = 900_000; // per-file safety cap for pull
const MAX_FILES = 400; // per-commit file cap for push

function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...ghHeaders(token), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new GhError(0, "Network error reaching GitHub — check your connection.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body?.message === "string" ? ` — ${body.message}` : "";
    } catch { /* non-JSON error body */ }
    switch (res.status) {
      case 401: throw new GhError(401, `Token rejected (401)${detail}. Check that it is valid and not expired.`);
      case 403:
        if (detail.toLowerCase().includes("rate limit")) {
          throw new GhError(403, `GitHub rate limit reached for this network (403). Sign in with a Personal Access Token — authenticated requests get 5,000/hour instead of ~60/hour.`);
        }
        throw new GhError(403, `Forbidden (403)${detail}. For pushing you need a token with repo (classic) or Contents read+write (fine-grained) permission.`);
      case 404: throw new GhError(404, `Not found (404)${detail}. For private repos the token must include that repo.`);
      case 409: throw new GhError(409, `Conflict (409)${detail}.`);
      case 422: throw new GhError(422, `GitHub rejected the request (422)${detail}. The repo name may be taken or a field invalid.`);
      case 301: throw new GhError(301, "Moved permanently — the repo may have been renamed.");
      default: throw new GhError(res.status, `GitHub API error ${res.status}${detail}`);
    }
  }
  return (await res.json()) as T;
}

/* ---------------- accounts & repos ---------------- */

export async function getAuthenticatedUser(token: string): Promise<GhUser> {
  return ghFetch<GhUser>("/user", token);
}

export async function listRepos(token: string): Promise<GhRepo[]> {
  const repos: GhRepo[] = [];
  for (let page = 1; page <= 3; page++) {
    const chunk = await ghFetch<GhRepo[]>(`/user/repos?per_page=100&sort=pushed&page=${page}`, token);
    repos.push(...chunk);
    if (chunk.length < 100) break;
  }
  return repos;
}

export async function createRepo(
  token: string,
  opts: { name: string; description?: string; isPrivate: boolean; autoInit: boolean }
): Promise<GhRepo> {
  return ghFetch<GhRepo>("/user/repos", token, {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      description: opts.description || "My data analytics portfolio — built with the Data Analytics Academy",
      private: opts.isPrivate,
      auto_init: opts.autoInit,
      has_issues: true,
    }),
  });
}

export async function getRepo(token: string | undefined, owner: string, repo: string): Promise<GhRepo> {
  return ghFetch<GhRepo>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token);
}

/* ---------------- push (Git Data API) ---------------- */

export interface PushFile { path: string; content: string }
export interface PushResult {
  commitSha: string;
  htmlUrl: string;
  fileCount: number;
}

async function createBlob(token: string, owner: string, repo: string, content: string): Promise<string> {
  const res = await ghFetch<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, token, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  return res.sha;
}

async function getBranchHead(token: string, owner: string, repo: string, branch: string): Promise<string | null> {
  try {
    const ref = await ghFetch<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, token
    );
    return ref.object.sha;
  } catch (e) {
    if (e instanceof GhError && (e.status === 404 || e.status === 409)) return null; // empty repo / unborn branch
    throw e;
  }
}

/** Push a full set of files as one commit. Handles both existing branches and empty repos. */
export async function pushFiles(
  token: string,
  repo: GhRepo,
  branch: string,
  files: PushFile[],
  message: string,
  onProgress?: (line: string) => void
): Promise<PushResult> {
  const owner = repo.owner.login;
  const name = repo.name;
  const capped = files.slice(0, MAX_FILES);
  if (files.length > MAX_FILES) onProgress?.(`⚠ ${files.length} files found — pushing the first ${MAX_FILES} (GitHub-safe cap).`);

  onProgress?.(`Comparing with remote branch ${branch}…`);
  const headSha = await getBranchHead(token, owner, name, branch);
  let baseTreeSha: string | undefined;
  if (headSha) {
    const head = await ghFetch<{ tree: { sha: string } }>(`/repos/${owner}/${repo}/git/commits/${headSha}`, token);
    baseTreeSha = head.tree.sha;
    onProgress?.(`Remote HEAD ${headSha.slice(0, 7)} found — building on top of it.`);
  } else {
    onProgress?.(`Branch ${branch} is empty (fresh repo) — creating the first commit.`);
  }

  onProgress?.(`Uploading ${capped.length} files…`);
  const treeEntries: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
  for (let i = 0; i < capped.length; i++) {
    const f = capped[i];
    const sha = await createBlob(token, owner, name, f.content);
    treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha });
    if ((i + 1) % 10 === 0) onProgress?.(`  ${i + 1}/${capped.length} files uploaded…`);
  }

  onProgress?.("Building the git tree…");
  const tree = await ghFetch<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify(baseTreeSha ? { base_tree: baseTreeSha, tree: treeEntries } : { tree: treeEntries }),
  });

  onProgress?.("Creating the commit…");
  const commit = await ghFetch<{ sha: string; html_url?: string }>(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: headSha ? [headSha] : [] }),
  });

  if (headSha) {
    await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } else {
    await ghFetch(`/repos/${owner}/${repo}/git/refs`, token, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });
  }

  onProgress?.(`✓ Pushed ${capped.length} files as commit ${commit.sha.slice(0, 7)}`);
  return {
    commitSha: commit.sha,
    htmlUrl: `${repo.html_url}/tree/${branch}`,
    fileCount: capped.length,
  };
}

/* ---------------- pull ---------------- */

export interface PullFile { path: string; content: string; size: number }
export interface PullResult {
  files: PullFile[];
  headSha: string;
  branch: string;
  truncated: boolean;
  skipped: number;
}

/** Pull all text files from a repo (or a subfolder). Public repos work without a token. */
export async function pullFiles(
  token: string | undefined,
  owner: string,
  repo: string,
  branch?: string,
  subfolder?: string,
  onProgress?: (line: string) => void
): Promise<PullResult> {
  const meta = await getRepo(token, owner, repo);
  const br = branch || meta.default_branch || "main";
  onProgress?.(`Fetching tree of ${owner}/${repo}@${br}…`);
  const treeRes = await ghFetch<{ sha: string; tree: { path: string; type: string; size?: number; sha: string }[]; truncated?: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(br)}?recursive=1`, token
  );
  const prefix = subfolder ? `${subfolder.replace(/\/+$/, "")}/` : "";
  const blobs = treeRes.tree.filter(
    (t) => t.type === "blob" && (!prefix || t.path.startsWith(prefix)) && (t.size ?? 0) <= MAX_FILE_BYTES
  );
  const skipped = treeRes.tree.filter((t) => t.type === "blob" && (prefix ? !t.path.startsWith(prefix) : false || (t.size ?? 0) > MAX_FILE_BYTES)).length;

  const files: PullFile[] = [];
  let i = 0;
  for (const b of blobs) {
    if (files.length >= MAX_FILES) break;
    i++;
    if (i % 15 === 0) onProgress?.(`  ${files.length}/${blobs.length} files downloaded…`);
    try {
      const blob = await ghFetch<{ content: string; encoding: string }>(
        `/repos/${owner}/${repo}/git/blobs/${b.sha}`, token
      );
      if (blob.encoding !== "base64") continue;
      const text = atob(blob.content.replace(/\n/g, ""));
      // crude binary sniff: NUL byte in first chunk
      if (text.slice(0, 800).includes("\u0000")) continue;
      files.push({ path: b.path, content: text, size: b.size ?? text.length });
    } catch { /* skip unreadable blob */ }
  }
  onProgress?.(`✓ Pulled ${files.length} files from ${owner}/${repo}.`);
  return { files, headSha: treeRes.sha, branch: br, truncated: !!treeRes.truncated, skipped };
}

/* ---------------- helpers ---------------- */

/** Accepts "owner/repo" or a full GitHub URL. Returns null when unparseable. */
export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const s = input.trim();
  if (!s) return null;
  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i.exec(s);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const short = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(s);
  if (short) return { owner: short[1], repo: short[2] };
  return null;
}

export function isRepoNameValid(name: string): boolean {
  return /^[A-Za-z0-9_.-]{1,100}$/.test(name);
}

/* ---------------- local connection state ---------------- */

export interface GhConnection {
  token: string;
  user: GhUser;
  savedAt: string;
}

const LS_CONN = "aaa-gh-connection";
const LS_REPO = "aaa-gh-repo";

export function loadConnection(): GhConnection | null {
  try {
    const raw = localStorage.getItem(LS_CONN);
    return raw ? (JSON.parse(raw) as GhConnection) : null;
  } catch { return null; }
}

export function saveConnection(conn: GhConnection | null) {
  try {
    if (conn) localStorage.setItem(LS_CONN, JSON.stringify(conn));
    else localStorage.removeItem(LS_CONN);
  } catch { /* storage unavailable */ }
}

export interface GhRepoChoice {
  fullName: string;
  branch: string;
}

export function loadRepoChoice(): GhRepoChoice | null {
  try {
    const raw = localStorage.getItem(LS_REPO);
    return raw ? (JSON.parse(raw) as GhRepoChoice) : null;
  } catch { return null; }
}

export function saveRepoChoice(choice: GhRepoChoice | null) {
  try {
    if (choice) localStorage.setItem(LS_REPO, JSON.stringify(choice));
    else localStorage.removeItem(LS_REPO);
  } catch { /* storage unavailable */ }
}
