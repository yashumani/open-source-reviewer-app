# Changelog

All notable changes are recorded here. ForkWise is currently a preview/beta; interfaces remain versioned even while implementation details evolve.

## Unreleased

### Added

- Formal OpenAPI and JSON Schema contracts for review requests, job status, and `forkwise-report/v1`.
- Clean PostgreSQL baseline migration and executable database contract tests.
- Non-root, read-only container packaging and a hardened container lifecycle CI check.
- Hosted report adapter and dormant review-runtime selector; hosted mode remains disabled by default.
- Immutable GitHub Actions pin validation and Dependabot update configuration.
- Privacy/data-handling draft, observability specification, go-live checklist, and architecture decision records.

## 0.6.0 — 2026-08-31

### Added

- Request-bound runner reference implementation with expiring leases.
- Atomic memory/file-store claim, progress, completion, failure, and idempotency operations.
- PostgreSQL lease/claim/progress/completion/failure migration.
- Deterministic local lifecycle smoke and layered GitHub Actions gates.
- Exact `/functions/v1/review-api` and `/api/public/review-api` route compatibility.

### Changed

- Documentation now distinguishes hosted health from a working hosted analysis lifecycle.
- Full hosted lifecycle verification is opt-in until the Lovable deployment fix is applied.

## 0.5.0 — 2026-08-30

### Added

- Hosted runner operator console.
- Hardened asynchronous runner client.
- Health/statistics display and API test panel.

## 0.4.0 — 2026-08-30

### Added

- Local Node analysis API, queue, worker thread, file-backed job/report store, and runner client contract.

## 0.3.0 — 2026-08-30

### Added

- Evidence-first browser reviewer, README Reality Check, five adoption dimensions, contextual decision engine, exports, responsive report, and GitHub Pages deployment.
