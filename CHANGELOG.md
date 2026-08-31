# Changelog

All notable changes are recorded here. ForkWise is currently a preview/beta; interfaces remain versioned even while implementation details evolve.

## Unreleased

### Pending

- Deploy the prepared request-bound lifecycle to the hosted Lovable runner.
- Prove the hosted full lifecycle and activate the dormant reviewer integration.
- Complete owner decisions for project license, privacy, terms, retention, and acceptable use.

## 0.8.0 — 2026-08-31

### Added

- GitHub-native global and repository navigation for the reviewer.
- README-style product overview and adoption-check composer.
- Actions-style analysis progress and runner operator console.
- Checks-style decision summary, repository About sidebar, issue-like findings, and file-like evidence rows.
- New ForkWise branch/check identity mark.
- Dedicated redesign plan and implementation-evidence documents.
- Playwright visual workflow covering reviewer desktop, tablet, mobile, and small-mobile states plus operator desktop/mobile states.
- Machine-readable responsive validation evidence.

### Changed

- Replaced generic glass, glow, and oversized SaaS styling with repository canvas, border, status, and evidence tokens.
- Reduced radii, decoration, and empty space while increasing technical scanability.
- Reframed report sections around repository checks, README review, issues, files, environment metadata, and merge readiness.
- Updated the application manifest and repository documentation.

### Validation

- Existing sample report remains functional with five dimensions, 18 findings, 21 evidence records, and six claim rows.
- Zero page-level overflow at 1440, 768, 390, and 320 pixel reviewer widths.
- Zero page-level overflow at 1440 and 390 pixel operator widths.
- No browser console errors, backdrop-filter glass treatment, or ambient marketing gradients.
- Hosted runner mode remains disabled and the static-only safety boundary is unchanged.

## 0.7.0 — 2026-08-31

### Added

- Formal OpenAPI and JSON Schema contracts for review requests, job status, and `forkwise-report/v1`.
- Clean PostgreSQL baseline migration and executable database contract tests.
- Non-root, read-only container packaging and hardened container lifecycle CI.
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
