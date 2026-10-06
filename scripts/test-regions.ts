import { getMessySales } from "../src/lib/academy/datasets";

const ds = getMessySales();
const smartCase = (s: string) =>
  s.replace(/\s+/g, " ").split(" ").map((w) => {
    if (!w) return w;
    if (w.length > 1 && (w === w.toUpperCase() || w === w.toLowerCase())) return w[0] + w.slice(1).toLowerCase();
    return w;
  }).join(" ");

const regions = new Map<string, number>();
for (const r of ds.rows) {
  const raw = String(r.region ?? "");
  const cleaned = smartCase(raw.trim());
  regions.set(cleaned, (regions.get(cleaned) ?? 0) + 1);
}
console.log("regions after trim+smartCase:", JSON.stringify([...regions.entries()], null, 1));
