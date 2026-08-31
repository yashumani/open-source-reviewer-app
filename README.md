# ForkWise — Open Source Reviewer

> **Public preview:** the evidence-first reviewer is live on GitHub Pages. The hosted runner health/API shell is provisioned, while the queued-job execution fix is prepared in GitHub and intentionally awaits Lovable deployment credits.

ForkWise helps an engineer decide whether a repository should be **Adopted, Piloted, Forked, Avoided, or reviewed again with more evidence**. It does not produce a generic popularity or code-quality score. The recommendation changes with the user's intended use, deployment target, data sensitivity, team capacity, and external-service policy.

- Reviewer: <https://yashumani.github.io/open-source-reviewer-app/>
- Runner operator console: <https://yashumani.github.io/open-source-reviewer-app/operator.html>
- Hosted runner shell: <https://forkwise-runner.lovable.app>
- Public API base: `https://forkwise-runner.lovable.app/functions/v1/review-api`

![ForkWise desktop intake](docs/screenshots/landing-desktop.webp)

## Current service status

| Surface | Status |
| --- | --- |
| GitHub Pages reviewer | Live; browser-side static analysis remains the production path |
| GitHub Pages operator console | Live |
| Hosted runner health and schema contract | Live |
| Hosted PostgreSQL job/report tables | Provisioned with RLS |
| Hosted queued-job execution | Blocked pending request-bound lease deployment |
| Hosted full lifecycle smoke | Intentionally opt-in until the execution fix is deployed |
| Local request-bound lifecycle contract | Implemented and required in CI |

The hosted API currently accepts and persists a queued review, but its serverless fire-and-forget analysis does not survive the request boundary. The tested lease/claim design, production SQL migration, deterministic tests, and deployment handoff are committed so the remaining credit-dependent cycle is narrowly scoped and auditable.

## What is implemented

- Public `github.com` repository URL parsing and normalization.
- Default-branch resolution and exact commit pinning.
- Bounded read-only GitHub metadata, tree, README, release, and high-value text retrieval.
- Deterministic artifact, language/framework, documentation, license, test/CI, deployment, operations, telemetry/external-service, security, portability, and maintenance rules.
- **README Reality Check** with Verified, Partial, Unverified, Contradicted, and Not claimed states.
- Contextual **Fit / Trust / Run / Own / Exit** dimensions.
- Adopt / Pilot / Fork / Avoid / Insufficient evidence decision engine.
- Decision confidence, evidence coverage, blockers, adoption effort, ownership burden, unresolved questions, and a repository-specific pilot checklist.
- File- and metadata-level evidence links pinned to the analyzed commit.
- JSON and Markdown report exports.
- Responsive and keyboard-accessible reviewer dashboard.
- Hosted `forkwise-report/v1` API shell with health, statistics, review submission, job, and report routes.
- PostgreSQL `analysis_jobs` and `analysis_reports` tables with row-level security and service-role-only application access.
- Idempotency, bounded request/content/time limits, anonymous rate limits, active-job caps, structured logs, and secret redaction in the hosted implementation.
- Responsive light/dark operator console with health, recent job counts, limits, and an API test panel.
- Request-bound runner reference implementation with atomic claims, expiring leases, stale recovery, sanitized errors, and duplicate-report prevention.
- Production-ready SQL migration for the hosted lease/claim/completion lifecycle.
- GitHub Actions gates for local request-bound lifecycle, published health, quality, and Pages deployment.

## Safety boundary

ForkWise performs static inspection only. It does **not** run repository-controlled:

- package installation or lifecycle scripts;
- tests or build commands;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- arbitrary repository HTML, JavaScript, binaries, or application code.

Repository text is rendered through DOM text nodes rather than `innerHTML`. Suspected credential patterns are redacted before they can enter findings, evidence excerpts, errors, or exports. See [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) and [`docs/RUNNER_OPERATIONS.md`](docs/RUNNER_OPERATIONS.md).

## Run locally

Requires Node.js 22 or newer. The production workflow uses Node.js 24.

```bash
npm run validate
npm run serve
```

Then open:

- reviewer: `http://127.0.0.1:4173`
- operator console: `http://127.0.0.1:4173/operator.html`

No third-party production or test packages are required. The manual browser-validation script uses Python Playwright and system Chromium when those tools are available:

```bash
python scripts/ui_validation.py
```

### Local request-bound API

```bash
npm run api
```

The first claimable `GET /v1/jobs/:id` poll performs the bounded static analysis inside the request. Concurrent polls cannot duplicate the active lease, and an expired lease can be recovered.

### Deterministic lifecycle contract

```bash
npm run api:contract
```

In another terminal:

```bash
FORKWISE_RUNNER_BASE=http://127.0.0.1:8787/functions/v1/review-api \
FORKWISE_EXPECT_ANALYZER_VERSION=forkwise-contract/0.1.0 \
npm run smoke:runner:lifecycle
```

## Runner API contract

```text
GET  /health
GET  /v1/stats
POST /v1/reviews
GET  /v1/jobs/:id
GET  /v1/reports/:id
```

Supported prefixes:

```text
/functions/v1/review-api/*
/api/public/review-api/*
```

The browser client contract lives in `src/runner-client.js`. It supports API-provided status/report URLs, idempotency keys, aborts, client timeouts, progress percentages, retry guidance, and nested API base paths.

## Validation

```bash
npm run check:syntax
npm run check:static
npm test
npm run build
# or all gates
npm run validate
```

CI validates the reviewer, operator console, source modules, backend reference implementation, request-bound concurrency and recovery behavior, client contract, report schema, responsive static structure, deterministic local lifecycle, published runner health, and the production Pages artifact.

The published full-lifecycle job is enabled only after the hosted execution fix passes manually. This prevents a known infrastructure blocker from turning unrelated product work red while preserving an explicit production gate.

## Repository map

```text
.
├── index.html                    # Intake and evidence report application
├── operator.html                 # Hosted runner operator/status console
├── styles.css                    # Reviewer responsive design system
├── operator.css                  # Operator console light/dark design system
├── src/
│   ├── app.js                    # Browser orchestration and safe rendering
│   ├── analyzer.js               # Deterministic evidence + decision engine
│   ├── export.js                 # JSON and Markdown exports
│   ├── github.js                 # Read-only, commit-pinned GitHub client
│   ├── inventory.js              # Artifact classification and content selection
│   ├── operator.js               # Live status and API test UI
│   ├── operator-model.js         # Pure operator summary/status normalization
│   ├── runner-client.js          # Hosted asynchronous API client contract
│   ├── sample.js                 # Embedded auditable sample repository
│   └── schema.js                 # Report contracts and secret redaction
├── server/
│   ├── api.js                    # Local API and hosted-path compatibility
│   ├── request-bound-runner.js   # Lease/claim execution reference
│   ├── contracts.js              # Context and idempotency validation
│   └── job-store.js              # Atomic memory/file reference stores
├── supabase/migrations/          # Hosted database changes ready to apply
├── tests/                        # Analyzer, backend, client, operator, lease tests
├── scripts/                      # Validation, smoke, build, server, browser checks
├── docs/                         # Requirements, architecture, operations, plans, evidence
└── .github/workflows/            # Quality, runner contract, and Pages deployment
```

## Documentation

- [`docs/MASTER_DEVELOPMENT_PLAN.md`](docs/MASTER_DEVELOPMENT_PLAN.md) — execution board and evidence map.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — current development log and next target.
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — product requirements and intended outcomes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — browser and backend module boundaries.
- [`docs/ANALYZER_RULES.md`](docs/ANALYZER_RULES.md) — deterministic rules and limitations.
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) — threat model and safety controls.
- [`docs/BACKEND_TRANSITION.md`](docs/BACKEND_TRANSITION.md) — production analysis-service plan.
- [`docs/RUNNER_OPERATIONS.md`](docs/RUNNER_OPERATIONS.md) — live URLs, API contract, RLS, retention, CORS, incidents, and production gates.
- [`docs/GITHUB_ONLY_READINESS.md`](docs/GITHUB_ONLY_READINESS.md) — work completed without Lovable credits.
- [`docs/HOSTED_RUNNER_HANDOFF.md`](docs/HOSTED_RUNNER_HANDOFF.md) — exact migration, handler, deployment, and acceptance sequence for the next credit-enabled cycle.
- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md) — automated and responsive UI evidence.

## Current limitations

- Public GitHub repositories only.
- Anonymous/free-beta GitHub and runner quotas apply.
- At most 24 bounded high-value text artifacts are read per hosted analysis.
- Static indicators do not prove runtime behavior, exploitability, performance, or data flow.
- Repository history, private advisories, branch protection, and organization settings are not comprehensively assessed.
- Anonymous hosted reports are intended to expire after seven days.
- The published hosted runner does not yet progress accepted jobs beyond `queued`; the public reviewer therefore remains in browser-analysis mode.
- Request-bound execution is a beta bridge, not the final durable queue/worker architecture.
- This is decision support, not a security certification or legal opinion.

## Development status

The public reviewer and operator console are deployed. The GitHub-only readiness cycle completes the request-bound reference implementation, migration, concurrency/recovery tests, CI contract, health-only production check, and handoff documentation without consuming Lovable credits. The only remaining hosted-lifecycle step is to apply the prepared migration and handler change in Lovable, deploy, pass the full hosted smoke, and then activate runner mode in the Pages reviewer.
