# ForkWise — Open Source Reviewer

> **Public preview:** a GitHub-native, evidence-first workspace for deciding whether a public repository should be **Adopted, Piloted, Forked, Avoided, or reviewed again with more evidence**.

ForkWise does not assign a generic popularity score. It pins a repository to an exact commit, inspects bounded static evidence, compares README claims with implementation signals, applies the user's intended use and constraints, and returns an auditable adoption recommendation.

- Reviewer: <https://yashumani.github.io/open-source-reviewer-app/>
- Runner operator console: <https://yashumani.github.io/open-source-reviewer-app/operator.html>
- Source repository: <https://github.com/yashumani/open-source-reviewer-app>
- Hosted runner shell: <https://forkwise-runner.lovable.app>
- Public API base: `https://forkwise-runner.lovable.app/functions/v1/review-api`
- OpenAPI contract: [`docs/api/openapi.json`](docs/api/openapi.json)

## GitHub-native product experience

The `0.8.0` redesign organizes repository due diligence around interaction models maintainers already understand:

| ForkWise information | Repository-native presentation |
| --- | --- |
| Application and repository context | Global bar plus repository header |
| Primary navigation | Review / Workflow / Security / Actions tabs |
| Product explanation | README-style file surface |
| Repository intake | Adoption-check composer |
| Analysis progress | Actions-style workflow stages |
| Recommendation | Checks summary with status and provenance |
| Findings | Issue rows with severity and blocking labels |
| README claims | Review ledger |
| Evidence | File and metadata rows pinned to a commit |
| Operational requirements | Repository environment inventory |
| Next work | Merge-readiness pilot checklist |
| Runner operations | Actions-style control plane |

ForkWise remains distinct from GitHub through its branch/check mark, warm review accent, purple evidence treatment, and contextual decision vocabulary. See [`docs/GITHUB_NATIVE_REDESIGN.md`](docs/GITHUB_NATIVE_REDESIGN.md) and [`docs/GITHUB_NATIVE_REDESIGN_EVIDENCE.md`](docs/GITHUB_NATIVE_REDESIGN_EVIDENCE.md).

## Current service status

| Surface | Status |
| --- | --- |
| GitHub Pages reviewer | Live; browser-side static analysis remains the active path |
| GitHub Pages operator console | Live |
| GitHub-native redesign | Implemented and responsive validation passed; deployment follows merge |
| Hosted runner health/schema contract | Live |
| Hosted PostgreSQL job/report tables | Provisioned with row-level security |
| Hosted queued-job execution | Blocked pending the prepared request-bound Lovable deployment |
| Local request-bound lifecycle | Implemented and required in CI |
| PostgreSQL contract | Passing against disposable PostgreSQL 16 in CI |
| Hardened runner container | Passing a deterministic lifecycle in CI |
| Hosted report adapter/runtime selector | Prepared but statically forced off |

The published hosted API currently accepts and persists a queued review, but its fire-and-forget analysis does not survive the serverless request boundary. The lease model, migrations, reference implementation, contracts, tests, and deployment handoff are ready; the public reviewer deliberately stays on its proven browser-analysis path until that hosted lifecycle passes end to end.

## Product capabilities

- Public `github.com` URL parsing and normalization.
- Default-branch resolution and exact commit pinning.
- Bounded read-only repository metadata, tree, README, release, and high-value text retrieval.
- Deterministic rules for artifacts, language/frameworks, documentation, licenses, tests/CI, deployment, operations, telemetry/external services, security, portability, and maintenance.
- **README Reality Check** with Verified, Partial, Unverified, Contradicted, and Not claimed states.
- Contextual **Fit / Trust / Run / Own / Exit** dimensions.
- Adopt / Pilot / Fork / Avoid / Insufficient evidence decision engine.
- Decision confidence, evidence coverage, blockers, adoption effort, ownership burden, unresolved questions, and repository-specific pilot checklist.
- File- and metadata-level evidence links pinned to the analyzed commit.
- Searchable findings plus JSON and Markdown exports.
- Responsive and keyboard-accessible reviewer and operator experiences.

## Runner and readiness capabilities

- Versioned `forkwise-report/v1` API contract with health, statistics, review submission, job, and report routes.
- OpenAPI 3.1 and JSON Schemas for requests, job states, and reports.
- PostgreSQL `analysis_jobs` and `analysis_reports` baseline with RLS and service-role-only access.
- Request-bound runner reference with atomic claims, expiring leases, stale recovery, idempotency, sanitized errors, and duplicate-report prevention.
- Executable PostgreSQL tests for schema, privileges, concurrent claims, lease renewal, idempotent completion, report uniqueness, and retention cleanup.
- Non-root, read-only Docker packaging with dropped capabilities, `no-new-privileges`, and resource limits.
- Dormant hosted-report adapter and runtime selector; hosted mode cannot be activated accidentally.
- Immutable GitHub Actions pins, workflow policy validation, and Dependabot coverage for Actions and Docker.
- Separate quality, visual, runner, database, container, hosted-lifecycle, and Pages deployment gates.

## Safety boundary

ForkWise performs static inspection only. It does **not** run repository-controlled:

- package installation or lifecycle scripts;
- tests or build commands;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- arbitrary repository HTML, JavaScript, binaries, or application code.

Repository text is rendered through DOM text nodes rather than `innerHTML`. Suspected credential patterns are redacted before they can enter findings, evidence excerpts, public errors, logs, or exports. See [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) and [`docs/adr/0002-static-only-analysis-boundary.md`](docs/adr/0002-static-only-analysis-boundary.md).

## Run locally

Requires Node.js 22 or newer. GitHub Actions uses Node.js 24.

```bash
npm run validate
npm run serve
```

Open:

- reviewer: `http://127.0.0.1:4173`
- operator console: `http://127.0.0.1:4173/operator.html`

### Render the responsive redesign

Python Playwright and a system Chrome/Chromium executable are required only for this optional visual gate:

```bash
python3 -m pip install playwright==1.55.0
npm run validate:ui
```

The script renders reviewer viewports at 1440, 768, 390, and 320 pixels and operator viewports at 1440 and 390 pixels. It checks page overflow, functional sample-report content, keyboard focus, console errors, repository chrome, status styling, and the absence of the former glass/gradient treatment.

### Local request-bound API

```bash
npm run api
```

The first claimable `GET /v1/jobs/:id` poll performs bounded static analysis within the request. Concurrent polls cannot duplicate the active lease, and an expired lease can be recovered.

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

The Compose profile binds to localhost, runs as non-root, uses a read-only root filesystem, drops all Linux capabilities, sets `no-new-privileges`, and bounds CPU, memory, and PIDs. Its local JSON volume is for single-instance development; production multi-instance persistence requires PostgreSQL or an equivalent transactional store.

## API surface

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

The browser client in `src/runner-client.js` supports API-provided status/report URLs, idempotency keys, aborts, client timeouts, progress, retry guidance, and nested API bases.

## Validation

```bash
npm run check:syntax
npm run check:static
npm run check:contracts
npm test
npm run build
npm run validate
```

Additional gates:

```bash
npm run validate:ui          # Playwright visual and responsive evidence
npm run test:postgres        # Requires PostgreSQL
npm run test:hosted-adapter
```

CI verifies application behavior, repository-native static structure, API schemas, immutable workflow pins, request-bound concurrency/recovery, PostgreSQL semantics, report provenance, deterministic local lifecycle, hosted health, hardened container behavior, responsive rendering, and the Pages artifact.

## Repository map

```text
.
├── index.html / styles.css             # GitHub-native reviewer workspace
├── operator.html / operator.css        # Actions-style runner console
├── assets/mark.svg                     # Branch + verified-check identity
├── src/
│   ├── app.js                          # Browser orchestration and safe rendering
│   ├── analyzer.js                     # Deterministic evidence + decision engine
│   ├── github.js                       # Read-only commit-pinned GitHub client
│   ├── runner-client.js                # Hosted asynchronous API client
│   ├── hosted-report-adapter.js        # Hosted-to-browser compatibility
│   └── review-runtime.js               # Dormant runtime selector
├── server/                             # Request-bound reference runner
├── supabase/migrations/                # Baseline and lease contracts
├── docs/api/                           # OpenAPI and JSON Schemas
├── scripts/                            # Build, validation, smoke, and visual checks
├── tests/                              # Deterministic application/runner tests
├── Dockerfile / compose.yaml           # Hardened hosting-neutral runtime
├── docs/                               # Plans, ADRs, evidence, operations, release gates
└── .github/workflows/                  # Quality, visual, runner, database, container, Pages
```

## Documentation

- [`docs/GITHUB_NATIVE_REDESIGN.md`](docs/GITHUB_NATIVE_REDESIGN.md) — visual thesis, information architecture, responsive plan, and acceptance criteria.
- [`docs/GITHUB_NATIVE_REDESIGN_EVIDENCE.md`](docs/GITHUB_NATIVE_REDESIGN_EVIDENCE.md) — branch implementation and browser-validation evidence.
- [`docs/MASTER_DEVELOPMENT_PLAN.md`](docs/MASTER_DEVELOPMENT_PLAN.md) — master execution board.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — current execution log and next target.
- [`docs/HOSTED_RUNNER_HANDOFF.md`](docs/HOSTED_RUNNER_HANDOFF.md) — remaining credit-enabled deployment sequence.
- [`docs/RUNNER_OPERATIONS.md`](docs/RUNNER_OPERATIONS.md) — service operations and incident response.
- [`docs/CONTAINER_OPERATIONS.md`](docs/CONTAINER_OPERATIONS.md) — hardened local/container deployment.
- [`docs/OBSERVABILITY_SPEC.md`](docs/OBSERVABILITY_SPEC.md) — event, metric, dashboard, and alert contract.
- [`docs/PRIVACY_DATA_HANDLING_DRAFT.md`](docs/PRIVACY_DATA_HANDLING_DRAFT.md) — draft processing and retention disclosure.
- [`docs/GO_LIVE_CHECKLIST.md`](docs/GO_LIVE_CHECKLIST.md) — production promotion gate.
- [`CHANGELOG.md`](CHANGELOG.md) — versioned delivery history.

## Current limitations

- Public GitHub repositories only.
- Anonymous/free-beta GitHub and runner quotas apply.
- At most 24 bounded high-value text artifacts are read per hosted analysis.
- Static indicators do not prove runtime behavior, exploitability, performance, or data flow.
- Repository history, private advisories, branch protection, and organization settings are not comprehensively assessed.
- Anonymous hosted reports are intended to expire after seven days; scheduled production cleanup still requires activation.
- The published hosted runner does not yet progress accepted jobs beyond `queued`; the public reviewer remains in browser-analysis mode.
- Request-bound execution is a beta bridge, not the final durable queue/worker architecture.
- The repository license and draft privacy/terms materials still require owner approval before general availability.
- ForkWise is decision support, not a security certification or legal opinion.

## Next hosted milestone

Resume issue `#3` when Lovable credits are available: apply the prepared migrations and handler change, pass the full hosted lifecycle, enable the continuous hosted gate, and then activate the already-prepared runner mode in the public reviewer.
