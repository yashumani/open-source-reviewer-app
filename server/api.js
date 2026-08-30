import http from "node:http";
import { parseGitHubUrl } from "../src/github.js";
import { FileJobStore } from "./job-store.js";
import { AnalysisQueue } from "./job-queue.js";
import { runStaticAnalysis } from "./analysis-runner.js";

const MAX_BODY = 32 * 1024;

function json(res, status, body, extraHeaders = {}) {
  const payload = `${JSON.stringify(body)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) {
      const error = new Error("Request body is too large.");
      error.code = "body_too_large";
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.code = "invalid_json";
    throw error;
  }
}

function safeContext(raw = {}) {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(Object.entries(value).slice(0, 20).map(([key, item]) => [String(key).slice(0, 64), typeof item === "string" ? item.slice(0, 2000) : item]));
}

export async function createApi({ store = new FileJobStore(), execute = ({ repositoryUrl, context, onProgress }) => runStaticAnalysis({ repositoryUrl, context, onProgress }), concurrency = 1 } = {}) {
  await store.init();
  const queue = new AnalysisQueue({ store, execute, concurrency });

  return http.createServer(async (req, res) => {
    const origin = process.env.FORKWISE_ALLOWED_ORIGIN || "";
    const cors = origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
    if (req.method === "OPTIONS") {
      res.writeHead(204, { ...cors, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" });
      return res.end();
    }

    const url = new URL(req.url || "/", "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { status: "ok", service: "forkwise-analysis-api", execution: "static-only" }, cors);

      if (req.method === "POST" && url.pathname === "/v1/reviews") {
        const body = await readJson(req);
        const parsed = parseGitHubUrl(body.repositoryUrl);
        const job = await queue.submit({ repositoryUrl: parsed.canonicalUrl, context: safeContext(body.context) });
        return json(res, 202, { jobId: job.id, status: job.status, statusUrl: `/v1/jobs/${job.id}`, reportUrl: `/v1/reports/${job.id}` }, cors);
      }

      const jobMatch = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]{36})$/i);
      if (req.method === "GET" && jobMatch) {
        const job = await store.getJob(jobMatch[1]);
        return job ? json(res, 200, job, cors) : json(res, 404, { error: { code: "job_not_found", message: "Analysis job not found." } }, cors);
      }

      const reportMatch = url.pathname.match(/^\/v1\/reports\/([0-9a-f-]{36})$/i);
      if (req.method === "GET" && reportMatch) {
        const report = await store.getReport(reportMatch[1]);
        if (report) return json(res, 200, report, cors);
        const job = await store.getJob(reportMatch[1]);
        if (job && job.status !== "completed") return json(res, 409, { error: { code: "report_not_ready", message: "The report is not ready yet.", status: job.status } }, cors);
        return json(res, 404, { error: { code: "report_not_found", message: "Analysis report not found." } }, cors);
      }

      return json(res, 404, { error: { code: "not_found", message: "Route not found." } }, cors);
    } catch (error) {
      const code = error?.code || "bad_request";
      const status = code === "body_too_large" ? 413 : 400;
      return json(res, status, { error: { code, message: String(error?.message || "Request could not be processed.") } }, cors);
    }
  });
}
