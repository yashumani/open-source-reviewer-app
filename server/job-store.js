import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class MemoryJobStore {
  #jobs = new Map();
  #reports = new Map();

  async init() {}
  async putJob(job) { this.#jobs.set(job.id, clone(job)); return clone(job); }
  async getJob(id) { return clone(this.#jobs.get(id) ?? null); }
  async listJobs() { return [...this.#jobs.values()].map(clone); }
  async putReport(id, report) { this.#reports.set(id, clone(report)); return clone(report); }
  async getReport(id) { return clone(this.#reports.get(id) ?? null); }
}

async function atomicJsonWrite(file, value) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(tmp, file);
}

export class FileJobStore {
  constructor(root = process.env.FORKWISE_DATA_DIR || ".runtime") {
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

  async putJob(job) {
    await atomicJsonWrite(this.jobFile(job.id), job);
    return clone(job);
  }

  async getJob(id) {
    try { return JSON.parse(await readFile(this.jobFile(id), "utf8")); }
    catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  }

  async listJobs() {
    const names = (await readdir(this.jobsDir)).filter((name) => name.endsWith(".json")).sort();
    return Promise.all(names.map((name) => this.getJob(name.slice(0, -5))));
  }

  async putReport(id, report) {
    await atomicJsonWrite(this.reportFile(id), report);
    return clone(report);
  }

  async getReport(id) {
    try { return JSON.parse(await readFile(this.reportFile(id), "utf8")); }
    catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  }
}
