import { runSql } from "../src/lib/academy/sql-engine";
import { getSqlTables } from "../src/lib/academy/datasets";

const t = getSqlTables();
const q1 = runSql("SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY n DESC;", t);
console.log("count by status:", q1.rows.slice(0, 3));

const q2 = runSql("SELECT substr(o.order_date,1,7) AS m, SUM(i.quantity * i.unit_price) AS rev FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status='completed' GROUP BY substr(o.order_date,1,7) ORDER BY m LIMIT 3;", t);
console.log("monthly rev:", q2.rows);

const q3 = runSql("WITH x AS (SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id) SELECT COUNT(*) AS c FROM x;", t);
console.log("CTE count:", q3.rows);
