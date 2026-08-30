import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of [
  "index.html",
  "operator.html",
  "styles.css",
  "operator.css",
  "manifest.webmanifest",
  "robots.txt",
  ".nojekyll",
  "assets",
  "src",
  "docs",
]) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

const index = await readFile(path.join(root, "index.html"), "utf8");
await writeFile(path.join(dist, "404.html"), index);
console.log("Static production bundle created in dist/ with reviewer, operator console, source modules, and runbooks.");
