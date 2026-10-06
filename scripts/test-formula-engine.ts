/**
 * Regression test for the shared formula engine (src/lib/academy/formula-engine.ts).
 * Builds a virtual sheet from the clean retail sales dataset (headers row 1, data row 2+)
 * exactly like the Functions Lab sandbox does, then asserts key formula results.
 *
 * Column map (dataset order): A=order_id B=order_date C=customer D=region E=category
 * F=product G=units H=unit_price I=revenue J=channel K=payment_method
 */
import { getCleanSales } from "../src/lib/academy/datasets";
import { evalSheetFormula } from "../src/lib/academy/formula-engine";

function buildCells(limit = 198): Record<string, string> {
  const ds = getCleanSales();
  const cols = ds.columns.map((c) => c.key);
  const cells: Record<string, string> = {};
  cols.forEach((c, i) => { cells[`${String.fromCharCode(65 + i)}1`] = c; });
  ds.rows.slice(0, limit).forEach((row, r) => {
    cols.forEach((c, ci) => {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "") cells[`${String.fromCharCode(65 + ci)}${r + 2}`] = String(v);
    });
  });
  return cells;
}

const cells = buildCells();
let pass = 0, fail = 0;
function eq(name: string, formula: string, expected: number | string, tol = 0.01) {
  try {
    const v = evalSheetFormula(formula.replace(/^=/, ""), cells, new Set());
    const ok = typeof expected === "number"
      ? Math.abs((typeof v === "number" ? v : parseFloat(String(v))) - expected) <= tol
      : String(v).toLowerCase() === String(expected).toLowerCase();
    if (ok) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`FAIL  ${name} → got ${JSON.stringify(v)}, want ${JSON.stringify(expected)}`); }
  } catch (e) {
    fail++; console.log(`FAIL  ${name} → threw ${(e as Error).message}`);
  }
}

// ground truth from the same 198 rows (grid caps at ROWS=200 → refs A1:K199 keep all data inside)
const ds = getCleanSales().rows.slice(0, 198);
const sumRevenue = ds.reduce((s, r) => s + Number(r.revenue), 0);
const sumUnits = ds.reduce((s, r) => s + Number(r.units), 0);
const avgPrice = ds.reduce((s, r) => s + Number(r.unit_price), 0) / ds.length;
const westRevenue = ds.filter((r) => r.region === "West").reduce((s, r) => s + Number(r.revenue), 0);
const electronicsCount = ds.filter((r) => r.category === "Electronics").length;
const electronicsRevenue = ds.filter((r) => r.category === "Electronics").reduce((s, r) => s + Number(r.revenue), 0);
const electronicsAvgPrice = ds.filter((r) => r.category === "Electronics").reduce((s, r) => s + Number(r.unit_price), 0) / electronicsCount;
const westSports = ds.filter((r) => r.region === "West" && r.category === "Sports").reduce((s, r) => s + Number(r.revenue), 0);
const bigOrders = ds.filter((r) => Number(r.revenue) >= 1000).length;
const highPriceCount = ds.filter((r) => Number(r.unit_price) > 100).length;
const prices = ds.map((r) => Number(r.unit_price)).sort((a, b) => b - a);
const elecHighUnits = ds.filter((r) => r.category === "Electronics" && Number(r.units) >= 5).length;
const prodRev = new Map<string, number>();
for (const r of ds) prodRev.set(String(r.product), (prodRev.get(String(r.product)) ?? 0) + Number(r.revenue));
const topProduct = [...prodRev.entries()].sort((a, b) => b[1] - a[1])[0];

console.log(`Virtual sheet: 198 rows of clean sales (11 cols → A1:K199)`);
eq("SUM full column revenue", "=SUM(I:I)", sumRevenue);
eq("SUM(H) units via range", "=SUM(G2:G199)", sumUnits);
eq("AVERAGE unit price", "=AVERAGE(H2:H199)", avgPrice);
eq("COUNT", "=COUNT(H2:H199)", ds.length);
eq("COUNTA dates", "=COUNTA(B2:B199)", ds.length);
eq("SUMIF region=West", '=SUMIF(D:D,"West",I:I)', westRevenue);
eq("COUNTIF category", '=COUNTIF(E:E,"Electronics")', electronicsCount);
eq("SUMIF Electronics", '=SUMIF(E:E,"Electronics",I:I)', electronicsRevenue);
eq("SUMIFS two conditions", '=SUMIFS(I:I,D:D,"West",E:E,"Sports")', westSports);
eq("COUNTIFS", '=COUNTIFS(E:E,"Electronics",G:G,">=5")', elecHighUnits);
eq("IF nested", '=IF(AVERAGE(H2:H199)>50,"HIGH","LOW")', avgPrice > 50 ? "HIGH" : "LOW");
eq("IF single-cell compare (BUGFIX)", "=IF(I2>500,1,0)", Number(ds[0].revenue) > 500 ? 1 : 0);
eq("compare arithmetic (BUGFIX)", "=(H2*G2)=I2", 1); // unit_price*units = revenue
eq("IFERROR div0", '=IFERROR(1/0,"n/a")', "n/a");
eq("AVERAGEIF", '=AVERAGEIF(E:E,"Electronics",H:H)', electronicsAvgPrice);
eq("arithmetic on aggregate", "=SUM(I:I)*0.1", sumRevenue * 0.1);
eq("COUNTIF numeric crit", '=COUNTIF(H:H,">100")', highPriceCount);
eq("COUNTIF big orders", '=COUNTIF(I:I,">=1000")', bigOrders);
eq("MAX", "=MAX(H2:H199)", Math.max(...ds.map((r) => Number(r.unit_price))));
eq("MIN", "=MIN(G2:G199)", Math.min(...ds.map((r) => Number(r.units))));
eq("ROUND", "=ROUND(AVERAGE(H2:H199),0)", Math.round(avgPrice));
eq("string concat", '="rows: "&COUNT(H2:H199)', `rows: ${ds.length}`);
eq("UPPER", "=UPPER(A2)", String(ds[0].order_id).toUpperCase());
eq("LEN", "=LEN(A2)", String(ds[0].order_id).length);
eq("LEFT", "=LEFT(B2,4)", String(ds[0].order_date).slice(0, 4));
eq("YEAR of date", "=YEAR(B2)", Number(String(ds[0].order_date).slice(0, 4)));
eq("MONTH of date", "=MONTH(B2)", Number(String(ds[0].order_date).slice(5, 7)));
eq("DAY of date", "=DAY(B2)", Number(String(ds[0].order_date).slice(8, 10)));
eq("DATE constructor", "=DATE(2025,3,15)", "2025-03-15");
eq("IFS", '=IFS(H2>200,"A",H2>50,"B",TRUE,"C")', Number(ds[0].unit_price) > 200 ? "A" : Number(ds[0].unit_price) > 50 ? "B" : "C");
eq("SUMPRODUCT", "=SUMPRODUCT(G2:G199,H2:H199)", ds.reduce((s, r) => s + Number(r.units) * Number(r.unit_price), 0));
eq("SUMPRODUCT vs revenue check", "=SUM(G2:G199)*0+SUMPRODUCT(G2:G5,H2:H5)", ds.slice(0, 4).reduce((s, r) => s + Number(r.units) * Number(r.unit_price), 0));
eq("LARGE 3rd price", "=LARGE(H2:H199,3)", prices[2]);
eq("MAXIFS", '=MAXIFS(H2:H199,E2:E201,"Electronics")', Math.max(...ds.filter((r) => r.category === "Electronics").map((r) => Number(r.unit_price))));
eq("MINIFS", '=MINIFS(G2:G199,E2:E201,"Furniture")', Math.min(...ds.filter((r) => r.category === "Furniture").map((r) => Number(r.units))));
eq("SUBSTITUTE", '=SUBSTITUTE(A2,"ORD","ORDER")', String(ds[0].order_id).replace("ORD", "ORDER"));
eq("SEARCH", '=SEARCH("-",A2)', String(ds[0].order_id).indexOf("-") + 1);
eq("TEXT number", '=TEXT(AVERAGE(H2:H199),"0.00")', avgPrice.toFixed(2));
eq("TEXT comma", '=TEXT(SUM(I:I),"#,##0")', Math.round(sumRevenue).toLocaleString("en-US"));
eq("TEXT date", '=TEXT(B2,"yyyy/mm")', String(ds[0].order_date).slice(0, 7).replace("-", "/"));
eq("TEXT percent", '=TEXT(0.256,"0.0%")', "25.6%");
const firstCoffee = ds.find((r) => r.product === "Coffee Maker");
eq("VLOOKUP col price", '=VLOOKUP("Coffee Maker",F:H,3,FALSE)', Number(firstCoffee?.unit_price ?? 0));
eq("derived revenue column formula", "=G2*H2", +(Number(ds[0].units) * Number(ds[0].unit_price)).toFixed(2));
eq("margin-style ratio", "=I2/G2", +(Number(ds[0].revenue) / Number(ds[0].units)).toFixed(2));
eq("orders above threshold flag count", '=COUNTIFS(I:I,">2000",G:G,">8")', ds.filter((r) => Number(r.revenue) > 2000 && Number(r.units) > 8).length);
eq("top product revenue", '=SUMIF(F:F,"' + topProduct[0] + '",I:I)', topProduct[1]);
const yaraish = ds.filter((r) => String(r.customer).startsWith("Yara")).length;
eq("COUNTIF wildcard prefix", '=COUNTIF(C2:C199,"Yara*")', yaraish);
eq("COUNTIF wildcard all text", '=COUNTIF(C2:C199,"*")', ds.length); // Excel "*" matches any text
eq("rev>price rows", '=IF(I2>H2,1,0)+IF(I3>H3,1,0)+IF(I4>H4,1,0)+IF(I5>H5,1,0)', ds.slice(0, 4).filter((r) => Number(r.revenue) > Number(r.unit_price)).length);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
