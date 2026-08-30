import { appendFile } from "node:fs/promises";
import { createRunnerClient } from "../src/runner-client.js";

const baseUrl = process.env.FORKWISE_RUNNER_BASE || "https://forkwise-runner.lovable.app/functions/v1/review-api";
const repositoryUrl = process.env.FORKWISE_SMOKE_REPOSITORY || "https://github.com/octocat/Hello-World";
const runId = process.env.GITHUB_RUN_ID || "local";
const client = createRunnerClient({ baseUrl, pollIntervalMs: 1_000, timeoutMs: 120_000 });
const decisions = new Set(["Adopt", "Pilot", "Fork", "Avoid", "Insufficient evidence"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeSummary(report, progressEvents, stats) {
  const repository = report.repository && typeof report.repository === "object" ? report.repository : {};
  return {
    service: "forkwise-runner",
    repository: [repository.owner, repository.name].filter(Boolean).join("/") || repository.url || repositoryUrl,
    decision: report.decision,
    confidence: report.confidence || report.decisionConfidence || "unknown",
    evidenceCoverage: Number(report.evidenceCoverage) || 0,
    blockerCount: Array.isArray(report.blockers)
      ? report.blockers.length
      : (Array.isArray(report.findings) ? report.findings.filter((item) => item?.blocking).length : 0),
    commitSha: repository.commitSha || report.commitSha || null,
    generatedAt: report.generatedAt || null,
    progressStages: [...new Set(progressEvents.map((item) => item.stage))],
    jobsInLast24Hours: Number(stats?.total) || 0,
  };
}

const health = await client.health();
assert(health.status === "ok", `Unexpected health status: ${health.status}`);
assert(health.service === "forkwise-runner", `Unexpected service: ${health.service}`);
assert(health.schemaVersion === "forkwise-report/v1", `Unexpected schema version: ${health.schemaVersion}`);
assert(health.analyzerVersion === "forkwise-hosted/0.1.0", `Unexpected analyzer version: ${health.analyzerVersion}`);
assert(health.execution === "static-only", `Unexpected execution mode: ${health.execution}`);

const beforeStats = await client.getStats();
const progressEvents = [];
const report = await client.runReview({
  repositoryUrl,
  clientRequestId: `github-actions-${runId}-${Date.now().toString(36)}`,
  context: {
    intent: "self-host",
    useCase: "Hosted runner end-to-end smoke validation from GitHub Actions.",
    deploymentTarget: "flexible",
    sensitivity: "public",
    teamSize: "small",
    externalServices: "disclosed",
  },
  onProgress: (progress) => {
    progressEvents.push(progress);
    console.log(`progress ${progress.percent ?? "?"}% ${progress.stage}: ${progress.message}`);
  },
});

assert(report.schemaVersion === "forkwise-report/v1", `Report schema mismatch: ${report.schemaVersion}`);
assert(report.analyzerVersion === "forkwise-hosted/0.1.0", `Report analyzer mismatch: ${report.analyzerVersion}`);
assert(report.execution === "static-only", `Report execution mismatch: ${report.execution}`);
assert(decisions.has(report.decision), `Unexpected decision: ${report.decision}`);
assert(Array.isArray(report.dimensions) && report.dimensions.length === 5, "Report must contain five dimensions.");
assert(/^[0-9a-f]{40}$/i.test(report.repository?.commitSha || ""), "Report is missing a commit-pinned SHA.");
assert(progressEvents.length > 0, "No durable job progress was observed.");

const afterStats = await client.getStats();
assert(Number(afterStats.total) >= Number(beforeStats.total || 0), "Recent job total moved backwards during smoke validation.");

const summary = safeSummary(report, progressEvents, afterStats);
console.log(`SMOKE_SUMMARY=${JSON.stringify(summary)}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = [
    "## ForkWise hosted runner smoke test",
    "",
    `- Repository: \`${summary.repository}\``,
    `- Decision: **${summary.decision}**`,
    `- Confidence: \`${summary.confidence}\``,
    `- Evidence coverage: \`${summary.evidenceCoverage}%\``,
    `- Blockers: \`${summary.blockerCount}\``,
    `- Commit: \`${summary.commitSha}\``,
    `- Progress stages: \`${summary.progressStages.join(" → ")}\``,
    `- Jobs in 24-hour window: \`${summary.jobsInLast24Hours}\``,
    "- Safety boundary: `static-only`",
    "",
  ].join("\n");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, rows, "utf8");
}
