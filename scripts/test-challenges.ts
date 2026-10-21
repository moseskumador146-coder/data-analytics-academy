/**
 * Challenge Arena verification — runs every challenge's model answer through the
 * real evaluators (formula engine, DAX engine, SQL engine) and asserts the
 * expected value stored in functions-db.ts. Catches any drift between the
 * knowledge base and the data.
 */
import { getCleanSales, getSqlTables } from "../src/lib/academy/datasets";
import { evalSheetFormula } from "../src/lib/academy/formula-engine";
import { createDaxEngine } from "../src/lib/academy/dax-engine";
import { runSql } from "../src/lib/academy/sql-engine";
import { CHALLENGES, type Challenge } from "../src/lib/academy/functions-db";

/* sandbox sheet — identical construction to the UI's Excel sandbox */
const rows = getCleanSales().rows.slice(0, 198);
const cols = ["order_id", "order_date", "customer", "region", "category", "product", "units", "unit_price", "revenue", "channel", "payment_method"];
const cells: Record<string, string> = {};
cols.forEach((c, i) => { cells[`${String.fromCharCode(65 + i)}1`] = c; });
rows.forEach((r, ri) => cols.forEach((c, ci) => {
  const v = r[c];
  if (v !== null && v !== undefined && v !== "") cells[`${String.fromCharCode(65 + ci)}${ri + 2}`] = String(v);
}));

const BUILTINS = [
  { name: "Total Sales", formula: "SUM('Sales'[revenue])" },
  { name: "Total Units", formula: "SUM('Sales'[units])" },
  { name: "Orders", formula: "COUNTROWS('Sales')" },
  { name: "Avg Order Value", formula: "DIVIDE([Total Sales], [Orders])" },
  { name: "Unique Customers", formula: "DISTINCTCOUNT('Sales'[customer])" },
];
const dax = createDaxEngine("Sales", getCleanSales().rows, BUILTINS);
const sqlTables = getSqlTables();

let pass = 0, fail = 0;
for (const ch of CHALLENGES) {
  const ok = checkChallenge(ch);
  if (ok) { pass++; console.log(`  ok  ${ch.id} (${ch.tool})`); }
  else { fail++; console.log(`FAIL  ${ch.id} (${ch.tool}) ${ch.prompt.slice(0, 60)}`); }
}

function checkChallenge(ch: Challenge): boolean {
  if (ch.check.kind === "choice") return true; // static — validated by structure
  try {
    if (ch.check.kind === "formula") {
      // strip anything after the first '=' assignments like "Total Sales = ..." — challenges store bare formulas
      const v = evalSheetFormula(ch.solution.replace(/^=/, ""), cells, new Set());
      const exp = ch.check.expected;
      if (typeof exp === "number") return Math.abs((typeof v === "number" ? v : parseFloat(String(v))) - exp) <= (ch.check.tol ?? 0.02);
      return String(v).toLowerCase() === String(exp).toLowerCase();
    }
    if (ch.check.kind === "dax") {
      const named = ch.solution.match(/^[A-Za-z][A-Za-z0-9 _'%-]*\s*=(?![=>])\s*([\s\S]+)$/);
      const src = named ? named[1].trim() : ch.solution;
      const { value } = dax.evaluate(src);
      const exp = ch.check.expected;
      if (exp === null) return value === null;
      if (typeof exp === "number") return typeof value === "number" && Math.abs(value - exp) <= (ch.check.tol ?? 0.02);
      return String(value).toLowerCase() === String(exp).toLowerCase();
    }
    if (ch.check.kind === "sql") {
      const a = runSql(ch.check.sql, sqlTables);
      const b = runSql(ch.solution, sqlTables);
      const av = a.rows[0]?.[0];
      const bv = b.rows[0]?.[0];
      return String(av) === String(bv) && String(av) === String(ch.check.expected);
    }
    return false;
  } catch {
    return false;
  }
}

console.log(`\n${pass}/${CHALLENGES.length} challenges verified`);
process.exit(fail ? 1 : 0);
