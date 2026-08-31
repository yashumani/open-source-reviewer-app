# ADR 0002: Static-only analysis is the default trust boundary

- **Status:** Accepted
- **Date:** 2026-08-31

## Context

ForkWise processes repositories selected by untrusted users. Repositories can contain malicious package scripts, tests, Makefiles, containers, workflows, binaries, documentation prompt injection, path traversal attempts, and credential material.

## Decision

The default service may read bounded public GitHub metadata, tree paths, and selected UTF-8 text files at an exact commit. It must not execute repository-controlled code or commands.

The deterministic evidence engine remains the source of facts. Any future language model may explain supplied evidence but cannot grant tools, change the score/decision contract, or treat repository text as instructions.

## Prohibited default behavior

- package installation or lifecycle scripts;
- tests, builds, generators, or task runners;
- shell scripts or Makefiles;
- Docker or Kubernetes execution;
- GitHub Actions or other workflows;
- repository HTML, JavaScript, native binaries, or WebAssembly;
- repository-controlled outbound URLs.

## Consequences

Static analysis cannot prove runtime behavior, exploitability, performance, or actual data flow. Reports must make that uncertainty visible rather than pretending that unsupported facts were verified.

Dynamic verification, if ever offered, is a separate product capability requiring explicit user authorization, ephemeral non-root container/VM isolation, disabled-by-default outbound network, resource limits, command allowlists, artifact provenance, and a separate security review.
