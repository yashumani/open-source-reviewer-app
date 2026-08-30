import test from "node:test";
import assert from "node:assert/strict";
import { fetchRepositorySnapshot, GitHubReviewError, parseGitHubUrl } from "../src/github.js";

const validCases = [
  ["https://github.com/openai/openai", "openai/openai"],
  ["https://github.com/openai/openai/", "openai/openai"],
  ["https://github.com/openai/openai.git", "openai/openai"],
  ["github.com/openai/openai", "openai/openai"],
  ["openai/openai", "openai/openai"],
  ["git@github.com:openai/openai.git", "openai/openai"],
  ["https://github.com/openai/openai/tree/main/src", "openai/openai"],
];
for (const [input, expected] of validCases) {
  test(`parseGitHubUrl accepts ${input}`, () => assert.equal(parseGitHubUrl(input).fullName, expected));
}

for (const input of ["", "https://gitlab.com/a/b", "https://github.com/owner", "https://github.com/a/b%2Fc", "not a repo"]) {
  test(`parseGitHubUrl rejects ${input || "empty input"}`, () => assert.throws(() => parseGitHubUrl(input)));
}

test("fetchRepositorySnapshot pins content and tree to an exact commit", async () => {
  const calls = [];
  const commitSha = "a".repeat(40);
  const treeSha = "b".repeat(40);
  const readmeSha = "c".repeat(40);
  const packageSha = "d".repeat(40);
  const fetchImpl = async (url) => {
    calls.push(String(url));
    const pathname = new URL(url).pathname;
    const search = new URL(url).search;
    let data;
    if (pathname === "/repos/acme/tool") data = { name: "tool", full_name: "acme/tool", html_url: "https://github.com/acme/tool", default_branch: "main", archived: false, disabled: false, visibility: "public", topics: [] };
    else if (pathname === "/repos/acme/tool/commits/main") data = { sha: commitSha, html_url: `https://github.com/acme/tool/commit/${commitSha}`, commit: { tree: { sha: treeSha }, author: { date: "2026-08-20T00:00:00Z" }, committer: { date: "2026-08-20T00:00:00Z" }, message: "commit" } };
    else if (pathname === `/repos/acme/tool/git/trees/${treeSha}` && search === "?recursive=1") data = { truncated: false, tree: [{ path: "README.md", type: "blob", size: 20, sha: readmeSha }, { path: "package.json", type: "blob", size: 30, sha: packageSha }] };
    else if (pathname === `/repos/acme/tool/git/blobs/${readmeSha}`) data = { encoding: "base64", content: Buffer.from("# Tool\nPinned README").toString("base64"), size: 20 };
    else if (pathname === `/repos/acme/tool/git/blobs/${packageSha}`) data = { encoding: "base64", content: Buffer.from('{"name":"tool"}').toString("base64"), size: 30 };
    else if (pathname === "/repos/acme/tool/readme" && search === `?ref=${commitSha}`) data = { path: "README.md", sha: readmeSha, encoding: "base64", content: Buffer.from("# Tool\nPinned README").toString("base64"), size: 20 };
    else if (pathname === "/repos/acme/tool/releases/latest") return new Response("{}", { status: 404 });
    else return new Response(JSON.stringify({ message: `Unexpected ${pathname}${search}` }), { status: 500 });
    return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
  };

  const snapshot = await fetchRepositorySnapshot(parseGitHubUrl("acme/tool"), { fetchImpl });
  assert.equal(snapshot.commit.sha, commitSha);
  assert.equal(snapshot.commit.tree_sha, treeSha);
  assert.equal(snapshot.readme, "# Tool\nPinned README");
  assert.equal(snapshot.treeTruncated, false);
  assert.ok(snapshot.contents.every((item) => item.url.includes(commitSha)));
  assert.ok(calls.some((url) => url.includes(`/git/trees/${treeSha}?recursive=1`)));
  assert.ok(calls.some((url) => url.includes(`/readme?ref=${commitSha}`)));
});

test("fetchRepositorySnapshot tolerates an unavailable optional latest release", async () => {
  const commitSha = "a".repeat(40);
  const treeSha = "b".repeat(40);
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/releases/latest") || parsed.pathname.endsWith("/readme")) return new Response("{}", { status: 404 });
    if (parsed.pathname === "/repos/acme/tool") return Response.json({ name: "tool", full_name: "acme/tool", html_url: "https://github.com/acme/tool", default_branch: "main", topics: [] });
    if (parsed.pathname.endsWith("/commits/main")) return Response.json({ sha: commitSha, html_url: "x", commit: { tree: { sha: treeSha }, author: {}, committer: {} } });
    if (parsed.pathname.includes("/git/trees/")) return Response.json({ truncated: false, tree: [] });
    throw new Error(`Unexpected ${url}`);
  };
  const snapshot = await fetchRepositorySnapshot(parseGitHubUrl("acme/tool"), { fetchImpl });
  assert.equal(snapshot.release, null);
  assert.equal(snapshot.readme, "");
});

test("fetchRepositorySnapshot reports anonymous API rate limiting", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ message: "rate limited" }), { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } });
  await assert.rejects(
    fetchRepositorySnapshot(parseGitHubUrl("acme/tool"), { fetchImpl }),
    (error) => error instanceof GitHubReviewError && error.code === "rate_limited" && error.details.reset === 1900000000 * 1000,
  );
});

test("fetchRepositorySnapshot reports inaccessible repositories without leaking API details", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
  await assert.rejects(fetchRepositorySnapshot(parseGitHubUrl("acme/tool"), { fetchImpl }), /not found or not publicly accessible/i);
});
