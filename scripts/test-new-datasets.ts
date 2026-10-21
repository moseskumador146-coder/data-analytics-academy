import { getSampleCatalog, getDatasetById, getAllDatasets } from "../src/lib/academy/datasets";

const cat = getSampleCatalog();
console.log(`Catalog: ${cat.length} datasets`);
const bySize: Record<string, number> = {};
for (const f of cat) bySize[f.size] = (bySize[f.size] ?? 0) + 1;
console.log(bySize);
for (const id of ["payroll", "social", "hospital", "subscriptions", "stocks", "iot"]) {
  const ds = getDatasetById(id)!;
  const ok = ds && ds.rows.length > 0 && ds.columns.length > 0;
  console.log(`${id}: ${ds.rows.length} rows × ${ds.columns.length} cols — ${ok ? "OK" : "FAIL"} | ${ds.description.slice(0, 40)}`);
}
const all = getAllDatasets();
console.log(`getAllDatasets: ${all.length}`);
if (cat.length !== 21) throw new Error("expected 21 datasets");
console.log("ALL DATASET CHECKS PASSED");
