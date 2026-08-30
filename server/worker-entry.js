import { parentPort, workerData } from "node:worker_threads";
import { parseGitHubUrl, fetchRepositorySnapshot } from "../src/github.js";
import { analyzeRepository } from "../src/analyzer.js";

function progress(stage, message, detail = null) {
  parentPort?.postMessage({ type: "progress", stage, message, detail });
}

try {
  const parsed = parseGitHubUrl(workerData.repositoryUrl);
  progress("metadata", "Reading public repository metadata.", parsed.fullName);
  const snapshot = await fetchRepositorySnapshot(parsed, {
    contentLimit: 32,
    onStage: (stage, message, detail) => progress(stage, message, detail),
  });
  progress("analyze", "Running deterministic evidence rules.", snapshot.commit.sha.slice(0, 12));
  const report = analyzeRepository(snapshot, workerData.context ?? {});
  parentPort?.postMessage({ type: "result", report });
} catch (error) {
  parentPort?.postMessage({ type: "error", code: error?.code || "analysis_failed", message: error?.message || "Analysis failed." });
}
