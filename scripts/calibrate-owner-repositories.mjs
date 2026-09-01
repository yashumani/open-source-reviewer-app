import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { analyzeRepository } from "../src/analyzer.js";
import {
  OWNER_CALIBRATION_CONTEXTS,
  detectCalibrationSignals,
  summarizeAssessment,
  summarizeCalibrationRun,
} from "../src/calibration.js";
import { fetchRepositorySnapshot, parseGitHubUrl } from "../src/github.js";
import { ANALYZER_VERSION, REPORT_SCHEMA_VERSION } from "../src/schema.js";

const OWNER = String(process.env.FORKWISE_CALIBRATION_OWNER || process.argv[2] || "yashumani").trim();
const OUTPUT_DIR = path.resolve(process.env.FORKWISE_CALIBRATION_DIR || "validation/owner-repository-calibration");
const TOKEN = String(process.env.GITHUB_TOKEN || "").trim();
const API_ROOT = "https://api.github.com";
const CONTENT_LIMIT = 24;
const HTTP_CONCURRENCY = 6;

if (!/^[A-Za-z0-9_.-]+$/.test(OWNER)) {
  throw new Error("FORKWISE_CALIBRATION_OWNER must be a valid GitHub login.");
}

function createSemaphore(limit) {
  let active = 0;
  const waiting = [];

  const acquire = () => new Promise((resolve) => {
    const start = () => {
      active += 1;
      resolve(() => {
        active -= 1;
        waiting.shift()?.();
      });
    };
    if (active < limit) start();
    else waiting.push(start);
  });

  return acquire;
}

const acquireRequest = createSemaphore(HTTP_CONCURRENCY);
let lastRateLimit = null;

async function authenticatedFetch(url, options = {}) {
  const release = await acquireRequest();
  try {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", headers.get("Accept") || "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", headers.get("X-GitHub-Api-Version") || "2022-11-28");
    headers.set("User-Agent", "ForkWise-owner-repository-calibration");
    if (TOKEN) headers.set("Authorization", `Bearer ${TOKEN}`);

    const response = await fetch(url, { ...options, headers });
    const remaining = response.headers.get("x-ratelimit-remaining");
    const limit = response.headers.get("x-ratelimit-limit");
    const reset = response.headers.get("x-ratelimit-reset");
    if (remaining || limit || reset) {
      lastRateLimit = {
        limit: limit ? Number(limit) : null,
        remaining: remaining ? Number(remaining) : null,
        resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : null,
      };
    }
    return response;
  } finally {
    release();
  }
}

async function requestJson(url) {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub returned ${response.status} for ${url}: ${body.slice(0, 180)}`);
  }
  return response.json();
}

async function listPublicOwnedRepositories(owner) {
  const repositories = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(`${API_ROOT}/users/${encodeURIComponent(owner)}/repos`);
    url.searchParams.set("type", "owner");
    url.searchParams.set("sort", "full_name");
    url.searchParams.set("direction", "asc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const batch = await requestJson(url.toString());
    if (!Array.isArray(batch)) throw new Error("GitHub did not return a repository list.");
    repositories.push(...batch.filter((repo) => repo?.owner?.login?.toLowerCase() === owner.toLowerCase()));
    if (batch.length < 100) break;
  }
  return repositories.sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
}

function safeError(error) {
  return {
    name: error?.name || "Error",
    code: error?.code || "analysis_error",
    message: String(error?.message || error || "Unknown error").slice(0, 500),
  };
}

function escapeCell(value) {
  return String(value ?? "—")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim() || "—";
}

function dimensionScore(summary, name) {
  return summary?.dimensions?.[name]?.score ?? "—";
}

function contextDecisionCounts(summary, contextId) {
  const counts = summary.decisionCounts?.[contextId] ?? {};
  return ["Adopt", "Pilot", "Fork", "Avoid", "Insufficient evidence"]
    .map((decision) => `${decision}: ${counts[decision] ?? 0}`)
    .join(" · ");
}

function createMarkdown(report) {
  const lines = [
    "# ForkWise owner-repository calibration",
    "",
    `> Generated: ${report.generatedAt}  `,
    `> Owner: \`${report.owner}\`  `,
    `> Analyzer: \`${report.analyzerVersion}\`  `,
    `> Application commit: \`${report.applicationCommit || "local"}\``,
    "",
    "## Scope",
    "",
    "This run discovers and analyzes **public repositories owned by the selected GitHub account** through the same commit-pinned snapshot and deterministic analyzer used by ForkWise. Private repository names and content are intentionally excluded from this public Actions artifact. The live Community Preview does not inherit a user's GitHub login and currently supports public repositories only.",
    "",
    `- Public repositories discovered: **${report.summary.discovered}**`,
    `- Completed: **${report.summary.completed}**`,
    `- Empty/skipped: **${report.summary.skipped}**`,
    `- Failed: **${report.summary.failed}**`,
    `- Selected-content limit: **${report.scope.contentLimit} files per repository**`,
    "",
    "## Aggregate decisions by intent",
    "",
    "| Intent profile | Decision counts |",
    "| --- | --- |",
    ...report.contexts.map((context) => `| ${escapeCell(context.label)} | ${escapeCell(contextDecisionCounts(report.summary, context.id))} |`),
    "",
    "## UI-default self-host results",
    "",
    "| Repository | Decision | Confidence | Coverage | Fit | Trust | Run | Own | Exit | Blockers | Primary driver | Signals |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
  ];

  for (const record of report.records) {
    if (record.status !== "completed") {
      lines.push(`| ${escapeCell(record.fullName)} | ${escapeCell(record.status)} | — | — | — | — | — | — | — | — | ${escapeCell(record.reason || record.error?.message)} | — |`);
      continue;
    }
    const summary = record.summaries["self-host"];
    const primary = summary.topRisks?.[0];
    lines.push(
      `| ${escapeCell(record.fullName)} | ${escapeCell(summary.decision)} | ${escapeCell(summary.confidence)} | ${summary.evidenceCoverage}% | ${dimensionScore(summary, "Fit")} | ${dimensionScore(summary, "Trust")} | ${dimensionScore(summary, "Run")} | ${dimensionScore(summary, "Own")} | ${dimensionScore(summary, "Exit")} | ${summary.blockerCount} | ${escapeCell(primary ? `${primary.ruleId}: ${primary.title}` : "No material risk")} | ${escapeCell(record.signals.map((signal) => signal.id).join(", ") || "none")} |`,
    );
  }

  lines.push("", "## Decision matrix", "", "| Repository | Self-host | Dependency | Fork | Contribute |", "| --- | --- | --- | --- | --- |");
  for (const record of report.records.filter((item) => item.status === "completed")) {
    lines.push(`| ${escapeCell(record.fullName)} | ${escapeCell(record.summaries["self-host"].decision)} | ${escapeCell(record.summaries.dependency.decision)} | ${escapeCell(record.summaries.fork.decision)} | ${escapeCell(record.summaries.contribute.decision)} |`);
  }

  const candidates = report.records.filter((record) => record.status === "completed" && record.signals.length);
  lines.push("", "## Calibration candidates", "");
  if (!candidates.length) {
    lines.push("No automatic calibration signals were raised.");
  } else {
    for (const record of candidates) {
      lines.push(`### ${record.fullName}`, "");
      for (const signal of record.signals) lines.push(`- **${signal.id}** (${signal.severity}): ${signal.message}`);
      lines.push("");
    }
  }

  const self = report.records.find((record) => record.fullName.toLowerCase() === `${report.owner}/open-source-reviewer-app`.toLowerCase());
  lines.push("## ForkWise self-review", "");
  if (self?.status === "completed") {
    const selfHost = self.summaries["self-host"];
    lines.push(
      `- Default self-host decision: **${selfHost.decision}**`,
      `- Confidence: **${selfHost.confidence}**`,
      `- Evidence coverage: **${selfHost.evidenceCoverage}%**`,
      `- Dimensions: Fit ${dimensionScore(selfHost, "Fit")}, Trust ${dimensionScore(selfHost, "Trust")}, Run ${dimensionScore(selfHost, "Run")}, Own ${dimensionScore(selfHost, "Own")}, Exit ${dimensionScore(selfHost, "Exit")}`,
      `- Blockers: **${selfHost.blockerCount}**`,
      `- Signals: **${self.signals.map((signal) => signal.id).join(", ") || "none"}**`,
    );
  } else {
    lines.push(`The ForkWise repository was not analyzed successfully: ${escapeCell(self?.error?.message || "not discovered")}.`);
  }

  lines.push(
    "",
    "## Interpretation boundary",
    "",
    "A repository can legitimately receive different decisions under different intended uses. A self-host profile is not an appropriate universal rating for libraries, documentation repositories, templates, or personal sites. This calibration run therefore preserves all four intent profiles instead of treating the UI-default self-host result as a global repository grade.",
    "",
    "The JSON artifact contains the full redacted ForkWise assessments for reproducibility and rule-level debugging.",
  );

  return `${lines.join("\n")}\n`;
}

async function analyzeOne(repo) {
  const record = {
    fullName: repo.full_name,
    url: repo.html_url,
    defaultBranch: repo.default_branch,
    sizeKb: repo.size ?? 0,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    status: "pending",
    summaries: {},
    reports: {},
    signals: [],
  };

  if ((repo.size ?? 0) === 0) {
    record.status = "skipped";
    record.reason = "empty_repository";
    return record;
  }

  try {
    const parsed = parseGitHubUrl(repo.html_url);
    const snapshot = await fetchRepositorySnapshot(parsed, {
      fetchImpl: authenticatedFetch,
      contentLimit: CONTENT_LIMIT,
    });

    for (const context of OWNER_CALIBRATION_CONTEXTS) {
      const assessment = analyzeRepository(snapshot, context.input);
      record.reports[context.id] = assessment;
      record.summaries[context.id] = summarizeAssessment(assessment);
    }

    record.status = "completed";
    record.commitSha = snapshot.commit.sha;
    record.treeFileCount = snapshot.tree.filter((item) => item.type === "blob").length;
    record.treeTruncated = snapshot.treeTruncated;
    record.selectedContentCount = snapshot.selectedContentCount;
    record.signals = detectCalibrationSignals(record.reports);
  } catch (error) {
    record.status = "failed";
    record.error = safeError(error);
  }

  return record;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`Discovering public repositories owned by ${OWNER}…`);
  const repositories = await listPublicOwnedRepositories(OWNER);
  console.log(`Discovered ${repositories.length} public repositories.`);

  const records = [];
  for (const [index, repo] of repositories.entries()) {
    console.log(`[${index + 1}/${repositories.length}] ${repo.full_name}`);
    const record = await analyzeOne(repo);
    records.push(record);
    const defaultDecision = record.summaries?.["self-host"]?.decision;
    console.log(`  ${record.status}${defaultDecision ? ` · ${defaultDecision}` : ""}${record.signals?.length ? ` · signals: ${record.signals.map((item) => item.id).join(", ")}` : ""}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const report = {
    schemaVersion: "forkwise-owner-calibration/v1",
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    analyzerVersion: ANALYZER_VERSION,
    applicationCommit: process.env.GITHUB_SHA || null,
    owner: OWNER,
    generatedAt: new Date().toISOString(),
    startedAt,
    scope: {
      publicOwnedRepositoriesOnly: true,
      privateRepositoriesExcluded: true,
      contentLimit: CONTENT_LIMIT,
      repositoryCodeExecuted: false,
      contexts: OWNER_CALIBRATION_CONTEXTS.map((context) => context.id),
    },
    contexts: OWNER_CALIBRATION_CONTEXTS,
    summary: summarizeCalibrationRun(records),
    rateLimit: lastRateLimit,
    records,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const jsonPath = path.join(OUTPUT_DIR, "owner-repository-calibration.json");
  const markdownPath = path.join(OUTPUT_DIR, "owner-repository-calibration.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, createMarkdown(report), "utf8");

  console.log(`Completed ${report.summary.completed}; skipped ${report.summary.skipped}; failed ${report.summary.failed}.`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${markdownPath}`);

  const self = records.find((record) => record.fullName.toLowerCase() === `${OWNER}/open-source-reviewer-app`.toLowerCase());
  const hardSignals = records.flatMap((record) => (record.signals ?? []).filter((signal) => signal.severity === "error"));
  const releaseProblems = [];
  if (!self || self.status !== "completed") releaseProblems.push("ForkWise did not successfully analyze its own public repository.");
  if (self?.summaries?.["self-host"]?.decision === "Avoid") releaseProblems.push("ForkWise still returns Avoid for its own UI-default self-host review.");
  if (report.summary.failed > 0) releaseProblems.push(`${report.summary.failed} non-empty public repository analysis run(s) failed.`);
  if (hardSignals.length > 0) releaseProblems.push(`${hardSignals.length} hard calibration signal(s) were raised.`);

  if (releaseProblems.length) {
    console.error("Calibration gate failed:");
    for (const problem of releaseProblems) console.error(`- ${problem}`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
