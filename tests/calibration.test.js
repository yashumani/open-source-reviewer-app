import test from "node:test";
import assert from "node:assert/strict";

import {
  OWNER_CALIBRATION_CONTEXTS,
  detectCalibrationSignals,
  summarizeAssessment,
  summarizeCalibrationRun,
} from "../src/calibration.js";

function assessment({
  decision = "Pilot",
  coverage = 80,
  fit = 75,
  findings = [],
  evidence = [],
} = {}) {
  return {
    decision,
    decisionConfidence: coverage >= 80 ? "High" : coverage >= 55 ? "Medium" : "Low",
    evidenceCoverage: coverage,
    blockerCount: findings.filter((finding) => finding.blocking).length,
    ownershipBurden: "Medium",
    ownershipScore: 50,
    adoptionEffort: "Medium",
    adoptionEffortScore: 45,
    repository: { fullName: "owner/repo", disabled: false },
    dimensions: [
      { name: "Fit", score: fit, status: "Watch" },
      { name: "Trust", score: 60, status: "Watch" },
      { name: "Run", score: 61, status: "Watch" },
      { name: "Own", score: 62, status: "Watch" },
      { name: "Exit", score: 63, status: "Watch" },
    ],
    findings,
    evidence,
    claims: [],
  };
}

function finding({
  id = "FN-001",
  ruleId = "example",
  severity = "medium",
  blocking = false,
  evidenceIds = [],
} = {}) {
  return {
    id,
    ruleId,
    title: ruleId,
    summary: ruleId,
    severity,
    dimension: "Trust",
    type: "risk",
    blocking,
    evidenceIds,
  };
}

test("summarizeAssessment preserves decision metrics and dimension scores", () => {
  const result = summarizeAssessment(assessment({
    findings: [finding({ severity: "high", blocking: true })],
  }));

  assert.equal(result.decision, "Pilot");
  assert.equal(result.blockerCount, 1);
  assert.equal(result.highRiskCount, 1);
  assert.equal(result.dimensions.Fit.score, 75);
  assert.equal(result.topRisks[0].ruleId, "example");
});

test("license-only Avoid is raised as a calibration review signal", () => {
  const report = assessment({
    decision: "Avoid",
    fit: 86,
    findings: [finding({ ruleId: "license-missing", severity: "critical", blocking: true })],
  });
  const signals = detectCalibrationSignals({
    "self-host": report,
    dependency: report,
    fork: report,
    contribute: report,
  });

  assert.ok(signals.some((signal) => signal.id === "license-only-avoid"));
  assert.ok(signals.some((signal) => signal.id === "high-fit-avoid"));
  assert.ok(signals.some((signal) => signal.id === "all-intents-avoid"));
});

test("Avoid without a critical driver is a hard calibration signal", () => {
  const report = assessment({
    decision: "Avoid",
    findings: [finding({ severity: "high", blocking: true })],
  });
  const signals = detectCalibrationSignals({ "self-host": report });
  assert.equal(signals.find((signal) => signal.id === "avoid-without-critical-driver")?.severity, "error");
});

test("critical findings backed only by fixtures are flagged", () => {
  const report = assessment({
    decision: "Avoid",
    findings: [finding({
      ruleId: "secret-detected",
      severity: "critical",
      blocking: true,
      evidenceIds: ["EV-001"],
    })],
    evidence: [{ id: "EV-001", path: "tests/fixtures/example.env" }],
  });
  const signals = detectCalibrationSignals({ "self-host": report });
  assert.equal(signals.find((signal) => signal.id === "critical-test-fixture-evidence")?.severity, "error");
});

test("summarizeCalibrationRun counts outcomes by context", () => {
  const summaries = Object.fromEntries(
    OWNER_CALIBRATION_CONTEXTS.map((context) => [context.id, { decision: context.id === "fork" ? "Fork" : "Pilot" }]),
  );
  const result = summarizeCalibrationRun([
    { status: "completed", summaries, signals: [{ id: "example" }] },
    { status: "skipped" },
    { status: "failed" },
  ]);

  assert.equal(result.discovered, 3);
  assert.equal(result.completed, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.decisionCounts["self-host"].Pilot, 1);
  assert.equal(result.decisionCounts.fork.Fork, 1);
  assert.equal(result.signalCounts.example, 1);
});
