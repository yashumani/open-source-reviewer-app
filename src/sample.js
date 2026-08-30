const SAMPLE_COMMIT = "7f4d9a3c2b1e8076d5c4b3a29180f7e6d5c4b3a2";
const BASE = "https://github.com/sample-org/atlas-board";

const files = {
  "README.md": `# Atlas Board

Atlas Board is a privacy-first, fully self-hosted analytics workspace for product teams.

## Quick start

Run the complete production-ready stack with Docker Compose:

\`\`\`bash
cp .env.example .env
docker compose up -d
\`\`\`

The application uses PostgreSQL and Redis. Optional product analytics help us improve onboarding. Set POSTHOG_DISABLED=true to disable analytics.

## Features
- Team dashboards
- CSV imports
- Role-based access
- REST API
`,
  "LICENSE": `MIT License\n\nCopyright (c) 2026 Atlas Board contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy...`,
  "SECURITY.md": `# Security\n\nReport vulnerabilities privately to security@example.invalid. Supported releases receive fixes for twelve months.`,
  "CONTRIBUTING.md": `# Contributing\n\nInstall Node.js 22, run npm test, and open a focused pull request.`,
  "package.json": JSON.stringify({
    name: "atlas-board",
    version: "2.4.0",
    scripts: { test: "node --test", build: "vite build", start: "node server.js" },
    dependencies: { react: "19.1.0", express: "5.1.0", pg: "8.16.0", redis: "5.6.1", posthog: "1.5.0" },
  }, null, 2),
  "docker-compose.yml": `services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://atlas:atlas@db:5432/atlas
      REDIS_URL: redis://cache:6379
      POSTHOG_KEY: \${POSTHOG_KEY}
  db:
    image: postgres:17
  cache:
    image: redis:8
`,
  "Dockerfile": `FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --ignore-scripts\nCOPY . .\nCMD ["node", "server.js"]`,
  ".env.example": `DATABASE_URL=postgres://atlas:atlas@localhost:5432/atlas\nREDIS_URL=redis://localhost:6379\nPOSTHOG_KEY=\nPOSTHOG_DISABLED=true\nSESSION_SECRET=replace-me\n`,
  ".github/workflows/quality.yml": `name: Quality\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci --ignore-scripts\n      - run: npm test\n      - run: npm run build\n`,
  ".github/dependabot.yml": `version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n`,
  "tests/auth.test.js": `import test from "node:test";\ntest("rejects an invalid session", () => {});`,
  "tests/import.test.js": `import test from "node:test";\ntest("imports a valid CSV", () => {});`,
  "src/telemetry.js": `import posthog from "posthog";\nexport function track(event) { if (!process.env.POSTHOG_DISABLED) posthog.capture(event); }`,
  "src/server.js": `import express from "express";\nconst app = express();\napp.listen(process.env.PORT || 3000);`,
  "prisma/schema.prisma": `datasource db { provider = "postgresql" url = env("DATABASE_URL") }\nmodel User { id String @id }`,
  "prisma/migrations/20260801_init/migration.sql": `CREATE TABLE users (id text primary key);`,
  "docs/deployment.md": `# Deployment\n\nUse Docker Compose for evaluation. Configure TLS at the reverse proxy.`,
  "docs/api.md": `# API\n\nThe API is available at /api/v1. Authentication uses a session cookie.`,
};

function pseudoSha(path) {
  let seed = 0;
  for (const character of path) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  return seed.toString(16).padStart(8, "0").repeat(5).slice(0, 40);
}

export function createSampleSnapshot() {
  const fileEntries = Object.keys(files).map((path) => ({
    path,
    type: "blob",
    size: files[path].length,
    sha: pseudoSha(path),
  }));
  const directories = [...new Set(Object.keys(files).flatMap((path) => {
    const parts = path.split("/");
    return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
  }))].map((path) => ({ path, type: "tree", size: null, sha: pseudoSha(`tree:${path}`) }));

  return {
    source: "embedded-sample",
    isSample: true,
    parsed: { owner: "sample-org", repo: "atlas-board", fullName: "sample-org/atlas-board", canonicalUrl: BASE },
    repo: {
      name: "atlas-board",
      full_name: "sample-org/atlas-board",
      html_url: BASE,
      description: "A self-hosted product analytics workspace for teams.",
      default_branch: "main",
      archived: false,
      disabled: false,
      fork: false,
      visibility: "public",
      license: { key: "mit", name: "MIT License", spdx_id: "MIT" },
      language: "TypeScript",
      size: 8420,
      stargazers_count: 2840,
      forks_count: 318,
      open_issues_count: 42,
      created_at: "2023-04-02T12:00:00Z",
      updated_at: "2026-08-27T15:30:00Z",
      pushed_at: "2026-08-27T15:29:00Z",
      topics: ["analytics", "self-hosted", "react", "postgresql"],
      homepage: "https://atlas.example.invalid",
    },
    commit: {
      sha: SAMPLE_COMMIT,
      html_url: `${BASE}/commit/${SAMPLE_COMMIT}`,
      authored_at: "2026-08-27T15:20:00Z",
      committed_at: "2026-08-27T15:29:00Z",
      message: "feat: improve onboarding dashboard",
      tree_sha: pseudoSha("root-tree"),
    },
    tree: [...directories, ...fileEntries],
    treeTruncated: false,
    selectedContentCount: Object.keys(files).length,
    contents: Object.entries(files).map(([path, content]) => ({
      path,
      sha: pseudoSha(path),
      size: content.length,
      content,
      url: `${BASE}/blob/${SAMPLE_COMMIT}/${path.split("/").map(encodeURIComponent).join("/")}`,
      priority: 100,
    })),
    readmePath: "README.md",
    readme: files["README.md"],
    release: {
      name: "Atlas Board 2.4.0",
      tag_name: "v2.4.0",
      html_url: `${BASE}/releases/tag/v2.4.0`,
      published_at: "2026-08-20T10:00:00Z",
      prerelease: false,
      draft: false,
    },
    rateLimit: { limit: null, remaining: null, reset: null },
    collectedAt: new Date().toISOString(),
  };
}

export const sampleContext = Object.freeze({
  intent: "self-host",
  useCase: "Evaluate a privacy-conscious internal analytics workspace for a 20-person product organization.",
  deploymentTarget: "docker",
  sensitivity: "internal",
  teamSize: "small",
  externalServices: "disclosed",
});
