import assert from "node:assert/strict";
import test from "node:test";
import { createRunnerClient } from "../src/runner-client.js";

function response(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
    json: async () => body,
  };
}

test("runner client submits idempotency key and follows API-provided URLs", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push([url, options.method || "GET", options.body]);
    if (url.endsWith("/v1/reviews")) return response(202, {
      jobId: "123e4567-e89b-12d3-a456-426614174000",
      statusUrl: "https://jobs.example.test/status/123",
      reportUrl: "https://jobs.example.test/report/123",
    });
    if (url.includes("/status/123")) return response(200, { status: "completed", progress: { stage: "complete", message: "ready", percent: 100 } });
    if (url.includes("/report/123")) return response(200, { decision: "Pilot" });
    return response(404, {});
  };
  const client = createRunnerClient({ baseUrl: "https://api.example.test/functions/v1/review-api/", fetchImpl, pollIntervalMs: 1 });
  const progress = [];
  const report = await client.runReview({
    repositoryUrl: "https://github.com/openai/openai",
    context: { intent: "self-host" },
    clientRequestId: "request-123",
    onProgress: (item) => progress.push(item),
  });
  assert.equal(report.decision, "Pilot");
  assert.equal(progress[0].percent, 100);
  assert.equal(calls[0][1], "POST");
  assert.equal(JSON.parse(calls[0][2]).clientRequestId, "request-123");
  assert.equal(calls[1][0], "https://jobs.example.test/status/123");
  assert.equal(calls[2][0], "https://jobs.example.test/report/123");
});

test("runner client keeps root-prefixed v1 paths under a nested API base", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith("/v1/reviews")) return response(202, { jobId: "123e4567-e89b-12d3-a456-426614174000", statusUrl: "/v1/jobs/123e4567-e89b-12d3-a456-426614174000" });
    if (url.includes("/v1/jobs/")) return response(200, { status: "completed" });
    return response(200, { decision: "Adopt" });
  };
  const client = createRunnerClient({ baseUrl: "https://api.example.test/functions/v1/review-api", fetchImpl, pollIntervalMs: 1 });
  await client.runReview({ repositoryUrl: "https://github.com/openai/openai", context: {} });
  assert.match(calls[1], /\/functions\/v1\/review-api\/v1\/jobs\//);
});

test("runner client exposes stats and API retry metadata", async () => {
  let attempt = 0;
  const client = createRunnerClient({
    baseUrl: "https://api.example.test",
    fetchImpl: async (url) => {
      attempt += 1;
      if (url.endsWith("/v1/stats")) return response(200, { total: 3 });
      return response(429, { error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 30 } }, { "retry-after": "30" });
    },
  });
  assert.equal((await client.getStats()).total, 3);
  await assert.rejects(() => client.health(), (error) => error.code === "rate_limited" && error.status === 429 && error.retryAfterSeconds === 30);
  assert.equal(attempt, 2);
});

test("runner client rejects non-http API base URLs", () => {
  assert.throws(() => createRunnerClient({ baseUrl: "file:///tmp/api", fetchImpl: async () => response(200, {}) }), /http or https/i);
});

test("runner client stops polling when aborted", async () => {
  const controller = new AbortController();
  const client = createRunnerClient({
    baseUrl: "https://api.example.test",
    pollIntervalMs: 500,
    fetchImpl: async (url) => url.endsWith("/v1/reviews")
      ? response(202, { jobId: "123e4567-e89b-12d3-a456-426614174000" })
      : response(200, { status: "running", progress: { stage: "analysis", message: "working" } }),
  });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(() => client.runReview({ repositoryUrl: "https://github.com/openai/openai", context: {}, signal: controller.signal }), (error) => error.name === "AbortError");
});
