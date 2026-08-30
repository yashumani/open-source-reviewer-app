import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepository } from "../src/analyzer.js";
import { createSampleSnapshot, sampleContext } from "../src/sample.js";
import { validateAssessment } from "../src/schema.js";
import { contexts, makeSnapshot } from "./fixtures.js";

test("sample assessment produces a valid contextual Pilot report", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  assert.equal(assessment.decision, "Pilot");
  assert.deepEqual(validateAssessment(assessment), []);
  assert.equal(assessment.dimensions.length, 5);
  assert.ok(assessment.findings.length >= 15);
  assert.ok(assessment.evidence.length >= 15);
  assert.ok(assessment.pilotChecklist.length >= 6);
});

test("sample README Reality Check verifies deployment and contradicts privacy claim", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  const states = Object.fromEntries(assessment.claims.map((claim) => [claim.id, claim.state]));
  assert.equal(states["CLM-self-hosted"], "verified");
  assert.equal(states["CLM-docker"], "verified");
  assert.equal(states["CLM-production"], "verified");
  assert.equal(states["CLM-privacy"], "contradicted");
});

test("missing license blocks normal adoption", () => {
  const files = { "README.md": "# Tool", "package.json": "{}", "tests/a.test.js": "test" };
  const assessment = analyzeRepository(makeSnapshot({ files, repo: { license: null }, release: null }), contexts.dependency);
  assert.equal(assessment.decision, "Avoid");
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "license-missing" && finding.blocking));
});

test("archived repository produces Avoid", () => {
  const assessment = analyzeRepository(makeSnapshot({ repo: { archived: true } }), contexts.selfHost);
  assert.equal(assessment.decision, "Avoid");
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "repository-state" && finding.severity === "critical"));
});

test("very low evidence produces Insufficient evidence", () => {
  const assessment = analyzeRepository(makeSnapshot({ files: {}, selectedContentCount: 0, repo: { license: null }, release: null }), contexts.contribute);
  assert.equal(assessment.decision, "Insufficient evidence");
  assert.ok(assessment.evidenceCoverage < 35);
});

test("fork context can produce Fork when ownership burden is high", () => {
  const files = { "README.md": "# Old app", "LICENSE": "MIT", "package.json": '{"dependencies":{"react":"1","express":"1","mongodb":"1","redis":"1"}}' };
  const assessment = analyzeRepository(makeSnapshot({ files, repo: { pushed_at: "2022-01-01T00:00:00Z" }, release: null }), contexts.fork);
  assert.equal(assessment.decision, "Fork");
  assert.equal(assessment.ownershipBurden, "High");
});

test("context can change the decision without changing repository facts", () => {
  const snapshot = makeSnapshot({ files: {
    "README.md": "# App\nSelf hosted with local setup.",
    "LICENSE": "MIT",
    "package.json": '{"dependencies":{"firebase":"1"}}',
    "src/config.js": "const backend = process.env.FIREBASE_PROJECT_ID;",
    "tests/a.test.js": "test",
    ".github/workflows/ci.yml": "- run: npm test",
  }});
  const allowed = analyzeRepository(snapshot, { ...contexts.selfHost, externalServices: "allowed" });
  const prohibited = analyzeRepository(snapshot, { ...contexts.selfHost, externalServices: "prohibited" });
  assert.notEqual(allowed.blockerCount, prohibited.blockerCount);
  assert.ok(prohibited.findings.some((finding) => finding.ruleId === "external-services-observed" && finding.blocking));
});

test("regulated data without security policy creates a blocking risk", () => {
  const files = { "README.md": "# App", "LICENSE": "MIT", "package.json": "{}", "tests/a.test.js": "test", ".github/workflows/ci.yml": "- run: npm test" };
  const assessment = analyzeRepository(makeSnapshot({ files }), { ...contexts.selfHost, sensitivity: "regulated" });
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "security-policy-missing" && finding.blocking));
  assert.equal(assessment.decision, "Pilot");
});

test("analyzer never fabricates a coverage percentage", () => {
  const assessment = analyzeRepository(makeSnapshot(), contexts.selfHost);
  const coverageFinding = assessment.findings.find((finding) => finding.ruleId === "coverage-unknown");
  assert.ok(coverageFinding);
  assert.doesNotMatch(JSON.stringify(assessment), /\b\d{1,3}% test coverage\b/i);
});

test("potential secrets are detected and redacted from the complete report", () => {
  const secret = "ghp_123456789012345678901234567890123456";
  const files = { ...Object.fromEntries(makeSnapshot().contents.map((item) => [item.path, item.content])), "config.txt": `token=${secret}` };
  const assessment = analyzeRepository(makeSnapshot({ files }), contexts.selfHost);
  const serialized = JSON.stringify(assessment);
  assert.equal(serialized.includes(secret), false);
  assert.match(serialized, /REDACTED/);
  assert.equal(assessment.decision, "Avoid");
});

test("tracked .env file creates a high blocking risk", () => {
  const files = { ...Object.fromEntries(makeSnapshot().contents.map((item) => [item.path, item.content])), ".env": "DEBUG=true" };
  const assessment = analyzeRepository(makeSnapshot({ files }), contexts.selfHost);
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "tracked-env" && finding.blocking));
});

test("tree truncation caps evidence coverage and adds a limitation", () => {
  const assessment = analyzeRepository(makeSnapshot({ treeTruncated: true }), contexts.selfHost);
  assert.ok(assessment.evidenceCoverage <= 68);
  assert.ok(assessment.limitations.some((item) => /truncated/i.test(item)));
});

test("operational inventory extracts deployment, data services, variables, and ports", () => {
  const files = {
    "README.md": "# App", "LICENSE": "MIT", "package.json": '{"dependencies":{"redis":"1","pg":"1"}}',
    "docker-compose.yml": "services:\n app:\n  ports: [\"8080:3000\"]\n  environment:\n   DATABASE_URL: postgres://db/app\n   REDIS_URL: redis://cache",
    ".env.example": "DATABASE_URL=postgres://db/app\nREDIS_URL=redis://cache\nPORT=3000",
    "tests/a.test.js": "test", ".github/workflows/ci.yml": "- run: npm test", "SECURITY.md": "security",
  };
  const assessment = analyzeRepository(makeSnapshot({ files }), contexts.selfHost);
  assert.ok(assessment.operations.deployment.includes("Docker Compose"));
  assert.ok(assessment.operations.databases.includes("PostgreSQL"));
  assert.ok(assessment.operations.databases.includes("Redis"));
  assert.ok(assessment.operations.environmentVariables.includes("DATABASE_URL"));
  assert.ok(assessment.operations.ports.includes("8080") || assessment.operations.ports.includes("3000"));
});

test("dependency mode reports missing package manifests", () => {
  const assessment = analyzeRepository(makeSnapshot({ files: { "README.md": "# Source", "LICENSE": "MIT", "tests/a.test.js": "test" } }), contexts.dependency);
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "dependency-manifest-missing" && finding.blocking));
});

test("contribution mode evaluates contributor onboarding", () => {
  const assessment = analyzeRepository(makeSnapshot({ files: { "README.md": "# Source", "LICENSE": "MIT", "package.json": "{}" } }), contexts.contribute);
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "contributing-missing"));
});

test("contribution mode does not turn a missing license alone into Avoid", () => {
  const files = { "README.md": "# Project", "CONTRIBUTING.md": "Send a PR", "package.json": "{}" };
  const assessment = analyzeRepository(makeSnapshot({ files, repo: { license: null }, release: null }), contexts.contribute);
  assert.notEqual(assessment.decision, "Avoid");
});

test("claim absence is distinct from contradiction", () => {
  const assessment = analyzeRepository(makeSnapshot(), contexts.selfHost);
  const privacy = assessment.claims.find((claim) => claim.id === "CLM-privacy");
  assert.equal(privacy.claimed, false);
  assert.notEqual(privacy.state, "contradicted");
});

test("supported external-service indicators do not claim proven data flow", () => {
  const files = { ...Object.fromEntries(makeSnapshot().contents.map((item) => [item.path, item.content])), "src/telemetry.js": "import Sentry from '@sentry/node';" };
  const assessment = analyzeRepository(makeSnapshot({ files }), contexts.selfHost);
  const finding = assessment.findings.find((item) => item.ruleId === "external-services-observed");
  assert.match(finding.summary, /does not prove/i);
});

test("every finding and claim references existing evidence", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  const ids = new Set(assessment.evidence.map((item) => item.id));
  for (const finding of assessment.findings) for (const id of finding.evidenceIds) assert.ok(ids.has(id));
  for (const claim of assessment.claims) for (const id of claim.evidenceIds) assert.ok(ids.has(id));
});
