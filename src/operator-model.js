export const RUNNER_BASE_URL = "https://forkwise-runner.lovable.app/functions/v1/review-api";

export function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

export function normalizeStatusCounts(stats = {}) {
  const source = stats?.counts && typeof stats.counts === "object" ? stats.counts : {};
  const counts = Object.fromEntries(["queued", "running", "completed", "failed"].map((key) => [key, Math.max(0, Number(source[key]) || 0)]));
  return { ...counts, total: Math.max(0, Number(stats.total) || Object.values(counts).reduce((sum, value) => sum + value, 0)) };
}

export function normalizeRunnerSummary(report = {}) {
  const repository = report.repository && typeof report.repository === "object" ? report.repository : {};
  const owner = repository.owner || "";
  const name = repository.name || "";
  const fullName = repository.fullName || [owner, name].filter(Boolean).join("/") || repository.url || "Unknown repository";
  const dimensions = Array.isArray(report.dimensions)
    ? report.dimensions.map((item) => ({
      label: String(item.name || item.label || item.id || "Dimension"),
      score: clampPercent(item.score),
    })).slice(0, 5)
    : [];
  const explicitBlockers = Array.isArray(report.blockers) ? report.blockers.length : null;
  const findingBlockers = Array.isArray(report.findings) ? report.findings.filter((item) => item?.blocking).length : 0;

  return {
    repository: String(fullName),
    decision: String(report.decision || "Insufficient evidence"),
    confidence: String(report.decisionConfidence || report.confidence || "unknown"),
    evidenceCoverage: clampPercent(report.evidenceCoverage),
    blockerCount: Number.isFinite(Number(report.blockerCount)) ? Math.max(0, Number(report.blockerCount)) : (explicitBlockers ?? findingBlockers),
    commitSha: String(repository.commitSha || report.commitSha || ""),
    generatedAt: String(report.generatedAt || ""),
    nextAction: String(report.nextAction || "Review the full report in the client application."),
    dimensions,
  };
}

export function createClientRequestId(now = Date.now(), random = Math.random()) {
  return `operator-${now.toString(36)}-${Math.floor(random * 1_000_000_000).toString(36)}`;
}
