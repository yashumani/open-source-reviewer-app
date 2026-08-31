# ForkWise — Open Source Reviewer

> **Public preview:** the evidence-first reviewer and operator console are live on GitHub Pages. The hosted runner health/API shell is provisioned, while the queued-job execution fix remains prepared in GitHub and intentionally awaits a Lovable credit-enabled deployment.

ForkWise helps an engineer decide whether a public GitHub repository should be **Adopted, Piloted, Forked, Avoided, or reviewed again with more evidence**. It does not produce a generic popularity score. The recommendation changes with intended use, deployment target, data sensitivity, team capacity, and external-service policy.

- Reviewer: <https://yashumani.github.io/open-source-reviewer-app/>
- Runner operator console: <https://yashumani.github.io/open-source-reviewer-app/operator.html>
- Hosted runner shell: <https://forkwise-runner.lovable.app>
- Public API base: `https://forkwise-runner.lovable.app/functions/v1/review-api`
- OpenAPI contract: [`docs/api/openapi.json`](docs/api/openapi.json)

![ForkWise desktop intake](docs/screenshots/landing-desktop.webp)

## Current service status

| Surface | Status |
| --- | --- |
| GitHub Pages reviewer | Live; browser-side static analysis remains the active path |
| GitHub Pages operator console | Live |
| Hosted runner health/schema contract | Live |
| Hosted PostgreSQL job/report tables | Provisioned with RLS |
| Hosted queued-job execution | Blocked pending request-bound lease deployment |
| Hosted full lifecycle smoke | Opt-in until the execution fix is deployed |
| Local request-bound lifecycle | Implemented and required in CI |
| PostgreSQL migration contract | Implemented against disposable PostgreSQL in CI |
| Hardened runner container | Implemented and validated through a deterministic lifecycle in CI |
| Hosted report adapter/runtime selector | Prepared but statically forced off |

The published hosted API currently accepts and persists a queued review, but its serverless fire-and-forget analysis does not survive the request boundary. The lease/claim design, database migrations, reference implementation, API schemas, deterministic tests, deployment handoff, container fallback, and production checklists are committed so the later credit-dependent cycle is limited to applying and validating the prepared hosted change.

## Product capabilities

- Public `github.com` URL parsing and normalization.
- Default-branch resolution and exact commit pinning.
- Bounded read-only GitHub metadata, tree, README, release, and high-value text retrieval.
- Deterministic artifact, language/framework, documentation, license, test/CI, deployment, operations, telemetry/external-service, security, portability, and maintenance rules.
- **README Reality Check** with Verified, Partial, Unverified, Contradicted, and Not claimed states.
- Contextual **Fit / Trust / Run / Own / Exit** dimensions.
- Adopt / Pilot / Fork / Avoid / Insufficient evidence decision engine.
- Decision confidence, evidence coverage, blockers, adoption effort, ownership burden, unresolved questions, and a repository-specific pilot checklist.
- File- and metadata-level evidence links pinned to the analyzed commit.
- JSON and Markdown report exports.
- Responsive, keyboard-accessible reviewer and operator dashboards.

## Runner and readiness capabilities

- Versioned `forkwise-report/v1` API shell with health, statistics, review submission, job, and report routes.
- Formal OpenAPI 3.1 and JSON Schema contracts for requests, job states, and reports.
- PostgreSQL `analysis_jobs` and `analysis_reports` baseline with row-level security and service-role-only access.
- Request-bound runner reference implementation with atomic claims, expiring leases, stale recovery, idempotency, sanitized errors, and duplicate-report prevention.
- Executable PostgreSQL contract tests for schema, privileges, concurrent claims, lease renewal, idempotent completion, report uniqueness, and retention cleanup.
- Non-root, read-only Docker packaging with dropped capabilities, `no-new-privileges`, and resource limits.
- Dormant hosted-report adapter and runtime selector; hosted mode is disabled by source and static validation until production lifecycle evidence exists.
- Immutable GitHub Actions pins plus automated action/container dependency update configuration.
- Separate liveness, deterministic lifecycle, database, container, full hosted lifecycle, quality, and Pages deployment gates.
- Privacy/data-handling draft, observability specification, architecture decisions, deployment handoff, and go-live checklist.

## Safety boundary

ForkWise performs static inspection only. It does **not** run repository-controlled:

- package installation or lifecycle scripts;
- tests or build commands;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- arbitrary repository HTML, JavaScript, binaries, or application code.

Repository text is rendered through DOM text nodes rather than `innerHTML`. Suspected credential patterns are redacted before they can enter findings, evidence excerpts, public errors, logs, or exports. See [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md), [`docs/RUNNER_OPERATIONS.md`](docs/RUNNER_OPERATIONS.md), and [`docs/adr/0002-static-only-analysis-boundary.md`](docs/adr/0002-static-only-analysis-boundary.md).

## Run locally

Requires Node.js 22 or newer. GitHub Actions uses Node.js 24.

```bash
npm run validate
npm run serve
```

Open:

- reviewer: `http://127.0.0.1:4173`
- operator console: `http://127.0.0.1:4173/operator.html`

No third-party production or test packages are required. The optional manual browser-validation script uses Python Playwright and system Chromium when those tools are available:

```bash
python scripts/ui_validation.py
```

### Local request-bound API

```bash
npm run api
```

The first claimable `GET /v1/jobs/:id` poll performs the bounded static analysis within the request. Concurrent polls cannot duplicate the active lease, and an expired lease can be recovered.

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

### Hosting-neutral container

```bash
docker compose up --build
```

The Compose profile binds only to localhost, runs as non-root, uses a read-only root filesystem, drops all Linux capabilities, sets `no-new-privileges`, and bounds CPU, memory, and PIDs. The local JSON volume is for single-instance development only; production multi-instance persistence requires PostgreSQL or an equivalent transactional store.

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

The browser client contract in `src/runner-client.js` supports API-provided status/report URLs, idempotency keys, aborts, client timeouts, progress percentages, retry guidance, and nested API base paths.

## Validation

```bash
npm run check:syntax
npm run check:static
npm run check:contracts
npm test
npm run build
# all zero-dependency application gates
npm run validate
```

Additional infrastructure gates run in GitHub Actions:

```bash
npm run test:postgres       # requires disposable PostgreSQL
npm run test:hosted-adapter
# Docker lifecycle is exercised by Container Contract workflow
```

CI validates the reviewer, operator console, source modules, API schemas, immutable workflow pins, backend reference implementation, request-bound concurrency/recovery behavior, PostgreSQL RPC semantics, client/adapter contracts, report provenance, deterministic local lifecycle, published runner health, hardened container lifecycle, and the production Pages artifact.

The published full-lifecycle job is enabled only after the hosted execution fix passes manually. This prevents a known infrastructure blocker from masking unrelated regressions while preserving an explicit production gate.

## Repository map

```text
.
├── index.html                      # Reviewer application shell
├── operator.html                   # Runner operator/status console
├── styles.css / operator.css       # Responsive design systems
├── src/
│   ├── app.js                      # Browser orchestration and safe rendering
│   ├── analyzer.js                 # Deterministic evidence + decision engine
│   ├── github.js                   # Read-only, commit-pinned GitHub client
│   ├── runner-client.js            # Hosted asynchronous API client
│   ├── hosted-report-adapter.js    # Hosted-to-browser report compatibility
│   └── review-runtime.js           # Dormant runtime selector; hosted disabled
├── server/
│   ├── api.js                      # Local API and hosted-path compatibility
│   ├── request-bound-runner.js     # Lease/claim execution reference
│   ├── contracts.js                # Context and idempotency validation
│   └── job-store.js                # Atomic memory/file reference stores
├── supabase/migrations/            # Baseline and request-bound database contracts
├── docs/api/                       # OpenAPI and JSON Schemas
├── tests/                          # Analyzer, backend, database-adjacent, client and adapter tests
├── scripts/                        # Validation, smoke, build and contract checks
├── Dockerfile / compose.yaml       # Hardened hosting-neutral reference runtime
├── docs/                           # Requirements, plans, ADRs, operations and release gates
└── .github/workflows/              # Quality, runner, database, container and Pages gates
```

## Documentation

- [`docs/MASTER_DEVELOPMENT_PLAN.md`](docs/MASTER_DEVELOPMENT_PLAN.md) — execution board and evidence map.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — current development log and exact next target.
- [`docs/api/README.md`](docs/api/README.md) — API contract inventory and compatibility rules.
- [`docs/HOSTED_RUNNER_HANDOFF.md`](docs/HOSTED_RUNNER_HANDOFF.md) — credit-enabled migration, handler, deployment, and acceptance sequence.
- [`docs/RUNNER_OPERATIONS.md`](docs/RUNNER_OPERATIONS.md) — service inventory, incident response, limits, retention, CORS, and operations.
- [`docs/CONTAINER_OPERATIONS.md`](docs/CONTAINER_OPERATIONS.md) — hardened local/container deployment guidance.
- [`docs/OBSERVABILITY_SPEC.md`](docs/OBSERVABILITY_SPEC.md) — safe event, metric, dashboard, and alert contract.
- [`docs/PRIVACY_DATA_HANDLING_DRAFT.md`](docs/PRIVACY_DATA_HANDLING_DRAFT.md) — draft processing and retention disclosure.
- [`docs/GO_LIVE_CHECKLIST.md`](docs/GO_LIVE_CHECKLIST.md) — production promotion gate.
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) — threat model and static-only controls.
- [`CHANGELOG.md`](CHANGELOG.md) — versioned development history.

## Current limitations

- Public GitHub repositories only.
- Anonymous/free-beta GitHub and runner quotas apply.
- At most 24 bounded high-value text artifacts are read per hosted analysis.
- Static indicators do not prove runtime behavior, exploitability, performance, or data flow.
- Repository history, private advisories, branch protection, and organization settings are not comprehensively assessed.
- Anonymous hosted reports are intended to expire after seven days; scheduled production cleanup still requires operational activation.
- The published hosted runner does not yet progress accepted jobs beyond `queued`; the public reviewer therefore remains in browser-analysis mode.
- Request-bound execution is a beta bridge, not the final durable queue/worker architecture.
- The repository does not yet contain a selected open-source license; that is a governance decision before general availability.
- Draft privacy/terms materials still require approval.
- This is decision support, not a security certification or legal opinion.

## Development status

All development that can be completed without Lovable credits is being moved into GitHub with executable evidence: formal contracts, database and container gates, dormant integration code, immutable CI pins, operational specifications, and release checklists. The remaining hosted-lifecycle step is narrow: apply the prepared migration and handler change in Lovable, deploy, pass the full hosted smoke, enable the continuous lifecycle gate, and then activate runner mode in the Pages reviewer.
