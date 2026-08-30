import { createRunnerClient } from "./runner-client.js";
import { RUNNER_BASE_URL, clampPercent, createClientRequestId, normalizeRunnerSummary, normalizeStatusCounts } from "./operator-model.js";

const $ = (selector, root = document) => root.querySelector(selector);
const byId = (id) => document.getElementById(id);
const metaBase = $("meta[name='forkwise-runner-base']")?.content;
const runner = createRunnerClient({ baseUrl: metaBase || RUNNER_BASE_URL, pollIntervalMs: 1_100, timeoutMs: 150_000 });
let activeController = null;
let refreshTimer = null;

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = String(value ?? "—");
}

function setHealthState(state, label) {
  const badge = byId("health-badge");
  badge.dataset.state = state;
  setText("health-label", label);
}

function formatTime(value) {
  if (!value) return "No jobs in window";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function renderStats(stats) {
  const counts = normalizeStatusCounts(stats);
  for (const key of ["total", "queued", "running", "completed", "failed"]) setText(`jobs-${key}`, counts[key]);
  setText("last-job-at", formatTime(stats.lastJobAt));
  setText("retention-days", `${stats.limits?.retentionDays ?? 7} days`);
  setText("artifact-limit", `${stats.limits?.maxFetchedFiles ?? 24} text artifacts`);
  setText("rate-limit", `${stats.limits?.rateMaxPerWindow ?? 8} / ${stats.limits?.rateWindowMinutes ?? 10} min`);
}

function renderHealth(health) {
  setHealthState(health.status === "ok" ? "ok" : "warn", health.status === "ok" ? "Operational" : "Degraded");
  setText("service-name", health.service || "forkwise-runner");
  setText("schema-version", health.schemaVersion || "forkwise-report/v1");
  setText("analyzer-version", health.analyzerVersion || "forkwise-hosted/0.1.0");
  setText("execution-mode", health.execution || "static-only");
  setText("health-checked-at", formatTime(health.time || new Date().toISOString()));
}

async function refreshStatus({ silent = false } = {}) {
  if (!silent) setHealthState("loading", "Checking");
  const [healthResult, statsResult] = await Promise.allSettled([runner.health(), runner.getStats()]);
  if (healthResult.status === "fulfilled") renderHealth(healthResult.value);
  else {
    setHealthState("error", "Unavailable");
    setText("health-checked-at", "Health endpoint did not respond");
  }
  if (statsResult.status === "fulfilled") renderStats(statsResult.value);
  else renderStats({ counts: {}, total: 0, limits: {} });
}

function contextFromForm() {
  return {
    intent: byId("test-intent").value,
    useCase: byId("test-use-case").value.trim(),
    deploymentTarget: byId("test-deployment").value,
    sensitivity: byId("test-sensitivity").value,
    teamSize: byId("test-team-size").value,
    externalServices: byId("test-external-services").value,
  };
}

function setTestState(state, message) {
  const status = byId("test-status");
  status.dataset.state = state;
  status.textContent = message;
}

function updateProgress(progress) {
  const percent = progress.percent === null ? ({ queued: 5, running: 35, completed: 100, failed: 100 }[progress.status] ?? 10) : clampPercent(progress.percent);
  byId("test-progress-fill").style.width = `${percent}%`;
  byId("test-progress").setAttribute("aria-valuenow", String(percent));
  setText("test-stage", progress.stage);
  setText("test-message", progress.message);
  setText("test-percent", `${percent}%`);
}

function renderSummary(report) {
  const summary = normalizeRunnerSummary(report);
  setText("result-repository", summary.repository);
  setText("result-decision", summary.decision);
  setText("result-confidence", summary.confidence);
  setText("result-coverage", `${summary.evidenceCoverage}%`);
  setText("result-blockers", summary.blockerCount);
  setText("result-commit", summary.commitSha ? summary.commitSha.slice(0, 12) : "Unavailable");
  setText("result-generated", formatTime(summary.generatedAt));
  setText("result-next-action", summary.nextAction);

  const list = byId("result-dimensions");
  list.replaceChildren();
  for (const dimension of summary.dimensions) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = dimension.label;
    const value = document.createElement("strong");
    value.textContent = `${dimension.score}/100`;
    item.append(label, value);
    list.append(item);
  }
  byId("test-result").hidden = false;
}

function userError(error) {
  if (error?.name === "AbortError") return "Analysis cancelled.";
  if (error?.code === "rate_limited") return `Free beta rate limit reached.${error.retryAfterSeconds ? ` Retry in about ${error.retryAfterSeconds} seconds.` : ""}`;
  if (error?.code === "runner_timeout") return "The analysis did not finish before the operator console timeout.";
  return error instanceof Error ? error.message : "The runner request failed.";
}

async function runSmokeTest(event) {
  event.preventDefault();
  activeController?.abort();
  activeController = new AbortController();
  byId("test-result").hidden = true;
  byId("run-test").disabled = true;
  byId("cancel-test").disabled = false;
  updateProgress({ stage: "submit", message: "Submitting review request", percent: 2, status: "queued" });
  setTestState("running", "Running real API smoke test");

  try {
    const report = await runner.runReview({
      repositoryUrl: byId("test-repository").value.trim(),
      context: contextFromForm(),
      clientRequestId: createClientRequestId(),
      signal: activeController.signal,
      onProgress: updateProgress,
    });
    renderSummary(report);
    updateProgress({ stage: "completed", message: "Report summary ready", percent: 100, status: "completed" });
    setTestState("success", "Smoke test completed");
    await refreshStatus({ silent: true });
  } catch (error) {
    const message = userError(error);
    setTestState(error?.name === "AbortError" ? "idle" : "error", message);
    if (error?.name !== "AbortError") updateProgress({ stage: "failed", message, percent: 100, status: "failed" });
  } finally {
    byId("run-test").disabled = false;
    byId("cancel-test").disabled = true;
    activeController = null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  byId("theme-toggle").setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
}

function initializeTheme() {
  const stored = localStorage.getItem("forkwise-operator-theme");
  const preferred = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(stored || preferred);
}

byId("operator-test-form").addEventListener("submit", runSmokeTest);
byId("cancel-test").addEventListener("click", () => activeController?.abort());
byId("refresh-status").addEventListener("click", () => refreshStatus());
byId("theme-toggle").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem("forkwise-operator-theme", theme);
  applyTheme(theme);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshStatus({ silent: true });
});

initializeTheme();
setText("api-base-url", runner.baseUrl);
refreshStatus();
refreshTimer = setInterval(() => refreshStatus({ silent: true }), 30_000);
window.addEventListener("beforeunload", () => clearInterval(refreshTimer), { once: true });
