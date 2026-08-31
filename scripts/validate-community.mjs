import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  "LICENSE",
  "NOTICE",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "SECURITY.md",
  "SUPPORT.md",
  "PRIVACY.md",
  "TERMS.md",
  "ACCEPTABLE_USE.md",
  ".github/CODEOWNERS",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/analyzer_rule.yml",
  ".github/ISSUE_TEMPLATE/false_positive.yml",
  ".github/ISSUE_TEMPLATE/false_negative.yml",
  ".github/ISSUE_TEMPLATE/documentation.yml",
  "docs/COMMUNITY_PREVIEW.md",
  "docs/MAINTAINER_GUIDE.md",
  "docs/REPOSITORY_SETTINGS.md",
  "docs/adr/0003-apache-2.0-license.md",
];

for (const file of requiredFiles) {
  try {
    await access(path.join(root, file));
  } catch {
    errors.push(`Missing community-readiness file: ${file}`);
  }
}

async function text(file) {
  return readFile(path.join(root, file), "utf8");
}

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) errors.push(message);
}

const packageJson = JSON.parse(await text("package.json"));
if (packageJson.version !== "0.9.0") errors.push("package.json version must be 0.9.0 for the community-preview release.");
if (packageJson.license !== "Apache-2.0") errors.push("package.json license must be Apache-2.0.");
if (packageJson.homepage !== "https://yashumani.github.io/open-source-reviewer-app/") errors.push("package.json homepage must identify the live reviewer.");
if (packageJson.repository?.url !== "https://github.com/yashumani/open-source-reviewer-app.git") errors.push("package.json repository URL is missing or incorrect.");
if (packageJson.bugs?.url !== "https://github.com/yashumani/open-source-reviewer-app/issues") errors.push("package.json bugs URL is missing or incorrect.");
if (!packageJson.scripts?.["check:community"]) errors.push("package.json must expose check:community.");
if (!packageJson.scripts?.check?.includes("check:community")) errors.push("The main check script must execute check:community.");

const license = await text("LICENSE");
requirePattern(license, /Apache License\s+Version 2\.0, January 2004/, "LICENSE is not the Apache License 2.0 text.");
requirePattern(license, /Copyright 2026 Yashu Sharma/, "LICENSE copyright notice is missing.");

const readme = await text("README.md");
for (const [pattern, label] of [
  [/Community Preview/i, "community preview"],
  [/CONTRIBUTING\.md/, "contributing link"],
  [/CODE_OF_CONDUCT\.md/, "code of conduct link"],
  [/SECURITY\.md/, "security link"],
  [/PRIVACY\.md/, "privacy link"],
  [/TERMS\.md/, "terms link"],
  [/ACCEPTABLE_USE\.md/, "acceptable-use link"],
  [/Apache License 2\.0/, "license declaration"],
]) requirePattern(readme, pattern, `README is missing ${label}.`);

const contributing = await text("CONTRIBUTING.md");
requirePattern(contributing, /Signed-off-by:/, "CONTRIBUTING must document DCO sign-off.");
requirePattern(contributing, /npm run validate/, "CONTRIBUTING must document the validation command.");
requirePattern(contributing, /static-only/i, "CONTRIBUTING must preserve the static-only boundary.");

const security = await text("SECURITY.md");
requirePattern(security, /security\/advisories\/new/, "SECURITY must include the private vulnerability-reporting path.");
requirePattern(security, /Do not open a public issue containing exploit steps/i, "SECURITY must warn against public sensitive disclosure.");

const codeowners = await text(".github/CODEOWNERS");
requirePattern(codeowners, /\*\s+@yashumani/, "CODEOWNERS must define a default maintainer.");

const templateFiles = requiredFiles.filter((file) => file.startsWith(".github/ISSUE_TEMPLATE/") && file.endsWith(".yml") && !file.endsWith("config.yml"));
for (const file of templateFiles) {
  const source = await text(file);
  requirePattern(source, /^name:\s+.+/m, `${file} is missing a name.`);
  requirePattern(source, /^description:\s+.+/m, `${file} is missing a description.`);
  requirePattern(source, /^body:\s*$/m, `${file} is missing an issue-form body.`);
  requirePattern(source, /required:\s+true/, `${file} has no required field.`);
}

const config = await text(".github/ISSUE_TEMPLATE/config.yml");
requirePattern(config, /blank_issues_enabled:\s+false/, "Issue-template config must disable blank issues.");
requirePattern(config, /security\/advisories\/new/, "Issue-template config must link private vulnerability reporting.");

const pullRequestTemplate = await text(".github/PULL_REQUEST_TEMPLATE.md");
requirePattern(pullRequestTemplate, /Security boundary/, "Pull-request template must include the security-boundary checklist.");
requirePattern(pullRequestTemplate, /Signed-off-by/, "Pull-request template must require contributor sign-off.");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Community readiness passed: ${requiredFiles.length} required files, Apache-2.0 metadata, six issue forms, contributor/security/governance contracts.`);
