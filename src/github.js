import { selectContentCandidates } from "./inventory.js";

const API_ROOT = "https://api.github.com";
const HOSTS = new Set(["github.com", "www.github.com"]);

export class GitHubReviewError extends Error {
  constructor(message, code = "github_error", details = {}) {
    super(message);
    this.name = "GitHubReviewError";
    this.code = code;
    this.details = details;
  }
}

export function parseGitHubUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Enter a public GitHub repository URL.");

  let candidate = raw;
  if (/^git@github\.com:/i.test(candidate)) candidate = candidate.replace(/^git@github\.com:/i, "https://github.com/");
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(candidate)) candidate = `https://github.com/${candidate}`;
  if (!candidate.includes("://")) candidate = `https://${candidate}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("The current reviewer supports public github.com repositories only.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("The URL must include both an owner and repository name.");
  const owner = decodeURIComponent(parts[0]);
  const repo = decodeURIComponent(parts[1]).replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("The owner or repository name contains unsupported characters.");
  }
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
  };
}

function translateError(response) {
  const remaining = response.headers?.get?.("x-ratelimit-remaining");
  const reset = response.headers?.get?.("x-ratelimit-reset");
  if (response.status === 404) return new GitHubReviewError("Repository not found or not publicly accessible.", "not_found");
  if (response.status === 403 && remaining === "0") {
    return new GitHubReviewError(
      "GitHub’s anonymous API rate limit has been reached. Try again after the reset time.",
      "rate_limited",
      { reset: reset ? Number(reset) * 1000 : null },
    );
  }
  return new GitHubReviewError(`GitHub returned ${response.status} while reading repository evidence.`, "github_http_error", {
    status: response.status,
  });
}

async function requestJson(url, { signal, fetchImpl, optional = false } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new GitHubReviewError("GitHub could not be reached. Check the network connection and try again.", "network_error", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
  if (optional && response.status === 404) return null;
  if (!response.ok) throw translateError(response);
  return response.json();
}

function decodeBase64(value) {
  const normalized = String(value ?? "").replace(/\s/g, "");
  if (!normalized) return "";
  if (typeof atob === "function") {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  return Buffer.from(normalized, "base64").toString("utf8");
}

function repoApi(parsed, suffix = "") {
  return `${API_ROOT}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}${suffix}`;
}

function pinnedFileUrl(parsed, sha, path) {
  const encoded = String(path).split("/").map(encodeURIComponent).join("/");
  return `${parsed.canonicalUrl}/blob/${encodeURIComponent(sha)}/${encoded}`;
}

async function fetchSelectedContents(parsed, commitSha, candidates, { signal, fetchImpl }) {
  const contents = [];
  await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const blob = await requestJson(repoApi(parsed, `/git/blobs/${encodeURIComponent(candidate.sha)}`), {
          signal,
          fetchImpl,
          optional: true,
        });
        if (!blob?.content || blob.encoding !== "base64") return;
        contents.push({
          path: candidate.path,
          sha: candidate.sha,
          size: candidate.size ?? blob.size ?? null,
          content: decodeBase64(blob.content),
          url: pinnedFileUrl(parsed, commitSha, candidate.path),
          priority: candidate.priority,
        });
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        // An individual optional text artifact must not fail the complete review.
      }
    }),
  );
  return contents.sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path));
}

export async function fetchRepositorySnapshot(parsed, {
  signal,
  onStage = () => {},
  fetchImpl = globalThis.fetch,
  contentLimit = 24,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");

  onStage("metadata", "Reading public repository metadata…", parsed.fullName);
  const metadata = await requestJson(repoApi(parsed), { signal, fetchImpl });

  onStage("commit", "Pinning the review to the default branch commit…", metadata.default_branch);
  const commit = await requestJson(repoApi(parsed, `/commits/${encodeURIComponent(metadata.default_branch)}`), {
    signal,
    fetchImpl,
  });
  if (!commit?.sha || !commit?.commit?.tree?.sha) {
    throw new GitHubReviewError("GitHub did not return a usable commit and tree reference.", "missing_tree");
  }

  onStage("inventory", "Building the recursive repository inventory…", commit.sha.slice(0, 10));
  const treeResponse = await requestJson(repoApi(parsed, `/git/trees/${encodeURIComponent(commit.commit.tree.sha)}?recursive=1`), {
    signal,
    fetchImpl,
  });
  const tree = Array.isArray(treeResponse?.tree)
    ? treeResponse.tree.map((entry) => ({ path: entry.path, type: entry.type, size: entry.size ?? null, sha: entry.sha }))
    : [];

  const selected = selectContentCandidates(tree, { limit: contentLimit });
  onStage("content", "Reading bounded high-value text artifacts…", `${selected.length} selected files`);
  const contents = await fetchSelectedContents(parsed, commit.sha, selected, { signal, fetchImpl });

  const [readme, release] = await Promise.all([
    requestJson(repoApi(parsed, `/readme?ref=${encodeURIComponent(commit.sha)}`), { signal, fetchImpl, optional: true }),
    requestJson(repoApi(parsed, "/releases/latest"), { signal, fetchImpl, optional: true }),
  ]);

  const readmeContent = readme?.content && readme.encoding === "base64" ? decodeBase64(readme.content) : "";
  const contentsWithoutDuplicateReadme = contents.filter((item) => item.path !== readme?.path);
  if (readme?.path && readmeContent) {
    contentsWithoutDuplicateReadme.unshift({
      path: readme.path,
      sha: readme.sha ?? null,
      size: readme.size ?? readmeContent.length,
      content: readmeContent,
      url: pinnedFileUrl(parsed, commit.sha, readme.path),
      priority: 110,
    });
  }

  const rateLimit = {
    limit: Number(metadata?._rateLimit?.limit ?? 0) || null,
    remaining: null,
    reset: null,
  };

  return {
    source: "github-public-api",
    isSample: false,
    parsed,
    repo: {
      name: metadata.name,
      full_name: metadata.full_name,
      html_url: metadata.html_url,
      description: metadata.description,
      default_branch: metadata.default_branch,
      archived: Boolean(metadata.archived),
      disabled: Boolean(metadata.disabled),
      fork: Boolean(metadata.fork),
      visibility: metadata.visibility,
      license: metadata.license,
      language: metadata.language,
      size: metadata.size ?? 0,
      stargazers_count: metadata.stargazers_count ?? 0,
      forks_count: metadata.forks_count ?? 0,
      open_issues_count: metadata.open_issues_count ?? 0,
      created_at: metadata.created_at,
      updated_at: metadata.updated_at,
      pushed_at: metadata.pushed_at,
      topics: Array.isArray(metadata.topics) ? metadata.topics : [],
      homepage: metadata.homepage,
    },
    commit: {
      sha: commit.sha,
      html_url: commit.html_url,
      authored_at: commit.commit?.author?.date ?? null,
      committed_at: commit.commit?.committer?.date ?? null,
      message: commit.commit?.message ?? null,
      tree_sha: commit.commit.tree.sha,
    },
    tree,
    treeTruncated: Boolean(treeResponse?.truncated),
    selectedContentCount: selected.length,
    contents: contentsWithoutDuplicateReadme,
    readmePath: readme?.path ?? null,
    readme: readmeContent,
    release: release
      ? {
          name: release.name || release.tag_name,
          tag_name: release.tag_name,
          html_url: release.html_url,
          published_at: release.published_at,
          prerelease: Boolean(release.prerelease),
          draft: Boolean(release.draft),
        }
      : null,
    rateLimit,
    collectedAt: new Date().toISOString(),
  };
}
