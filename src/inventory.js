import { unique } from "./schema.js";

const basename = (path) => String(path).split("/").at(-1) ?? "";

export const PATH_MATCHERS = Object.freeze({
  readmes: (path) => /^readme(?:\.[a-z0-9]+)?$/i.test(basename(path)),
  licenses: (path) => /^(license|licence|copying)(?:\.[a-z0-9]+)?$/i.test(basename(path)),
  securityPolicies: (path) => /(^|\/)security\.md$/i.test(path),
  contributing: (path) => /(^|\/)contributing(?:\.[a-z0-9]+)?$/i.test(path),
  codeOfConduct: (path) => /(^|\/)code[_-]of[_-]conduct(?:\.[a-z0-9]+)?$/i.test(path),
  changelogs: (path) => /(^|\/)(changelog|changes|history|releases)(?:\.[a-z0-9]+)?$/i.test(path),
  documentation: (path) => /(^|\/)(docs?|documentation)(\/|$)/i.test(path),
  workflows: (path) => /^\.github\/workflows\/[^/]+\.(ya?ml)$/i.test(path),
  tests: (path) =>
    /(^|\/)(__tests__|tests?|specs?|e2e|integration)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/i.test(path),
  coverage: (path) => /(^|\/)(coverage|lcov)(\/|$)|(^|\/)(coverage-final\.json|lcov\.info|coverage\.xml)$/i.test(path),
  docker: (path) => /(^|\/)dockerfile(?:\.[^/]+)?$/i.test(path),
  compose: (path) => /(^|\/)(docker-)?compose(?:\.[^/]+)?\.(ya?ml)$/i.test(path),
  kubernetes: (path) =>
    /(^|\/)(k8s|kubernetes|manifests)(\/|$)|(^|\/)[^/]*(deployment|statefulset|daemonset)\.ya?ml$/i.test(path),
  helm: (path) => /(^|\/)charts?(\/|$)|(^|\/)chart\.yaml$/i.test(path),
  terraform: (path) => /\.tf$|(^|\/)terraform(\/|$)/i.test(path),
  envTemplates: (path) => /(^|\/)(\.env\.(example|sample|template)|env\.example|example\.env)$/i.test(path),
  trackedEnv: (path) => /(^|\/)\.env$/i.test(path),
  manifests: (path) =>
    /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|pyproject\.toml|requirements(?:-[^/]+)?\.txt|poetry\.lock|pipfile|go\.mod|cargo\.toml|gemfile|composer\.json|pom\.xml|build\.gradle(?:\.kts)?|mix\.exs)$/i.test(path),
  lockfiles: (path) =>
    /(^|\/)(pnpm-lock\.yaml|yarn\.lock|package-lock\.json|poetry\.lock|pipfile\.lock|cargo\.lock|composer\.lock|gemfile\.lock)$/i.test(path),
  migrations: (path) => /(^|\/)(migrations?|alembic|prisma)(\/|$)|schema\.prisma$/i.test(path),
  backupDocs: (path) => /(^|\/)[^/]*(backup|restore|disaster-recovery|recovery)[^/]*\.(md|txt|rst)$/i.test(path),
  exportDocs: (path) => /(^|\/)[^/]*(export|import|migration)[^/]*\.(md|txt|rst)$/i.test(path),
  apiSpecs: (path) => /(^|\/)(openapi|swagger)(?:\.[^/]+)?\.(json|ya?ml)$|(^|\/)api(\/|$)/i.test(path),
  issueTemplates: (path) => /^\.github\/issue_template(\/|$)/i.test(path),
  pullRequestTemplates: (path) => /(^|\/)pull_request_template(?:\.[^/]+)?$/i.test(path),
  dependabot: (path) => /^\.github\/dependabot\.ya?ml$/i.test(path),
  renovate: (path) => /(^|\/)(renovate\.json|renovate\.json5|\.renovaterc(?:\.json)?)$/i.test(path),
  codeql: (path) => /^\.github\/workflows\/[^/]*(codeql|security)[^/]*\.ya?ml$/i.test(path),
  monorepo: (path) => /(^|\/)(turbo\.json|nx\.json|lerna\.json|pnpm-workspace\.yaml)$/i.test(path),
  releases: (path) => /(^|\/)(release-please-config\.json|\.releaserc(?:\.json)?|semantic-release|changesets)(\/|$)/i.test(path),
});

export function buildArtifactInventory(snapshot) {
  const tree = Array.isArray(snapshot?.tree) ? snapshot.tree : [];
  const blobs = tree.filter((entry) => entry?.type === "blob" && typeof entry.path === "string");
  const paths = blobs.map((entry) => entry.path);
  const inventory = {
    totalFiles: blobs.length,
    totalDirectories: tree.filter((entry) => entry?.type === "tree").length,
    paths,
    treeTruncated: Boolean(snapshot?.treeTruncated),
  };

  for (const [name, matcher] of Object.entries(PATH_MATCHERS)) {
    inventory[name] = paths.filter(matcher);
  }
  return inventory;
}

const HIGH_PRIORITY = [
  /^readme(?:\.[^/]+)?$/i,
  /(^|\/)(license|licence|copying)(?:\.[^/]+)?$/i,
  /(^|\/)security\.md$/i,
  /(^|\/)contributing(?:\.[^/]+)?$/i,
  /^\.github\/workflows\/[^/]+\.ya?ml$/i,
  /^\.github\/(dependabot\.ya?ml|pull_request_template\.md)$/i,
  /(^|\/)dockerfile(?:\.[^/]+)?$/i,
  /(^|\/)(docker-)?compose[^/]*\.ya?ml$/i,
  /(^|\/)\.env\.(example|sample|template)$/i,
  /(^|\/)(package\.json|pyproject\.toml|requirements(?:-[^/]+)?\.txt|go\.mod|cargo\.toml|pom\.xml|build\.gradle(?:\.kts)?|mix\.exs)$/i,
  /(^|\/)(openapi|swagger)[^/]*\.(json|ya?ml)$/i,
  /(^|\/)[^/]*(backup|restore|deployment|operations|telemetry|privacy|export)[^/]*\.(md|txt|rst)$/i,
];

const MEDIUM_PRIORITY = [
  /(^|\/)(docs?|documentation)\//i,
  /(^|\/)(config|settings)[^/]*\.(json|ya?ml|toml|js|ts|py)$/i,
  /(^|\/)(next|nuxt|vite|svelte|angular)\.config\.[^/]+$/i,
  /(^|\/)(schema\.prisma|alembic\.ini)$/i,
];

const TEXT_EXTENSIONS = new Set([
  "", "md", "mdx", "txt", "rst", "json", "json5", "yaml", "yml", "toml", "ini", "cfg", "conf", "env",
  "xml", "gradle", "kts", "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "go", "rs", "rb", "php", "java",
  "kt", "scala", "ex", "exs", "sql", "sh", "bash", "zsh", "dockerfile",
]);

function extension(path) {
  const name = basename(path).toLowerCase();
  if (name === "dockerfile" || name.startsWith("dockerfile.")) return "dockerfile";
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index + 1);
}

export function contentPriority(path) {
  if (HIGH_PRIORITY.some((pattern) => pattern.test(path))) return 100;
  if (MEDIUM_PRIORITY.some((pattern) => pattern.test(path))) return 60;
  if (PATH_MATCHERS.tests(path)) return 15;
  return 0;
}

export function selectContentCandidates(treeItems, { limit = 24, maxFileSize = 240_000 } = {}) {
  return (Array.isArray(treeItems) ? treeItems : [])
    .filter((entry) => entry?.type === "blob" && typeof entry.path === "string")
    .filter((entry) => Number(entry.size ?? 0) <= maxFileSize)
    .filter((entry) => TEXT_EXTENSIONS.has(extension(entry.path)))
    .map((entry) => ({ ...entry, priority: contentPriority(entry.path) }))
    .filter((entry) => entry.priority > 0)
    .sort((a, b) => b.priority - a.priority || Number(a.size ?? 0) - Number(b.size ?? 0) || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export function countExtensions(paths = []) {
  const counts = new Map();
  for (const path of paths) {
    const value = extension(path) || "no extension";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

export function inventorySummary(inventory) {
  return unique([
    inventory.readmes.length ? `${inventory.readmes.length} README artifact(s)` : null,
    inventory.licenses.length ? `${inventory.licenses.length} license artifact(s)` : null,
    inventory.workflows.length ? `${inventory.workflows.length} workflow(s)` : null,
    inventory.tests.length ? `${inventory.tests.length} test-oriented path(s)` : null,
    inventory.docker.length || inventory.compose.length ? "container deployment artifacts" : null,
  ]);
}
