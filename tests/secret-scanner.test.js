import test from "node:test";
import assert from "node:assert/strict";

import {
  isCredentialPlaceholder,
  isCredentialReference,
  scanCredentialCandidates,
} from "../src/secret-scanner.js";

test("environment and secret-store references are not exposed literals", () => {
  const result = scanCredentialCandidates([
    { path: "deploy/docker-compose.prod.yml", content: "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}" },
    { path: ".github/workflows/deploy.yml", content: "API_KEY: ${{ secrets.PROVIDER_API_KEY }}" },
    { path: "src/config.js", content: "client_secret = process.env.CLIENT_SECRET" },
  ]);

  assert.equal(result.exposed.length, 0);
  assert.ok(result.references.length >= 2);
});

test("documented placeholders and explicit CI or local defaults are not critical secrets", () => {
  const result = scanCredentialCandidates([
    { path: "README.md", content: "OPENROUTER_API_KEY=<your-openrouter-api-key>" },
    { path: ".github/workflows/database-contract.yml", content: "POSTGRES_PASSWORD: forkwise-test" },
    { path: "docker-compose.local.yml", content: "POSTGRES_PASSWORD: talk2data-local-only" },
    { path: ".github/workflows/ci.yml", content: "UKB_POSTGRES_PASSWORD: ci-only-password" },
    { path: ".env.example", content: "API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx" },
  ]);

  assert.equal(result.exposed.length, 0);
  assert.ok(result.defaults.length >= 4);
});

test("high-confidence structured tokens remain exposed even in ordinary text", () => {
  const token = "ghp_123456789012345678901234567890123456";
  const result = scanCredentialCandidates([{ path: "config.txt", content: `token=${token}` }]);

  assert.equal(result.exposed.length, 1);
  assert.equal(result.exposed[0].kind, "GitHub token");
  assert.equal(result.exposed[0].match, token);
});

test("high-entropy literals and production credential defaults remain exposed", () => {
  const result = scanCredentialCandidates([
    { path: "src/config.js", content: 'client_secret = "A1b2C3d4E5f6G7h8I9"' },
    { path: "deploy/production.yml", content: "ADMIN_PASSWORD: admin12345" },
  ]);

  assert.equal(result.exposed.length, 2);
});

test("low-entropy literals outside production are separated from exposed secrets", () => {
  const result = scanCredentialCandidates([{ path: "config/defaults.yml", content: "PASSWORD: internal123" }]);

  assert.equal(result.exposed.length, 0);
  assert.equal(result.defaults[0].disposition, "literal-default");
});

test("placeholder and reference classifiers cover common explicit forms", () => {
  assert.equal(isCredentialReference("${TOKEN}"), true);
  assert.equal(isCredentialReference("<your-api-key>"), true);
  assert.equal(isCredentialPlaceholder("forkwise-test"), true);
  assert.equal(isCredentialPlaceholder("sk-proj-xxxxxxxxxxxxxxxxxxxx"), true);
  assert.equal(isCredentialPlaceholder("A1b2C3d4E5f6G7h8"), false);
});
