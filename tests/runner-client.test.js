import assert from "node:assert/strict";
import test from "node:test";
import { createRunnerClient } from "../src/runner-client.js";

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("runner client submits and polls to a completed report", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push([url, options.method || "GET"]);
    if (url.endsWith("/v1/reviews")) return response(202, { jobId: "123e4567-e89b-12d3-a456-426614174000" });
    if (url.includes("/v1/jobs/")) return response(200, { status: "completed", reportId: "123e4567-e89b-12d3-a456-426614174000", progress: { stage: "complete", message: "ready" } });
    if (url.includes("/v1/reports/")) return response(200, { decision: "Pilot" });
    return response(404, {});
  };
  const client = createRunnerClient({ baseUrl: "https://api.example.test/", fetchImpl, pollIntervalMs: 1 });
  const progress = [];
  const report = await client.runReview({ repositoryUrl: "https://github.com/openai/openai", context: { intent: "self-host" }, onProgress: (item) => progress.push(item.stage) });
  assert.equal(report.decision, "Pilot");
  assert.deepEqual(progress, ["complete"]);
  assert.equal(calls[0][1], "POST");
});

test("runner client surfaces API error codes", async () => {
  const client = createRunnerClient({ baseUrl: "https://api.example.test", fetchImpl: async () => response(429, { error: { code: "rate_limited", message: "Slow down" } }) });
  await assert.rejects(() => client.health(), (error) => error.code === "rate_limited" && error.status === 429);
});

test("runner client rejects non-http API base URLs", () => {
  assert.throws(() => createRunnerClient({ baseUrl: "file:///tmp/api", fetchImpl: async () => response(200, {}) }), /http or https/i);
});
