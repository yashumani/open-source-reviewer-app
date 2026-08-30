import assert from "node:assert/strict";
import test from "node:test";
import { clampPercent, createClientRequestId, normalizeRunnerSummary, normalizeStatusCounts } from "../src/operator-model.js";

test("operator summary accepts the hosted runner report shape", () => {
  const summary = normalizeRunnerSummary({
    repository: { owner: "octocat", name: "Hello-World", commitSha: "abcdef1234567890" },
    decision: "Pilot",
    confidence: "medium",
    evidenceCoverage: 72.4,
    blockers: ["one"],
    dimensions: [{ label: "Fit", score: 81 }, { id: "trust", score: 49 }],
    nextAction: "Run a pilot.",
  });
  assert.equal(summary.repository, "octocat/Hello-World");
  assert.equal(summary.evidenceCoverage, 72);
  assert.equal(summary.blockerCount, 1);
  assert.deepEqual(summary.dimensions, [{ label: "Fit", score: 81 }, { label: "trust", score: 49 }]);
});

test("operator summary also accepts the browser assessment shape", () => {
  const summary = normalizeRunnerSummary({
    repository: { fullName: "owner/repo", commitSha: "1234" },
    decision: "Adopt",
    decisionConfidence: "high",
    blockerCount: 2,
    dimensions: [{ name: "Own", score: 101 }],
  });
  assert.equal(summary.confidence, "high");
  assert.equal(summary.blockerCount, 2);
  assert.equal(summary.dimensions[0].score, 100);
});

test("operator status counts are bounded and total is derived", () => {
  assert.deepEqual(normalizeStatusCounts({ counts: { queued: 2, running: 1, completed: 4, failed: -3 } }), {
    queued: 2,
    running: 1,
    completed: 4,
    failed: 0,
    total: 7,
  });
  assert.equal(clampPercent("110"), 100);
});

test("operator client request identifiers are stable-format and unique inputs change them", () => {
  assert.equal(createClientRequestId(1000, 0.25), "operator-rs-44ud8g");
  assert.notEqual(createClientRequestId(1001, 0.25), createClientRequestId(1000, 0.25));
});
