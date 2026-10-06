// Verifies portfolio generation + ZIP assembly server-side (same logic as browser).
import { generateProjectFiles, PORTFOLIO_ROOT } from "../src/lib/academy/portfolio";
import { PROJECTS } from "../src/lib/academy/projects";
import JSZip from "jszip";

let totalFiles = 0;
for (const p of PROJECTS) {
  const files = generateProjectFiles(p);
  totalFiles += files.length;
  const sizes = files.map((f) => `${f.path.replace(PORTFOLIO_ROOT + "/" + p.folder + "/", "")}(${f.content.length}b)`);
  console.log(`${p.emoji} ${p.folder}: ${files.length} files → ${sizes.join(", ")}`);
  // sanity: no empty files
  for (const f of files) if (f.content.trim().length < 20) console.log(`   ⚠ SUSPICIOUSLY SMALL: ${f.path}`);
}

const zip = new JSZip();
const all = PROJECTS.flatMap((p) => generateProjectFiles(p));
for (const f of all) zip.file(f.path, f.content);
const blob = await zip.generateAsync({ type: "uint8array" });
console.log(`\nZIP: ${all.length} files, ${(blob.length / 1024).toFixed(0)} KB — OK`);
