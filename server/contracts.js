import { createHash } from "node:crypto";

const ENUMS = Object.freeze({
  intent: { allowed: new Set(["self-host", "dependency", "fork", "contribute"]), fallback: "self-host" },
  deploymentTarget: { allowed: new Set(["flexible", "docker", "kubernetes", "managed", "local"]), fallback: "flexible" },
  sensitivity: { allowed: new Set(["public", "internal", "confidential", "regulated"]), fallback: "internal" },
  teamSize: { allowed: new Set(["small", "medium", "large"]), fallback: "small" },
  externalServices: { allowed: new Set(["allowed", "disclosed", "prohibited"]), fallback: "disclosed" },
});

const MAX_USE_CASE = 1_000;
const MAX_CLIENT_REQUEST_ID = 120;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateReviewContext(raw) {
  if (!isRecord(raw)) {
    const error = new TypeError("context must be an object.");
    error.code = "invalid_context";
    throw error;
  }

  const issues = [];
  const value = {};
  for (const [field, rule] of Object.entries(ENUMS)) {
    const item = raw[field];
    if (item == null || item === "") {
      value[field] = rule.fallback;
    } else if (typeof item !== "string" || !rule.allowed.has(item)) {
      issues.push(`${field} must be one of: ${[...rule.allowed].join(", ")}.`);
    } else {
      value[field] = item;
    }
  }

  if (raw.useCase == null) {
    value.useCase = "";
  } else if (typeof raw.useCase !== "string") {
    issues.push("useCase must be a string.");
  } else if (raw.useCase.length > MAX_USE_CASE) {
    issues.push(`useCase must be at most ${MAX_USE_CASE} characters.`);
  } else {
    value.useCase = raw.useCase.trim();
  }

  if (issues.length) {
    const error = new TypeError("Review context failed validation.");
    error.code = "invalid_context";
    error.details = issues;
    throw error;
  }

  return Object.freeze(value);
}

export function validateClientRequestId(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > MAX_CLIENT_REQUEST_ID || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    const error = new TypeError("clientRequestId must be a short token using letters, numbers, dot, underscore, colon, or hyphen.");
    error.code = "invalid_client_request_id";
    throw error;
  }
  return value;
}

export function contextFingerprint(context) {
  const canonical = JSON.stringify([
    context.intent,
    context.useCase,
    context.deploymentTarget,
    context.sensitivity,
    context.teamSize,
    context.externalServices,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export function idempotencyFingerprint({ repositoryUrl, context, clientRequestId }) {
  if (!clientRequestId) return null;
  return createHash("sha256")
    .update(`${clientRequestId}\n${repositoryUrl}\n${contextFingerprint(context)}`)
    .digest("hex");
}
