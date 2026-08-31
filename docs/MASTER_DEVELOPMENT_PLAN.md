# Open Source Reviewer — Master Development Plan

> **Purpose:** execution evidence for building, validating, deploying, and maturing ForkWise. This is not the product-requirements document.
>
> **Plan version:** 1.4  
> **Working method:** feature branch → pull request → validated merge to `main`  
> **Last updated:** 2026-08-31

## Status legend

- ⬜ Not started
- 🟡 Implemented or partially complete; acceptance evidence pending
- ✅ Complete with repository or deployment evidence
- 🔴 Blocked by a known external/release dependency

A checkpoint is complete only when implementation, validation, and documentation evidence exist. Local attempts alone do not count.

## Master execution board

| # | Development checkpoint | Status | Primary evidence / exit gate |
| ---: | --- | :---: | --- |
| 01 | Repository development governance | ✅ | README, requirements and development docs |
| 02 | Master execution plan | ✅ | Auditable execution board |
| 03 | Runnable application skeleton | ✅ | Static application + production build |
| 04 | Responsive design system | ✅ | Desktop/tablet/mobile validation |
| 05 | Repository intake workflow | ✅ | URL + intent + use-case controls |
| 06 | GitHub URL normalization/validation | ✅ | Deterministic parser tests |
| 07 | Read-only GitHub retrieval | ✅ | Commit/tree pinning and provider error tests |
| 08 | Analysis progress UX | ✅ | Explicit analysis stages |
| 09 | Artifact inventory | ✅ | Deterministic classifier tests |
| 10 | Language/framework detection | ✅ | Evidence-derived technology signals |
| 11 | Evidence/finding schemas | ✅ | Schema and evidence-reference validation |
| 12 | Documentation/license analyzer | ✅ | Deterministic rules and evidence |
| 13 | Testing/CI analyzer | ✅ | Test/CI signals; no fabricated coverage |
| 14 | Deployment/operations analyzer | ✅ | Container/data/runtime inventory |
| 15 | External-service/telemetry analyzer | ✅ | Static indicators with runtime uncertainty |
| 16 | Security-posture analyzer | ✅ | Governance/workflow/secret-redaction rules |
| 17 | README Reality Check | ✅ | Claim ledger and claim-state tests |
| 18 | Fit/Trust/Run/Own/Exit dimensions | ✅ | Contextual dimension model |
| 19 | Contextual decision engine | ✅ | Adopt/Pilot/Fork/Avoid/Insufficient Evidence tests |
| 20 | Executive review dashboard | ✅ | Decision-first responsive report |
| 21 | Evidence explorer/detailed report | ✅ | Search/filter/evidence links |
| 22 | Report export and pilot checklist | ✅ | JSON/Markdown provenance tests |
| 23 | Full quality/security validation | ✅ | Automated CI + responsive validation |
| 24 | Deploy and live-validate browser preview | ✅ | Live Pages reviewer |
| 25 | Runner architecture | ✅ | Static-only worker and request/job model |
| 26 | Analysis API | ✅ | Health, stats, review, status and report routes |
| 27 | Job queue | ✅ | Bounded queue and progress/failure handling |
| 28 | Static-analysis worker | ✅ | Worker timeout and analyzer reuse |
| 29 | Report/job persistence | ✅ | Atomic local store plus memory test store |
| 30 | Web-to-runner integration | 🟡 | Client complete; activation gated on hosted lifecycle |
| 31 | Backend hosting provisioned | ✅ | Published Lovable service shell |
| 32 | Hosted datastore baseline | ✅ | PostgreSQL jobs/reports, RLS, indexes, retention function |
| 33 | Authentication, quotas and abuse controls | 🟡 | Anonymous controls exist; authenticated identity/quotas remain |
| 34 | Strong worker isolation | 🟡 | Non-root read-only container reference prepared; production distributed worker remains |
| 35 | Activate runner mode in live reviewer | 🔴 | Blocked until hosted job lifecycle passes |
| 36 | Production observability and operations | 🟡 | Console, runbooks and specification exist; live metrics/alerts/restore drill remain |
| 37 | Security/privacy/legal readiness | 🟡 | Security model and privacy draft exist; approvals/terms/license remain |
| 38 | Production release gate | 🔴 | Hosted jobs remain queued; no go-live approval |
| 39 | Request-bound lease reference implementation | ✅ | Lease runner, stores and exact route-prefix API |
| 40 | Hosted database/handler handoff package | ✅ | Production lease migration + handoff |
| 41 | Layered runner CI gates | ✅ | Local lifecycle, published health, opt-in hosted lifecycle |
| 42 | Deploy request-bound execution to Lovable | 🔴 | Credit-dependent migration and handler deployment |
| 43 | Hosted lifecycle verification and UI activation | ⬜ | Full smoke, operator validation, Pages integration |
| 44 | Formal API and report contracts | 🟡 | OpenAPI 3.1 + request/job/report JSON Schemas; CI evidence pending |
| 45 | Executable PostgreSQL contract | 🟡 | Clean baseline + migration/RLS/lease/idempotency tests; CI pending |
| 46 | Hardened hosting-neutral container | 🟡 | Non-root/read-only/cap-drop lifecycle workflow; CI pending |
| 47 | Dormant hosted report adapter/runtime | 🟡 | Adapter/runtime tests; static gate keeps hosted disabled; CI pending |
| 48 | Workflow supply-chain hardening | 🟡 | Immutable action SHAs, validation script, Dependabot; CI pending |
| 49 | Privacy, observability and go-live governance | ✅ | Draft notice, metrics/alert spec, ADRs, release checklist |
| 50 | Credit-free readiness release | 🟡 | Quality + runner + database + container + Pages evidence required |

## Current architecture

```text
GitHub Pages reviewer
   ├── active: bounded browser static analysis
   └── dormant: hosted runtime selector (forced disabled)
                         │
                         ▼
Published Lovable API shell
   ├── liveness/schema: live
   ├── PostgreSQL jobs/reports: provisioned
   └── execution: blocked in deployed fire-and-forget handler
                         │
                         ▼
Prepared beta bridge
   ├── atomic PostgreSQL lease claim
   ├── first claimable poll awaits bounded analysis
   ├── progress renews lease
   ├── stale invocation cannot overwrite newer result
   └── completion persists exactly one report
```

## Credit-free readiness cycle — Steps 44–50

This cycle intentionally uses no Lovable credits.

### Formal contracts

- `docs/api/openapi.json`
- `docs/api/review-request-v1.schema.json`
- `docs/api/job-status-v1.schema.json`
- `docs/api/forkwise-report-v1.schema.json`
- `scripts/validate-api-contract.mjs`
- `tests/api-contract.test.js`

The contract fixes endpoint names, request context, job states, `forkwise-report/v1`, the static-only invariant, exactly five dimensions, and 40-character commit provenance.

### Database contract

- `supabase/migrations/20260830_forkwise_runner_schema.sql` creates a clean idempotent baseline.
- `supabase/migrations/20260831_request_bound_execution.sql` adds lease/claim/progress/completion/failure behavior.
- `scripts/test-postgres-contract.sh` validates RLS, service-role privileges, concurrent claims, stale-token rejection, lease renewal, one-report completion, idempotency, browser denial, and retention cleanup.
- `.github/workflows/database-contract.yml` runs the test against disposable PostgreSQL 16.

### Container contract

- `Dockerfile` runs the dependency-free service as the unprivileged `node` user.
- `compose.yaml` applies a read-only root, writable data volume, tmpfs, dropped capabilities, no-new-privileges, and CPU/memory/PID bounds.
- `.github/workflows/container-contract.yml` builds the image and completes the exact-prefix deterministic lifecycle through the hardened container boundary.

### Dormant integration

- `src/hosted-report-adapter.js` maps hosted reports into the existing reviewer contract without changing repository facts.
- `src/review-runtime.js` centralizes runtime selection with `hostedEnabled: false` and `automaticFallback: false`.
- `tests/hosted-report-adapter.test.js` rejects dynamic/unpinned reports and verifies no silent fallback.
- Static validation fails if hosted mode is enabled before production evidence exists.

### Supply-chain and governance

- External GitHub Actions are pinned by immutable 40-character SHAs.
- `scripts/validate-workflows.mjs` enforces pins, permissions and timeouts.
- Dependabot tracks Action and Docker updates.
- Privacy/data-handling, observability, container operations, ADRs, changelog and go-live checklist are repository artifacts.

## Security boundary

- Repository-controlled packages, tests, builds, scripts, Dockerfiles, Makefiles, workflows, HTML, JavaScript, binaries and application code are not executed.
- Container and worker boundaries are defense-in-depth for ForkWise itself; they do not authorize dynamic repository execution.
- Request, tree, file, content, time and report limits remain bounded.
- Public errors and evidence excerpts remain redacted.
- Hosted mode cannot be enabled by configuration drift without failing static validation.

## Current external blocker

The Lovable production handler still starts unawaited analysis after returning a response. The hosted release blocker closes only when:

1. the prepared migrations are applied;
2. the status handler claims and awaits using the returned lease token;
3. completion/failure uses the same lease token;
4. the full hosted lifecycle smoke passes;
5. the operator console observes a completed job;
6. the public reviewer is switched and responsive/error states are revalidated.

## Evidence package required for every cycle

1. Commit SHA and files changed.
2. Automated test commands and passed/failed counts.
3. Syntax/static/contract/build result.
4. Database/container evidence where applicable.
5. Desktop/mobile and error-state evidence where applicable.
6. Security-boundary result.
7. Deployment workflow and URL when applicable.
8. Known limitations.
9. Updated checkpoint status.
10. Exact next checkpoint.
