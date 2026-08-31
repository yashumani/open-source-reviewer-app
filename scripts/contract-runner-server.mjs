import { createApi } from "../server/api.js";
import { MemoryJobStore } from "../server/job-store.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const analyzerVersion = process.env.FORKWISE_ANALYZER_VERSION || "forkwise-contract/0.1.0";
const commitSha = "0123456789abcdef0123456789abcdef01234567";

const execute = async ({ repositoryUrl, context, onProgress }) => {
  const parsed = new URL(repositoryUrl);
  const [owner, name] = parsed.pathname.split("/").filter(Boolean);
  await onProgress("metadata", "Reading deterministic contract metadata.", null, 20);
  await onProgress("commit", "Pinning deterministic contract commit.", null, 40);
  await onProgress("analysis", "Applying deterministic contract rules.", null, 75);
  return {
    schemaVersion: "forkwise-report/v1",
    analyzerVersion,
    execution: "static-only",
    generatedAt: new Date().toISOString(),
    decision: "Pilot",
    confidence: "high",
    evidenceCoverage: 80,
    blockers: [],
    ownershipEffort: "moderate",
    adoptionEffort: "moderate",
    nextAction: "Run a bounded pilot before production adoption.",
    repository: {
      url: repositoryUrl,
      owner,
      name,
      commitSha,
      defaultBranch: "main",
    },
    context,
    dimensions: ["fit", "trust", "run", "own", "exit"].map((id) => ({
      id,
      label: id[0].toUpperCase() + id.slice(1),
      score: 70,
      rating: "adequate",
      summary: "Deterministic contract fixture.",
      findingIds: [],
    })),
    findings: [],
    evidence: [{
      id: "ev-001",
      type: "metadata",
      url: repositoryUrl,
      summary: "Deterministic contract evidence.",
    }],
    claims: [],
    operations: {},
    technologies: [],
    unresolvedQuestions: [],
    pilotChecklist: ["Validate the production runner after deployment."],
    limitations: ["Contract fixture only; no repository content was executed."],
    inventory: { treeEntries: 1, treeTruncated: false, filesInspected: 1, inspectedPaths: ["README.md"], signals: {}, counts: {}, notes: [] },
  };
};

const server = await createApi({
  store: new MemoryJobStore(),
  execute,
  leaseMs: 10_000,
  analyzerVersion,
});

server.listen(port, host, () => {
  console.log(`ForkWise contract runner listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
