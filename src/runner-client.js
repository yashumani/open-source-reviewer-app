function normalizeBaseUrl(value) {
  const text = String(value ?? "").trim().replace(/\/+$/, "");
  if (!text) throw new TypeError("A runner API base URL is required.");
  const url = new URL(text);
  if (!/^https?:$/.test(url.protocol)) throw new TypeError("Runner API must use http or https.");
  return url.toString().replace(/\/$/, "");
}

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Runner API returned ${response.status}.`);
    error.code = body?.error?.code || "runner_http_error";
    error.status = response.status;
    throw error;
  }
  return body;
}

export function createRunnerClient({ baseUrl, fetchImpl = globalThis.fetch, pollIntervalMs = 750 } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");

  const request = async (path, options = {}) => readResponse(await fetchImpl(`${root}${path}`, {
    ...options,
    headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}), ...(options.headers ?? {}) },
  }));

  return {
    health: () => request("/health"),
    submitReview: ({ repositoryUrl, context }) => request("/v1/reviews", { method: "POST", body: JSON.stringify({ repositoryUrl, context }) }),
    getJob: (jobId) => request(`/v1/jobs/${encodeURIComponent(jobId)}`),
    getReport: (reportId) => request(`/v1/reports/${encodeURIComponent(reportId)}`),
    async runReview({ repositoryUrl, context, signal, onProgress = () => {} }) {
      const submitted = await this.submitReview({ repositoryUrl, context });
      while (!signal?.aborted) {
        const job = await this.getJob(submitted.jobId);
        onProgress(job.progress ?? { stage: job.status, message: job.status });
        if (job.status === "completed") return this.getReport(job.reportId || submitted.jobId);
        if (job.status === "failed") {
          const error = new Error(job.error?.message || "Analysis failed.");
          error.code = job.error?.code || "analysis_failed";
          throw error;
        }
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, Math.max(100, pollIntervalMs));
          signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        });
      }
      throw new DOMException("Aborted", "AbortError");
    },
  };
}
