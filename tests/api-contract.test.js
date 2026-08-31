import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateReviewContext } from "../server/contracts.js";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const requestSchema = await readJson("../docs/api/review-request-v1.schema.json");
const reportSchema = await readJson("../docs/api/forkwise-report-v1.schema.json");
const openapi = await readJson("../docs/api/openapi.json");

test("OpenAPI exposes the complete versioned runner lifecycle", () => {
  assert.equal(openapi.openapi, "3.1.0");
  assert.ok(openapi.paths["/health"].get);
  assert.ok(openapi.paths["/v1/stats"].get);
  assert.ok(openapi.paths["/v1/reviews"].post);
  assert.ok(openapi.paths["/v1/jobs/{jobId}"].get);
  assert.ok(openapi.paths["/v1/reports/{reportId}"].get);
  assert.equal(
    openapi.paths["/v1/reports/{reportId}"].get.responses["200"].content["application/json"].schema.$ref,
    "forkwise-report-v1.schema.json",
  );
});

test("published and local servers use the exact review-api base", () => {
  const urls = openapi.servers.map((server) => server.url);
  assert.ok(urls.includes("https://forkwise-runner.lovable.app/functions/v1/review-api"));
  assert.ok(urls.includes("http://127.0.0.1:8787/functions/v1/review-api"));
});

test("request schema enums match runtime context validation", () => {
  const properties = requestSchema.$defs.reviewContext.properties;
  const valid = {
    intent: "self-host",
    useCase: "Contract validation.",
    deploymentTarget: "docker",
    sensitivity: "internal",
    teamSize: "small",
    externalServices: "disclosed",
  };
  assert.deepEqual(validateReviewContext(valid), valid);
  for (const [field, property] of Object.entries(properties)) {
    if (!Array.isArray(property.enum)) continue;
    for (const candidate of property.enum) {
      assert.equal(validateReviewContext({ ...valid, [field]: candidate })[field], candidate);
    }
  }
});

test("report schema fixes provenance and static-only safety invariants", () => {
  assert.equal(reportSchema.properties.schemaVersion.const, "forkwise-report/v1");
  assert.equal(reportSchema.properties.execution.const, "static-only");
  assert.equal(reportSchema.properties.repository.properties.commitSha.pattern, "^[0-9a-fA-F]{40}$");
  assert.equal(reportSchema.properties.dimensions.minItems, 5);
  assert.equal(reportSchema.properties.dimensions.maxItems, 5);
  for (const required of ["findings", "evidence", "claims", "limitations", "inventory"]) {
    assert.ok(reportSchema.required.includes(required));
  }
});
