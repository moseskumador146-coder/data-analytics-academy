// Validate practices: coverage of every lesson + every solution runs clean
// through the REAL engines (formula / SQL / DAX). Run: bun scripts/validate-practices.ts
import { PATH_LEVELS } from "../src/lib/academy/curriculum";
import { PRACTICES, practiceFor, PRACTICE_COUNT } from "../src/lib/academy/practices";
import { getCleanSales, getSqlTables, type Row } from "../src/lib/academy/datasets";
import { evalSheetFormula, FormulaError } from "../src/lib/academy/formula-engine";
import { createDaxEngine } from "../src/lib/academy/dax-engine";
import { runSql } from "../src/lib/academy/sql-engine";

const COL_KEYS = ["order_id", "order_date", "customer", "region", "category", "product", "units", "unit_price", "revenue", "channel", "payment_method"];

function buildCells(): Record<string, string> {
  const ds = getCleanSales();
  const cells: Record<string, string> = {};
  COL_KEYS.forEach((c, i) => { cells[`${String.fromCharCode(65 + i)}1`] = c; });
  ds.rows.slice(0, 198).forEach((row: Row, r) => {
    COL_KEYS.forEach((c, ci) => {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "") cells[`${String.fromCharCode(65 + ci)}${r + 2}`] = String(v);
    });
  });
  return cells;
}

let fails = 0;
const bad = (id: string, msg: string) => { fails++; console.log(`  ✗ ${id}: ${msg}`); };

// 1. coverage
const lessonIds = PATH_LEVELS.flatMap((l) => l.modules.flatMap((m) => m.lessons.map((ls) => ls.id)));
console.log(`Lessons: ${lessonIds.length}, practices: ${PRACTICE_COUNT}`);
for (const id of lessonIds) {
  if (!practiceFor(id)) bad(id, "no practice attached");
}
const extra = Object.keys(PRACTICES).filter((k) => !lessonIds.includes(k));
for (const k of extra) bad(k, "practice for unknown lesson");

const cells = buildCells();
const dax = createDaxEngine("Sales", getCleanSales().rows, []);
const tables = getSqlTables();

for (const [id, p] of Object.entries(PRACTICES)) {
  switch (p.kind) {
    case "quiz": {
      if (!p.questions?.length) bad(id, "quiz without questions");
      p.questions?.forEach((q, i) => {
        if (q.correct < 0 || q.correct >= q.options.length) bad(id, `Q${i + 1} correct index out of range`);
        if (!q.explain) bad(id, `Q${i + 1} missing explanation`);
      });
      break;
    }
    case "clean": {
      if (!p.issues?.length) bad(id, "clean without issues");
      p.issues?.forEach((iss, i) => {
        if (iss.correct < 0 || iss.correct >= iss.options.length) bad(id, `issue ${i + 1} correct index out of range`);
        if (!iss.explain) bad(id, `issue ${i + 1} missing explanation`);
      });
      break;
    }
    case "excel": {
      if (!p.tasks?.length) bad(id, "excel without tasks");
      for (const t of p.tasks ?? []) {
        try {
          const v = evalSheetFormula(t.solution.replace(/^=/, ""), cells, new Set());
          if (v === undefined || v === null) bad(id, `task ${t.cell} solution evaluates to blank`);
          else console.log(`  · ${id} ${t.cell} → ${typeof v === "number" ? (+v).toLocaleString("en-US", { maximumFractionDigits: 2 }) : v}`);
        } catch (e) {
          bad(id, `task ${t.cell} solution error: ${e instanceof FormulaError ? e.message : (e as Error).message}`);
        }
      }
      break;
    }
    case "dax": {
      if (!p.daxTasks?.length) bad(id, "dax without tasks");
      for (const t of p.daxTasks ?? []) {
        try {
          const { value, display } = dax.evaluate(t.solution);
          console.log(`  · ${id} dax → ${display ?? String(value)}`);
        } catch (e) {
          bad(id, `dax solution error: ${(e as Error).message}`);
        }
      }
      break;
    }
    case "sql": {
      if (!p.sqlTasks?.length) bad(id, "sql without tasks");
      for (const t of p.sqlTasks ?? []) {
        try {
          const res = runSql(t.solution, tables);
          console.log(`  · ${id} sql → ${res.rows.length} rows × ${res.columns.length} cols [${res.columns.slice(0, 3).join(", ")}]`);
          if (!res.rows.length) bad(id, `task solution returns 0 rows: ${t.prompt}`);
        } catch (e) {
          bad(id, `sql solution error: ${(e as Error).message}`);
        }
      }
      break;
    }
  }
  if (!p.hints?.length) bad(id, "missing hints");
}

console.log(fails === 0 ? `\nALL ${PRACTICE_COUNT} PRACTICES PASSED` : `\n${fails} FAILURES`);
if (fails) process.exit(1);
