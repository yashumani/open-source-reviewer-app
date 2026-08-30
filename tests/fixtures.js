const SHA = "1234567890abcdef1234567890abcdef12345678";
const BASE = "https://github.com/acme/review-target";

function hash(path) {
  let seed = 17;
  for (const char of path) seed = (seed * 33 + char.charCodeAt(0)) >>> 0;
  return seed.toString(16).padStart(8, "0").repeat(5).slice(0, 40);
}

export function makeSnapshot(overrides = {}) {
  const defaultFiles = {
    "README.md": "# Review Target\n\nA self-hosted application. Use Docker Compose for quick setup.",
    "LICENSE": "MIT License",
    "package.json": JSON.stringify({ name: "review-target", scripts: { test: "node --test" }, dependencies: { express: "5.0.0" } }),
    "docker-compose.yml": "services:\n  app:\n    build: .\n    ports: [\"3000:3000\"]",
    ".env.example": "PORT=3000\nDATABASE_URL=postgres://localhost/app",
    ".github/workflows/quality.yml": "steps:\n  - uses: actions/checkout@v4\n  - run: npm test",
    "tests/app.test.js": "test('app', () => {});",
    "SECURITY.md": "Report security concerns privately.",
    ".github/dependabot.yml": "version: 2",
  };
  const files = overrides.files ?? defaultFiles;
  const entries = Object.keys(files).map((path) => ({ path, type: "blob", size: files[path].length, sha: hash(path) }));
  const directories = [...new Set(Object.keys(files).flatMap((path) => {
    const parts = path.split("/");
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/"));
  }))].map((path) => ({ path, type: "tree", sha: hash(`tree:${path}`), size: null }));

  const repo = {
    name: "review-target",
    full_name: "acme/review-target",
    html_url: BASE,
    description: "Test repository",
    default_branch: "main",
    archived: false,
    disabled: false,
    fork: false,
    visibility: "public",
    license: { spdx_id: "MIT", name: "MIT License" },
    language: "JavaScript",
    size: 100,
    stargazers_count: 50,
    forks_count: 8,
    open_issues_count: 4,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
    pushed_at: "2026-08-20T00:00:00Z",
    topics: ["self-hosted"],
    homepage: null,
    ...(overrides.repo ?? {}),
  };

  const snapshot = {
    source: "fixture",
    isSample: false,
    parsed: { owner: "acme", repo: "review-target", fullName: "acme/review-target", canonicalUrl: BASE },
    repo,
    commit: {
      sha: SHA,
      html_url: `${BASE}/commit/${SHA}`,
      authored_at: "2026-08-20T00:00:00Z",
      committed_at: "2026-08-20T00:00:00Z",
      message: "test commit",
      tree_sha: hash("tree"),
      ...(overrides.commit ?? {}),
    },
    tree: [...directories, ...entries],
    treeTruncated: Boolean(overrides.treeTruncated),
    selectedContentCount: overrides.selectedContentCount ?? Object.keys(files).length,
    contents: Object.entries(files).map(([path, content]) => ({
      path,
      content,
      size: content.length,
      sha: hash(path),
      url: `${BASE}/blob/${SHA}/${path}`,
      priority: 100,
    })),
    readmePath: Object.hasOwn(files, "README.md") ? "README.md" : null,
    readme: files["README.md"] ?? "",
    release: overrides.release === undefined ? {
      name: "v1.0.0",
      tag_name: "v1.0.0",
      html_url: `${BASE}/releases/tag/v1.0.0`,
      published_at: "2026-08-10T00:00:00Z",
      prerelease: false,
      draft: false,
    } : overrides.release,
    rateLimit: { limit: null, remaining: null, reset: null },
    collectedAt: "2026-08-30T00:00:00Z",
  };
  return snapshot;
}

export const contexts = {
  selfHost: { intent: "self-host", useCase: "Internal tool", deploymentTarget: "docker", sensitivity: "internal", teamSize: "small", externalServices: "disclosed" },
  dependency: { intent: "dependency", useCase: "Production package", deploymentTarget: "flexible", sensitivity: "internal", teamSize: "medium", externalServices: "allowed" },
  fork: { intent: "fork", useCase: "Build a customized internal product", deploymentTarget: "docker", sensitivity: "internal", teamSize: "small", externalServices: "disclosed" },
  contribute: { intent: "contribute", useCase: "Make a first contribution", deploymentTarget: "flexible", sensitivity: "public", teamSize: "small", externalServices: "allowed" },
};
