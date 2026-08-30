import { Worker } from "node:worker_threads";

const DEFAULT_TIMEOUT_MS = 90_000;

export function runStaticAnalysis(payload, { timeoutMs = DEFAULT_TIMEOUT_MS, workerUrl = new URL("./worker-entry.js", import.meta.url) } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { workerData: { repositoryUrl: payload.repositoryUrl, context: payload.context ?? {} } });
    let settled = false;
    const timeout = setTimeout(async () => {
      if (settled) return;
      settled = true;
      await worker.terminate();
      const error = new Error("The static analysis runner exceeded its time limit.");
      error.code = "analysis_timeout";
      reject(error);
    }, Math.max(1_000, timeoutMs));
    timeout.unref?.();

    worker.on("message", (message) => {
      if (message?.type === "progress") payload.onProgress?.(message.stage, message.message, message.detail);
      if (message?.type === "result" && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(message.report);
        worker.terminate();
      }
      if (message?.type === "error" && !settled) {
        settled = true;
        clearTimeout(timeout);
        const error = new Error(message.message || "Analysis failed.");
        error.code = message.code || "analysis_failed";
        reject(error);
        worker.terminate();
      }
    });
    worker.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
    worker.on("exit", (code) => {
      if (!settled && code !== 0) {
        settled = true;
        clearTimeout(timeout);
        const error = new Error(`Analysis worker exited with code ${code}.`);
        error.code = "worker_exit";
        reject(error);
      }
    });
  });
}
