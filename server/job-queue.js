import { randomUUID } from "node:crypto";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

function publicError(error) {
  const code = typeof error?.code === "string" ? error.code : "analysis_failed";
  const safe = new Set(["not_found", "rate_limited", "network_error", "github_http_error", "missing_tree", "invalid_repository"]);
  return {
    code: safe.has(code) ? code : "analysis_failed",
    message: safe.has(code) ? String(error?.message || "Analysis failed.") : "The analysis runner could not complete this review.",
  };
}

export class AnalysisQueue {
  constructor({ store, execute, concurrency = 1, now = () => new Date().toISOString() }) {
    if (!store || typeof execute !== "function") throw new TypeError("store and execute are required");
    this.store = store;
    this.execute = execute;
    this.concurrency = Math.max(1, Math.min(4, Number(concurrency) || 1));
    this.now = now;
    this.pending = [];
    this.running = 0;
  }

  async submit(input) {
    const createdAt = this.now();
    const job = {
      id: randomUUID(),
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      completedAt: null,
      repositoryUrl: input.repositoryUrl,
      context: input.context ?? {},
      progress: { stage: "queued", message: "Waiting for an analysis runner." },
      reportId: null,
      error: null,
    };
    await this.store.putJob(job);
    this.pending.push(job.id);
    queueMicrotask(() => this.#drain());
    return job;
  }

  async get(id) { return this.store.getJob(id); }

  async #drain() {
    while (this.running < this.concurrency && this.pending.length) {
      const id = this.pending.shift();
      this.running += 1;
      this.#run(id).finally(() => {
        this.running -= 1;
        queueMicrotask(() => this.#drain());
      });
    }
  }

  async #run(id) {
    let job = await this.store.getJob(id);
    if (!job || TERMINAL.has(job.status)) return;
    job = { ...job, status: "running", startedAt: this.now(), updatedAt: this.now(), progress: { stage: "acquire", message: "Pinning repository evidence to an exact commit." } };
    await this.store.putJob(job);

    const onProgress = async (stage, message, detail = null) => {
      const latest = await this.store.getJob(id);
      if (!latest || TERMINAL.has(latest.status)) return;
      await this.store.putJob({ ...latest, updatedAt: this.now(), progress: { stage, message, detail } });
    };

    try {
      const report = await this.execute({ repositoryUrl: job.repositoryUrl, context: job.context, onProgress });
      const reportId = id;
      await this.store.putReport(reportId, report);
      const latest = await this.store.getJob(id);
      await this.store.putJob({ ...latest, status: "completed", updatedAt: this.now(), completedAt: this.now(), progress: { stage: "complete", message: "Evidence-backed report is ready." }, reportId, error: null });
    } catch (error) {
      const latest = await this.store.getJob(id);
      await this.store.putJob({ ...latest, status: "failed", updatedAt: this.now(), completedAt: this.now(), progress: { stage: "failed", message: "Analysis could not be completed." }, error: publicError(error) });
    }
  }
}
