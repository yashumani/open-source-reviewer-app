export const OWNER_CALIBRATION_CONTEXTS = Object.freeze([
  Object.freeze({
    id: "self-host",
    label: "Self-host · UI default constraints",
    input: Object.freeze({
      intent: "self-host",
      useCase: "Standardized owner-repository calibration for an internal self-hosted deployment.",
      deploymentTarget: "docker",
      sensitivity: "internal",
      teamSize: "small",
      externalServices: "disclosed",
    }),
  }),
  Object.freeze({
    id: "dependency",
    label: "Dependency",
    input: Object.freeze({
      intent: "dependency",
      useCase: "Standardized owner-repository calibration for use as an application dependency.",
      deploymentTarget: "flexible",
      sensitivity: "internal",
      teamSize: "small",
      externalServices: "disclosed",
    }),
  }),
  Object.freeze({
    id: "fork",
    label: "Fork and customize",
    input: Object.freeze({
      intent: "fork",
      useCase: "Standardized owner-repository calibration for an internally maintained fork.",
      deploymentTarget: "flexible",
      sensitivity: "internal",
      teamSize: "small",
      externalServices: "disclosed",
    }),
  }),
  Object.freeze({
    id: "contribute",
    label: "Contribute",
    input: Object.freeze({
      intent: "contribute",
      useCase: "Standardized owner-repository calibration for making a focused open-source contribution.",
      deploymentTarget: "flexible",
      sensitivity: "public",
      teamSize: "small",
      externalServices: "allowed",
    }),
  }),
]);

function dimensionMap(assessment) {
  return Object.fromEntries(
    (assessment?.dimensions ?? []).map((dimension) => [dimension.name, {
      score: dimension.score,
      status: dimension.status,
    }]),
  );
}

function riskFindings(assessment) {
  return (assessment?.findings ?? []).filter((finding) => finding.type !== "strength");
}

function evidencePathsForFinding(assessment, finding) {
  const evidenceById = new Map((assessment?.evidence ?? []).map((item) => [item.id, item]));
  return (finding?.evidenceIds ?? [])
    .map((id) => evidenceById.get(id)?.path)
    .filter(Boolean);
}

export function summarizeAssessment(assessment) {
  if (!assessment || typeof assessment !== "object") {
    throw new TypeError("An assessment object is required.");
  }

  const risks = riskFindings(assessment);
  const critical = risks.filter((finding) => finding.severity === "critical");
  const high = risks.filter((finding) => finding.severity === "high");
  const blockers = risks.filter((finding) => finding.blocking);

  return {
    decision: assessment.decision,
    confidence: assessment.decisionConfidence,
    evidenceCoverage: assessment.evidenceCoverage,
    blockerCount: assessment.blockerCount,
    ownershipBurden: assessment.ownershipBurden,
    ownershipScore: assessment.ownershipScore,
    adoptionEffort: assessment.adoptionEffort,
    adoptionEffortScore: assessment.adoptionEffortScore,
    dimensions: dimensionMap(assessment),
    findingCount: assessment.findings?.length ?? 0,
    evidenceCount: assessment.evidence?.length ?? 0,
    claimCount: assessment.claims?.length ?? 0,
    criticalRiskCount: critical.length,
    highRiskCount: high.length,
    topRisks: risks
      .slice()
      .sort((a, b) => Number(b.blocking) - Number(a.blocking)
        || ({ critical: 5, high: 4, medium: 3, low: 2, info: 1 }[b.severity] ?? 0)
          - ({ critical: 5, high: 4, medium: 3, low: 2, info: 1 }[a.severity] ?? 0)
        || String(a.id).localeCompare(String(b.id)))
      .slice(0, 5)
      .map((finding) => ({
        id: finding.id,
        ruleId: finding.ruleId,
        title: finding.title,
        severity: finding.severity,
        dimension: finding.dimension,
        blocking: Boolean(finding.blocking),
        evidencePaths: evidencePathsForFinding(assessment, finding),
      })),
  };
}

export function detectCalibrationSignals(reportsByContext) {
  const reports = Object.values(reportsByContext ?? {}).filter(Boolean);
  if (!reports.length) return [];

  const signals = [];
  const defaultReport = reportsByContext?.["self-host"] ?? reports[0];
  const decisions = reports.map((report) => report.decision);
  const uniqueDecisions = new Set(decisions);
  const defaultRisks = riskFindings(defaultReport);
  const defaultCritical = defaultRisks.filter((finding) => finding.severity === "critical");
  const defaultBlockers = defaultRisks.filter((finding) => finding.blocking);
  const fit = defaultReport.dimensions?.find((dimension) => dimension.name === "Fit")?.score ?? null;

  if (defaultReport.decision === "Avoid" && defaultCritical.length === 0 && !defaultReport.repository?.disabled) {
    signals.push({
      id: "avoid-without-critical-driver",
      severity: "error",
      message: "The default review returned Avoid without a critical finding or disabled repository state.",
    });
  }

  if (
    defaultReport.decision === "Avoid"
    && defaultCritical.length > 0
    && defaultCritical.every((finding) => finding.ruleId === "license-missing")
  ) {
    signals.push({
      id: "license-only-avoid",
      severity: "review",
      message: "The default Avoid decision is driven only by the missing-license rule.",
    });
  }

  if (defaultReport.decision === "Avoid" && Number.isFinite(fit) && fit >= 80) {
    signals.push({
      id: "high-fit-avoid",
      severity: "review",
      message: `The default review returned Avoid while Fit remained ${fit}.`,
    });
  }

  const criticalFixtureFindings = defaultCritical.filter((finding) => {
    const paths = evidencePathsForFinding(defaultReport, finding);
    return paths.length > 0 && paths.every((path) => /(^|\/)(tests?|fixtures?|examples?)(\/|$)/i.test(path));
  });
  if (criticalFixtureFindings.length) {
    signals.push({
      id: "critical-test-fixture-evidence",
      severity: "error",
      message: "A critical default finding is supported only by test, fixture, or example paths.",
    });
  }

  if ((defaultReport.evidenceCoverage ?? 0) < 55) {
    signals.push({
      id: "low-evidence-coverage",
      severity: "review",
      message: `The default review used only ${defaultReport.evidenceCoverage ?? 0}% evidence coverage.`,
    });
  }

  if (reports.length > 1 && uniqueDecisions.size === 1) {
    signals.push({
      id: "decision-context-invariant",
      severity: "info",
      message: `All ${reports.length} intent profiles produced ${decisions[0]}.`,
    });
  }

  if (reports.length > 1 && decisions.every((decision) => decision === "Avoid")) {
    signals.push({
      id: "all-intents-avoid",
      severity: "review",
      message: "Every intent profile produced Avoid; inspect whether a repository-wide critical rule is calibrated correctly.",
    });
  }

  if (defaultReport.decision === "Avoid" && defaultBlockers.length === 1 && defaultBlockers[0].severity !== "critical") {
    signals.push({
      id: "noncritical-single-blocker-avoid",
      severity: "error",
      message: "A single noncritical blocker appears to have produced Avoid.",
    });
  }

  return signals;
}

export function summarizeCalibrationRun(records, contexts = OWNER_CALIBRATION_CONTEXTS) {
  const contextIds = contexts.map((context) => context.id);
  const decisionCounts = Object.fromEntries(contextIds.map((id) => [id, {}]));
  const signalCounts = {};
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records ?? []) {
    if (record.status === "completed") {
      completed += 1;
      for (const contextId of contextIds) {
        const decision = record.summaries?.[contextId]?.decision;
        if (!decision) continue;
        decisionCounts[contextId][decision] = (decisionCounts[contextId][decision] ?? 0) + 1;
      }
      for (const signal of record.signals ?? []) {
        signalCounts[signal.id] = (signalCounts[signal.id] ?? 0) + 1;
      }
    } else if (record.status === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return {
    discovered: records?.length ?? 0,
    completed,
    skipped,
    failed,
    decisionCounts,
    signalCounts,
  };
}
