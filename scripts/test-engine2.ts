import { runSql } from "../src/lib/academy/sql-engine";
import { getSqlTables } from "../src/lib/academy/datasets";

const t = getSqlTables();
// ground truth: completed revenue per month, computed manually
const orders = new Map(t.orders.rows.map((r) => [r.id, r]));
const products = new Map(t.order_items.rows.map((r) => [r.product_id, r.product_id]));
const truth = new Map<string, number>();
for (const it of t.order_items.rows) {
  const o = orders.get(it.order_id as number);
  if (!o || o.status !== "completed") continue;
  const m = String(o.order_date).slice(0, 7);
  truth.set(m, (truth.get(m) ?? 0) + (it.quantity as number) * (it.unit_price as number));
}
const sorted = [...truth.entries()].sort().slice(0, 3);
console.log("TRUTH:", sorted);

const q = runSql("SELECT substr(o.order_date,1,7) AS m, SUM(i.quantity * i.unit_price) AS rev FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status='completed' GROUP BY substr(o.order_date,1,7) ORDER BY m LIMIT 3;", t);
console.log("SQL:  ", q.rows);
