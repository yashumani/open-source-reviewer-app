# GitHub-Only Development Readiness

> This checkpoint records work that can be completed without Lovable credits.
>
> Last updated: 2026-08-31

## Completed in the GitHub-only cycle

- Added a request-bound runner reference implementation with expiring leases.
- Extended memory and file job stores with atomic in-process claim, progress, completion, failure, idempotency, and duplicate-report protections.
- Updated the local API to support both root routes and the exact hosted compatibility prefix:
  - `/health`
  - `/v1/reviews`
  - `/v1/jobs/:id`
  - `/v1/reports/:id`
  - `/v1/stats`
  - `/functions/v1/review-api/*`
  - `/api/public/review-api/*`
- Added strict context validation and bounded client request identifiers.
- Preserved strict CORS for mutation routes and no wildcard origin.
- Added deterministic local lifecycle smoke infrastructure.
- Split hosted verification into:
  - mandatory health contract;
  - opt-in full lifecycle after the deployment fix.
- Added the production PostgreSQL lease/claim/completion migration.
- Added deterministic tests for concurrent claims, stale recovery, idempotency, sanitization, CORS, and route compatibility.
- Added the hosted deployment handoff so the credit-dependent work is a small, auditable deployment cycle rather than new product design.

## Intentionally not changed

- The public reviewer remains in browser-analysis mode.
- The published Lovable API is not presented as lifecycle-ready.
- The hosted full-lifecycle GitHub Action is not enabled by default.
- No repository-controlled code execution has been added.
- No paid service, paid integration, private-repository credential, or production secret has been authorized.

## Next action when credits are available

Apply the prepared PostgreSQL migration, port the tested request-bound execution behavior into the hosted handler, deploy, run the opt-in full hosted lifecycle, and only then activate hosted mode in the public reviewer.

See [`HOSTED_RUNNER_HANDOFF.md`](HOSTED_RUNNER_HANDOFF.md) for the exact sequence and acceptance evidence.
