import { adaptHostedReport } from "./hosted-report-adapter.js";

export const HOSTED_RUNNER_BASE_URL = "https://forkwise-runner.lovable.app/functions/v1/review-api";
export const REVIEW_RUNTIME_CONFIG = Object.freeze({
  defaultMode: "browser",
  hostedEnabled: false,
  hostedBaseUrl: HOSTED_RUNNER_BASE_URL,
  automaticFallback: false,
});

export function resolveReviewMode({ requestedMode = null, config = REVIEW_RUNTIME_CONFIG } = {}) {
  if (requestedMode === "hosted" && config.hostedEnabled) return "hosted";
  return "browser";
}

export async function executeReview({
  requestedMode = null,
  config = REVIEW_RUNTIME_CONFIG,
  repositoryUrl,
  context,
  signal,
  onProgress = () => {},
  browserAnalyze,
  runnerClient = null,
}) {
  const mode = resolveReviewMode({ requestedMode, config });
  if (mode === "hosted") {
    if (!runnerClient || typeof runnerClient.runReview !== "function") {
      const error = new TypeError("Hosted review mode requires a configured runner client.");
      error.code = "runner_client_missing";
      throw error;
    }
    const report = await runnerClient.runReview({ repositoryUrl, context, signal, onProgress });
    return { mode, assessment: adaptHostedReport(report) };
  }

  if (typeof browserAnalyze !== "function") {
    throw new TypeError("Browser review mode requires a browserAnalyze function.");
  }
  return { mode, assessment: await browserAnalyze({ repositoryUrl, context, signal, onProgress }) };
}
