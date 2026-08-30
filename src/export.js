import { REPORT_SCHEMA_VERSION, redactSensitiveText, validateAssessment } from "./schema.js";

export function safeFileName(value, extension = "json") {
  const base = String(value ?? "repository-review")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "repository-review";
  const ext = String(extension).replace(/[^a-z0-9]/gi, "").toLowerCase() || "txt";
  return `${base}.${ext}`;
}

function cleanAssessment(assessment) {
  const errors = validateAssessment(assessment);
  if (errors.length) throw new TypeError(`Cannot export an invalid assessment: ${errors.join(" ")}`);
  const serialized = JSON.stringify(assessment);
  return JSON.parse(redactSensitiveText(serialized));
}

export function createJsonExport(assessment) {
  const clean = cleanAssessment(assessment);
  return JSON.stringify({
    exportVersion: "forkwise-export/v1",
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    assessment: clean,
  }, null, 2);
}

function markdownList(items, fallback = "None observed.") {
  if (!items?.length) return `- ${fallback}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function evidenceLabels(assessment, evidenceIds = []) {
  const lookup = new Map(assessment.evidence.map((item) => [item.id, item]));
  return evidenceIds.map((id) => lookup.get(id)).filter(Boolean);
}

export function createMarkdownExport(assessment) {
  const clean = cleanAssessment(assessment);
  const repository = clean.repository;
  const lines = [
    `# Open Source Adoption Review — ${repository.fullName}`,
    "",
    `> **Decision: ${clean.decision}**  `,
    `> Confidence: ${clean.decisionConfidence} · Evidence coverage: ${clean.evidenceCoverage}% · Commit: \`${repository.commitSha}\``,
    "",
    "## Executive recommendation",
    "",
    clean.summary,
    "",
    `**Next action:** ${clean.nextAction}`,
    "",
    "## Intended use",
    "",
    `- Intent: ${clean.context.intent}`,
    `- Use case: ${clean.context.useCase || "Not provided"}`,
    `- Deployment target: ${clean.context.deploymentTarget}`,
    `- Data sensitivity: ${clean.context.sensitivity}`,
    `- Team size: ${clean.context.teamSize}`,
    `- External services policy: ${clean.context.externalServices}`,
    "",
    "## Repository provenance",
    "",
    `- Repository: ${repository.url}`,
    `- Default branch: ${repository.defaultBranch}`,
    `- Analyzed commit: ${repository.commitUrl}`,
    `- Analyzer version: ${clean.analyzerVersion}`,
    `- Generated: ${clean.generatedAt}`,
    "",
    "## Decision signals",
    "",
    ...clean.decisionReasons.map((reason) => `- **${reason.title}** — ${reason.type}; ${reason.severity}`),
    "",
    "## Adoption dimensions",
    "",
    "| Dimension | Status | Score | Summary |",
    "| --- | --- | ---: | --- |",
    ...clean.dimensions.map((dimension) => `| ${dimension.name} | ${dimension.status} | ${dimension.score}/100 | ${dimension.summary.replace(/\|/g, "\\|")} |`),
    "",
    "## README Reality Check",
    "",
    "| Claim | Detected | Result | Explanation |",
    "| --- | --- | --- | --- |",
    ...clean.claims.map((claim) => `| ${claim.title} | ${claim.claimed ? "Yes" : "No"} | ${claim.state} | ${claim.explanation.replace(/\|/g, "\\|")} |`),
    "",
    "## Blocking risks",
    "",
    markdownList(clean.findings.filter((finding) => finding.blocking).map((finding) => `**${finding.title}:** ${finding.summary}`), "No blocking findings were generated."),
    "",
    "## Unresolved questions",
    "",
    markdownList(clean.unresolvedQuestions),
    "",
    "## Operational inventory",
    "",
    `- Runtimes/frameworks: ${clean.operations.runtimes.join(", ") || "Not identified"}`,
    `- Data services: ${clean.operations.databases.join(", ") || "Not identified"}`,
    `- Deployment: ${clean.operations.deployment.join(", ") || "Not identified"}`,
    `- External-service indicators: ${clean.operations.externalServices.map((item) => item.name).join(", ") || "None found in inspected text"}`,
    `- Environment variables observed: ${clean.operations.environmentVariables.join(", ") || "None identified"}`,
    `- Ports observed: ${clean.operations.ports.join(", ") || "None identified"}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of clean.findings) {
    lines.push(`### ${finding.id} — ${finding.title}`);
    lines.push("");
    lines.push(`**${finding.dimension} · ${finding.type} · ${finding.severity} · confidence ${finding.confidence}${finding.blocking ? " · BLOCKING" : ""}**`);
    lines.push("");
    lines.push(finding.summary);
    if (finding.impact) lines.push("", `**Impact:** ${finding.impact}`);
    if (finding.recommendation) lines.push("", `**Recommendation:** ${finding.recommendation}`);
    const refs = evidenceLabels(clean, finding.evidenceIds);
    if (refs.length) {
      lines.push("", "**Evidence:**");
      for (const item of refs) {
        const target = item.url ? `[${item.label}](${item.url})` : item.label;
        lines.push(`- ${target}${item.path ? ` — \`${item.path}\`` : ""}: ${item.detail}`);
      }
    }
    lines.push("");
  }

  lines.push("## Pilot checklist", "", ...clean.pilotChecklist.map((item) => `- [ ] ${item}`), "");
  lines.push("## Limitations", "", ...clean.limitations.map((item) => `- ${item}`), "");
  lines.push("---", "", "Generated by ForkWise Open Source Reviewer. This static review is decision support, not a security certification or legal opinion.");
  return lines.join("\n");
}

export function downloadText(content, fileName, mimeType = "text/plain;charset=utf-8") {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof Blob === "undefined") {
    throw new Error("Browser download APIs are unavailable.");
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
