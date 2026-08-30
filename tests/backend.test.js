import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { MemoryJobStore } from "../server/job-store.js";
import { AnalysisQueue } from "../server/job-queue.js";
import { createApi } from "../server/api.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, predicate, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    const value = await fn();
    if (predicate(value)) return value;
    await sleep(5);
  }
  throw new Error("condition not reached");
}

test("analysis queue persists completed reports", async () => {
  const store = new MemoryJobStore();
  const queue = new AnalysisQueue({ store, execute: async ({ onProgress }) => { await onProgress("analyze", "running"); return { schemaVersion: "test", decision: "Pilot" }; } });
  const job = await queue.submit({ repositoryUrl: "https://github.com/openai/openai", context: { intent: "self-host" } });
  const done = await waitFor(() => store.getJob(job.id), (item) => item?.status === "completed");
  assert.equal(done.reportId, job.id);
  assert.equal((await store.getReport(job.id)).decision, "Pilot");
});

test("analysis queue sanitizes unexpected failures", async () => {
  const store = new MemoryJobStore();
  const queue = new AnalysisQueue({ store, execute: async () => { throw new Error("internal secret path /tmp/foo"); } });
  const job = await queue.submit({ repositoryUrl: "https://github.com/openai/openai" });
  const failed = await waitFor(() => store.getJob(job.id), (item) => item?.status === "failed");
  assert.equal(failed.error.code, "analysis_failed");
  assert.doesNotMatch(failed.error.message, /\/tmp\/foo/);
});

test("API exposes async job and report lifecycle", async () => {
  const store = new MemoryJobStore();
  const server = await createApi({ store, execute: async () => ({ schemaVersion: "test", decision: "Adopt" }) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repositoryUrl: "https://github.com/openai/openai", context: { intent: "dependency" } }) });
    assert.equal(response.status, 202);
    const created = await response.json();
    const job = await waitFor(() => fetch(`http://127.0.0.1:${port}/v1/jobs/${created.jobId}`).then((r) => r.json()), (item) => item.status === "completed");
    assert.equal(job.status, "completed");
    const reportResponse = await fetch(`http://127.0.0.1:${port}/v1/reports/${created.jobId}`);
    assert.equal(reportResponse.status, 200);
    assert.equal((await reportResponse.json()).decision, "Adopt");
  } finally { server.close(); }
});

test("API rejects non-GitHub repository URLs", async () => {
  const server = await createApi({ store: new MemoryJobStore(), execute: async () => ({}) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repositoryUrl: "https://gitlab.com/a/b" }) });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error.message, /github\.com/i);
  } finally { server.close(); }
});
