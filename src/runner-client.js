function normalizeBaseUrl(value) {
  const text = String(value ?? "").trim().replace(/\/+$/, "");
  if (!text) throw new TypeError("A runner API base URL is required.");
  const url = new URL(text);
  if (!/^https?:$/.test(url.protocol)) throw new TypeError("Runner API must use http or https.");
  return url.toString().replace(/\/$/, "");
}

function apiUrl(root, candidate, fallbackPath) {
  const value = String(candidate || fallbackPath || "").trim();
  if (!value) return root;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/v1/") || value === "/health") return `${root}${value}`;
  if (value.startsWith("/")) return new URL(value, root).toString();
  return `${root}/${value.replace(/^\/+/, "")}`;
}

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Runner API returned ${response.status}.`);
    error.code = body?.error?.code || "runner_http_error";
    error.status = response.status;
    error.retryAfterSeconds = Number(body?.error?.retryAfterSeconds || response.headers?.get?.("retry-after") || 0) || null;
    throw error;
  }
  return body;
}

function abortError() {
  return new DOMException("Aborted", "AbortError");
}

function delay(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, Math.max(100, ms));
    function done() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    function onAbort() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function progressPayload(job, jobId) {
  const progress = job?.progress && typeof job.progress === "object" ? job.progress : {};
  const percent = Number(progress.percent);
  return {
    stage: String(progress.stage || job?.status || "queued"),
    message: String(progress.message || job?.status || "Queued"),
    percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null,
    status: String(job?.status || "queued"),
    jobId,
  };
}

export function createRunnerClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  pollIntervalMs = 750,
  timeoutMs = 120_000,
} = {}) {
  const root = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");

  const requestUrl = async (url, options = {}) => readResponse(await fetchImpl(url, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  }));
  const request = (path, options) => requestUrl(apiUrl(root, path), options);

  return {
    baseUrl: root,
    health: () => request("/health"),
    getStats: () => request("/v1/stats"),
    submitReview: ({ repositoryUrl, context, clientRequestId }) => request("/v1/reviews", {
      method: "POST",
      body: JSON.stringify({ repositoryUrl, context, ...(clientRequestId ? { clientRequestId } : {}) }),
    }),
    getJob: (jobId, statusUrl = null) => requestUrl(apiUrl(root, statusUrl, `/v1/jobs/${encodeURIComponent(jobId)}`)),
    getReport: (reportId, reportUrl = null) => requestUrl(apiUrl(root, reportUrl, `/v1/reports/${encodeURIComponent(reportId)}`)),
    async runReview({ repositoryUrl, context, clientRequestId, signal, onProgress = () => {} }) {
      const submitted = await this.submitReview({ repositoryUrl, context, clientRequestId });
      const jobId = submitted.jobId;
      if (!jobId) {
        const error = new Error("Runner API did not return a job identifier.");
        error.code = "missing_job_id";
        throw error;
      }

      const startedAt = Date.now();
      const statusUrl = apiUrl(root, submitted.statusUrl, `/v1/jobs/${encodeURIComponent(jobId)}`);
      const defaultReportUrl = apiUrl(root, submitted.reportUrl, `/v1/reports/${encodeURIComponent(jobId)}`);

      while (true) {
        if (signal?.aborted) throw abortError();
        if (Date.now() - startedAt > Math.max(1_000, timeoutMs)) {
          const error = new Error("The analysis runner did not finish before the client timeout.");
          error.code = "runner_timeout";
          throw error;
        }

        const job = await requestUrl(statusUrl);
        onProgress(progressPayload(job, jobId));
        if (job.status === "completed") {
          return requestUrl(apiUrl(root, job.reportUrl, defaultReportUrl));
        }
        if (job.status === "failed") {
          const error = new Error(job.error?.message || "Analysis failed.");
          error.code = job.error?.code || "analysis_failed";
          error.retryable = Boolean(job.error?.retryable);
          throw error;
        }
        await delay(pollIntervalMs, signal);
      }
    },
  };
}
