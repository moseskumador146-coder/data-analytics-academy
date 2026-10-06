import { runSql } from "../src/lib/academy/sql-engine";
import { getSqlTables } from "../src/lib/academy/datasets";

const tables = getSqlTables() as unknown as Record<string, { rows: Record<string, string | number | null>[] }>;

const queries = [
  "SELECT * FROM customers LIMIT 5;",
  "SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY n DESC;",
  "SELECT name, city FROM customers WHERE segment = 'Enterprise' LIMIT 5;",
  "SELECT c.name, c.city, SUM(i.quantity * i.unit_price) AS revenue FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id WHERE o.status = 'completed' GROUP BY c.name, c.city HAVING SUM(i.quantity * i.unit_price) > 500 ORDER BY revenue DESC LIMIT 5;",
  "SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;",
  "SELECT substr(o.order_date, 1, 7) AS month, SUM(i.quantity * i.unit_price) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'completed' GROUP BY substr(o.order_date, 1, 7) ORDER BY month;",
  "SELECT DISTINCT city FROM customers ORDER BY city;",
  "SELECT name FROM customers WHERE city IN ('London', 'Paris') AND id BETWEEN 3 AND 30;",
  "SELECT name FROM customers WHERE name LIKE 'A%';",
  "SELECT UPPER(name) AS uname, LENGTH(city) AS clen FROM customers LIMIT 3;",
  "SELECT city, COUNT(*) AS n, AVG(id) AS avg_id FROM customers GROUP BY city HAVING COUNT(*) > 3 ORDER BY n DESC, city;",
  "SELECT e.name, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id LIMIT 5;",
  "SELECT p.category, COUNT(DISTINCT p.id) AS products FROM products p GROUP BY p.category ORDER BY products DESC;",
];

for (const q of queries) {
  try {
    const r = runSql(q, tables);
    console.log(`OK (${r.rows.length} rows, ${r.ms}ms) :: ${q.slice(0, 60)}`);
    if (r.rows[0]) console.log("   first row:", JSON.stringify(r.rows[0]));
  } catch (e) {
    console.log(`FAIL :: ${q.slice(0, 60)}\n   ${e instanceof Error ? e.message : e}`);
  }
}
