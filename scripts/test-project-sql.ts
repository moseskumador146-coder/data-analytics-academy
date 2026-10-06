// Verifies every generated SQL query from Project 4 runs against the built-in engine.
import { runSql } from "../src/lib/academy/sql-engine";
import { getSqlTables } from "../src/lib/academy/datasets";
import { generateProjectFiles } from "../src/lib/academy/portfolio";
import { findProject } from "../src/lib/academy/projects";

const tables = getSqlTables() as unknown as Record<string, { rows: Record<string, string | number | null>[] }>;
const files = generateProjectFiles(findProject("p4")!);
let pass = 0, fail = 0;
for (const f of files.filter((x) => x.kind === "sql")) {
  const sql = f.content
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  try {
    const r = runSql(sql, tables);
    console.log(`OK  ${f.path.split("/").pop()} → ${r.rows.length} rows`);
    pass++;
  } catch (e) {
    console.log(`FAIL ${f.path.split("/").pop()} → ${e instanceof Error ? e.message : e}`);
    fail++;
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
