import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const workflowDir = path.join(process.cwd(), ".github", "workflows");
const names = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/i.test(name)).sort();
const errors = [];
let externalUses = 0;

for (const name of names) {
  const file = path.join(workflowDir, name);
  const text = await readFile(file, "utf8");
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (!match) continue;
    const target = match[1];
    if (target.startsWith("./")) continue;
    externalUses += 1;
    const at = target.lastIndexOf("@");
    const ref = at >= 0 ? target.slice(at + 1) : "";
    if (!/^[0-9a-f]{40}$/i.test(ref)) {
      errors.push(`${name}:${index + 1} must pin ${target} to a full 40-character commit SHA.`);
    }
  }
  if (!/^permissions:\s*$/m.test(text)) errors.push(`${name} must declare top-level permissions.`);
  if (!/timeout-minutes:/m.test(text)) errors.push(`${name} must bound job runtime with timeout-minutes.`);
}

if (externalUses === 0) errors.push("No external GitHub Actions references were found.");
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`Workflow validation passed: ${names.length} workflows, ${externalUses} external actions pinned by immutable SHA.`);
