import { readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["dist", ".git", "node_modules", "artifacts"]);

async function walk(directory) {
  const result = [];
  for (const name of await readdir(directory)) {
    if (ignored.has(name)) continue;
    const absolute = path.join(directory, name);
    const info = await stat(absolute);
    if (info.isDirectory()) result.push(...await walk(absolute));
    else if (/\.(?:m?js|cjs)$/.test(name)) result.push(absolute);
  }
  return result;
}

function checkFile(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Syntax check failed: ${path.relative(root, file)}`)));
  });
}

const files = await walk(root);
for (const file of files) await checkFile(file);
console.log(`Syntax validation passed for ${files.length} JavaScript files.`);
