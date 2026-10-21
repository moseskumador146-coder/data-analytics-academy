/* Regression tests for the new SQL engine features: window functions + UNION. */
import { runSql } from "../src/lib/academy/sql-engine";
import { getSqlTables } from "../src/lib/academy/datasets";

const tables = getSqlTables() as unknown as Record<string, { rows: Record<string, unknown>[] }>;
let pass = 0;
let fail = 0;

function check(name: string, sql: string, validate: (r: ReturnType<typeof runSql>) => void) {
  try {
    const res = runSql(sql, tables);
    validate(res);
    pass++;
    console.log(`  ok - ${name}`);
  } catch (e) {
    fail++;
    console.error(`  FAIL - ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

function checkThrows(name: string, sql: string, match: string) {
  try {
    runSql(sql, tables);
    fail++;
    console.error(`  FAIL - ${name}: expected an error containing "${match}", got none`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes(match)) { pass++; console.log(`  ok - ${name}`); }
    else { fail++; console.error(`  FAIL - ${name}: error "${msg}" does not contain "${match}"`); }
  }
}

console.log("Window functions:");

check("ROW_NUMBER over whole table", 
  "SELECT name, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM customers ORDER BY name LIMIT 5",
  (r) => {
    if (r.rows.length !== 5) throw new Error(`expected 5 rows, got ${r.rows.length}`);
    const rns = r.rows.map((row) => row[1]);
    if (JSON.stringify(rns) !== JSON.stringify([1, 2, 3, 4, 5])) throw new Error(`rn not sequential: ${rns}`);
  });

check("ROW_NUMBER with PARTITION BY",
  "SELECT name, segment, ROW_NUMBER() OVER (PARTITION BY segment ORDER BY name) AS rn FROM customers",
  (r) => {
    // each segment restarts at 1 and is sequential across the full result
    const seen = new Map<string, number[]>();
    for (const row of r.rows) {
      const seg = String(row[1]);
      const rn = row[2] as number;
      const list = seen.get(seg) ?? [];
      list.push(rn);
      seen.set(seg, list);
    }
    for (const [seg, list] of seen) {
      const sorted = [...list].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) if (sorted[i] !== i + 1) throw new Error(`segment ${seg} rn not a 1..N permutation: ${sorted.slice(0, 8)}…`);
    }
  });

check("RANK with ties",
  "SELECT RANK() OVER (ORDER BY status) AS rk, status FROM orders LIMIT 10",
  (r) => {
    // ties share rank: same status → same rank
    const byStatus = new Map<string, number>();
    for (const row of r.rows) {
      const st = String(row[1]);
      const rk = row[0] as number;
      if (byStatus.has(st) && byStatus.get(st) !== rk) throw new Error(`same status got different ranks: ${st}`);
      byStatus.set(st, rk);
    }
  });

check("LAG previous row",
  "SELECT id, LAG(id, 1) OVER (ORDER BY id) AS prev_id FROM customers ORDER BY id LIMIT 5",
  (r) => {
    if (r.rows[0][1] !== null) throw new Error(`first LAG should be null, got ${r.rows[0][1]}`);
    for (let i = 1; i < r.rows.length; i++) {
      if (r.rows[i][1] !== r.rows[i - 1][0]) throw new Error(`LAG mismatch at row ${i}: ${r.rows[i][1]} vs ${r.rows[i - 1][0]}`);
    }
  });

check("LEAD next row",
  "SELECT id, LEAD(id, 1) OVER (ORDER BY id) AS next_id FROM customers ORDER BY id LIMIT 5",
  (r) => {
    for (let i = 0; i < r.rows.length - 1; i++) {
      if (r.rows[i][1] !== r.rows[i + 1][0]) throw new Error(`LEAD mismatch at row ${i}`);
    }
  });

check("SUM() OVER (PARTITION BY) — group total beside each row",
  "SELECT name, segment, COUNT(*) OVER (PARTITION BY segment) AS seg_size FROM customers",
  (r) => {
    const sizes = new Map<string, number>();
    for (const row of r.rows) sizes.set(String(row[1]), (sizes.get(String(row[1])) ?? 0) + 1);
    for (const row of r.rows) {
      if (row[2] !== sizes.get(String(row[1]))) throw new Error(`seg_size mismatch for ${row[1]}`);
    }
  });

check("window inside arithmetic (amount - LAG)",
  "SELECT id, id - LAG(id, 1) OVER (ORDER BY id) AS gap FROM customers ORDER BY id LIMIT 5",
  (r) => {
    if (r.rows[0][1] === null || r.rows[0][1] === "") { /* first row gap null — ok */ }
    for (let i = 1; i < r.rows.length; i++) {
      const expected = (r.rows[i][0] as number) - (r.rows[i - 1][0] as number);
      if (r.rows[i][1] !== expected) throw new Error(`gap mismatch: ${r.rows[i][1]} vs ${expected}`);
    }
  });

check("ROW_NUMBER + CTE (top per group shape)",
  "WITH ranked AS (SELECT name, city, ROW_NUMBER() OVER (PARTITION BY city ORDER BY name) AS rn FROM customers) SELECT name, city, rn FROM ranked WHERE rn = 1 LIMIT 5",
  (r) => {
    for (const row of r.rows) if (row[2] !== 1) throw new Error(`rn should be 1, got ${row[2]}`);
  });

check("window with alias in ORDER BY",
  "SELECT name, ROW_NUMBER() OVER (ORDER BY name DESC) AS rn FROM customers ORDER BY rn LIMIT 3",
  (r) => {
    if ((r.rows[0][1] as number) !== 1) throw new Error("first row should have rn=1");
  });

checkThrows("window function error for missing OVER", "SELECT ROW_NUMBER() FROM customers LIMIT 1", "requires an OVER");

console.log("UNION:");

check("UNION ALL stacks rows",
  "SELECT name FROM customers LIMIT 3 UNION ALL SELECT name FROM products LIMIT 3",
  (r) => {
    if (r.rows.length !== 6) throw new Error(`expected 6 rows, got ${r.rows.length}`);
  });

check("UNION dedupes identical rows",
  "SELECT name FROM products LIMIT 3 UNION SELECT name FROM products LIMIT 3",
  (r) => {
    if (r.rows.length !== 3) throw new Error(`expected 3 deduped rows, got ${r.rows.length}`);
  });

check("UNION ALL keeps duplicates",
  "SELECT name FROM products LIMIT 3 UNION ALL SELECT name FROM products LIMIT 3",
  (r) => {
    if (r.rows.length !== 6) throw new Error(`expected 6 rows, got ${r.rows.length}`);
  });

check("UNION with ORDER BY on output column",
  "SELECT name AS n, 1 AS src FROM customers LIMIT 2 UNION ALL SELECT name, 2 FROM products LIMIT 2 ORDER BY n LIMIT 4",
  (r) => {
    if (r.rows.length !== 4) throw new Error(`expected 4 rows, got ${r.rows.length}`);
    for (let i = 1; i < r.rows.length; i++) {
      if (String(r.rows[i - 1][0]) > String(r.rows[i][0])) throw new Error("not sorted by n");
    }
  });

checkThrows("UNION column-count mismatch errors clearly",
  "SELECT id, name FROM customers LIMIT 1 UNION SELECT id FROM products LIMIT 1",
  "same number of columns");

console.log("Regression (existing features still work):");

check("plain SELECT", "SELECT name, city FROM customers LIMIT 3", (r) => {
  if (r.rows.length !== 3 || r.columns.length !== 2) throw new Error("bad shape");
});

check("GROUP BY + HAVING", "SELECT status, COUNT(*) AS n FROM orders GROUP BY status HAVING COUNT(*) > 5 ORDER BY n DESC", (r) => {
  if (r.rows.length < 1) throw new Error("no groups");
});

check("JOIN + aggregate", "SELECT c.segment, COUNT(*) AS n FROM orders o JOIN customers c ON o.customer_id = c.id GROUP BY c.segment ORDER BY n DESC LIMIT 3", (r) => {
  if (r.rows.length !== 3) throw new Error("expected 3 segments");
});

check("CTE chain", "WITH t AS (SELECT status, COUNT(*) AS n FROM orders GROUP BY status) SELECT * FROM t WHERE n > 3 ORDER BY n DESC", (r) => {
  if (r.rows.length < 1) throw new Error("no rows");
});

check("CASE WHEN", "SELECT CASE WHEN 1 = 1 THEN 'yes' ELSE 'no' END AS v FROM customers LIMIT 1", (r) => {
  if (r.rows[0][0] !== "yes") throw new Error(`got ${r.rows[0][0]}`);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
