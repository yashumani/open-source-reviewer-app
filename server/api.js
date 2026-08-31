import http from "node:http";
import { parseGitHubUrl } from "../src/github.js";
import { validateClientRequestId, validateReviewContext } from "./contracts.js";
import { FileJobStore } from "./job-store.js";
import { RequestBoundRunner } from "./request-bound-runner.js";
import { runStaticAnalysis } from "./analysis-runner.js";

const MAX_BODY = 32 * 1024;
const SCHEMA_VERSION = "forkwise-report/v1";
const EXECUTION = "static-only";
const SERVICE = "forkwise-runner";
const DEFAULT_ANALYZER_VERSION = process.env.FORKWISE_ANALYZER_VERSION || "forkwise-local/0.6.0";
const API_PREFIXES = ["/functions/v1/review-api", "/api/public/review-api"];
const DEFAULT_ALLOWED_ORIGINS = [
  "https://yashumani.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
];
const LOVABLE_ORIGIN = /^https:\/\/[a-z0-9.-]+\.lovable\.app$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function configuredOrigins() {
  const extra = String(process.env.FORKWISE_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return configuredOrigins().has(origin) || LOVABLE_ORIGIN.test(origin);
}

function corsHeaders(origin) {
  const headers = {
    vary: "Origin",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-client-request-id",
    "access-control-max-age": "600",
  };
  if (origin && isAllowedOrigin(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(res, status, body, extraHeaders = {}) {
  const payload = `${JSON.stringify(body)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...extraHeaders,
  });
  res.end(payload);
}

function publicError(res, status, code, message, cors, details = null, retryAfterSeconds = null) {
  return json(res, status, {
    error: {
      code,
      message,
      ...(details == null ? {} : { details }),
      ...(retryAfterSeconds == null ? {} : { retryAfterSeconds }),
    },
  }, {
    ...cors,
    ...(retryAfterSeconds == null ? {} : { "retry-after": String(retryAfterSeconds) }),
  });
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
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch (error) {
    if (error?.code === "body_too_large") throw error;
    const invalid = new Error("Request body must be a JSON object.");
    invalid.code = "invalid_json";
    throw invalid;
  }
}

function apiRoute(pathname) {
  for (const prefix of API_PREFIXES) {
    if (pathname === prefix) return { path: "/", prefix };
    if (pathname.startsWith(`${prefix}/`)) return { path: pathname.slice(prefix.length), prefix };
  }
  return { path: pathname, prefix: "" };
}

function routeUrls(prefix, id) {
  return {
    statusUrl: `${prefix}/v1/jobs/${id}`,
    reportUrl: `${prefix}/v1/reports/${id}`,
  };
}

function publicJob(job, prefix) {
  return {
    jobId: job.id,
    status: job.status,
    repositoryUrl: job.repositoryUrl,
    progress: job.progress,
    error: job.error ?? null,
    attemptCount: Number(job.attemptCount || 0),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    reportId: job.reportId,
    ...routeUrls(prefix, job.id),
  };
}

function statusForError(code) {
  if (code === "body_too_large") return 413;
  if (code === "invalid_context" || code === "invalid_client_request_id") return 422;
  return 400;
}

export async function createApi({
  store = new FileJobStore(),
  execute = ({ repositoryUrl, context, onProgress }) => runStaticAnalysis({ repositoryUrl, context, onProgress }),
  leaseMs = Number(process.env.FORKWISE_JOB_LEASE_MS || 60_000),
  idempotencyWindowMs = Number(process.env.FORKWISE_IDEMPOTENCY_WINDOW_MS || 30 * 60_000),
  analyzerVersion = DEFAULT_ANALYZER_VERSION,
} = {}) {
  await store.init();
  const runner = new RequestBoundRunner({ store, execute, leaseMs, idempotencyWindowMs });

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || null;
    const cors = corsHeaders(origin);
    const url = new URL(req.url || "/", "http://localhost");
    const { path, prefix } = apiRoute(url.pathname);

    if (req.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) return publicError(res, 403, "origin_not_allowed", "This origin is not allowed to call the API.", cors);
      res.writeHead(204, cors);
      return res.end();
    }

    try {
      if (req.method === "GET" && path === "/health") {
        return json(res, 200, {
          status: "ok",
          service: SERVICE,
          schemaVersion: SCHEMA_VERSION,
          analyzerVersion,
          execution: EXECUTION,
          executionModel: "request-bound-with-lease",
          time: new Date().toISOString(),
        }, cors);
      }

      if (req.method === "GET" && path === "/v1/stats") {
        const stats = await runner.stats();
        return json(res, 200, {
          ...stats,
          limits: {
            requestBytes: MAX_BODY,
            leaseMs,
            idempotencyWindowMinutes: Math.round(idempotencyWindowMs / 60_000),
          },
          schemaVersion: SCHEMA_VERSION,
          analyzerVersion,
          execution: EXECUTION,
        }, cors);
      }

      if (req.method === "POST" && path === "/v1/reviews") {
        if (!isAllowedOrigin(origin)) {
          return publicError(res, 403, "origin_not_allowed", "This origin is not allowed to call the API.", cors);
        }
        const body = await readJson(req);
        const parsed = parseGitHubUrl(body.repositoryUrl);
        const context = validateReviewContext(body.context);
        const clientRequestId = validateClientRequestId(body.clientRequestId ?? req.headers["x-client-request-id"]);
        const job = await runner.submit({
          repositoryUrl: parsed.canonicalUrl,
          context,
          clientRequestId,
        });
        return json(res, 202, {
          jobId: job.id,
          status: job.status,
          idempotent: Boolean(job.idempotent),
          ...routeUrls(prefix, job.id),
        }, cors);
      }

      const jobMatch = path.match(/^\/v1\/jobs\/([0-9a-f-]{36})$/i);
      if (req.method === "GET" && jobMatch) {
        if (!UUID_RE.test(jobMatch[1])) return publicError(res, 400, "invalid_job_id", "Job id must be a UUID.", cors);
        const job = await runner.getJob(jobMatch[1], { executeIfClaimable: true });
        return job
          ? json(res, 200, publicJob(job, prefix), cors)
          : publicError(res, 404, "job_not_found", "Analysis job not found.", cors);
      }

      const reportMatch = path.match(/^\/v1\/reports\/([0-9a-f-]{36})$/i);
      if (req.method === "GET" && reportMatch) {
        if (!UUID_RE.test(reportMatch[1])) return publicError(res, 400, "invalid_report_id", "Report id must be a UUID.", cors);
        const report = await runner.getReport(reportMatch[1]);
        if (report) return json(res, 200, report, cors);
        const job = await runner.getJob(reportMatch[1], { executeIfClaimable: false });
        if (job && job.status !== "completed") {
          return publicError(res, 409, "report_not_ready", "The report is not ready yet.", cors, { status: job.status }, 3);
        }
        return publicError(res, 404, "report_not_found", "Analysis report not found.", cors);
      }

      return publicError(res, 404, "not_found", "Route not found.", cors);
    } catch (error) {
      const code = error?.code || "bad_request";
      return publicError(
        res,
        statusForError(code),
        code,
        String(error?.message || "Request could not be processed."),
        cors,
        error?.details ?? null,
      );
    }
  });
}
