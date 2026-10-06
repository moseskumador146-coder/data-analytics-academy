/**
 * DAX engine test — evaluates measures against the clean retail Sales model and
 * compares with ground truth computed directly from the same rows.
 */
import { getCleanSales, type Row } from "../src/lib/academy/datasets";
import { createDaxEngine } from "../src/lib/academy/dax-engine";

const rows: Row[] = getCleanSales().rows; // 340 rows, 2025-01-01..2025-12-31-ish
const BUILTINS = [
  { name: "Total Sales", formula: "SUM('Sales'[revenue])" },
  { name: "Total Units", formula: "SUM('Sales'[units])" },
  { name: "Orders", formula: "COUNTROWS('Sales')" },
  { name: "Avg Order Value", formula: "DIVIDE([Total Sales], [Orders])" },
  { name: "Unique Customers", formula: "DISTINCTCOUNT('Sales'[customer])" },
];
const eng = createDaxEngine("Sales", rows, BUILTINS);

// ground truth
const sumRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
const sumUnits = rows.reduce((s, r) => s + Number(r.units), 0);
const west = rows.filter((r) => r.region === "West");
const westRev = west.reduce((s, r) => s + Number(r.revenue), 0);
const westSports = west.filter((r) => r.category === "Sports");
const westSportsRev = westSports.reduce((s, r) => s + Number(r.revenue), 0);
const westUnits = west.reduce((s, r) => s + Number(r.units), 0);
const elec = rows.filter((r) => r.category === "Electronics");
const elecRev = elec.reduce((s, r) => s + Number(r.revenue), 0);
const bigOrders = rows.filter((r) => Number(r.revenue) >= 1000).length;
const lineRev = rows.reduce((s, r) => s + Number(r.units) * Number(r.unit_price), 0);
const regions = new Set(rows.map((r) => r.region)).size;
const customers = new Set(rows.map((r) => r.customer)).size;
const aov = sumRevenue / rows.length;
const dec2025 = rows.filter((r) => String(r.order_date).startsWith("2025-12"));
const decRev = dec2025.reduce((s, r) => s + Number(r.revenue), 0);
const q4 = rows.filter((r) => String(r.order_date).startsWith("2025") && String(r.order_date).slice(5, 7) >= "10");
const q4Rev = q4.reduce((s, r) => s + Number(r.revenue), 0);
const nov = rows.filter((r) => String(r.order_date).startsWith("2025-11"));
const novRev = nov.reduce((s, r) => s + Number(r.revenue), 0);
const onlineRows = rows.filter((r) => r.channel === "Online Store");
const onlineRev = onlineRows.reduce((s, r) => s + Number(r.revenue), 0);
const westShare = westRev / sumRevenue;

let pass = 0, fail = 0;
function eq(name: string, formula: string, expected: number | string | null, tol = 0.02) {
  try {
    const { value } = eng.evaluate(formula);
    const ok = expected === null
      ? value === null
      : typeof expected === "number"
        ? typeof value === "number" && Math.abs(value - expected) <= tol
        : String(value).toLowerCase() === String(expected).toLowerCase();
    if (ok) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`FAIL  ${name} → got ${JSON.stringify(value)}, want ${JSON.stringify(expected)}`); }
  } catch (e) {
    fail++; console.log(`FAIL  ${name} → threw: ${(e as Error).message}`);
  }
}
function throws(name: string, formula: string, match: string) {
  try {
    const r = eng.evaluate(formula);
    fail++; console.log(`FAIL  ${name} → expected error, got ${JSON.stringify(r.value)}`);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes(match.toLowerCase())) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`FAIL  ${name} → wrong error: ${msg}`); }
  }
}

console.log(`DAX engine over ${rows.length} Sales rows`);

eq("SUM revenue", "SUM('Sales'[revenue])", sumRevenue);
eq("SUM unquoted table", "SUM(Sales[revenue])", sumRevenue);
eq("SUM units", "SUM('Sales'[units])", sumUnits);
eq("AVERAGE revenue", "AVERAGE('Sales'[revenue])", sumRevenue / rows.length);
eq("MIN", "MIN('Sales'[unit_price])", Math.min(...rows.map((r) => Number(r.unit_price))));
eq("MAX", "MAX('Sales'[revenue])", Math.max(...rows.map((r) => Number(r.revenue))));
eq("COUNTROWS", "COUNTROWS('Sales')", rows.length);
eq("COUNT col", "COUNT('Sales'[revenue])", rows.length);
eq("DISTINCTCOUNT regions", "DISTINCTCOUNT('Sales'[region])", regions);
eq("DISTINCTCOUNT customers", "DISTINCTCOUNT('Sales'[customer])", customers);
eq("measure ref [Total Sales]", "[Total Sales]", sumRevenue);
eq("measure ref inside expr", "[Total Sales] * 2", sumRevenue * 2);
eq("DIVIDE measures", "DIVIDE([Total Sales], [Orders])", aov);
eq("arithmetic", "SUM('Sales'[revenue]) - SUM('Sales'[units])", sumRevenue - sumUnits);

eq("CALCULATE region=West", 'CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "West")', westRev);
eq("CALCULATE two filters", 'CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "West", \'Sales\'[category] = "Sports")', westSportsRev);
eq("CALCULATE numeric filter", "CALCULATE(COUNTROWS('Sales'), 'Sales'[revenue] >= 1000)", bigOrders);
eq("CALCULATE measure + filter", 'CALCULATE([Total Sales], \'Sales\'[channel] = "Online Store")', onlineRev);
eq("CALCULATE <> filter", "CALCULATE(SUM('Sales'[revenue]), 'Sales'[region] <> \"West\")", sumRevenue - westRev);

eq("ALL % of total", "DIVIDE([Total Sales], CALCULATE([Total Sales], ALL('Sales')))", 1);
eq("ALL region share", "DIVIDE(CALCULATE(SUM('Sales'[revenue]), 'Sales'[region]=\"West\"), CALCULATE(SUM('Sales'[revenue]), ALL('Sales'[region])))", westShare);
eq("FILTER table expr", "COUNTROWS(FILTER('Sales', 'Sales'[revenue] > 1000))", bigOrders);
eq("FILTER + SUMX", "SUMX(FILTER('Sales', 'Sales'[region] = \"West\"), 'Sales'[revenue])", westRev);
eq("SUMX row arithmetic", "SUMX('Sales', 'Sales'[units] * 'Sales'[unit_price])", lineRev);
eq("AVERAGEX", "AVERAGEX('Sales', 'Sales'[revenue])", sumRevenue / rows.length);
eq("MINX", "MINX('Sales', 'Sales'[revenue])", Math.min(...rows.map((r) => Number(r.revenue))));
eq("MAXX filtered", "MAXX(FILTER('Sales','Sales'[region]=\"West\"), 'Sales'[revenue])", Math.max(...west.map((r) => Number(r.revenue))));
eq("COUNTX", "COUNTX(FILTER('Sales', 'Sales'[revenue] > 500), 'Sales'[revenue])", rows.filter((r) => Number(r.revenue) > 500).length);

eq("IF true branch", 'IF([Total Sales] > 0, "profit", "loss")', "profit");
eq("IF false branch", 'IF([Total Sales] > 99999999999, "a", "b")', "b");
eq("SWITCH value form", 'SWITCH("West", "West", 4, "East", 3, 0)', 4);
eq("SWITCH TRUE form", 'SWITCH(TRUE(), [Total Sales] > 1000000, "big", [Total Sales] > 100000, "mid", "small")', "mid");
eq("AND", 'AND(1=1, 2>1)', 1);
eq("OR", 'OR(1=2, 2>1)', 1);
eq("NOT", "NOT(FALSE())", 1);
eq("ISBLANK blank", "ISBLANK(BLANK())", 1);
eq("ISBLANK value", "ISBLANK(5)", 0);
eq("BLANK arithmetic", "BLANK() + 5", 5);

eq("DIVIDE safe", "DIVIDE(10, 0)", null);
eq("DIVIDE alt", "DIVIDE(10, 0, -1)", -1);
eq("ROUND", "ROUND(3.14159, 2)", 3.14);
eq("ABS", "ABS(0 - 7.5)", 7.5);
eq("INT", "INT(7.9)", 7);
eq("scalar MIN", "MIN(3, 9)", 3);
eq("scalar MAX", "MAX(3, 9)", 9);

eq("FORMAT 2dp", 'FORMAT(1234.5678, "#,##0.00")', "1,234.57");
eq("FORMAT percent", 'FORMAT(0.256, "0.0%")', "25.6%");
eq("CONCATENATE", 'CONCATENATE("Total: ", FORMAT(5, "0"))', "Total: 5");

eq("COUNTROWS VALUES", "COUNTROWS(VALUES('Sales'[region]))", regions);
eq("VALUES + SUMX avg", "AVERAGEX(VALUES('Sales'[region]), CALCULATE(SUM('Sales'[revenue])))", sumRevenue / regions);

eq("TOTALYTD (all-2025 data)", "TOTALYTD(SUM('Sales'[revenue]), 'Sales'[order_date])", sumRevenue);
eq("TOTALYTD through June", "CALCULATE(SUM('Sales'[revenue]), 'Sales'[order_date] <= \"2025-06-30\")", rows.filter((r) => String(r.order_date) <= "2025-06-30").reduce((s, r) => s + Number(r.revenue), 0));
eq("DATESYTD rowcount", "COUNTROWS(DATESYTD('Sales'[order_date]))", rows.length);
eq("DATEADD -1 YEAR blank", "CALCULATE(SUM('Sales'[revenue]), DATEADD('Sales'[order_date], -1, YEAR))", null);
eq("SAMEPERIODLASTYEAR blank", "CALCULATE(SUM('Sales'[revenue]), SAMEPERIODLASTYEAR('Sales'[order_date]))", null);
eq("PREVIOUSMONTH from Dec", "CALCULATE(SUM('Sales'[revenue]), PREVIOUSMONTH('Sales'[order_date]))", novRev);
eq("YoY growth pattern (DAX: BLANK-1 = -1)", "DIVIDE([Total Sales], CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Sales'[order_date]))) - 1", -1);
eq("MoM on Nov", "CALCULATE(SUM('Sales'[revenue]), 'Sales'[order_date] >= \"2025-11-01\", 'Sales'[order_date] <= \"2025-11-30\")", novRev);
eq("Q4 revenue", "CALCULATE(SUM('Sales'[revenue]), 'Sales'[order_date] >= \"2025-10-01\")", q4Rev);
eq("December revenue", "CALCULATE(SUM('Sales'[revenue]), 'Sales'[order_date] >= \"2025-12-01\")", decRev);

eq("user measure division", "DIVIDE([Total Units], [Orders])", sumUnits / rows.length);
eq("nested CALCULATE", 'CALCULATE(CALCULATE(SUM(\'Sales\'[revenue]), \'Sales\'[region] = "West"), \'Sales\'[category] = "Sports")', westSportsRev);

// teaching errors
throws("bare column error", "'Sales'[revenue]", "row context");
throws("unknown measure", "[Nope]", "no measure");
throws("unknown function", "RANKX('Sales', [Total Sales])", "isn't available");
throws("bad table", "SUM('Store'[revenue])", "'Sales'");
eq("self-referencing expression (not circular)", "[Total Sales] + [Total Sales]", sumRevenue * 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
