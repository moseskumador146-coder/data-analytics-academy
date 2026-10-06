import { getSampleCatalog, getDatasetById, rowsToCSV } from "/home/z/my-project/src/lib/academy/datasets";
const cat = getSampleCatalog();
for (const f of cat) console.log(`${f.size.padEnd(7)} rows=${String(f.rows).padStart(5)} cols=${String(f.cols).padStart(2)} messy=${f.messy ? "Y" : "N"}  ${f.name}`);
// spot check
const gl = getDatasetById("finance_gl")!;
console.log("GL sample:", JSON.stringify(gl.rows[0]));
const logs = getDatasetById("server_logs")!;
console.log("Logs sample:", JSON.stringify(logs.rows[0]));
console.log("CSV head:", rowsToCSV(getDatasetById("inventory")!.rows.slice(0,2)).split("\n")[0]);
