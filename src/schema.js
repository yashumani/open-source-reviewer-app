export const ANALYZER_VERSION = "0.3.0";
export const REPORT_SCHEMA_VERSION = "forkwise-report/v1";
export const DECISIONS = Object.freeze(["Adopt", "Pilot", "Fork", "Avoid", "Insufficient evidence"]);
export const DIMENSIONS = Object.freeze(["Fit", "Trust", "Run", "Own", "Exit"]);
export const SEVERITIES = Object.freeze(["critical", "high", "medium", "low", "info"]);
export const FINDING_TYPES = Object.freeze(["strength", "risk", "gap", "unknown"]);
export const CLAIM_STATES = Object.freeze(["verified", "partial", "unverified", "contradicted", "not-claimed"]);

export function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

export function unique(values = []) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

export function safeText(value, fallback = "Unknown") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function normalizeContext(context = {}) {
  const intent = ["self-host", "dependency", "fork", "contribute"].includes(context.intent)
    ? context.intent
    : "self-host";
  const deploymentTarget = ["flexible", "docker", "kubernetes", "managed", "local"].includes(context.deploymentTarget)
    ? context.deploymentTarget
    : "flexible";
  const sensitivity = ["public", "internal", "confidential", "regulated"].includes(context.sensitivity)
    ? context.sensitivity
    : "internal";
  const teamSize = ["small", "medium", "large"].includes(context.teamSize) ? context.teamSize : "small";
  const externalServices = ["allowed", "disclosed", "prohibited"].includes(context.externalServices)
    ? context.externalServices
    : "disclosed";

  return {
    intent,
    useCase: String(context.useCase ?? "").trim().slice(0, 1000),
    deploymentTarget,
    sensitivity,
    teamSize,
    externalServices,
  };
}

const SECRET_PATTERNS = [
  /\b(gh[pousr]_[A-Za-z0-9]{20,255})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{20,255})\b/g,
  /\b(sk-(?:proj-)?[A-Za-z0-9_-]{16,255})\b/g,
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{10,255})\b/g,
  /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
  /((?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?)([^\s"'`]{8,})/gi,
];

function maskSecret(value) {
  const text = String(value);
  if (text.length <= 8) return "[REDACTED]";
  return `${text.slice(0, 4)}…${text.slice(-3)} [REDACTED]`;
}

export function redactSensitiveText(value) {
  let text = String(value ?? "");
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, (...args) => {
      if (pattern.source.startsWith("((?:api")) {
        return `${args[1]}${maskSecret(args[2])}`;
      }
      return maskSecret(args[1] ?? args[0]);
    });
  }
  return text;
}

export function createEvidence({
  id,
  type,
  label,
  detail,
  path = null,
  url = null,
  line = null,
  excerpt = null,
  confidence = "high",
  source = "repository",
}) {
  if (!id || !type || !label) throw new TypeError("Evidence requires id, type, and label.");
  return {
    id: String(id),
    type: String(type),
    label: redactSensitiveText(label),
    detail: redactSensitiveText(detail ?? ""),
    path: path ? String(path) : null,
    url: url ? String(url) : null,
    line: Number.isFinite(line) ? Number(line) : null,
    excerpt: excerpt ? redactSensitiveText(excerpt) : null,
    confidence: ["high", "medium", "low"].includes(confidence) ? confidence : "medium",
    source,
  };
}

export function createFinding({
  id,
  ruleId,
  dimension,
  type,
  severity,
  confidence = "high",
  title,
  summary,
  impact = "",
  recommendation = "",
  evidenceIds = [],
  blocking = false,
  applicability = "all",
}) {
  if (!id || !ruleId || !DIMENSIONS.includes(dimension) || !FINDING_TYPES.includes(type) || !SEVERITIES.includes(severity)) {
    throw new TypeError(`Invalid finding: ${id ?? "unknown"}`);
  }
  return {
    id: String(id),
    ruleId: String(ruleId),
    dimension,
    type,
    severity,
    confidence: ["high", "medium", "low"].includes(confidence) ? confidence : "medium",
    title: redactSensitiveText(title),
    summary: redactSensitiveText(summary),
    impact: redactSensitiveText(impact),
    recommendation: redactSensitiveText(recommendation),
    evidenceIds: unique(evidenceIds.map(String)),
    blocking: Boolean(blocking),
    applicability,
  };
}

export function severityRank(severity) {
  return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[severity] ?? 0;
}

export function validateAssessment(assessment) {
  const errors = [];
  if (!assessment || typeof assessment !== "object") return ["Assessment must be an object."];
  if (assessment.schemaVersion !== REPORT_SCHEMA_VERSION) errors.push("Unexpected schema version.");
  if (!DECISIONS.includes(assessment.decision)) errors.push("Invalid decision.");
  if (!assessment.repository?.fullName) errors.push("Missing repository identity.");
  if (!assessment.repository?.commitSha) errors.push("Missing analyzed commit SHA.");
  if (!Array.isArray(assessment.findings)) errors.push("Findings must be an array.");
  if (!Array.isArray(assessment.evidence)) errors.push("Evidence must be an array.");
  if (!Array.isArray(assessment.claims)) errors.push("Claims must be an array.");
  if (!Array.isArray(assessment.dimensions) || assessment.dimensions.length !== 5) {
    errors.push("Five dimensions are required.");
  }

  const evidenceIds = new Set((assessment.evidence ?? []).map((item) => item.id));
  const duplicateEvidence = (assessment.evidence ?? []).filter((item, index, items) =>
    items.findIndex((candidate) => candidate.id === item.id) !== index,
  );
  if (duplicateEvidence.length) errors.push("Evidence identifiers must be unique.");

  const duplicateFindings = (assessment.findings ?? []).filter((item, index, items) =>
    items.findIndex((candidate) => candidate.id === item.id) !== index,
  );
  if (duplicateFindings.length) errors.push("Finding identifiers must be unique.");

  for (const finding of assessment.findings ?? []) {
    if (!DIMENSIONS.includes(finding.dimension)) errors.push(`Finding ${finding.id} has an invalid dimension.`);
    if (!SEVERITIES.includes(finding.severity)) errors.push(`Finding ${finding.id} has an invalid severity.`);
    for (const evidenceId of finding.evidenceIds ?? []) {
      if (!evidenceIds.has(evidenceId)) errors.push(`Finding ${finding.id} references missing evidence ${evidenceId}.`);
    }
  }

  for (const claim of assessment.claims ?? []) {
    if (!CLAIM_STATES.includes(claim.state)) errors.push(`Claim ${claim.id} has an invalid state.`);
    for (const evidenceId of claim.evidenceIds ?? []) {
      if (!evidenceIds.has(evidenceId)) errors.push(`Claim ${claim.id} references missing evidence ${evidenceId}.`);
    }
  }

  return errors;
}
