import assert from "node:assert/strict";
import test from "node:test";
import { adaptHostedReport } from "../src/hosted-report-adapter.js";
import { executeReview, resolveReviewMode, REVIEW_RUNTIME_CONFIG } from "../src/review-runtime.js";

const hostedReport = {
  schemaVersion: "forkwise-report/v1",
  analyzerVersion: "forkwise-hosted/0.1.0",
  execution: "static-only",
  generatedAt: "2026-08-31T00:00:00.000Z",
  repository: {
    url: "https://github.com/octocat/Hello-World",
    owner: "octocat",
    name: "Hello-World",
    description: "Fixture repository",
    defaultBranch: "master",
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    commitUrl: "https://github.com/octocat/Hello-World/commit/0123456789abcdef0123456789abcdef01234567",
    license: "MIT",
    primaryLanguage: "JavaScript",
    stars: 100,
  },
  context: {
    intent: "self-host",
    useCase: "Test hosted report adaptation.",
    deploymentTarget: "flexible",
    sensitivity: "public",
    teamSize: "small",
    externalServices: "disclosed",
  },
  decision: "Pilot",
  confidence: "high",
  evidenceCoverage: 78,
  blockers: ["Validate the undocumented backup path."],
  ownershipEffort: "moderate",
  adoptionEffort: "low",
  nextAction: "Run a small pilot.",
  dimensions: [
    { id: "fit", score: 72, rating: "adequate", summary: "Fit evidence." },
    { id: "trust", score: 66, rating: "adequate", summary: "Trust evidence." },
    { id: "run", score: 60, rating: "adequate", summary: "Run evidence." },
    { id: "own", score: 55, rating: "adequate", summary: "Own evidence." },
    { id: "exit", score: 40, rating: "weak", summary: "Exit evidence." },
  ],
  evidence: [
    { id: "ev-001", type: "file", path: "README.md", url: "https://example.test/readme", summary: "README present." },
  ],
  findings: [
    {
      id: "f-001",
      dimension: "trust",
      severity: "info",
      title: "README present",
      detail: "The repository documents itself.",
      recommendation: "Verify it against the pinned commit.",
      evidenceIds: ["ev-001", "missing-evidence"],
    },
  ],
  claims: [
    { id: "claim-1", claim: "The project can be self-hosted.", verdict: "supported", rationale: "Deployment evidence exists.", evidenceIds: ["ev-001"] },
  ],
  operations: {
    deployment: "No container artifact was found.",
    externalServices: "No common external-service indicators were found in inspected files.",
  },
  technologies: [
    { name: "Node.js", category: "runtime", confidence: "high", evidenceIds: ["ev-001"] },
  ],
  unresolvedQuestions: ["How is data exported?"],
  pilotChecklist: ["Pin the analyzed commit."],
  limitations: ["Static analysis only."],
  inventory: { treeEntries: 12, filesInspected: 1, treeTruncated: false },
};

test("hosted report adapts to the existing browser assessment contract", () => {
  const assessment = adaptHostedReport(hostedReport);
  assert.equal(assessment.repository.fullName, "octocat/Hello-World");
  assert.equal(assessment.repository.commitSha.length, 40);
  assert.equal(assessment.decision, "Pilot");
  assert.equal(assessment.decisionConfidence, "high");
  assert.equal(assessment.dimensions.length, 5);
  assert.deepEqual(assessment.dimensions.map((item) => item.name), ["Fit", "Trust", "Run", "Own", "Exit"]);
  assert.equal(assessment.claims[0].state, "verified");
  assert.deepEqual(assessment.findings[0].evidenceIds, ["ev-001"]);
  assert.equal(assessment.findings.filter((item) => item.blocking).length, 1);
  assert.equal(assessment.operations.runtimes[0], "Node.js");
  assert.equal(assessment.inventory.totalFiles, 12);
});

test("adapter rejects non-static or unpinned hosted reports", () => {
  assert.throws(() => adaptHostedReport({ ...hostedReport, execution: "dynamic" }), /static-only/i);
  assert.throws(() => adaptHostedReport({ ...hostedReport, repository: { ...hostedReport.repository, commitSha: "main" } }), /40-character/i);
  assert.throws(() => adaptHostedReport({ ...hostedReport, schemaVersion: "forkwise-report/v2" }), /unsupported/i);
});

test("hosted mode remains disabled by default", () => {
  assert.equal(REVIEW_RUNTIME_CONFIG.hostedEnabled, false);
  assert.equal(REVIEW_RUNTIME_CONFIG.defaultMode, "browser");
  assert.equal(resolveReviewMode({ requestedMode: "hosted" }), "browser");
});

test("runtime never silently falls back after a hosted failure", async () => {
  let browserCalls = 0;
  const config = { ...REVIEW_RUNTIME_CONFIG, hostedEnabled: true };
  await assert.rejects(
    () => executeReview({
      requestedMode: "hosted",
      config,
      repositoryUrl: hostedReport.repository.url,
      context: hostedReport.context,
      runnerClient: { runReview: async () => { const error = new Error("rate limited"); error.code = "rate_limited"; throw error; } },
      browserAnalyze: async () => { browserCalls += 1; return {}; },
    }),
    (error) => error.code === "rate_limited",
  );
  assert.equal(browserCalls, 0);
});

test("enabled hosted runtime returns an adapted assessment", async () => {
  const progress = [];
  const result = await executeReview({
    requestedMode: "hosted",
    config: { ...REVIEW_RUNTIME_CONFIG, hostedEnabled: true },
    repositoryUrl: hostedReport.repository.url,
    context: hostedReport.context,
    runnerClient: {
      runReview: async ({ onProgress }) => {
        onProgress({ stage: "completed", message: "ready", percent: 100 });
        return hostedReport;
      },
    },
    onProgress: (item) => progress.push(item.stage),
    browserAnalyze: async () => { throw new Error("browser should not run"); },
  });
  assert.equal(result.mode, "hosted");
  assert.equal(result.assessment.decision, "Pilot");
  assert.deepEqual(progress, ["completed"]);
});
