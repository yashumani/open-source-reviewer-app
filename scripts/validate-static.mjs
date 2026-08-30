import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const html = await readFile(path.join(root, "index.html"), "utf8");
const css = await readFile(path.join(root, "styles.css"), "utf8");

const errors = [];
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) errors.push(`Duplicate HTML IDs: ${[...new Set(duplicates)].join(", ")}`);

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
for (const id of requiredIds) if (!ids.includes(id)) errors.push(`Missing required element #${id}`);

if (!/<main\b/i.test(html)) errors.push("Missing semantic <main> element.");
if (!/<h1\b/i.test(html)) errors.push("Missing primary heading.");
if (!/<form\b[^>]*id=["']review-form["']/i.test(html)) errors.push("Review form not found.");
if (!/name=["']intent["']/i.test(html)) errors.push("Intent radio group is missing.");
if (/\son[a-z]+\s*=/i.test(html)) errors.push("Inline event handlers are not allowed.");
if (/<script(?![^>]*type=["']module["'])/i.test(html)) errors.push("Scripts must use ES modules.");
if (!/aria-live/i.test(html)) errors.push("No live-region accessibility feedback was found.");
if (!/skip-link/.test(html)) errors.push("Skip link is missing.");

const localRefs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)]
  .map((match) => match[1])
  .filter((value) => !/^(?:https?:|mailto:|tel:|data:)/i.test(value))
  .filter((value) => !value.endsWith(".md"));
for (const ref of localRefs) {
  try { await access(path.join(root, ref)); }
  catch { errors.push(`Missing local asset: ${ref}`); }
}

for (const breakpoint of [1120, 900, 680, 380]) {
  if (!new RegExp(`@media\\s*\\(max-width:\\s*${breakpoint}px\\)`).test(css)) errors.push(`Missing responsive breakpoint ${breakpoint}px.`);
}
if (!/:focus-visible/.test(css)) errors.push("Visible keyboard focus styling is missing.");
if (!/prefers-reduced-motion/.test(css)) errors.push("Reduced-motion support is missing.");
if (!/overflow-x:\s*hidden/.test(css)) errors.push("Global horizontal overflow protection is missing.");
if (!/\[hidden\]/.test(css)) errors.push("Hidden-state rule is missing.");

const app = await readFile(path.join(root, "src/app.js"), "utf8");
const imports = [...app.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
for (const imported of imports.filter((value) => value.startsWith("."))) {
  try { await access(path.resolve(root, "src", imported)); }
  catch { errors.push(`Missing app import: ${imported}`); }
}
if (/\.innerHTML\s*=/.test(app)) errors.push("Repository-derived UI must not be rendered with innerHTML.");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`Static validation passed: ${ids.length} unique IDs, ${localRefs.length} local assets, responsive/accessibility/security checks complete.`);
