const STRUCTURED_SECRET_PATTERNS = [
  { kind: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,255}\b/g },
  { kind: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,255}\b/g },
  { kind: "OpenAI-style key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,255}\b/g },
  { kind: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/g },
];

const ASSIGNMENT_PATTERN = /(?<key>(?:[A-Z][A-Z0-9_]*_)?(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password))\s*[:=]\s*(?<quote>["']?)(?<value>[^\s"'`,#]+)\k<quote>/gim;

const REFERENCE_PATTERNS = [
  /^\$\{[^}]*\}?$/,
  /^\$[A-Z_][A-Z0-9_]*$/i,
  /^\{\{[^}]+\}\}$/,
  /^<[^>]+>$/,
  /^%[A-Z_][A-Z0-9_]*%$/i,
  /^(?:process\.env|import\.meta\.env)\.[A-Z_][A-Z0-9_]*$/i,
  /^(?:secrets?|vars?)\.[A-Z_][A-Z0-9_]*$/i,
];

const PLACEHOLDER_TOKEN = /(?:^|[-_.:/])(?:your|example|sample|placeholder|dummy|fake|mock|test|testing|smoke|local|localonly|local-only|ci|cionly|ci-only|dev|development|changeme|change-me|replace|replace-me|redacted|notasecret|not-a-secret|notused|not-used|unused|unset)(?:[-_.:/]|$)/i;
const EXACT_PLACEHOLDERS = new Set([
  "password",
  "secret",
  "token",
  "api-key",
  "apikey",
  "key",
  "none",
  "null",
  "undefined",
  "xxxx",
  "xxxxxxxx",
  "********",
]);

const NON_PRODUCTION_PATH = /(^|\/)(?:readme(?:\.[^/]*)?|docs?|documentation|examples?|samples?|fixtures?|tests?|testdata)(\/|$)|(?:^|\/)[^/]+\.(?:example|sample|template)(?:\.[^/]*)?$|(^|\/)\.github\/workflows\//i;
const LOCAL_CONFIGURATION_PATH = /(^|\/)(?:docker-)?compose(?:\.[^/]*)?\.ya?ml$|(^|\/)(?:dev|development|local)(?:[./_-]|$)/i;
const PRODUCTION_PATH = /(^|\/)(?:prod|production|deploy|k8s|kubernetes|helm|terraform)(?:[./_-]|$)/i;

function normalizeValue(rawValue) {
  return String(rawValue ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[;,]+$/g, "");
}

function compactToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isCredentialReference(rawValue) {
  const value = normalizeValue(rawValue);
  return REFERENCE_PATTERNS.some((pattern) => pattern.test(value));
}

export function isCredentialPlaceholder(rawValue) {
  const value = normalizeValue(rawValue);
  if (!value) return true;
  const compact = compactToken(value);
  if (EXACT_PLACEHOLDERS.has(value.toLowerCase()) || EXACT_PLACEHOLDERS.has(compact)) return true;
  if (/^[x*_.-]{6,}$/i.test(value) || /(?:^|[-_.])[x*]{8,}$/i.test(value)) return true;
  if (PLACEHOLDER_TOKEN.test(value)) return true;
  if (/^(?:example|sample|dummy|fake|test|local|ci|dev)[a-z0-9_-]*$/i.test(value)) return true;
  return false;
}

function characterClasses(value) {
  return [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)]
    .filter(Boolean).length;
}

function looksLikeExposedLiteral(value) {
  if (value.length >= 20 && characterClasses(value) >= 2) return true;
  if (value.length >= 14 && characterClasses(value) >= 3) return true;
  return false;
}

function assignmentDisposition(path, key, rawValue) {
  const value = normalizeValue(rawValue);
  if (isCredentialReference(value)) return "reference";
  if (isCredentialPlaceholder(value)) return "placeholder";

  const nonProductionPath = NON_PRODUCTION_PATH.test(path);
  const localPath = LOCAL_CONFIGURATION_PATH.test(path);
  const productionPath = PRODUCTION_PATH.test(path);

  if (looksLikeExposedLiteral(value)) return "exposed";
  if (productionPath) return "exposed";
  if (nonProductionPath || localPath) return "development-default";
  if (/password/i.test(key)) return "literal-default";
  return value.length >= 10 ? "exposed" : "literal-default";
}

function candidateKey(candidate) {
  return [candidate.path, candidate.kind, candidate.key ?? "", candidate.match].join("\u0000");
}

export function scanCredentialCandidates(corpus = []) {
  const exposed = [];
  const defaults = [];
  const references = [];
  const seen = new Set();

  const add = (bucket, candidate) => {
    const key = candidateKey(candidate);
    if (seen.has(key)) return;
    seen.add(key);
    bucket.push(candidate);
  };

  for (const item of corpus) {
    const path = String(item?.path ?? "");
    const content = String(item?.content ?? "");

    for (const definition of STRUCTURED_SECRET_PATTERNS) {
      definition.pattern.lastIndex = 0;
      for (const match of content.matchAll(definition.pattern)) {
        const literal = match[0];
        const candidate = { path, kind: definition.kind, key: null, match: literal, disposition: "exposed" };
        if (isCredentialPlaceholder(literal) || isCredentialReference(literal)) {
          add(defaults, { ...candidate, disposition: "placeholder" });
        } else {
          add(exposed, candidate);
        }
      }
    }

    ASSIGNMENT_PATTERN.lastIndex = 0;
    for (const match of content.matchAll(ASSIGNMENT_PATTERN)) {
      const key = match.groups?.key ?? "credential";
      const value = match.groups?.value ?? "";
      const disposition = assignmentDisposition(path, key, value);
      const candidate = {
        path,
        kind: "Credential assignment",
        key,
        match: match[0],
        disposition,
      };
      if (disposition === "exposed") add(exposed, candidate);
      else if (disposition === "reference") add(references, candidate);
      else add(defaults, candidate);
    }
  }

  return { exposed, defaults, references };
}
