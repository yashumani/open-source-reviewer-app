import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const html = await readFile(path.join(root, "index.html"), "utf8");
const css = await readFile(path.join(root, "styles.css"), "utf8");
const operatorHtml = await readFile(path.join(root, "operator.html"), "utf8");
const operatorCss = await readFile(path.join(root, "operator.css"), "utf8");
const errors = [];

function idsFor(markup) {
  return [...markup.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
}

function validateUniqueIds(markup, label) {
  const ids = idsFor(markup);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`${label} duplicate HTML IDs: ${[...new Set(duplicates)].join(", ")}`);
  return ids;
}

async function validateLocalRefs(markup, label) {
  const refs = [...markup.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:https?:|mailto:|tel:|data:)/i.test(value))
    .filter((value) => !value.endsWith(".md"));
  for (const ref of refs) {
    try { await access(path.join(root, ref)); }
    catch { errors.push(`${label} missing local asset: ${ref}`); }
  }
  return refs;
}

function validateMarkup(markup, label) {
  if (!/<main\b/i.test(markup)) errors.push(`${label} is missing a semantic <main> element.`);
  if (!/<h1\b/i.test(markup)) errors.push(`${label} is missing a primary heading.`);
  if (/\son[a-z]+\s*=/i.test(markup)) errors.push(`${label} contains an inline event handler.`);
  if (/<script(?![^>]*type=["']module["'])/i.test(markup)) errors.push(`${label} scripts must use ES modules.`);
  if (!/skip-link/.test(markup)) errors.push(`${label} skip link is missing.`);
}

function validateCss(source, label) {
  for (const breakpoint of [1120, 900, 680, 380]) {
    if (!new RegExp(`@media\\s*\\(max-width:\\s*${breakpoint}px\\)`).test(source)) errors.push(`${label} is missing responsive breakpoint ${breakpoint}px.`);
  }
  if (!/:focus-visible/.test(source)) errors.push(`${label} visible keyboard focus styling is missing.`);
  if (!/prefers-reduced-motion/.test(source)) errors.push(`${label} reduced-motion support is missing.`);
  if (!/overflow-x:\s*hidden/.test(source)) errors.push(`${label} global horizontal overflow protection is missing.`);
  if (!/\[hidden\]/.test(source)) errors.push(`${label} hidden-state rule is missing.`);
}

async function validateImports(filePath) {
  const source = await readFile(path.join(root, filePath), "utf8");
  const directory = path.dirname(path.join(root, filePath));
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  for (const imported of imports.filter((value) => value.startsWith("."))) {
    try { await access(path.resolve(directory, imported)); }
    catch { errors.push(`Missing ${filePath} import: ${imported}`); }
  }
  if (/\.innerHTML\s*=/.test(source)) errors.push(`${filePath} must not render API or repository data with innerHTML.`);
}

const ids = validateUniqueIds(html, "Reviewer");
const operatorIds = validateUniqueIds(operatorHtml, "Operator console");
validateMarkup(html, "Reviewer");
validateMarkup(operatorHtml, "Operator console");
validateCss(css, "Reviewer CSS");
validateCss(operatorCss, "Operator CSS");

const requiredIds = [
  "review-form", "repo-url", "use-case", "deployment-target", "sensitivity", "team-size", "external-services",
  "analyze-button", "sample-review", "url-error", "analysis-progress", "progress-title", "progress-detail", "progress-bar",
  "progress-steps", "report", "report-name", "report-provenance", "source-link", "new-review", "export-json",
  "export-markdown", "decision-banner", "decision-value", "decision-summary", "confidence-value", "coverage-value",
  "blocker-value", "burden-value", "effort-value", "commit-pill", "decision-reasons", "next-action-text", "repo-facts",
  "dimension-grid", "blocker-list", "question-list", "claim-ledger", "findings-list", "findings-count", "findings-search",
  "dimension-filter", "severity-filter", "operations-list", "technology-list", "evidence-list", "evidence-count",
  "pilot-checklist", "copy-checklist", "limitations-list", "live-status",
];
for (const id of requiredIds) if (!ids.includes(id)) errors.push(`Reviewer is missing required element #${id}`);
if (!/<form\b[^>]*id=["']review-form["']/i.test(html)) errors.push("Reviewer form not found.");
if (!/name=["']intent["']/i.test(html)) errors.push("Reviewer intent radio group is missing.");
if (!/aria-live/i.test(html)) errors.push("Reviewer has no live-region accessibility feedback.");

const requiredOperatorIds = [
  "health-badge", "health-label", "refresh-status", "service-name", "schema-version", "analyzer-version", "execution-mode",
  "jobs-total", "jobs-queued", "jobs-running", "jobs-completed", "jobs-failed", "last-job-at", "retention-days",
  "artifact-limit", "rate-limit", "api-base-url", "operator-test-form", "test-repository", "test-use-case", "test-intent",
  "test-deployment", "test-sensitivity", "test-team-size", "test-external-services", "run-test", "cancel-test", "test-status",
  "test-progress", "test-progress-fill", "test-stage", "test-message", "test-percent", "test-result", "result-decision",
  "result-repository", "result-confidence", "result-coverage", "result-blockers", "result-commit", "result-generated",
  "result-dimensions", "result-next-action", "theme-toggle",
];
for (const id of requiredOperatorIds) if (!operatorIds.includes(id)) errors.push(`Operator console is missing required element #${id}`);
if (!/<form\b[^>]*id=["']operator-test-form["']/i.test(operatorHtml)) errors.push("Operator smoke-test form not found.");
if (!/role=["']progressbar["']/i.test(operatorHtml)) errors.push("Operator console progress bar is missing its ARIA role.");
if (!/meta\s+name=["']forkwise-runner-base["']/i.test(operatorHtml)) errors.push("Operator runner-base metadata is missing.");

const localRefs = await validateLocalRefs(html, "Reviewer");
const operatorRefs = await validateLocalRefs(operatorHtml, "Operator console");
for (const modulePath of [
  "src/app.js",
  "src/operator.js",
  "src/runner-client.js",
  "src/hosted-report-adapter.js",
  "src/review-runtime.js",
]) await validateImports(modulePath);

const runtimeSource = await readFile(path.join(root, "src/review-runtime.js"), "utf8");
if (!/hostedEnabled:\s*false/.test(runtimeSource)) {
  errors.push("Hosted reviewer mode must remain disabled until the production lifecycle gate passes.");
}
if (!/automaticFallback:\s*false/.test(runtimeSource)) {
  errors.push("Hosted reviewer mode must not silently fall back after API failures.");
}

for (const requiredContract of [
  "docs/api/openapi.json",
  "docs/api/review-request-v1.schema.json",
  "docs/api/job-status-v1.schema.json",
  "docs/api/forkwise-report-v1.schema.json",
  "supabase/migrations/20260830_forkwise_runner_schema.sql",
  "supabase/migrations/20260831_request_bound_execution.sql",
]) {
  try { await access(path.join(root, requiredContract)); }
  catch { errors.push(`Missing production-readiness artifact: ${requiredContract}`); }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`Static validation passed: reviewer ${ids.length} IDs/${localRefs.length} assets; operator ${operatorIds.length} IDs/${operatorRefs.length} assets; dormant hosted mode, responsive/accessibility/security checks complete.`);
