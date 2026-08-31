import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const files = {
  openapi: "docs/api/openapi.json",
  request: "docs/api/review-request-v1.schema.json",
  job: "docs/api/job-status-v1.schema.json",
  report: "docs/api/forkwise-report-v1.schema.json",
};

const documents = {};
for (const [name, relative] of Object.entries(files)) {
  const text = await readFile(path.join(root, relative), "utf8");
  documents[name] = JSON.parse(text);
}

const errors = [];
const openapi = documents.openapi;
if (openapi.openapi !== "3.1.0") errors.push("OpenAPI version must be 3.1.0.");
for (const route of ["/health", "/v1/stats", "/v1/reviews", "/v1/jobs/{jobId}", "/v1/reports/{reportId}"]) {
  if (!openapi.paths?.[route]) errors.push(`OpenAPI route missing: ${route}`);
}
if (documents.report.properties?.schemaVersion?.const !== "forkwise-report/v1") {
  errors.push("Report schema version constant is incorrect.");
}
if (documents.report.properties?.execution?.const !== "static-only") {
  errors.push("Report schema must preserve static-only execution.");
}
if (documents.report.properties?.dimensions?.minItems !== 5 || documents.report.properties?.dimensions?.maxItems !== 5) {
  errors.push("Report schema must require exactly five dimensions.");
}
if (documents.request.properties?.context?.$ref !== "#/$defs/reviewContext") {
  errors.push("Review request must reference the normalized context definition.");
}
const context = documents.request.$defs?.reviewContext;
for (const required of ["intent", "useCase", "deploymentTarget", "sensitivity", "teamSize", "externalServices"]) {
  if (!context?.required?.includes(required)) errors.push(`Review context missing required field: ${required}`);
}
const reportRef = openapi.paths?.["/v1/reports/{reportId}"]?.get?.responses?.["200"]?.content?.["application/json"]?.schema?.$ref;
if (reportRef !== "forkwise-report-v1.schema.json") errors.push("Report endpoint does not reference the versioned report schema.");
const requestRef = openapi.paths?.["/v1/reviews"]?.post?.requestBody?.content?.["application/json"]?.schema?.$ref;
if (requestRef !== "review-request-v1.schema.json") errors.push("Create-review endpoint does not reference the versioned request schema.");

const serialized = JSON.stringify(documents);
for (const forbidden of ["npm install", "pip install", "docker build repository", "execute repository code"]) {
  if (serialized.toLowerCase().includes(forbidden)) errors.push(`Contract contains prohibited execution language: ${forbidden}`);
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`API contract validation passed: ${Object.keys(files).length} JSON documents, ${Object.keys(openapi.paths).length} paths, static-only report schema.`);
