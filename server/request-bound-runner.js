import { randomUUID } from "node:crypto";
import { contextFingerprint, idempotencyFingerprint } from "./contracts.js";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);
const SAFE_ERROR_CODES = new Set([
  "not_found",
  "rate_limited",
  "network_error",
  "github_http_error",
  "missing_tree",
  "invalid_repository",
  "analysis_timeout",
]);

export function publicRunnerError(error) {
  const code = typeof error?.code === "string" ? error.code : "analysis_failed";
  const safe = SAFE_ERROR_CODES.has(code);
  return {
    code: safe ? code : "analysis_failed",
    message: safe
      ? String(error?.message || "Analysis failed.")
      : "The analysis runner could not complete this review.",
    retryable: code === "rate_limited" || code === "network_error" || code === "analysis_timeout",
  };
}

function toIso(value) {
  return typeof value === "string" ? value : new Date(value).toISOString();
}

export class RequestBoundRunner {
  constructor({
    store,
    execute,
    leaseMs = 60_000,
    idempotencyWindowMs = 30 * 60_000,
    now = () => new Date(),
  }) {
    if (!store || typeof execute !== "function") throw new TypeError("store and execute are required");
    this.store = store;
    this.execute = execute;
    this.leaseMs = Math.max(5_000, Math.min(5 * 60_000, Number(leaseMs) || 60_000));
    this.idempotencyWindowMs = Math.max(0, Number(idempotencyWindowMs) || 0);
    this.now = now;
  }

  #nowIso() {
    return toIso(this.now());
  }

  async submit({ repositoryUrl, context, clientRequestId = null }) {
    const createdAt = this.#nowIso();
    const contextHash = contextFingerprint(context);
    const idempotencyKey = idempotencyFingerprint({ repositoryUrl, context, clientRequestId });

    if (idempotencyKey && typeof this.store.findJobByIdempotency === "function") {
      const notBefore = new Date(Date.parse(createdAt) - this.idempotencyWindowMs).toISOString();
      const existing = await this.store.findJobByIdempotency({ idempotencyKey, notBefore });
      if (existing) return { ...existing, idempotent: true };
    }

    const job = {
      id: randomUUID(),
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      completedAt: null,
      repositoryUrl,
      context,
      contextHash,
      clientRequestId,
      idempotencyKey,
      attemptCount: 0,
      leaseToken: null,
      leaseExpiresAt: null,
      progress: { stage: "queued", message: "Job accepted and waiting for a request-bound runner.", percent: 0 },
      reportId: null,
      error: null,
    };
    await this.store.putJob(job);
    return job;
  }

  async getJob(id, { executeIfClaimable = true } = {}) {
    let job = await this.store.getJob(id);
    if (!job || TERMINAL.has(job.status) || !executeIfClaimable) return job;

    const now = this.#nowIso();
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(Date.parse(now) + this.leaseMs).toISOString();
    const claimed = await this.store.claimJob(id, { leaseToken, now, leaseExpiresAt });

    if (claimed) {
      await this.#executeClaimed(claimed, leaseToken);
      job = await this.store.getJob(id);
    } else {
      job = await this.store.getJob(id);
    }
    return job;
  }

  async #executeClaimed(job, leaseToken) {
    const onProgress = async (stage, message, detail = null, percent = null) => {
      const now = this.#nowIso();
      const leaseExpiresAt = new Date(Date.parse(now) + this.leaseMs).toISOString();
      await this.store.updateClaimedJob(job.id, leaseToken, (latest) => ({
        ...latest,
        updatedAt: now,
        leaseExpiresAt,
        progress: {
          stage: String(stage || "running"),
          message: String(message || "Analysis is running."),
          detail,
          ...(Number.isFinite(percent) ? { percent: Math.max(0, Math.min(99, Number(percent))) } : {}),
        },
      }));
    };

    try {
      const report = await this.execute({
        repositoryUrl: job.repositoryUrl,
        context: job.context,
        onProgress,
      });
      if (!report || typeof report !== "object" || Array.isArray(report)) {
        const error = new TypeError("Analysis returned an invalid report object.");
        error.code = "invalid_report";
        throw error;
      }
      await this.store.completeJob(job.id, {
        leaseToken,
        report,
        now: this.#nowIso(),
      });
    } catch (error) {
      await this.store.failJob(job.id, {
        leaseToken,
        error: publicRunnerError(error),
        now: this.#nowIso(),
      });
    }
  }

  async getReport(id) {
    return this.store.getReport(id);
  }

  async stats({ windowMs = 24 * 60 * 60_000 } = {}) {
    const now = Date.parse(this.#nowIso());
    const jobs = (await this.store.listJobs()).filter(Boolean);
    const recent = jobs.filter((job) => now - Date.parse(job.createdAt) <= windowMs);
    const counts = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    for (const job of recent) {
      if (job.status in counts) counts[job.status] += 1;
    }
    return {
      windowHours: Math.round((windowMs / 3_600_000) * 100) / 100,
      total: recent.length,
      counts,
      lastJobAt: recent.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]?.createdAt ?? null,
    };
  }
}
