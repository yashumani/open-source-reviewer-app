import test from "node:test";
import assert from "node:assert/strict";
import { buildArtifactInventory, contentPriority, countExtensions, selectContentCandidates } from "../src/inventory.js";
import { makeSnapshot } from "./fixtures.js";

test("buildArtifactInventory classifies common repository artifacts", () => {
  const snapshot = makeSnapshot({ files: {
    "README.md": "docs", "LICENSE": "MIT", "SECURITY.md": "security", "CONTRIBUTING.md": "contribute",
    ".github/workflows/ci.yml": "ci", ".github/dependabot.yml": "deps", "Dockerfile": "container",
    "compose.yaml": "compose", ".env.example": "PORT=1", "package.json": "{}", "tests/a.test.js": "test",
    "docs/backup.md": "backup", "docs/export.md": "export", "openapi.yaml": "openapi: 3.1.0",
  }});
  const inventory = buildArtifactInventory(snapshot);
  assert.equal(inventory.readmes.length, 1);
  assert.equal(inventory.licenses.length, 1);
  assert.equal(inventory.securityPolicies.length, 1);
  assert.equal(inventory.workflows.length, 1);
  assert.equal(inventory.tests.length, 1);
  assert.equal(inventory.compose.length, 1);
  assert.equal(inventory.backupDocs.length, 1);
  assert.equal(inventory.exportDocs.length, 1);
  assert.equal(inventory.apiSpecs.length, 1);
});

test("buildArtifactInventory preserves tree truncation", () => {
  assert.equal(buildArtifactInventory(makeSnapshot({ treeTruncated: true })).treeTruncated, true);
});

test("contentPriority gives core governance and deployment files highest priority", () => {
  assert.equal(contentPriority("README.md"), 100);
  assert.equal(contentPriority(".github/workflows/quality.yml"), 100);
  assert.equal(contentPriority("docs/architecture.md"), 60);
  assert.equal(contentPriority("src/app.js"), 0);
});

test("selectContentCandidates is bounded and ignores binary/oversized files", () => {
  const tree = [
    { path: "README.md", type: "blob", size: 100, sha: "a" },
    { path: "package.json", type: "blob", size: 100, sha: "b" },
    { path: "docs/guide.md", type: "blob", size: 100, sha: "c" },
    { path: "assets/logo.png", type: "blob", size: 100, sha: "d" },
    { path: "SECURITY.md", type: "blob", size: 999999, sha: "e" },
  ];
  const selected = selectContentCandidates(tree, { limit: 2, maxFileSize: 1000 });
  assert.deepEqual(new Set(selected.map((item) => item.path)), new Set(["README.md", "package.json"]));
});

test("countExtensions returns descending extension counts", () => {
  const counts = countExtensions(["a.js", "b.js", "c.md", "Dockerfile"]);
  assert.deepEqual(counts[0], { name: "js", count: 2 });
  assert.ok(counts.some((item) => item.name === "dockerfile"));
});
