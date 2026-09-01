import {
  ANALYZER_VERSION,
  REPORT_SCHEMA_VERSION,
  clamp,
  createEvidence,
  createFinding,
  normalizeContext,
  redactSensitiveText,
  severityRank,
  unique,
  validateAssessment,
} from "./schema.js";
import { buildArtifactInventory, countExtensions, inventorySummary } from "./inventory.js";
import { scanCredentialCandidates } from "./secret-scanner.js";

const DAY = 86_400_000;
const MAX_EXCERPT = 240;

const EXTERNAL_SERVICES = [
  { id: "sentry", label: "Sentry", kind: "telemetry", pattern: /\b(sentry|sentry\.io|@sentry\/|SENTRY_DSN)\b/i },
  { id: "posthog", label: "PostHog", kind: "telemetry", pattern: /\b(posthog|POSTHOG_KEY|POSTHOG_HOST)\b/i },
  { id: "segment", label: "Segment", kind: "telemetry", pattern: /\b(segment\.com|analytics-node|@segment\/|SEGMENT_WRITE_KEY)\b/i },
  { id: "google-analytics", label: "Google Analytics", kind: "telemetry", pattern: /\b(google analytics|gtag\(|G-[A-Z0-9]{6,}|GOOGLE_ANALYTICS)\b/i },
  { id: "datadog", label: "Datadog", kind: "observability", pattern: /\b(datadog|DD_API_KEY|dd-trace)\b/i },
  { id: "newrelic", label: "New Relic", kind: "observability", pattern: /\b(newrelic|NEW_RELIC_LICENSE_KEY)\b/i },
  { id: "stripe", label: "Stripe", kind: "payments", pattern: /\b(stripe|STRIPE_SECRET_KEY|STRIPE_PUBLISHABLE_KEY)\b/i },
  { id: "openai", label: "OpenAI", kind: "AI API", pattern: /\b(openai|OPENAI_API_KEY|api\.openai\.com)\b/i },
  { id: "anthropic", label: "Anthropic", kind: "AI API", pattern: /\b(anthropic|ANTHROPIC_API_KEY|api\.anthropic\.com)\b/i },
  { id: "firebase", label: "Firebase", kind: "hosted backend", pattern: /\b(firebase|FIREBASE_[A-Z_]+)\b/i },
  { id: "supabase", label: "Supabase", kind: "hosted backend", pattern: /\b(supabase|SUPABASE_URL|SUPABASE_ANON_KEY)\b/i },
  { id: "aws", label: "Amazon Web Services", kind: "cloud", pattern: /\b(AWS_[A-Z_]+|amazonaws\.com|@aws-sdk\/)\b/i },
  { id: "gcp", label: "Google Cloud", kind: "cloud", pattern: /\b(GOOGLE_CLOUD_PROJECT|google-cloud|googleapis\.com)\b/i },
  { id: "azure", label: "Microsoft Azure", kind: "cloud", pattern: /\b(AZURE_[A-Z_]+|azurewebsites\.net|@azure\/)\b/i },
];

const TECHNOLOGIES = [
  { name: "JavaScript / Node.js", category: "runtime", path: /(^|\/)(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i, content: /\b(node|npm|pnpm|yarn)\b/i },
  { name: "TypeScript", category: "language", path: /(^|\/)tsconfig\.json$|\.tsx?$/i, content: /\btypescript\b/i },
  { name: "React", category: "framework", path: /\.(jsx|tsx)$/i, content: /["']react["']|\breact-dom\b/i },
  { name: "Next.js", category: "framework", path: /(^|\/)next\.config\./i, content: /["']next["']/i },
  { name: "Vue", category: "framework", path: /\.vue$/i, content: /["']vue["']/i },
  { name: "Python", category: "runtime", path: /(^|\/)(pyproject\.toml|requirements[^/]*\.txt|poetry\.lock)$|\.py$/i, content: /\bpython\b/i },
  { name: "FastAPI", category: "framework", path: /\.py$/i, content: /\bfastapi\b/i },
  { name: "Django", category: "framework", path: /\.py$/i, content: /\bdjango\b/i },
  { name: "Go", category: "runtime", path: /(^|\/)go\.mod$|\.go$/i, content: /\bmodule\s+[^\s]+/i },
  { name: "Rust", category: "runtime", path: /(^|\/)cargo\.toml$|\.rs$/i, content: /\[package\]/i },
  { name: "Java / JVM", category: "runtime", path: /(^|\/)(pom\.xml|build\.gradle(?:\.kts)?)$|\.java$/i, content: /\b(spring-boot|maven|gradle)\b/i },
  { name: "PostgreSQL", category: "database", path: /(^|\/)schema\.prisma$/i, content: /\b(postgres|postgresql|DATABASE_URL)\b/i },
  { name: "MySQL", category: "database", path: /(^|\/)schema\.prisma$/i, content: /\b(mysql|MARIADB_)\b/i },
  { name: "MongoDB", category: "database", path: /(^|\/)package\.json$/i, content: /\b(mongodb|mongoose|MONGO_URI)\b/i },
  { name: "Redis", category: "data service", path: /(^|\/)(compose|docker-compose)[^/]*\.ya?ml$/i, content: /\b(redis|REDIS_URL)\b/i },
  { name: "Docker", category: "deployment", path: /(^|\/)dockerfile|(^|\/)(docker-)?compose/i, content: /\bdocker\b/i },
  { name: "Kubernetes", category: "deployment", path: /(^|\/)(k8s|kubernetes|charts?)\//i, content: /\b(apiVersion:|kind:\s*(Deployment|StatefulSet|Service))\b/i },
];

function excerptAround(content, pattern) {
  const text = String(content ?? "");
  const match = text.match(pattern);
  if (!match || match.index === undefined) return null;
  const start = Math.max(0, match.index - 80);
  const end = Math.min(text.length, match.index + match[0].length + 120);
  return redactSensitiveText(text.slice(start, end).replace(/\s+/g, " ").trim()).slice(0, MAX_EXCERPT);
}

function contentCorpus(snapshot) {
  return (snapshot.contents ?? []).map((item) => ({
    path: item.path,
    content: String(item.content ?? ""),
    url: item.url ?? null,
  }));
}

function readableAge(dateValue, now = Date.now()) {
  const time = Date.parse(dateValue ?? "");
  if (!Number.isFinite(time)) return "unknown";
  const days = Math.max(0, Math.round((now - time) / DAY));
  if (days < 2) return "within the last day";
  if (days < 60) return `${days} days ago`;
  const months = Math.round(days / 30.4);
  if (months < 24) return `${months} months ago`;
  return `${Math.round(months / 12)} years ago`;
}

function classifyAge(dateValue, now = Date.now()) {
  const time = Date.parse(dateValue ?? "");
  if (!Number.isFinite(time)) return "unknown";
  const days = (now - time) / DAY;
  if (days <= 120) return "recent";
  if (days <= 365) return "aging";
  if (days <= 730) return "stale";
  return "inactive";
}

function findingPenalty(finding) {
  const base = { critical: 35, high: 22, medium: 11, low: 5, info: 1 }[finding.severity] ?? 0;
  if (finding.type === "strength") return -Math.min(7, Math.max(2, base / 3));
  if (finding.type === "unknown") return Math.max(3, base / 2);
  return base;
}

function dimensionStatus(score, coverage) {
  if (coverage < 35) return "Insufficient evidence";
  if (score >= 80) return "Strong";
  if (score >= 62) return "Watch";
  return "High risk";
}

function ownershipLabel(score) {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function effortLabel(score) {
  if (score >= 75) return "High";
  if (score >= 42) return "Medium";
  return "Low";
}

function compactPathList(paths, limit = 3) {
  if (!paths?.length) return "None observed";
  const shown = paths.slice(0, limit).join(", ");
  return paths.length > limit ? `${shown} (+${paths.length - limit} more)` : shown;
}

export function analyzeRepository(snapshot, rawContext = {}) {
  if (!snapshot?.repo || !snapshot?.commit?.sha) throw new TypeError("A repository snapshot pinned to a commit is required.");

  const context = normalizeContext(rawContext);
  const inventory = buildArtifactInventory(snapshot);
  const corpus = contentCorpus(snapshot);
  const allText = corpus.map((item) => `\n--- ${item.path} ---\n${item.content}`).join("\n");
  const readmeText = String(snapshot.readme ?? corpus.find((item) => /(^|\/)readme/i.test(item.path))?.content ?? "");
  const evidence = [];
  const findings = [];
  const claims = [];
  const evidenceByKey = new Map();
  let evidenceCounter = 0;
  let findingCounter = 0;

  const addEvidence = (key, data) => {
    if (evidenceByKey.has(key)) return evidenceByKey.get(key);
    const id = `EV-${String(++evidenceCounter).padStart(3, "0")}`;
    const item = createEvidence({ id, ...data });
    evidence.push(item);
    evidenceByKey.set(key, id);
    return id;
  };

  const fileEvidence = (path, label, detail, excerpt = null) => {
    const item = corpus.find((candidate) => candidate.path === path);
    return addEvidence(`file:${path}:${label}`, {
      type: "file",
      label,
      detail,
      path,
      url: item?.url ?? `${snapshot.repo.html_url}/blob/${snapshot.commit.sha}/${path.split("/").map(encodeURIComponent).join("/")}`,
      excerpt,
      confidence: item ? "high" : "medium",
    });
  };

  const metadataEvidence = addEvidence("metadata", {
    type: "metadata",
    label: "GitHub repository metadata",
    detail: `${snapshot.repo.full_name}; default branch ${snapshot.repo.default_branch}; visibility ${snapshot.repo.visibility ?? "public"}.`,
    url: snapshot.repo.html_url,
  });
  const commitEvidence = addEvidence("commit", {
    type: "commit",
    label: `Analyzed commit ${snapshot.commit.sha.slice(0, 12)}`,
    detail: `The report is pinned to the default-branch commit from ${snapshot.commit.committed_at ?? "an unknown date"}.`,
    url: snapshot.commit.html_url ?? `${snapshot.repo.html_url}/commit/${snapshot.commit.sha}`,
  });
  const treeEvidence = addEvidence("tree", {
    type: "inventory",
    label: `${inventory.totalFiles.toLocaleString()} repository files inventoried`,
    detail: snapshot.treeTruncated
      ? "GitHub marked the recursive tree as truncated; absence-based findings have reduced confidence."
      : "GitHub returned a complete recursive tree for the analyzed commit.",
    url: `${snapshot.repo.html_url}/tree/${snapshot.commit.sha}`,
    confidence: snapshot.treeTruncated ? "medium" : "high",
  });

  const addFinding = (data) => {
    const item = createFinding({ id: `FN-${String(++findingCounter).padStart(3, "0")}`, ...data });
    findings.push(item);
    return item.id;
  };

  // Repository state and maintenance.
  if (snapshot.repo.disabled || snapshot.repo.archived) {
    addFinding({
      ruleId: "repository-state",
      dimension: "Trust",
      type: "risk",
      severity: "critical",
      title: snapshot.repo.disabled ? "Repository is disabled" : "Repository is archived",
      summary: "GitHub metadata indicates that normal upstream maintenance cannot be assumed.",
      impact: "Adoption would transfer more support and security responsibility to the adopting team.",
      recommendation: "Avoid direct production adoption unless the repository is intentionally being acquired and maintained as a fork.",
      evidenceIds: [metadataEvidence],
      blocking: true,
    });
  } else {
    addFinding({
      ruleId: "repository-active-state",
      dimension: "Trust",
      type: "strength",
      severity: "low",
      title: "Repository is open for active development",
      summary: "GitHub does not mark the repository as archived or disabled.",
      evidenceIds: [metadataEvidence],
    });
  }

  const activityClass = classifyAge(snapshot.repo.pushed_at);
  const activityEvidence = addEvidence("activity", {
    type: "metadata",
    label: `Latest push was ${readableAge(snapshot.repo.pushed_at)}`,
    detail: snapshot.repo.pushed_at ? `Last push: ${snapshot.repo.pushed_at}.` : "No push date was returned.",
    url: `${snapshot.repo.html_url}/commits/${encodeURIComponent(snapshot.repo.default_branch)}`,
    confidence: snapshot.repo.pushed_at ? "high" : "low",
  });
  if (activityClass === "inactive") {
    addFinding({
      ruleId: "maintenance-inactive",
      dimension: "Own",
      type: "risk",
      severity: "high",
      title: "Upstream activity appears inactive",
      summary: `The latest repository push was ${readableAge(snapshot.repo.pushed_at)}.`,
      impact: "Security updates, compatibility fixes, and issue response may require internal ownership.",
      recommendation: "Review maintainer activity and create a fork/patch ownership plan before adoption.",
      evidenceIds: [activityEvidence],
      blocking: context.teamSize === "small" && context.intent !== "contribute",
    });
  } else if (activityClass === "stale" || activityClass === "aging") {
    addFinding({
      ruleId: "maintenance-aging",
      dimension: "Own",
      type: "unknown",
      severity: activityClass === "stale" ? "medium" : "low",
      title: "Maintenance cadence needs validation",
      summary: `The latest push was ${readableAge(snapshot.repo.pushed_at)}; cadence alone does not prove abandonment.`,
      recommendation: "Inspect releases, issue response, and maintainer communication before committing to production use.",
      evidenceIds: [activityEvidence],
    });
  } else {
    addFinding({
      ruleId: "maintenance-recent",
      dimension: "Own",
      type: "strength",
      severity: "low",
      title: "Recent repository activity observed",
      summary: `The latest push was ${readableAge(snapshot.repo.pushed_at)}.`,
      evidenceIds: [activityEvidence],
    });
  }

  // Documentation and license.
  if (inventory.readmes.length || readmeText) {
    const path = inventory.readmes[0] ?? snapshot.readmePath ?? "README.md";
    const ev = fileEvidence(path, "README available", "The repository provides a primary project overview and entry point.");
    addFinding({
      ruleId: "readme-present",
      dimension: "Fit",
      type: "strength",
      severity: "low",
      title: "Primary project documentation is available",
      summary: "A README gives adopters an initial source for purpose, setup, and usage claims.",
      evidenceIds: [ev],
    });
  } else {
    addFinding({
      ruleId: "readme-missing",
      dimension: "Fit",
      type: "gap",
      severity: "high",
      title: "No README was observed",
      summary: "The repository lacks a clear primary explanation of purpose and setup.",
      recommendation: "Treat product fit and installation assumptions as unresolved until maintainers provide documentation.",
      evidenceIds: [treeEvidence],
      blocking: true,
    });
  }

  const licensePath = inventory.licenses[0];
  const licenseMetadata = snapshot.repo.license?.spdx_id && snapshot.repo.license.spdx_id !== "NOASSERTION"
    ? snapshot.repo.license.spdx_id
    : null;
  if (licensePath || licenseMetadata) {
    const ev = licensePath
      ? fileEvidence(licensePath, "License artifact", `A license file is present; GitHub identifies ${licenseMetadata ?? "an unspecified license"}.`)
      : addEvidence("license-metadata", { type: "metadata", label: `GitHub license: ${licenseMetadata}`, detail: "GitHub returned an SPDX license identifier.", url: snapshot.repo.html_url });
    addFinding({
      ruleId: "license-present",
      dimension: "Trust",
      type: "strength",
      severity: "low",
      title: "A license signal is present",
      summary: `Observed license: ${licenseMetadata ?? "license file present; terms require review"}.`,
      impact: "A license signal enables legal review, but this report is not legal advice.",
      recommendation: "Confirm that the exact license terms and dependencies are compatible with the intended use.",
      evidenceIds: [ev],
    });
  } else {
    addFinding({
      ruleId: "license-missing",
      dimension: "Trust",
      type: "risk",
      severity: context.intent === "contribute" ? "medium" : "critical",
      title: "No usable license signal was observed",
      summary: "Public source code is not automatically permission for copying, modifying, distributing, or commercial use.",
      impact: "Adoption may create unacceptable legal uncertainty.",
      recommendation: "Do not adopt, redistribute, or build a commercial dependency until the license is clarified by the owner.",
      evidenceIds: [treeEvidence, metadataEvidence],
      blocking: context.intent !== "contribute",
    });
  }

  if (inventory.documentation.length >= 3) {
    const ev = fileEvidence(inventory.documentation[0], "Documentation directory", `${inventory.documentation.length} documentation paths were observed.`);
    addFinding({
      ruleId: "docs-depth",
      dimension: "Fit",
      type: "strength",
      severity: "low",
      title: "Supporting documentation is present",
      summary: `${inventory.documentation.length} documentation-oriented paths were observed in addition to the README.`,
      evidenceIds: [ev],
    });
  } else {
    addFinding({
      ruleId: "docs-limited",
      dimension: "Own",
      type: "gap",
      severity: "medium",
      title: "Supporting documentation appears limited",
      summary: "The repository tree provides little evidence of operating, architecture, troubleshooting, or maintenance guidance.",
      recommendation: "Validate installation, upgrades, backups, troubleshooting, and architecture during a pilot.",
      evidenceIds: [treeEvidence],
    });
  }

  // Tests, CI, coverage.
  const testEv = inventory.tests.length
    ? fileEvidence(inventory.tests[0], "Test-oriented paths", `${inventory.tests.length} test-oriented paths were observed.`)
    : treeEvidence;
  if (inventory.tests.length) {
    addFinding({
      ruleId: "tests-present",
      dimension: "Own",
      type: "strength",
      severity: "low",
      title: "Automated test structure is present",
      summary: `${inventory.tests.length} test-oriented paths were detected. Presence does not establish coverage or reliability.`,
      evidenceIds: [testEv],
    });
  } else {
    addFinding({
      ruleId: "tests-missing",
      dimension: "Own",
      type: "gap",
      severity: "high",
      title: "No test-oriented paths were observed",
      summary: "The repository inventory did not reveal conventional unit, integration, or end-to-end test locations.",
      impact: "Regression risk and customization cost are harder to control.",
      recommendation: "Require representative test execution and add tests around business-critical paths before production adoption.",
      evidenceIds: [treeEvidence],
      blocking: context.intent === "dependency" || context.sensitivity === "regulated",
    });
  }

  if (inventory.workflows.length) {
    const workflowContents = corpus.filter((item) => inventory.workflows.includes(item.path));
    const runsTests = workflowContents.some((item) => /\b(npm test|pnpm test|yarn test|pytest|go test|cargo test|mvn test|gradle test)\b/i.test(item.content));
    const ev = fileEvidence(inventory.workflows[0], "Continuous-integration workflow", `${inventory.workflows.length} GitHub Actions workflow(s) were observed.`);
    addFinding({
      ruleId: runsTests ? "ci-tests" : "ci-present",
      dimension: "Trust",
      type: runsTests ? "strength" : "unknown",
      severity: runsTests ? "low" : "medium",
      title: runsTests ? "CI appears to execute automated tests" : "CI exists, but test execution was not verified",
      summary: runsTests
        ? "At least one inspected workflow contains a conventional test command."
        : "Workflow files are present, but the bounded content review did not prove that tests run on changes.",
      evidenceIds: [ev],
      confidence: workflowContents.length ? "high" : "medium",
    });
  } else {
    addFinding({
      ruleId: "ci-missing",
      dimension: "Trust",
      type: "gap",
      severity: "medium",
      title: "No GitHub Actions workflow was observed",
      summary: "The repository tree does not show GitHub Actions checks for builds, tests, or security validation.",
      recommendation: "Confirm whether another CI system exists; otherwise add repeatable validation before relying on upstream changes.",
      evidenceIds: [treeEvidence],
    });
  }

  if (inventory.coverage.length) {
    const ev = fileEvidence(inventory.coverage[0], "Coverage artifact/configuration", "A conventional coverage artifact or path was observed.");
    addFinding({
      ruleId: "coverage-evidence-present",
      dimension: "Own",
      type: "strength",
      severity: "info",
      title: "Coverage evidence may be available",
      summary: "A coverage-oriented path exists, but this static review does not infer a percentage without reading a valid report.",
      evidenceIds: [ev],
    });
  } else {
    addFinding({
      ruleId: "coverage-unknown",
      dimension: "Own",
      type: "unknown",
      severity: "low",
      title: "Test coverage is unknown",
      summary: "No coverage artifact was observed. The reviewer does not fabricate a coverage percentage.",
      evidenceIds: [treeEvidence],
    });
  }

  // Deployment and operations.
  const hasContainer = inventory.docker.length > 0 || inventory.compose.length > 0;
  if (hasContainer) {
    const path = inventory.compose[0] ?? inventory.docker[0];
    const ev = fileEvidence(path, "Container deployment artifact", "Docker or Compose configuration is present.");
    addFinding({
      ruleId: "container-present",
      dimension: "Run",
      type: "strength",
      severity: "low",
      title: "Container deployment artifacts are present",
      summary: `Observed: ${compactPathList([...inventory.docker, ...inventory.compose])}.`,
      evidenceIds: [ev],
    });
  } else if (context.deploymentTarget === "docker" || context.intent === "self-host") {
    addFinding({
      ruleId: "container-missing",
      dimension: "Run",
      type: "gap",
      severity: context.deploymentTarget === "docker" ? "high" : "medium",
      title: "Container deployment was not verified",
      summary: "No Dockerfile or Compose file was observed in the repository tree.",
      impact: "Deployment may require custom packaging or undocumented host configuration.",
      recommendation: "Prototype installation in an isolated environment and document a repeatable deployment path.",
      evidenceIds: [treeEvidence],
      blocking: context.deploymentTarget === "docker",
    });
  }

  if (context.deploymentTarget === "kubernetes") {
    if (inventory.kubernetes.length || inventory.helm.length) {
      const path = inventory.helm[0] ?? inventory.kubernetes[0];
      addFinding({
        ruleId: "kubernetes-present",
        dimension: "Run",
        type: "strength",
        severity: "low",
        title: "Kubernetes deployment artifacts are present",
        summary: "Kubernetes manifests or a Helm chart were observed.",
        evidenceIds: [fileEvidence(path, "Kubernetes deployment artifact", "A requested deployment format is present.")],
      });
    } else {
      addFinding({
        ruleId: "kubernetes-missing",
        dimension: "Run",
        type: "gap",
        severity: "high",
        title: "Requested Kubernetes deployment was not observed",
        summary: "No conventional Kubernetes manifests or Helm chart were found.",
        recommendation: "Budget for deployment engineering and validate health checks, persistence, upgrades, and rollback behavior.",
        evidenceIds: [treeEvidence],
        blocking: true,
      });
    }
  }

  if (inventory.envTemplates.length) {
    const ev = fileEvidence(inventory.envTemplates[0], "Environment template", `${inventory.envTemplates.length} environment template(s) were observed.`);
    addFinding({
      ruleId: "env-template",
      dimension: "Run",
      type: "strength",
      severity: "low",
      title: "Environment configuration is partially discoverable",
      summary: "An example environment file helps expose required configuration without publishing real credentials.",
      evidenceIds: [ev],
    });
  } else if (hasContainer || context.intent === "self-host") {
    addFinding({
      ruleId: "env-template-missing",
      dimension: "Run",
      type: "gap",
      severity: "medium",
      title: "No environment template was observed",
      summary: "Required runtime variables may be undocumented or scattered across source/configuration.",
      recommendation: "Inventory required variables and secret-handling expectations during the pilot.",
      evidenceIds: [treeEvidence],
    });
  }

  if (inventory.backupDocs.length) {
    addFinding({
      ruleId: "backup-docs",
      dimension: "Run",
      type: "strength",
      severity: "low",
      title: "Backup or recovery guidance is present",
      summary: "At least one backup, restore, recovery, or disaster-recovery document was observed.",
      evidenceIds: [fileEvidence(inventory.backupDocs[0], "Backup/recovery documentation", "An operational resilience document is present.")],
    });
  } else if (context.intent === "self-host") {
    addFinding({
      ruleId: "backup-docs-missing",
      dimension: "Run",
      type: "gap",
      severity: context.sensitivity === "regulated" ? "high" : "medium",
      title: "Backup and recovery procedure was not observed",
      summary: "The tree does not show conventional backup, restore, or disaster-recovery documentation.",
      recommendation: "Define and test backup, restoration, and upgrade rollback before production use.",
      evidenceIds: [treeEvidence],
      blocking: context.sensitivity === "regulated",
    });
  }

  // External services.
  const serviceIndicators = [];
  for (const service of EXTERNAL_SERVICES) {
    const matches = corpus.filter((item) => service.pattern.test(item.content) || service.pattern.test(item.path));
    if (!matches.length) continue;
    const primary = matches[0];
    const ev = fileEvidence(
      primary.path,
      `${service.label} indicator`,
      `Static text/configuration contains a ${service.kind} indicator. This does not prove runtime data flow.`,
      excerptAround(primary.content, service.pattern),
    );
    serviceIndicators.push({ ...service, evidenceId: ev, paths: unique(matches.map((item) => item.path)).slice(0, 5) });
  }

  if (serviceIndicators.length) {
    addFinding({
      ruleId: "external-services-observed",
      dimension: "Run",
      type: context.externalServices === "prohibited" ? "risk" : "unknown",
      severity: context.externalServices === "prohibited" ? "high" : "medium",
      title: `${serviceIndicators.length} external-service indicator${serviceIndicators.length === 1 ? "" : "s"} require review`,
      summary: `Observed static indicators: ${serviceIndicators.map((item) => item.label).join(", ")}. Static inspection does not prove whether integrations are enabled by default or what data they receive.`,
      impact: context.externalServices === "prohibited" ? "The intended deployment prohibits external services, so even optional integrations must be disabled or replaced." : "Undisclosed integrations can affect cost, privacy, resilience, and self-hosting claims.",
      recommendation: "Trace configuration defaults and runtime network behavior in an isolated pilot before handling sensitive data.",
      evidenceIds: serviceIndicators.map((item) => item.evidenceId),
      blocking: context.externalServices === "prohibited",
    });
  } else {
    addFinding({
      ruleId: "external-services-not-observed",
      dimension: "Run",
      type: "unknown",
      severity: "info",
      title: "No supported external-service indicators were found in inspected text",
      summary: "This bounded static scan is not proof that the application makes no outbound requests.",
      evidenceIds: [treeEvidence],
      confidence: "low",
    });
  }

  // Security posture and secret handling.
  if (inventory.securityPolicies.length) {
    addFinding({
      ruleId: "security-policy",
      dimension: "Trust",
      type: "strength",
      severity: "low",
      title: "Security disclosure guidance is present",
      summary: "A SECURITY.md file provides a channel for vulnerability reporting or supported-version guidance.",
      evidenceIds: [fileEvidence(inventory.securityPolicies[0], "Security policy", "A security disclosure policy is present.")],
    });
  } else {
    addFinding({
      ruleId: "security-policy-missing",
      dimension: "Trust",
      type: "gap",
      severity: ["confidential", "regulated"].includes(context.sensitivity) ? "high" : "medium",
      title: "No security disclosure policy was observed",
      summary: "The repository tree does not show a conventional SECURITY.md file.",
      recommendation: "Confirm supported versions, disclosure handling, and vulnerability response before sensitive production use.",
      evidenceIds: [treeEvidence],
      blocking: context.sensitivity === "regulated",
    });
  }

  if (inventory.dependabot.length || inventory.renovate.length) {
    const path = inventory.dependabot[0] ?? inventory.renovate[0];
    addFinding({
      ruleId: "dependency-automation",
      dimension: "Trust",
      type: "strength",
      severity: "low",
      title: "Dependency-update automation is configured",
      summary: "Dependabot or Renovate configuration was observed.",
      evidenceIds: [fileEvidence(path, "Dependency update configuration", "Automated dependency update configuration is present.")],
    });
  } else if (inventory.manifests.length) {
    addFinding({
      ruleId: "dependency-automation-missing",
      dimension: "Trust",
      type: "gap",
      severity: "medium",
      title: "Dependency-update automation was not observed",
      summary: "The project has dependency manifests, but no conventional Dependabot or Renovate configuration was found.",
      recommendation: "Review dependency freshness and establish a repeatable update/vulnerability process.",
      evidenceIds: [treeEvidence],
    });
  }

  if (inventory.codeql.length) {
    addFinding({
      ruleId: "codeql-present",
      dimension: "Trust",
      type: "strength",
      severity: "low",
      title: "A security-oriented workflow is present",
      summary: "A workflow filename suggests CodeQL or another security check. Workflow behavior should still be verified.",
      evidenceIds: [fileEvidence(inventory.codeql[0], "Security workflow", "A security-oriented GitHub Actions workflow is present.")],
    });
  }

  if (inventory.trackedEnv.length) {
    addFinding({
      ruleId: "tracked-env",
      dimension: "Trust",
      type: "risk",
      severity: "high",
      title: "A tracked .env file was observed",
      summary: "A repository-tracked .env file can unintentionally expose credentials or sensitive configuration.",
      recommendation: "Inspect history, rotate any real credentials, remove sensitive values, and replace with an example template.",
      evidenceIds: [fileEvidence(inventory.trackedEnv[0], "Tracked environment file", "A literal .env path is present in the repository tree.")],
      blocking: true,
    });
  }

  const credentialCandidates = scanCredentialCandidates(corpus);
  if (credentialCandidates.exposed.length) {
    const evidenceIds = credentialCandidates.exposed.slice(0, 5).map((candidate) => fileEvidence(
      candidate.path,
      `Potential ${candidate.kind.toLowerCase()}`,
      "A high-confidence credential-like literal was found; the value is intentionally redacted.",
      redactSensitiveText(candidate.match),
    ));
    addFinding({
      ruleId: "potential-secret",
      dimension: "Trust",
      type: "risk",
      severity: "critical",
      title: "Potential credential material was detected",
      summary: `${credentialCandidates.exposed.length} high-confidence credential-like literal${credentialCandidates.exposed.length === 1 ? " was" : "s were"} found. Environment references, placeholders, documentation examples, and explicit CI/local-only defaults are excluded. Values are redacted.`,
      impact: "Exposed credentials can enable unauthorized access even after the file is removed because Git history may retain them.",
      recommendation: "Treat the credential as compromised, rotate/revoke it, inspect history, and verify downstream access logs.",
      evidenceIds,
      blocking: true,
    });
  }

  const literalDefaults = credentialCandidates.defaults.filter((candidate) =>
    ["development-default", "literal-default"].includes(candidate.disposition),
  );
  if (literalDefaults.length) {
    const evidenceIds = literalDefaults.slice(0, 5).map((candidate) => fileEvidence(
      candidate.path,
      "Literal development credential",
      "A non-secret literal credential default was observed. It is not treated as exposed credential material, but deployments should override it outside bounded development environments.",
      redactSensitiveText(candidate.match),
    ));
    addFinding({
      ruleId: "literal-development-credential",
      dimension: "Trust",
      type: "unknown",
      severity: "low",
      title: "Literal development credential defaults need deployment review",
      summary: `${literalDefaults.length} test, local, or low-entropy credential default${literalDefaults.length === 1 ? " was" : "s were"} observed.`,
      impact: "A documented local default is not evidence of a leaked secret, but reusing it in a reachable deployment can weaken access control.",
      recommendation: "Keep defaults limited to disposable local/test environments and require injected credentials for shared or production deployments.",
      evidenceIds,
      blocking: false,
    });
  }

  const workflowItems = corpus.filter((item) => inventory.workflows.includes(item.path));
  const unpinnedActions = workflowItems.flatMap((item) => {
    const refs = [...item.content.matchAll(/uses:\s*([^\s#]+)@([^\s#]+)/g)];
    return refs.filter((match) => !/^[a-f0-9]{40}$/i.test(match[2])).map((match) => ({ item, ref: match[0] }));
  });
  if (unpinnedActions.length) {
    const first = unpinnedActions[0];
    addFinding({
      ruleId: "actions-unpinned",
      dimension: "Trust",
      type: "risk",
      severity: "low",
      title: "Workflow actions are not pinned to immutable commit SHAs",
      summary: `${unpinnedActions.length} action reference${unpinnedActions.length === 1 ? "" : "s"} use a tag or branch. This is common, but immutable pins provide stronger supply-chain control.`,
      recommendation: "Consider pinning third-party actions to reviewed commit SHAs and use automated update tooling.",
      evidenceIds: [fileEvidence(first.item.path, "Mutable workflow action reference", "A workflow uses a tag/branch action reference.", first.ref)],
    });
  }

  // Exit and portability.
  if (inventory.exportDocs.length || inventory.apiSpecs.length) {
    const path = inventory.exportDocs[0] ?? inventory.apiSpecs[0];
    addFinding({
      ruleId: "portability-signal",
      dimension: "Exit",
      type: "strength",
      severity: "low",
      title: "A portability or integration signal is present",
      summary: "Export/import documentation or an API specification was observed.",
      evidenceIds: [fileEvidence(path, "Portability artifact", "An export/import/migration document or API specification is present.")],
    });
  } else {
    addFinding({
      ruleId: "portability-unknown",
      dimension: "Exit",
      type: "unknown",
      severity: context.intent === "self-host" ? "medium" : "low",
      title: "Exit and data portability are not documented",
      summary: "The repository tree does not show conventional export, import, migration, or API specification artifacts.",
      recommendation: "During a pilot, export representative data and document replacement/migration options.",
      evidenceIds: [treeEvidence],
    });
  }

  // Technology and operations inventory.
  const paths = inventory.paths;
  const technologies = TECHNOLOGIES.filter((technology) =>
    paths.some((path) => technology.path.test(path)) || corpus.some((item) => technology.content.test(item.content)),
  ).map(({ name, category }) => ({ name, category }));
  if (snapshot.repo.language && !technologies.some((item) => item.name.toLowerCase().includes(String(snapshot.repo.language).toLowerCase()))) {
    technologies.unshift({ name: snapshot.repo.language, category: "primary language (GitHub)" });
  }

  const envVariables = unique(corpus
    .filter((item) => inventory.envTemplates.includes(item.path) || /compose|docker|config|settings/i.test(item.path))
    .flatMap((item) => [...item.content.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)].map((match) => match[1])))
    .filter((name) => !["HTTP", "HTTPS", "URL", "TRUE", "FALSE", "NULL", "JSON", "YAML", "UTF"].includes(name))
    .slice(0, 30);
  const ports = unique(corpus.flatMap((item) => [...item.content.matchAll(/(?:^|[\s"'])((?:[1-9]\d{1,4}))(?::([1-9]\d{1,4}))?(?:[\/"'\s]|$)/gm)]
    .flatMap((match) => [match[1], match[2]])).filter((value) => value && Number(value) <= 65535)).slice(0, 12);
  const databases = technologies.filter((item) => item.category === "database" || item.category === "data service").map((item) => item.name);
  const deployment = unique([
    inventory.docker.length ? "Docker image" : null,
    inventory.compose.length ? "Docker Compose" : null,
    inventory.kubernetes.length ? "Kubernetes manifests" : null,
    inventory.helm.length ? "Helm" : null,
    inventory.terraform.length ? "Terraform" : null,
  ]);
  const operations = {
    runtimes: technologies.filter((item) => ["runtime", "language", "framework"].includes(item.category)).map((item) => item.name),
    databases,
    deployment,
    externalServices: serviceIndicators.map((item) => ({ name: item.label, kind: item.kind, paths: item.paths })),
    environmentVariables: envVariables,
    ports,
    migrations: inventory.migrations.slice(0, 8),
    backupEvidence: inventory.backupDocs.slice(0, 8),
  };

  if (technologies.length > 4 && context.teamSize === "small") {
    addFinding({
      ruleId: "small-team-stack-breadth",
      dimension: "Own",
      type: "risk",
      severity: "medium",
      title: "Technology breadth may stretch a small team",
      summary: `${technologies.length} technology signals were detected across runtime, framework, data, and deployment categories.`,
      impact: "A small team may inherit operational and upgrade responsibilities across several ecosystems.",
      recommendation: "Confirm internal ownership for each critical runtime, database, and deployment component.",
      evidenceIds: [treeEvidence],
    });
  }

  if (context.intent === "dependency" && inventory.manifests.length === 0) {
    addFinding({
      ruleId: "dependency-manifest-missing",
      dimension: "Fit",
      type: "gap",
      severity: "high",
      title: "No supported package manifest was observed",
      summary: "The repository may not be packaged as a conventional reusable dependency.",
      recommendation: "Verify installation, versioning, release artifacts, and API stability before integrating it.",
      evidenceIds: [treeEvidence],
      blocking: true,
    });
  }

  if (context.intent === "contribute") {
    if (inventory.contributing.length) {
      addFinding({
        ruleId: "contributing-present",
        dimension: "Fit",
        type: "strength",
        severity: "low",
        title: "Contributor guidance is present",
        summary: "A contributing guide gives newcomers a documented entry path.",
        evidenceIds: [fileEvidence(inventory.contributing[0], "Contribution guide", "Contributor guidance is present.")],
      });
    } else {
      addFinding({
        ruleId: "contributing-missing",
        dimension: "Fit",
        type: "gap",
        severity: "medium",
        title: "Contributor onboarding is not documented",
        summary: "No conventional CONTRIBUTING file was observed.",
        recommendation: "Review open issues and contact maintainers before investing in a substantial contribution.",
        evidenceIds: [treeEvidence],
      });
    }
  }

  // README Reality Check.
  const claimDefinitions = [
    {
      id: "CLM-self-hosted",
      title: "Fully self-hosted",
      claimed: /\b(self[- ]host(?:ed|ing)?|on[- ]prem(?:ise|ises)?|run (?:it )?yourself)\b/i.test(readmeText),
      support: hasContainer || inventory.kubernetes.length || /\b(local deployment|on-prem)\b/i.test(allText),
      contradiction: serviceIndicators.some((item) => item.kind === "hosted backend"),
      evidenceIds: unique([
        hasContainer ? fileEvidence(inventory.compose[0] ?? inventory.docker[0], "Self-host deployment evidence", "Container deployment artifacts support local operation.") : null,
        ...serviceIndicators.filter((item) => item.kind === "hosted backend").map((item) => item.evidenceId),
      ]),
    },
    {
      id: "CLM-docker",
      title: "Docker or easy container deployment",
      claimed: /\b(docker|compose|container(?:ized)?)\b/i.test(readmeText),
      support: hasContainer,
      contradiction: false,
      evidenceIds: hasContainer ? [fileEvidence(inventory.compose[0] ?? inventory.docker[0], "Docker claim evidence", "A Docker or Compose artifact is present.")] : [treeEvidence],
    },
    {
      id: "CLM-production",
      title: "Production ready",
      claimed: /\b(production[- ]ready|ready for production|enterprise[- ]ready)\b/i.test(readmeText),
      support: inventory.tests.length > 0 && inventory.workflows.length > 0 && Boolean(snapshot.release),
      contradiction: inventory.tests.length === 0 || snapshot.repo.archived,
      evidenceIds: unique([
        testEv,
        inventory.workflows.length ? fileEvidence(inventory.workflows[0], "CI evidence", "A workflow is present.") : treeEvidence,
        snapshot.release ? addEvidence("release", { type: "release", label: `Latest release ${snapshot.release.tag_name}`, detail: `Published ${snapshot.release.published_at ?? "on an unknown date"}.`, url: snapshot.release.html_url }) : null,
      ]),
    },
    {
      id: "CLM-privacy",
      title: "Privacy focused or no telemetry",
      claimed: /\b(privacy[- ]first|privacy focused|no telemetry|without telemetry|no tracking)\b/i.test(readmeText),
      support: serviceIndicators.filter((item) => item.kind === "telemetry").length === 0 && inventory.securityPolicies.length > 0,
      contradiction: serviceIndicators.some((item) => item.kind === "telemetry"),
      evidenceIds: unique([
        ...serviceIndicators.filter((item) => item.kind === "telemetry").map((item) => item.evidenceId),
        inventory.securityPolicies.length ? fileEvidence(inventory.securityPolicies[0], "Security documentation", "A security policy exists; this is supporting governance evidence, not proof of runtime privacy.") : treeEvidence,
      ]),
    },
    {
      id: "CLM-easy-setup",
      title: "Easy or quick setup",
      claimed: /\b(quick start|quickstart|easy setup|one[- ]command|minutes to (?:run|install)|get started in)\b/i.test(readmeText),
      support: hasContainer && inventory.envTemplates.length > 0,
      contradiction: envVariables.length > 18 && inventory.envTemplates.length === 0,
      evidenceIds: unique([
        hasContainer ? fileEvidence(inventory.compose[0] ?? inventory.docker[0], "Setup artifact", "Container configuration is available.") : treeEvidence,
        inventory.envTemplates.length ? fileEvidence(inventory.envTemplates[0], "Configuration template", "An environment template is available.") : null,
      ]),
    },
    {
      id: "CLM-portability",
      title: "No vendor lock-in or easy migration",
      claimed: /\b(no vendor lock[- ]in|portable|easy migration|data export)\b/i.test(readmeText),
      support: inventory.exportDocs.length > 0 || inventory.apiSpecs.length > 0,
      contradiction: serviceIndicators.some((item) => ["hosted backend", "cloud"].includes(item.kind)) && inventory.exportDocs.length === 0,
      evidenceIds: unique([
        inventory.exportDocs.length ? fileEvidence(inventory.exportDocs[0], "Export/migration evidence", "An export, import, or migration document is present.") : null,
        inventory.apiSpecs.length ? fileEvidence(inventory.apiSpecs[0], "API specification", "A portable integration surface is documented.") : null,
        ...serviceIndicators.filter((item) => ["hosted backend", "cloud"].includes(item.kind)).map((item) => item.evidenceId),
        treeEvidence,
      ]),
    },
  ];

  for (const definition of claimDefinitions) {
    let state = "not-claimed";
    if (definition.claimed) {
      if (definition.contradiction) state = "contradicted";
      else if (definition.support) state = "verified";
      else state = "unverified";
    } else if (definition.support || definition.contradiction) {
      state = definition.contradiction ? "partial" : "partial";
    }
    claims.push({
      id: definition.id,
      title: definition.title,
      claimed: definition.claimed,
      state,
      explanation: state === "verified"
        ? "The inspected repository contains supporting implementation or operational evidence."
        : state === "contradicted"
          ? "Observed repository evidence conflicts with the documented claim or creates a material exception."
          : state === "partial"
            ? "Relevant implementation evidence exists, but the repository does not make or fully support the complete claim."
            : state === "unverified"
              ? "The README makes this claim, but the bounded static review did not find enough supporting evidence."
              : "This claim was not detected in the primary README.",
      evidenceIds: definition.evidenceIds,
    });
  }

  const contradictedClaims = claims.filter((claim) => claim.state === "contradicted");
  for (const claim of contradictedClaims) {
    addFinding({
      ruleId: `claim-${claim.id}`,
      dimension: claim.id === "CLM-privacy" ? "Trust" : claim.id === "CLM-portability" ? "Exit" : "Fit",
      type: "risk",
      severity: claim.id === "CLM-privacy" && ["confidential", "regulated"].includes(context.sensitivity) ? "high" : "medium",
      title: `README Reality Check: ${claim.title} needs correction`,
      summary: claim.explanation,
      recommendation: "Validate the claim with maintainers and test the relevant behavior before relying on it.",
      evidenceIds: claim.evidenceIds,
      blocking: claim.id === "CLM-privacy" && context.sensitivity === "regulated",
    });
  }

  // Evidence coverage.
  const coverageSignals = [
    Boolean(snapshot.repo.full_name),
    Boolean(snapshot.commit.sha),
    inventory.totalFiles > 0,
    Boolean(readmeText),
    Boolean(licensePath || licenseMetadata),
    inventory.manifests.length > 0,
    inventory.workflows.length > 0,
    inventory.tests.length > 0,
    hasContainer || inventory.kubernetes.length > 0,
    inventory.envTemplates.length > 0,
    inventory.securityPolicies.length > 0,
    Boolean(snapshot.release),
    snapshot.selectedContentCount > 0,
  ];
  let evidenceCoverage = Math.round((coverageSignals.filter(Boolean).length / coverageSignals.length) * 100);
  if (snapshot.treeTruncated) evidenceCoverage = Math.min(evidenceCoverage, 68);
  if ((snapshot.selectedContentCount ?? 0) < 3) evidenceCoverage = Math.min(evidenceCoverage, 56);

  // Dimension scoring.
  const dimensions = ["Fit", "Trust", "Run", "Own", "Exit"].map((name) => {
    const related = findings.filter((finding) => finding.dimension === name);
    const raw = 82 - related.reduce((total, finding) => total + findingPenalty(finding), 0);
    const score = clamp(Math.round(raw), 0, 100);
    const strongest = related.filter((finding) => finding.type === "strength").sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
    const concern = related.filter((finding) => finding.type !== "strength").sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
    return {
      name,
      score,
      status: dimensionStatus(score, evidenceCoverage),
      summary: concern?.summary ?? strongest?.summary ?? "No material conclusion was generated for this dimension.",
      findingIds: related.map((finding) => finding.id),
    };
  });

  const blockers = findings.filter((finding) => finding.blocking);
  const critical = findings.filter((finding) => finding.severity === "critical" && finding.type !== "strength");
  const highRisks = findings.filter((finding) => finding.severity === "high" && finding.type !== "strength");
  const mediumRisks = findings.filter((finding) => finding.severity === "medium" && finding.type !== "strength");

  let ownershipScore = 20;
  ownershipScore += context.teamSize === "small" ? 15 : context.teamSize === "medium" ? 7 : 0;
  ownershipScore += Math.min(25, Math.max(0, technologies.length - 3) * 4);
  ownershipScore += inventory.tests.length ? 0 : 15;
  ownershipScore += inventory.documentation.length >= 3 ? 0 : 10;
  ownershipScore += activityClass === "inactive" ? 25 : activityClass === "stale" ? 12 : 0;
  ownershipScore += inventory.migrations.length && !inventory.backupDocs.length ? 8 : 0;
  ownershipScore = clamp(ownershipScore);

  let effortScore = 15;
  effortScore += context.deploymentTarget === "kubernetes" ? 12 : 0;
  effortScore += !hasContainer && context.intent === "self-host" ? 18 : 0;
  effortScore += Math.min(18, envVariables.length);
  effortScore += databases.length * 8;
  effortScore += serviceIndicators.length * 5;
  effortScore += blockers.length * 8;
  effortScore = clamp(effortScore);

  let decision = "Adopt";
  if (snapshot.repo.disabled || critical.length || blockers.filter((item) => item.severity === "critical").length) {
    decision = "Avoid";
  } else if (evidenceCoverage < 35) {
    decision = "Insufficient evidence";
  } else if (context.intent === "fork" && ownershipScore >= 55) {
    decision = "Fork";
  } else if (blockers.length || highRisks.length >= 2 || mediumRisks.length >= 5 || evidenceCoverage < 62) {
    decision = "Pilot";
  }

  if (context.intent === "contribute" && decision === "Avoid" && !snapshot.repo.disabled && critical.every((item) => item.ruleId === "license-missing")) {
    decision = "Pilot";
  }

  const confidence = evidenceCoverage >= 80 && !snapshot.treeTruncated ? "High" : evidenceCoverage >= 55 ? "Medium" : "Low";
  const decisionReasons = findings
    .filter((finding) => finding.blocking || finding.severity === "critical" || finding.severity === "high" || finding.type === "strength")
    .sort((a, b) => Number(b.blocking) - Number(a.blocking) || severityRank(b.severity) - severityRank(a.severity) || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((finding) => ({ title: finding.title, type: finding.type, severity: finding.severity, findingId: finding.id }));

  const decisionSummary = {
    Adopt: "The observed evidence supports the stated use, subject to normal implementation and legal review.",
    Pilot: "The repository is promising, but material risks or unknowns should be resolved in an isolated pilot before adoption.",
    Fork: "The repository may be a useful foundation, but the evidence suggests meaningful internal ownership and customization responsibility.",
    Avoid: "A blocking conflict or critical risk makes adoption inappropriate for the stated use until the condition is resolved.",
    "Insufficient evidence": "The bounded public evidence is not strong enough for a responsible adoption recommendation.",
  }[decision];

  const unresolvedQuestions = unique([
    !inventory.backupDocs.length && context.intent === "self-host" ? "How are backup, restoration, disaster recovery, and upgrade rollback performed?" : null,
    serviceIndicators.length ? "Which external integrations are enabled by default, what data do they receive, and can each be disabled?" : null,
    !inventory.coverage.length ? "What test coverage and failure-mode evidence exists for the workflows we depend on?" : null,
    !inventory.securityPolicies.length ? "Which versions receive security fixes, and how are vulnerabilities disclosed and communicated?" : null,
    !inventory.exportDocs.length ? "Can representative data be exported in a documented, portable format?" : null,
    !licensePath && !licenseMetadata ? "What license terms does the owner intend for use, modification, and distribution?" : null,
    activityClass === "inactive" || activityClass === "stale" ? "Who will own maintenance if upstream response is slow or stops?" : null,
    snapshot.treeTruncated ? "What evidence was omitted because GitHub truncated the recursive tree response?" : null,
  ]);

  const pilotChecklist = unique([
    `Pin and review commit ${snapshot.commit.sha.slice(0, 12)} rather than an unbounded branch reference.`,
    "Reproduce installation from a clean environment without executing unreviewed privileged scripts.",
    hasContainer ? "Start the documented container deployment and verify health checks, persistence, and clean shutdown." : "Create and document a repeatable isolated deployment procedure.",
    serviceIndicators.length ? "Capture outbound network connections and confirm every external service can be governed as required." : "Capture outbound network traffic to validate the static scan's external-service assumptions.",
    "Exercise authentication, authorization, input validation, and failure recovery using non-sensitive test data.",
    inventory.backupDocs.length ? "Perform a backup and full restoration drill using the documented procedure." : "Design and test backup and restoration before production approval.",
    inventory.exportDocs.length ? "Export representative data and verify that the result can be independently read or migrated." : "Define and test an exit/export path.",
    "Record the exact license review, unresolved questions, owners, and go/no-go criteria.",
  ]);

  const limitations = unique([
    "This is a bounded static review of public GitHub evidence; repository-controlled code was not installed or executed.",
    "Static indicators do not prove runtime behavior, exploitability, data flows, performance, or operational reliability.",
    "The anonymous GitHub API and selected-content limit can omit files, history, branch protection, private advisories, or organization settings.",
    snapshot.treeTruncated ? "GitHub marked the recursive tree as truncated, so absence-based findings have reduced confidence." : null,
    "License observations are not legal advice; qualified counsel should review material adoption decisions.",
    "No test coverage percentage is inferred unless a valid coverage report is explicitly available.",
  ]);

  const assessment = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    analyzerVersion: ANALYZER_VERSION,
    generatedAt: new Date().toISOString(),
    context,
    repository: {
      owner: snapshot.parsed?.owner ?? snapshot.repo.full_name.split("/")[0],
      name: snapshot.repo.name,
      fullName: snapshot.repo.full_name,
      url: snapshot.repo.html_url,
      description: snapshot.repo.description ?? "No repository description provided.",
      defaultBranch: snapshot.repo.default_branch,
      commitSha: snapshot.commit.sha,
      commitUrl: snapshot.commit.html_url ?? `${snapshot.repo.html_url}/commit/${snapshot.commit.sha}`,
      pushedAt: snapshot.repo.pushed_at,
      license: licenseMetadata ?? (licensePath ? "License file present" : "No license observed"),
      primaryLanguage: snapshot.repo.language ?? technologies[0]?.name ?? "Unknown",
      stars: snapshot.repo.stargazers_count ?? 0,
      forks: snapshot.repo.forks_count ?? 0,
      openIssues: snapshot.repo.open_issues_count ?? 0,
      isSample: Boolean(snapshot.isSample),
    },
    decision,
    decisionConfidence: confidence,
    evidenceCoverage,
    blockerCount: blockers.length,
    ownershipBurden: ownershipLabel(ownershipScore),
    ownershipScore,
    adoptionEffort: effortLabel(effortScore),
    adoptionEffortScore: effortScore,
    summary: decisionSummary,
    nextAction: decision === "Adopt"
      ? "Proceed with a time-boxed implementation review and retain the commit-pinned evidence package."
      : decision === "Avoid"
        ? "Resolve the blocking condition or select an alternative repository before investing in integration."
        : decision === "Fork"
          ? "Define internal ownership, fork governance, upgrade strategy, and a maintenance budget before implementation."
          : "Run the generated pilot checklist and close the blocking or unresolved questions before approving production use.",
    decisionReasons,
    dimensions,
    findings: findings.sort((a, b) => Number(b.blocking) - Number(a.blocking) || severityRank(b.severity) - severityRank(a.severity) || a.id.localeCompare(b.id)),
    evidence,
    claims,
    operations,
    technologies,
    unresolvedQuestions,
    pilotChecklist,
    limitations,
    inventory: {
      totalFiles: inventory.totalFiles,
      totalDirectories: inventory.totalDirectories,
      treeTruncated: inventory.treeTruncated,
      summary: inventorySummary(inventory),
      extensions: countExtensions(inventory.paths).slice(0, 10),
      readmes: inventory.readmes,
      licenses: inventory.licenses,
      workflows: inventory.workflows,
      tests: inventory.tests.slice(0, 20),
      manifests: inventory.manifests,
      deployment: unique([...inventory.docker, ...inventory.compose, ...inventory.kubernetes, ...inventory.helm, ...inventory.terraform]),
    },
  };

  const errors = validateAssessment(assessment);
  if (errors.length) throw new Error(`Assessment schema validation failed: ${errors.join(" ")}`);
  return assessment;
}
