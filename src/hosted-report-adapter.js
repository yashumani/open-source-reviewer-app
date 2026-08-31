const DIMENSION_ORDER = ["Fit", "Trust", "Run", "Own", "Exit"];
const CLAIM_STATES = new Set(["verified", "partial", "unverified", "contradicted", "not-claimed"]);
const FINDING_TYPES = new Set(["strength", "risk", "gap", "unknown"]);
const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function percent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

function titleCase(value) {
  return text(value, "Unknown")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dimensionName(value) {
  const normalized = text(value).toLowerCase();
  const match = DIMENSION_ORDER.find((item) => item.toLowerCase() === normalized);
  return match || titleCase(value);
}

function dimensionStatus(score, explicit) {
  if (explicit) return titleCase(explicit);
  if (score >= 75) return "Strong";
  if (score >= 50) return "Adequate";
  if (score > 0) return "Weak";
  return "Unknown";
}

function claimState(claim) {
  const explicit = text(claim.state).toLowerCase();
  if (CLAIM_STATES.has(explicit)) return explicit;
  const verdict = text(claim.verdict).toLowerCase();
  return {
    supported: "verified",
    verified: "verified",
    "partially-supported": "partial",
    partial: "partial",
    contradicted: "contradicted",
    unsupported: "unverified",
    unverifiable: "unverified",
    unverified: "unverified",
    "not-claimed": "not-claimed",
  }[verdict] || "unverified";
}

function normalizeContext(source = {}) {
  return {
    intent: ["self-host", "dependency", "fork", "contribute"].includes(source.intent) ? source.intent : "self-host",
    useCase: text(source.useCase).slice(0, 1000),
    deploymentTarget: ["flexible", "docker", "kubernetes", "managed", "local"].includes(source.deploymentTarget)
      ? source.deploymentTarget
      : "flexible",
    sensitivity: ["public", "internal", "confidential", "regulated"].includes(source.sensitivity)
      ? source.sensitivity
      : "internal",
    teamSize: ["small", "medium", "large"].includes(source.teamSize) ? source.teamSize : "small",
    externalServices: ["allowed", "disclosed", "prohibited"].includes(source.externalServices)
      ? source.externalServices
      : "disclosed",
  };
}

function normalizeEvidence(source) {
  const seen = new Set();
  return array(source).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const id = text(item.id, `ev-${String(index + 1).padStart(3, "0")}`);
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      type: text(item.type, "repository"),
      label: text(item.label || item.path || item.summary, `Evidence ${index + 1}`),
      detail: text(item.detail || item.summary, "Repository evidence."),
      path: item.path == null ? null : text(item.path),
      url: item.url == null ? null : text(item.url),
      line: Number.isFinite(Number(item.line)) ? Number(item.line) : null,
      excerpt: item.excerpt == null ? null : text(item.excerpt),
      confidence: ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "high",
      source: text(item.source, "repository"),
    }];
  });
}

function normalizeFindings(source, evidenceIds) {
  const seen = new Set();
  return array(source).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    let id = text(item.id, `finding-${String(index + 1).padStart(3, "0")}`);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const severity = SEVERITIES.has(item.severity) ? item.severity : "medium";
    const explicitType = text(item.type).toLowerCase();
    const type = FINDING_TYPES.has(explicitType)
      ? explicitType
      : (severity === "info" ? "strength" : "risk");
    return [{
      id,
      ruleId: text(item.ruleId, `hosted-${id}`),
      dimension: dimensionName(item.dimension || "Trust"),
      type,
      severity,
      confidence: ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "medium",
      title: text(item.title, "Hosted analyzer finding"),
      summary: text(item.summary || item.detail, "No additional summary was supplied."),
      impact: text(item.impact),
      recommendation: text(item.recommendation),
      evidenceIds: [...new Set(array(item.evidenceIds).map(String).filter((idValue) => evidenceIds.has(idValue)))],
      blocking: Boolean(item.blocking || severity === "critical"),
      applicability: text(item.applicability, "all"),
    }];
  });
}

function addExplicitBlockers(findings, blockers) {
  const known = new Set(findings.filter((item) => item.blocking).map((item) => item.title.toLowerCase()));
  const next = [...findings];
  for (const [index, blocker] of array(blockers).entries()) {
    const title = text(blocker);
    if (!title || known.has(title.toLowerCase())) continue;
    next.push({
      id: `hosted-blocker-${index + 1}`,
      ruleId: `hosted-explicit-blocker-${index + 1}`,
      dimension: "Fit",
      type: "risk",
      severity: "high",
      confidence: "high",
      title,
      summary: title,
      impact: "The hosted decision engine identified this as an adoption blocker.",
      recommendation: "Resolve this blocker before adopting the repository.",
      evidenceIds: [],
      blocking: true,
      applicability: "all",
    });
  }
  return next;
}

function normalizeDimensions(source, findings) {
  const byName = new Map(array(source).map((item) => [dimensionName(item.id || item.name || item.label), item]));
  return DIMENSION_ORDER.map((name) => {
    const item = byName.get(name) || {};
    const score = percent(item.score);
    return {
      name,
      score,
      status: dimensionStatus(score, item.status || item.rating),
      summary: text(item.summary, `No ${name} summary was supplied by the hosted analyzer.`),
      findingIds: array(item.findingIds).map(String).filter((id) => findings.some((finding) => finding.id === id)),
    };
  });
}

function normalizeClaims(source, evidenceIds) {
  const seen = new Set();
  return array(source).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    let id = text(item.id, `claim-${index + 1}`);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return [{
      id,
      title: text(item.title || item.claim, `Claim ${index + 1}`),
      claimed: Boolean(item.claimed),
      state: claimState(item),
      explanation: text(item.explanation || item.rationale, "The hosted analyzer did not supply additional claim rationale."),
      evidenceIds: [...new Set(array(item.evidenceIds).map(String).filter((idValue) => evidenceIds.has(idValue)))],
    }];
  });
}

function normalizeTechnologies(source) {
  const seen = new Set();
  return array(source).flatMap((item) => {
    const name = text(typeof item === "string" ? item : item?.name);
    if (!name || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    return [{
      name,
      category: text(typeof item === "object" ? item.category : "technology", "technology"),
      confidence: text(typeof item === "object" ? item.confidence : "medium", "medium"),
      evidenceIds: array(typeof item === "object" ? item.evidenceIds : []).map(String),
    }];
  });
}

function normalizeOperations(source = {}, technologies = [], inventory = {}) {
  const runtimes = technologies
    .filter((item) => ["runtime", "framework", "frontend", "backend", "primary-language"].includes(item.category))
    .map((item) => item.name);
  const databases = technologies
    .filter((item) => ["datastore", "database", "storage"].includes(item.category))
    .map((item) => item.name);
  const externalText = text(source.externalServices);
  const externalServices = Array.isArray(source.externalServices)
    ? source.externalServices.map((item) => typeof item === "string" ? { name: item, kind: "static indicator" } : item)
    : (/^no\b/i.test(externalText) || !externalText ? [] : [{ name: externalText, kind: "static indicator" }]);
  const deployment = array(source.deployment).length
    ? array(source.deployment).map(String)
    : [text(source.deployment, "Not identified in inspected evidence")];

  return {
    runtimes: [...new Set(runtimes)],
    databases: [...new Set(databases)],
    deployment,
    externalServices,
    environmentVariables: array(source.environmentVariables || inventory.environmentVariables).map(String),
    ports: array(source.ports || inventory.ports).map(String),
    upgrades: text(source.upgrades),
    backupsAndExport: text(source.backupsAndExport),
    observability: text(source.observability),
    secretsHandling: text(source.secretsHandling),
  };
}

function decisionReasons(findings, decision) {
  const ordered = [...findings].sort((a, b) => {
    const blocking = Number(b.blocking) - Number(a.blocking);
    if (blocking) return blocking;
    const rank = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    return (rank[b.severity] || 0) - (rank[a.severity] || 0);
  });
  const reasons = ordered.slice(0, 5).map((item) => ({
    title: item.title,
    type: item.type,
    severity: item.severity,
  }));
  if (!reasons.length) reasons.push({ title: `${decision} recommendation`, type: "unknown", severity: "info" });
  return reasons;
}

export function adaptHostedReport(report = {}) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new TypeError("Hosted report must be an object.");
  }
  if (report.schemaVersion !== "forkwise-report/v1") {
    throw new TypeError(`Unsupported hosted report schema: ${text(report.schemaVersion, "missing")}`);
  }
  if (report.execution !== "static-only") {
    throw new TypeError("Hosted report does not preserve the static-only execution boundary.");
  }

  const repository = report.repository && typeof report.repository === "object" ? report.repository : {};
  const owner = text(repository.owner);
  const name = text(repository.name);
  const fullName = text(repository.fullName, [owner, name].filter(Boolean).join("/") || text(repository.url, "Unknown repository"));
  const commitSha = text(repository.commitSha || report.commitSha);
  if (!/^[0-9a-f]{40}$/i.test(commitSha)) throw new TypeError("Hosted report is missing an exact 40-character commit SHA.");

  const evidence = normalizeEvidence(report.evidence);
  const evidenceIds = new Set(evidence.map((item) => item.id));
  let findings = normalizeFindings(report.findings, evidenceIds);
  findings = addExplicitBlockers(findings, report.blockers);
  const dimensions = normalizeDimensions(report.dimensions, findings);
  const claims = normalizeClaims(report.claims, evidenceIds);
  const technologies = normalizeTechnologies(report.technologies);
  const inventorySource = report.inventory && typeof report.inventory === "object" ? report.inventory : {};
  const operations = normalizeOperations(report.operations, technologies, inventorySource);
  const decision = ["Adopt", "Pilot", "Fork", "Avoid", "Insufficient evidence"].includes(report.decision)
    ? report.decision
    : "Insufficient evidence";
  const blockingFindings = findings.filter((item) => item.blocking);
  const confidence = ["high", "medium", "low"].includes(report.decisionConfidence || report.confidence)
    ? (report.decisionConfidence || report.confidence)
    : "low";

  return {
    schemaVersion: "forkwise-report/v1",
    analyzerVersion: text(report.analyzerVersion, "unknown"),
    generatedAt: text(report.generatedAt, new Date(0).toISOString()),
    context: normalizeContext(report.context),
    repository: {
      owner,
      name,
      fullName,
      description: text(repository.description, "No repository description was supplied."),
      url: text(repository.url),
      defaultBranch: text(repository.defaultBranch, "Unknown"),
      commitSha,
      commitUrl: text(repository.commitUrl, `${text(repository.url).replace(/\/$/, "")}/commit/${commitSha}`),
      license: text(repository.license, "Unknown"),
      primaryLanguage: text(repository.primaryLanguage || repository.language, "Unknown"),
      stars: Math.max(0, Number(repository.stars) || 0),
      forks: Math.max(0, Number(repository.forks) || 0),
      openIssues: Math.max(0, Number(repository.openIssues) || 0),
      pushedAt: repository.lastPushedAt || repository.pushedAt || null,
    },
    decision,
    decisionConfidence: confidence,
    evidenceCoverage: percent(report.evidenceCoverage),
    blockerCount: Number.isFinite(Number(report.blockerCount))
      ? Math.max(0, Number(report.blockerCount))
      : Math.max(array(report.blockers).length, blockingFindings.length),
    ownershipBurden: titleCase(report.ownershipBurden || report.ownershipEffort || "Unknown"),
    adoptionEffort: titleCase(report.adoptionEffort || "Unknown"),
    summary: text(report.summary, `${decision} is recommended based on the hosted deterministic evidence and the supplied adoption context.`),
    nextAction: text(report.nextAction, "Review the blockers, evidence, and pilot checklist before making an adoption decision."),
    decisionReasons: decisionReasons(findings, decision),
    dimensions,
    findings,
    evidence,
    claims,
    operations,
    technologies,
    unresolvedQuestions: array(report.unresolvedQuestions).map(String),
    pilotChecklist: array(report.pilotChecklist).map(String),
    limitations: [
      ...array(report.limitations).map(String),
      "This view was adapted from the hosted forkwise-report/v1 contract without changing repository facts.",
    ],
    inventory: {
      ...inventorySource,
      totalFiles: Math.max(0, Number(inventorySource.totalFiles ?? inventorySource.treeEntries) || 0),
      selectedFiles: Math.max(0, Number(inventorySource.selectedFiles ?? inventorySource.filesInspected) || 0),
      treeTruncated: Boolean(inventorySource.treeTruncated),
    },
  };
}
