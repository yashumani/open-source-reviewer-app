# ForkWise — Open Source Reviewer

> **Hosted public beta:** evidence-first open-source adoption due diligence for public GitHub repositories, backed by a static-only analysis runner.

ForkWise helps an engineer decide whether a repository should be **Adopted, Piloted, Forked, Avoided, or reviewed again with more evidence**. It does not produce a generic popularity or code-quality score. The recommendation changes with the user's intended use, deployment target, data sensitivity, team capacity, and external-service policy.

- Reviewer: <https://yashumani.github.io/open-source-reviewer-app/>
- Runner operator console: <https://yashumani.github.io/open-source-reviewer-app/operator.html>
- Hosted runner: <https://forkwise-runner.lovable.app>
- Public API base: `https://forkwise-runner.lovable.app/functions/v1/review-api`

![ForkWise desktop intake](docs/screenshots/landing-desktop.webp)

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
- Hosted `forkwise-report/v1` API with durable jobs and seven-day anonymous reports.
- PostgreSQL `analysis_jobs` and `analysis_reports` tables with row-level security and service-role-only application access.
- Idempotency, bounded request/content/time limits, anonymous rate limits, active-job caps, structured logs, and secret redaction.
- Responsive light/dark operator console with live health, recent job counts, limits, and a real end-to-end API test panel.
- Static GitHub Pages build and deployment workflow.

## Safety boundary

ForkWise performs static inspection only. It does **not** run repository-controlled:

- package installation or lifecycle scripts;
- tests or build commands;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- arbitrary repository HTML or JavaScript.

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

The local reference API remains available for deterministic backend development:

```bash
npm run api
```

## Public runner API

```text
GET  /health
GET  /v1/stats
POST /v1/reviews
GET  /v1/jobs/:id
GET  /v1/reports/:id
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

CI validates the reviewer, operator console, source modules, backend reference implementation, client contract, report schema, responsive static structure, and production artifact. See the latest GitHub Actions run and [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md) for recorded evidence.

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
│   ├── operator.js               # Live status and real API smoke-test UI
│   ├── operator-model.js         # Pure operator summary/status normalization
│   ├── runner-client.js          # Hosted asynchronous API client contract
│   ├── sample.js                 # Embedded auditable sample repository
│   └── schema.js                 # Report contracts and secret redaction
├── server/                       # Dependency-free local reference runner
├── tests/                        # Deterministic analyzer, backend, client, and operator tests
├── scripts/                      # Validation, build, server, and browser checks
├── docs/                         # Requirements, architecture, operations, plans, and evidence
└── .github/workflows/            # Quality and Pages deployment
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
- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md) — automated and responsive UI evidence.

## Current limitations

- Public GitHub repositories only.
- Anonymous/free-beta GitHub and runner quotas apply.
- At most 24 bounded high-value text artifacts are read per hosted analysis.
- Static indicators do not prove runtime behavior, exploitability, performance, or data flow.
- Repository history, private advisories, branch protection, and organization settings are not comprehensively assessed.
- Anonymous reports expire after seven days.
- The free-beta job runner uses best-effort request-lifetime execution with lazy poll resumption; a durable queue is a production-hardening gate.
- This is decision support, not a security certification or legal opinion.

## Development status

The public reviewer is deployed. The hosted runner, PostgreSQL schema, and production URL are provisioned. The current delivery slice adds the GitHub Pages operator console, hardens the runner client, expands validation, and records the operations runbook. The next gate is a live API smoke test tied to the branch/merge commit, followed by authenticated quotas and production-grade worker orchestration.
