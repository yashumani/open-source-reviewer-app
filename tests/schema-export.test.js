import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepository } from "../src/analyzer.js";
import { createJsonExport, createMarkdownExport, safeFileName } from "../src/export.js";
import { createSampleSnapshot, sampleContext } from "../src/sample.js";
import { createEvidence, createFinding, normalizeContext, redactSensitiveText, validateAssessment } from "../src/schema.js";

test("normalizeContext applies safe defaults and length limits", () => {
  const context = normalizeContext({ intent: "bad", useCase: "x".repeat(2000), teamSize: "bad" });
  assert.equal(context.intent, "self-host");
  assert.equal(context.teamSize, "small");
  assert.equal(context.useCase.length, 1000);
});

test("redactSensitiveText masks GitHub and generic secret patterns", () => {
  const text = redactSensitiveText("ghp_123456789012345678901234567890 token password=supersecretvalue");
  assert.doesNotMatch(text, /ghp_123456789012345678901234567890/);
  assert.doesNotMatch(text, /supersecretvalue/);
  assert.match(text, /REDACTED/);
});

test("createEvidence redacts excerpts", () => {
  const evidence = createEvidence({ id: "E1", type: "file", label: "key", detail: "key", excerpt: "OPENAI_API_KEY=sk-proj-1234567890abcdefghijkl" });
  assert.doesNotMatch(evidence.excerpt, /sk-proj-1234567890abcdefghijkl/);
});

test("createFinding rejects unsupported dimensions", () => {
  assert.throws(() => createFinding({ id: "F1", ruleId: "x", dimension: "Quality", type: "risk", severity: "high", title: "x", summary: "x" }));
});

test("validateAssessment catches missing evidence references", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  assessment.findings[0].evidenceIds.push("does-not-exist");
  assert.ok(validateAssessment(assessment).some((error) => /missing evidence/i.test(error)));
});

test("JSON export preserves schema, commit provenance, and findings", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  const exported = JSON.parse(createJsonExport(assessment));
  assert.equal(exported.reportSchemaVersion, "forkwise-report/v1");
  assert.equal(exported.assessment.repository.commitSha, assessment.repository.commitSha);
  assert.equal(exported.assessment.findings.length, assessment.findings.length);
});

test("Markdown export includes decision, dimensions, claims, provenance, and checklist", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  const markdown = createMarkdownExport(assessment);
  assert.match(markdown, /\*\*Decision: Pilot\*\*/);
  assert.match(markdown, /README Reality Check/);
  assert.match(markdown, /Analyzed commit/);
  assert.match(markdown, /- \[ \]/);
  assert.match(markdown, new RegExp(assessment.repository.commitSha));
});

test("exports do not reintroduce suspected secret values", () => {
  const assessment = analyzeRepository(createSampleSnapshot(), sampleContext);
  assessment.summary = "password=supersecretvalue";
  const json = createJsonExport(assessment);
  const markdown = createMarkdownExport(assessment);
  assert.doesNotMatch(json, /supersecretvalue/);
  assert.doesNotMatch(markdown, /supersecretvalue/);
});

test("safeFileName removes path and shell separators", () => {
  assert.equal(safeFileName("../../acme/tool report; rm -rf", "JSON"), "..-..-acme-tool-report-rm-rf.json");
});
