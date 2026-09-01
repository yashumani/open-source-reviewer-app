import test from "node:test";
import assert from "node:assert/strict";

import { analyzeRepository } from "../src/analyzer.js";
import { contexts, makeSnapshot } from "./fixtures.js";

function baselineFiles(extra = {}) {
  return {
    "README.md": "# Review target\nSelf-hosted with Docker.",
    "LICENSE": "Apache License 2.0",
    "package.json": '{"scripts":{"test":"node --test"}}',
    "Dockerfile": "FROM node:22-alpine",
    ".env.example": "PORT=3000",
    ".github/workflows/quality.yml": "steps:\n  - run: npm test",
    "tests/app.test.js": "test('app', () => {});",
    "SECURITY.md": "Report privately.",
    ...extra,
  };
}

test("CI service passwords do not turn a healthy repository into Avoid", () => {
  const files = baselineFiles({
    ".github/workflows/database-contract.yml": "services:\n  postgres:\n    env:\n      POSTGRES_PASSWORD: forkwise-test\nsteps:\n  - run: npm test",
  });
  const assessment = analyzeRepository(makeSnapshot({ files }), contexts.selfHost);

  assert.notEqual(assessment.decision, "Avoid");
  assert.equal(assessment.findings.some((finding) => finding.ruleId === "potential-secret"), false);
});

test("README API-key placeholders do not create a credential finding", () => {
  const assessment = analyzeRepository(makeSnapshot({
    files: baselineFiles({ "README.md": "# App\nOPENROUTER_API_KEY=<your-openrouter-api-key>" }),
  }), contexts.selfHost);

  assert.equal(assessment.findings.some((finding) => finding.ruleId === "potential-secret"), false);
});

test("environment references in production Compose remain non-secret evidence", () => {
  const assessment = analyzeRepository(makeSnapshot({
    files: baselineFiles({
      "deploy/docker-compose.prod.yml": "services:\n  db:\n    environment:\n      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}",
    }),
  }), contexts.selfHost);

  assert.equal(assessment.findings.some((finding) => finding.ruleId === "potential-secret"), false);
});

test("an actual high-confidence token remains critical, blocking, and redacted", () => {
  const secret = "ghp_123456789012345678901234567890123456";
  const assessment = analyzeRepository(makeSnapshot({
    files: baselineFiles({ "src/config.txt": `token=${secret}` }),
  }), contexts.selfHost);
  const serialized = JSON.stringify(assessment);
  const finding = assessment.findings.find((item) => item.ruleId === "potential-secret");

  assert.ok(finding);
  assert.equal(finding.severity, "critical");
  assert.equal(finding.blocking, true);
  assert.equal(assessment.decision, "Avoid");
  assert.equal(serialized.includes(secret), false);
  assert.match(serialized, /REDACTED/);
});
