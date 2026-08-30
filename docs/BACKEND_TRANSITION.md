# Backend Transition Plan

The browser preview validates the product workflow and report schema. Deeper production analysis should move acquisition and parsing into bounded workers without changing the evidence-first contract.

## Target architecture

```text
Web client
   │ submit repository + context
   ▼
API / job coordinator
   ├── authentication and quotas
   ├── repository allowlist/policy
   ├── job status
   └── report retrieval
   │
   ▼
Queue
   │
   ▼
Ephemeral static-analysis worker
   ├── download commit archive
   ├── safe extraction
   ├── file classification
   ├── manifest/config parsers
   ├── deterministic rule registry
   ├── evidence graph
   └── signed/versioned report
   │
   ├── PostgreSQL: metadata/findings/provenance
   └── object storage: bounded artifacts/exports
```

## Transition increments

1. Preserve `forkwise-report/v1` as the API response contract.
2. Add authenticated GitHub API access and per-user/organization quotas.
3. Create job/status endpoints and idempotency keys based on repository + commit + analyzer version + context hash.
4. Implement archive acquisition at an exact commit.
5. Add extraction controls: compressed/decompressed size, file count, path traversal, symlinks, nesting, and time limits.
6. Move current path inventory and deterministic rules into a worker package.
7. Add language-specific manifest parsers rather than broad text matching.
8. Persist evidence and versioned reports.
9. Add re-analysis and commit-to-commit comparisons.
10. Add private repository access with least-privilege GitHub App installation permissions.
11. Add organization policy profiles and approved/prohibited technology constraints.
12. Add evidence-grounded LLM synthesis only after prompt-injection isolation and source attribution tests.

## Runtime execution remains separate

Static backend analysis does not authorize executing repository code. Optional build/test/runtime verification would require a separate sandbox service with no default outbound network, non-root users, ephemeral machines, allowlisted commands, resource limits, captured provenance, and explicit user authorization.

## Deployment decision

GitHub Pages remains appropriate for the preview UI. A production API/worker deployment requires an infrastructure and operating-cost decision before implementation; no paid service is assumed by this plan.
