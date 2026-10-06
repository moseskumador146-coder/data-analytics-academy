/* Triple-check validator: paths, curriculum integrity, datasets, functions-db.
   Run: npx tsx scripts/validate-academy.ts */
import { getAllDatasets, getSampleCatalog, getDatasetById } from "../src/lib/academy/datasets";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${name} ${extra}`);
  } else {
    console.log(`  ✓ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

/* ---------- datasets ---------- */
console.log("\n[1] Sample datasets");
const cat = getSampleCatalog();
check("catalog has 21 sample files", cat.length === 21, `${cat.length}`);
check("sizes span Small→Huge", ["Small", "Medium", "Large", "Huge"].every((s) => cat.some((f) => f.size === s)));
check("messy files exist", cat.filter((f) => f.messy).length >= 5, `${cat.filter((f) => f.messy).length} messy`);
for (const ds of getAllDatasets()) {
  check(`${ds.id}`, ds.rows.length > 0 && ds.columns.length > 0 && ds.description.length > 10, `${ds.rows.length}×${ds.columns.length}`);
  // column integrity: every row has every column key
  const missing = ds.rows.slice(0, 50).some((r) => ds.columns.some((c) => !(c.key in r)));
  check(`${ds.id} column keys`, !missing);
}

/* ---------- paths & curriculum ---------- */
async function main() {
console.log("\n[2] Curriculum & learning paths (4 levels)");
const { PATH_LEVELS, ALL_LESSONS, findLesson, TOTAL_LESSONS } = await import("../src/lib/academy/curriculum");

check("4 path levels (beginner → master)", PATH_LEVELS.length === 4, PATH_LEVELS.map((l: { id: string }) => l.id).join(" → "));
check("lesson count is substantial", TOTAL_LESSONS >= 60, `${TOTAL_LESSONS} lessons`);

// every lesson: id unique, has title, minutes, body with real depth
const seen = new Set<string>();
let dupes = 0, shallow = 0, noTitle = 0;
for (const l of ALL_LESSONS as { id: string; title?: string; minutes?: number; content?: string; takeaways?: string[] }[]) {
  if (seen.has(l.id)) dupes++;
  seen.add(l.id);
  if (!l.title || l.title.length < 4) noTitle++;
  const bodyLen = (l.content ?? "").length + (l.takeaways ?? []).join("").length;
  if (bodyLen < 400) shallow++; // lessons must be detailed
}
check("lesson ids unique", dupes === 0, `${dupes} dupes`);
check("all lessons titled", noTitle === 0);
check("all lessons have deep body content (≥400 chars)", shallow === 0, `${shallow} shallow`);
check("findLesson resolves every id", (ALL_LESSONS as { id: string }[]).every((l) => !!findLesson(l.id)));

// levels well-formed: modules + outcomes
for (const lvl of PATH_LEVELS as { id: string; title: string; modules: unknown[]; outcomes: string[] }[]) {
  check(`level "${lvl.id}" — ${lvl.modules.length} modules, ${lvl.outcomes?.length ?? 0} outcomes`, lvl.modules.length >= 2 && (lvl.outcomes?.length ?? 0) >= 2);
}

/* ---------- functions-db ---------- */
console.log("\n[3] Functions knowledge base");
const fdb = await import("../src/lib/academy/functions-db");
const fdbAny = fdb as unknown as Record<string, unknown>;
for (const [key, val] of Object.entries(fdbAny)) {
  if (Array.isArray(val) && val.length && typeof val[0] === "object" && val[0] !== null && "syntax" in (val[0] as object)) {
    const entries = val as { name?: string; syntax: string; example?: string; detail?: string }[];
    const bad = entries.filter((e) => !e.syntax || e.syntax.length < 4 || (e.detail && e.detail.length < 30));
    check(`${key}: ${entries.length} function entries well-formed`, bad.length === 0, bad.length ? bad.map((b) => b.name ?? b.syntax).slice(0, 3).join(",") : "");
  }
}

/* ---------- engines smoke ---------- */
console.log("\n[4] Engine smoke (import + basic eval)");
const { evalSheetFormula } = await import("../src/lib/academy/formula-engine");
check("SUM evaluates", evalSheetFormula("SUM(1,2,3)", {}, new Set()) === 6);
const testCells: Record<string, string> = { A1: "a", A2: "b", B1: "1", B2: "2" };
check("XLOOKUP over cells", String(evalSheetFormula('XLOOKUP("b",A1:A2,B1:B2,"nf")', testCells, new Set())) === "2");
check("SUMIF over cells", evalSheetFormula('SUMIF(A1:A2,"a",B1:B2)', testCells, new Set()) === 1);
const { createDaxEngine } = await import("../src/lib/academy/dax-engine");
const cleanSales = getDatasetById("clean_sales")!;
const eng = createDaxEngine("Sales", cleanSales.rows, []);
check("DAX COUNTROWS", eng.evaluate("COUNTROWS(Sales)").value === cleanSales.rows.length, String(eng.evaluate("COUNTROWS(Sales)").display));

console.log(failures === 0 ? "\nALL VALIDATIONS PASSED ✅" : `\n${failures} VALIDATION FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
