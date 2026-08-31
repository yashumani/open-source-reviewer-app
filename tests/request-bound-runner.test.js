import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApi } from "../server/api.js";
import { MemoryJobStore } from "../server/job-store.js";
import { RequestBoundRunner } from "../server/request-bound-runner.js";

const context = Object.freeze({
  intent: "self-host",
  useCase: "Deterministic request-bound runner test.",
  deploymentTarget: "flexible",
  sensitivity: "public",
  teamSize: "small",
  externalServices: "disclosed",
});

const report = Object.freeze({
  schemaVersion: "forkwise-report/v1",
  analyzerVersion: "forkwise-contract/0.1.0",
  execution: "static-only",
  generatedAt: "2026-08-31T00:00:00.000Z",
  decision: "Pilot",
  confidence: "high",
  evidenceCoverage: 80,
  repository: {
    owner: "octocat",
    name: "Hello-World",
    url: "https://github.com/octocat/Hello-World",
    commitSha: "0123456789abcdef0123456789abcdef01234567",
  },
  dimensions: ["fit", "trust", "run", "own", "exit"].map((id) => ({ id })),
});

const input = {
  repositoryUrl: "https://github.com/octocat/Hello-World",
  context,
};

function waitFor(predicate, attempts = 100) {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const value = await predicate();
      if (value) return resolve(value);
      await new Promise((next) => setTimeout(next, 2));
    }
    reject(new Error("condition not reached"));
  });
}

test("first status poll claims, executes, and persists a request-bound job", async () => {
  const store = new MemoryJobStore();
  let executions = 0;
  const runner = new RequestBoundRunner({
    store,
    execute: async ({ onProgress }) => {
      executions += 1;
      await onProgress("analysis", "Applying deterministic rules.", null, 70);
      return report;
    },
  });

  const created = await runner.submit(input);
  assert.equal(created.status, "queued");
  const completed = await runner.getJob(created.id);
  assert.equal(completed.status, "completed");
  assert.equal(completed.attemptCount, 1);
  assert.equal(executions, 1);
  assert.deepEqual(await runner.getReport(created.id), report);
});

test("concurrent status polls execute a job only once", async () => {
  const store = new MemoryJobStore();
  let executions = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const runner = new RequestBoundRunner({
    store,
    execute: async () => {
      executions += 1;
      await gate;
      return report;
    },
  });

  const created = await runner.submit(input);
  const first = runner.getJob(created.id);
  await waitFor(() => executions === 1);
  const second = await runner.getJob(created.id);
  assert.equal(second.status, "running");
  release();
  const completed = await first;
  assert.equal(completed.status, "completed");
  assert.equal(executions, 1);
  assert.equal((await store.listReports()).length, 1);
});

test("an expired lease can be reclaimed without duplicating a report", async () => {
  const store = new MemoryJobStore();
  let now = new Date("2026-08-31T00:00:00.000Z");
  let executions = 0;
  const runner = new RequestBoundRunner({
    store,
    leaseMs: 5_000,
    now: () => now,
    execute: async () => {
      executions += 1;
      return report;
    },
  });

  const created = await runner.submit(input);
  await store.claimJob(created.id, {
    leaseToken: "orphaned-invocation",
    now: now.toISOString(),
    leaseExpiresAt: new Date(now.getTime() + 5_000).toISOString(),
  });
  now = new Date(now.getTime() + 6_000);

  const recovered = await runner.getJob(created.id);
  assert.equal(recovered.status, "completed");
  assert.equal(recovered.attemptCount, 2);
  assert.equal(executions, 1);
  assert.equal((await store.listReports()).length, 1);
});

test("unexpected execution failures are sanitized", async () => {
  const store = new MemoryJobStore();
  const runner = new RequestBoundRunner({
    store,
    execute: async () => {
      throw new Error("private token ghp_123456789012345678901234 and /tmp/secret-path");
    },
  });

  const created = await runner.submit(input);
  const failed = await runner.getJob(created.id);
  assert.equal(failed.status, "failed");
  assert.equal(failed.error.code, "analysis_failed");
  assert.doesNotMatch(JSON.stringify(failed.error), /ghp_|secret-path/);
});

test("client request id makes repeated submissions idempotent", async () => {
  const store = new MemoryJobStore();
  const runner = new RequestBoundRunner({ store, execute: async () => report });
  const first = await runner.submit({ ...input, clientRequestId: "same-request" });
  const second = await runner.submit({ ...input, clientRequestId: "same-request" });
  assert.equal(second.id, first.id);
  assert.equal(second.idempotent, true);
  assert.equal((await store.listJobs()).length, 1);
});

test("API supports exact hosted prefix and completes the lifecycle during polling", async () => {
  const server = await createApi({
    store: new MemoryJobStore(),
    analyzerVersion: "forkwise-contract/0.1.0",
    execute: async ({ onProgress }) => {
      await onProgress("analysis", "Running contract analysis.", null, 75);
      return report;
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/functions/v1/review-api`;

  try {
    const health = await fetch(`${base}/health`).then((response) => response.json());
    assert.equal(health.status, "ok");
    assert.equal(health.service, "forkwise-runner");
    assert.equal(health.executionModel, "request-bound-with-lease");

    const acceptedResponse = await fetch(`${base}/v1/reviews`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://yashumani.github.io",
      },
      body: JSON.stringify({ ...input, clientRequestId: "api-contract-1" }),
    });
    assert.equal(acceptedResponse.status, 202);
    assert.equal(acceptedResponse.headers.get("access-control-allow-origin"), "https://yashumani.github.io");
    const accepted = await acceptedResponse.json();
    assert.match(accepted.statusUrl, /^\/functions\/v1\/review-api\/v1\/jobs\//);

    const jobResponse = await fetch(`http://127.0.0.1:${port}${accepted.statusUrl}`);
    assert.equal(jobResponse.status, 200);
    const job = await jobResponse.json();
    assert.equal(job.status, "completed");
    assert.equal(job.progress.percent, 100);

    const reportResponse = await fetch(`http://127.0.0.1:${port}${accepted.reportUrl}`);
    assert.equal(reportResponse.status, 200);
    assert.equal((await reportResponse.json()).decision, "Pilot");

    const stats = await fetch(`${base}/v1/stats`).then((response) => response.json());
    assert.equal(stats.total, 1);
    assert.equal(stats.counts.completed, 1);
  } finally {
    server.close();
  }
});

test("API rejects invalid contexts and disallowed mutation origins", async () => {
  const server = await createApi({ store: new MemoryJobStore(), execute: async () => report });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/functions/v1/review-api/v1/reviews`;

  try {
    const rejectedOrigin = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify(input),
    });
    assert.equal(rejectedOrigin.status, 403);
    assert.equal(rejectedOrigin.headers.get("access-control-allow-origin"), null);

    const invalidContext = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://yashumani.github.io" },
      body: JSON.stringify({ repositoryUrl: input.repositoryUrl, context: { intent: "self-host", teamSize: "tiny" } }),
    });
    assert.equal(invalidContext.status, 422);
    assert.equal((await invalidContext.json()).error.code, "invalid_context");
  } finally {
    server.close();
  }
});
