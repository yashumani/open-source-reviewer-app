import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? process.cwd());
const port = Number(process.env.PORT ?? process.argv[3] ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const decoded = decodeURIComponent(url.pathname);
    const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
    let target = path.resolve(root, relative);
    if (!target.startsWith(`${root}${path.sep}`) && target !== root) throw new Error("Path traversal rejected.");
    let info;
    try { info = await stat(target); }
    catch {
      target = path.join(root, "index.html");
      info = await stat(target);
    }
    if (info.isDirectory()) target = path.join(target, "index.html");
    response.writeHead(200, {
      "content-type": types[path.extname(target).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    });
    createReadStream(target).pipe(response);
  } catch (error) {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Bad request");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`ForkWise available at http://127.0.0.1:${port}`);
});
