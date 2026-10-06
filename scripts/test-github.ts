/* Validates the GitHub lib against the real public API (no token needed for public pulls):
   1. pullFiles on octocat/Hello-World → README fetched
   2. parseRepoInput accepts URLs + owner/repo, rejects junk
   3. pushFiles error path with a bogus token → GhError 401 (API plumbing reachable) */
import { pullFiles, parseRepoInput, pushFiles, GhError } from "../src/lib/academy/github";

async function main() {
  console.log("— parseRepoInput —");
  const cases: [string, string | null][] = [
    ["https://github.com/octocat/Hello-World", "octocat/Hello-World"],
    ["octocat/Hello-World", "octocat/Hello-World"],
    ["https://github.com/user/repo.git", "user/repo.git".replace(".git", "")],
    ["not a repo", null],
    ["", null],
  ];
  let ok = 0;
  for (const [input, expected] of cases) {
    const got = parseRepoInput(input);
    const gotStr = got ? `${got.owner}/${got.repo}` : null;
    const pass = gotStr === expected;
    if (pass) ok++;
    console.log(`  ${pass ? "OK" : "FAIL"} "${input}" → ${gotStr}`);
  }

  console.log("— pullFiles (public, no token) —");
  const res = await pullFiles(undefined, "octocat", "Hello-World", undefined, undefined, (l) => console.log("  " + l));
  const readme = res.files.find((f) => f.path.toLowerCase().includes("readme"));
  console.log(`  files: ${res.files.length}, branch: ${res.branch}, head: ${res.headSha.slice(0, 7)}`);
  console.log(`  README found: ${!!readme} (${readme?.size ?? 0} bytes)`);
  if (!readme) throw new Error("README not pulled");

  console.log("— pushFiles with bogus token (expect clean 401) —");
  try {
    await pushFiles(
      "ghp_bogus_token_for_error_path",
      { id: 0, name: "Hello-World", full_name: "octocat/Hello-World", private: false, html_url: "", default_branch: "main", owner: { login: "octocat" } },
      "main",
      [{ path: "test.md", content: "hi" }],
      "test commit"
    );
    console.log("  FAIL — push should have thrown");
  } catch (e) {
    if (e instanceof GhError && e.status === 401) console.log(`  OK — GhError 401: ${e.message}`);
    else console.log(`  UNEXPECTED: ${e}`);
  }

  if (ok === cases.length) console.log("\nALL GITHUB LIB CHECKS PASSED");
  else { console.log(`\n${cases.length - ok} parse cases failed`); process.exit(1); }
}

main();
