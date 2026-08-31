import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isClaimable(job, now) {
  if (!job) return false;
  if (job.status === "queued") return true;
  if (job.status !== "running") return false;
  if (!job.leaseExpiresAt) return true;
  return Date.parse(job.leaseExpiresAt) <= Date.parse(now);
}

function matchesIdempotency(job, { idempotencyKey, notBefore }) {
  if (!job || !idempotencyKey || job.idempotencyKey !== idempotencyKey) return false;
  return !notBefore || Date.parse(job.createdAt) >= Date.parse(notBefore);
}

class AtomicStoreBase {
  #tail = Promise.resolve();

  async withLock(task) {
    const previous = this.#tail;
    let release;
    this.#tail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }
}

export class MemoryJobStore extends AtomicStoreBase {
  #jobs = new Map();
  #reports = new Map();

  async init() {}

  async putJob(job) {
    return this.withLock(async () => {
      this.#jobs.set(job.id, clone(job));
      return clone(job);
    });
  }

  async getJob(id) {
    return clone(this.#jobs.get(id) ?? null);
  }

  async listJobs() {
    return [...this.#jobs.values()].map(clone);
  }

  async findJobByIdempotency(query) {
    return clone([...this.#jobs.values()]
      .filter((job) => matchesIdempotency(job, query))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null);
  }

  async claimJob(id, { leaseToken, now, leaseExpiresAt }) {
    return this.withLock(async () => {
      const job = this.#jobs.get(id);
      if (!isClaimable(job, now)) return null;
      const claimed = {
        ...job,
        status: "running",
        startedAt: job.startedAt ?? now,
        updatedAt: now,
        leaseToken,
        leaseExpiresAt,
        attemptCount: Number(job.attemptCount || 0) + 1,
        progress: { stage: "starting", message: "Starting bounded static analysis.", percent: 5 },
      };
      this.#jobs.set(id, clone(claimed));
      return clone(claimed);
    });
  }

  async updateClaimedJob(id, leaseToken, updater) {
    return this.withLock(async () => {
      const job = this.#jobs.get(id);
      if (!job || job.status !== "running" || job.leaseToken !== leaseToken) return null;
      const updated = typeof updater === "function" ? updater(clone(job)) : { ...job, ...updater };
      this.#jobs.set(id, clone(updated));
      return clone(updated);
    });
  }

  async completeJob(id, { leaseToken, report, now }) {
    return this.withLock(async () => {
      const job = this.#jobs.get(id);
      if (!job) return null;
      if (job.status === "completed") return clone(job);
      if (job.status !== "running" || job.leaseToken !== leaseToken) return null;
      if (!this.#reports.has(id)) this.#reports.set(id, clone(report));
      const completed = {
        ...job,
        status: "completed",
        updatedAt: now,
        completedAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
        progress: { stage: "completed", message: "Evidence-backed report is ready.", percent: 100 },
        reportId: id,
        error: null,
      };
      this.#jobs.set(id, clone(completed));
      return clone(completed);
    });
  }

  async failJob(id, { leaseToken, error, now }) {
    return this.withLock(async () => {
      const job = this.#jobs.get(id);
      if (!job || job.status !== "running" || job.leaseToken !== leaseToken) return null;
      const failed = {
        ...job,
        status: "failed",
        updatedAt: now,
        completedAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
        progress: { stage: "failed", message: "Analysis could not be completed.", percent: 100 },
        error: clone(error),
      };
      this.#jobs.set(id, clone(failed));
      return clone(failed);
    });
  }

  async putReport(id, report) {
    return this.withLock(async () => {
      this.#reports.set(id, clone(report));
      return clone(report);
    });
  }

  async getReport(id) {
    return clone(this.#reports.get(id) ?? null);
  }

  async listReports() {
    return [...this.#reports.values()].map(clone);
  }
}

async function atomicJsonWrite(file, value) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(tmp, file);
}

export class FileJobStore extends AtomicStoreBase {
  constructor(root = process.env.FORKWISE_DATA_DIR || ".runtime") {
    super();
    this.root = path.resolve(root);
    this.jobsDir = path.join(this.root, "jobs");
    this.reportsDir = path.join(this.root, "reports");
  }

  async init() {
    await mkdir(this.jobsDir, { recursive: true, mode: 0o700 });
    await mkdir(this.reportsDir, { recursive: true, mode: 0o700 });
  }

  jobFile(id) { return path.join(this.jobsDir, `${id}.json`); }
  reportFile(id) { return path.join(this.reportsDir, `${id}.json`); }

  async #readJob(id) {
    try { return JSON.parse(await readFile(this.jobFile(id), "utf8")); }
    catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  }

  async #readReport(id) {
    try { return JSON.parse(await readFile(this.reportFile(id), "utf8")); }
    catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  }

  async putJob(job) {
    return this.withLock(async () => {
      await atomicJsonWrite(this.jobFile(job.id), job);
      return clone(job);
    });
  }

  async getJob(id) {
    return clone(await this.#readJob(id));
  }

  async listJobs() {
    const names = (await readdir(this.jobsDir)).filter((name) => name.endsWith(".json")).sort();
    return Promise.all(names.map((name) => this.getJob(name.slice(0, -5))));
  }

  async findJobByIdempotency(query) {
    const jobs = await this.listJobs();
    return clone(jobs
      .filter((job) => matchesIdempotency(job, query))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null);
  }

  async claimJob(id, { leaseToken, now, leaseExpiresAt }) {
    return this.withLock(async () => {
      const job = await this.#readJob(id);
      if (!isClaimable(job, now)) return null;
      const claimed = {
        ...job,
        status: "running",
        startedAt: job.startedAt ?? now,
        updatedAt: now,
        leaseToken,
        leaseExpiresAt,
        attemptCount: Number(job.attemptCount || 0) + 1,
        progress: { stage: "starting", message: "Starting bounded static analysis.", percent: 5 },
      };
      await atomicJsonWrite(this.jobFile(id), claimed);
      return clone(claimed);
    });
  }

  async updateClaimedJob(id, leaseToken, updater) {
    return this.withLock(async () => {
      const job = await this.#readJob(id);
      if (!job || job.status !== "running" || job.leaseToken !== leaseToken) return null;
      const updated = typeof updater === "function" ? updater(clone(job)) : { ...job, ...updater };
      await atomicJsonWrite(this.jobFile(id), updated);
      return clone(updated);
    });
  }

  async completeJob(id, { leaseToken, report, now }) {
    return this.withLock(async () => {
      const job = await this.#readJob(id);
      if (!job) return null;
      if (job.status === "completed") return clone(job);
      if (job.status !== "running" || job.leaseToken !== leaseToken) return null;
      const existingReport = await this.#readReport(id);
      if (!existingReport) await atomicJsonWrite(this.reportFile(id), report);
      const completed = {
        ...job,
        status: "completed",
        updatedAt: now,
        completedAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
        progress: { stage: "completed", message: "Evidence-backed report is ready.", percent: 100 },
        reportId: id,
        error: null,
      };
      await atomicJsonWrite(this.jobFile(id), completed);
      return clone(completed);
    });
  }

  async failJob(id, { leaseToken, error, now }) {
    return this.withLock(async () => {
      const job = await this.#readJob(id);
      if (!job || job.status !== "running" || job.leaseToken !== leaseToken) return null;
      const failed = {
        ...job,
        status: "failed",
        updatedAt: now,
        completedAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
        progress: { stage: "failed", message: "Analysis could not be completed.", percent: 100 },
        error: clone(error),
      };
      await atomicJsonWrite(this.jobFile(id), failed);
      return clone(failed);
    });
  }

  async putReport(id, report) {
    return this.withLock(async () => {
      await atomicJsonWrite(this.reportFile(id), report);
      return clone(report);
    });
  }

  async getReport(id) {
    return clone(await this.#readReport(id));
  }

  async listReports() {
    const names = (await readdir(this.reportsDir)).filter((name) => name.endsWith(".json")).sort();
    return Promise.all(names.map((name) => this.getReport(name.slice(0, -5))));
  }
}
