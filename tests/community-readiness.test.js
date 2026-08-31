import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("community release declares Apache-2.0 consistently", async () => {
  const [license, notice, packageSource, readme] = await Promise.all([
    read("LICENSE"),
    read("NOTICE"),
    read("package.json"),
    read("README.md"),
  ]);
  const packageJson = JSON.parse(packageSource);
  assert.equal(packageJson.license, "Apache-2.0");
  assert.match(license, /Apache License\s+Version 2\.0/);
  assert.match(notice, /ForkWise/);
  assert.match(readme, /Apache License 2\.0/);
});

test("public contribution entry points are present", async () => {
  const [contributing, codeOfConduct, security, support, pullRequest] = await Promise.all([
    read("CONTRIBUTING.md"),
    read("CODE_OF_CONDUCT.md"),
    read("SECURITY.md"),
    read("SUPPORT.md"),
    read(".github/PULL_REQUEST_TEMPLATE.md"),
  ]);
  assert.match(contributing, /Signed-off-by:/);
  assert.match(contributing, /static-only/i);
  assert.match(codeOfConduct, /Contributor Covenant/);
  assert.match(security, /security\/advisories\/new/);
  assert.match(support, /False positive/);
  assert.match(pullRequest, /No repository-controlled code is executed/);
});

test("issue forms separate bug, rule, documentation, and analyzer-quality feedback", async () => {
  const files = [
    "bug_report.yml",
    "feature_request.yml",
    "analyzer_rule.yml",
    "false_positive.yml",
    "false_negative.yml",
    "documentation.yml",
  ];
  const sources = await Promise.all(files.map((file) => read(`.github/ISSUE_TEMPLATE/${file}`)));
  for (const [index, source] of sources.entries()) {
    assert.match(source, /^name:/m, files[index]);
    assert.match(source, /^description:/m, files[index]);
    assert.match(source, /^body:/m, files[index]);
    assert.match(source, /required:\s+true/, files[index]);
  }
});

test("community-preview policies prohibit sensitive input and unsupported guarantees", async () => {
  const [privacy, terms, acceptableUse, preview] = await Promise.all([
    read("PRIVACY.md"),
    read("TERMS.md"),
    read("ACCEPTABLE_USE.md"),
    read("docs/COMMUNITY_PREVIEW.md"),
  ]);
  assert.match(privacy, /browser/i);
  assert.match(privacy, /Do not submit/i);
  assert.match(terms, /decision-support/i);
  assert.match(terms, /not a security certification/i);
  assert.match(acceptableUse, /private.*data/i);
  assert.match(preview, /Hosted runner.*remains blocked/is);
});
