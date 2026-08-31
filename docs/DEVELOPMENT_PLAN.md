# Open Source Reviewer — Development Plan and Execution Log

> **Status:** All currently available credit-free development is implemented, merged, validated, and deployed  
> **Working method:** feature branch → pull request → GitHub Actions → merge → Pages deploy  
> **Current checkpoint:** Step 42 is the next executable product step and requires a Lovable credit-enabled deployment  
> **Last updated:** 2026-08-31

The execution board is maintained in [`MASTER_DEVELOPMENT_PLAN.md`](MASTER_DEVELOPMENT_PLAN.md). This file records development cycles, validation evidence, blockers, and the exact next action.

## Current objective

Hold the live public reviewer on its proven browser-analysis path while preserving a complete, tested, and auditable handoff for the hosted runner. Resume with the narrow Lovable deployment cycle when credits are available.

## Development cycle — 2026-08-31: credit-free production readiness — complete

### Repository delivery

- Pull request: `#6 — feat: complete credit-free production readiness`
- Merge commit: `252af76c3984e67543971a0894a93d3fa64b3357`
- Pages deployment commit: `252af76c3984e67543971a0894a93d3fa64b3357`
- Release version: `0.7.0`

### Delivered

1. **Formal API contract**
   - OpenAPI 3.1 document.
   - JSON Schemas for review requests, job states, and `forkwise-report/v1`.
   - Contract validator and deterministic tests.
2. **Reproducible PostgreSQL contract**
   - Idempotent clean baseline migration.
   - Request-bound lease migration.
   - Disposable PostgreSQL CI validating schema, RLS, service-role privileges, atomic concurrent claim, lease renewal, stale-token rejection, idempotent completion, report uniqueness, browser denial, and retention cleanup.
3. **Hosting-neutral container**
   - Non-root Node image.
   - Read-only root, data volume, tmpfs, dropped capabilities, no-new-privileges, and resource bounds.
   - CI lifecycle through the exact hosted API prefix.
4. **Dormant hosted integration**
   - Hosted report adapter preserving commit provenance and static-only execution.
   - Runtime selector with hosted mode disabled by default.
   - No automatic fallback after hosted security/quota/provider failures.
   - Static validation that fails if hosted mode is enabled prematurely.
5. **Supply-chain controls**
   - GitHub Actions pinned by immutable commit SHA.
   - Workflow validator requiring top-level permissions and timeouts.
   - Dependabot configuration for Actions and Docker.
6. **Operational/governance artifacts**
   - Privacy and data-handling draft.
   - Observability event/metric/alert specification.
   - Go-live checklist.
   - Architecture decisions for request-bound beta execution and static-only trust boundary.
   - Changelog and container operations guide.

### Main-branch validation evidence

| Workflow | Run | Result | Evidence |
| --- | ---: | :---: | --- |
| Quality | `33425078383` / #26 | ✅ | 39 JavaScript files; static reviewer/operator/hosted-mode checks; API and workflow contracts; **78 passed, 0 failed**; build passed |
| Runner Contract and Hosted Health | `33425078295` / #6 | ✅ | Local request-bound lifecycle passed; hosted health passed; full hosted lifecycle intentionally skipped |
| Database Contract | `33425078323` / #2 | ✅ | PostgreSQL 16 baseline + lease lifecycle, RLS, privileges, atomic claims, idempotency and retention passed |
| Container Contract | `33425078288` / #2 | ✅ | Non-root/read-only/cap-drop container lifecycle passed |
| Pages Readiness and Deploy | `33425078343` / #20 | ✅ | Build, Pages artifact, and deployment all passed |

Quality details:

```text
Syntax validation: 39 JavaScript files
Reviewer static validation: 68 IDs / 5 local assets
Operator static validation: 53 IDs / 7 local assets
Hosted mode: dormant and no automatic fallback
API contract: 4 JSON documents / 5 paths
Workflow contract: 5 workflows / 16 immutable Action pins
Automated tests: 78 passed / 0 failed
Production build: passed
```

Live surfaces after deployment:

- reviewer: `https://yashumani.github.io/open-source-reviewer-app/`
- operator console: `https://yashumani.github.io/open-source-reviewer-app/operator.html`

### Safety result

- Static-only boundary unchanged.
- Hosted reviewer mode remains off.
- Automatic failure fallback remains off.
- PostgreSQL RPCs are service-role-only.
- Direct browser database access remains denied.
- Workflow dependencies are immutable at execution time.
- Container runs as non-root with a read-only root and no Linux capabilities.
- No paid service, private-repository credential, or dynamic execution was introduced.

### Governance follow-through

- Issue `#8` tracks selection and addition of a project license before general availability.
- Issue `#9` tracks review and approval of privacy, terms, retention, and acceptable-use materials.
- Existing issue `#3` contains the credit-dependent hosted lifecycle deployment.
- Existing issue `#4` contains public reviewer activation after lifecycle validation.
- Existing issue `#5` contains post-beta production hardening.

### Known limitations

- PostgreSQL CI verifies the committed schema, not the still-unmodified Lovable production database.
- Container reference persistence is single-instance only.
- The published hosted runner still leaves jobs queued.
- The privacy notice is a draft, not legal approval.
- Observability is specified but not deployed.
- The project license is not selected.
- Request-bound execution is a beta bridge rather than the final durable worker architecture.

## Previous cycle — request-bound runner preparation

Merged commit: `843a18d46bccea03e7f260dcde87c59558806a11`

Evidence:

- 69 deterministic tests passed.
- Local request-bound lifecycle passed.
- Published runner health passed.
- Pages build and deployment passed.
- Full hosted lifecycle intentionally skipped.

That cycle delivered the lease runner, atomic stores, exact hosted route compatibility, production lease migration, deterministic smoke, and deployment handoff.

## Exact Lovable-dependent sequence

The next product-development cycle is fully specified and does not require additional architecture discovery:

1. Apply `supabase/migrations/20260830_forkwise_runner_schema.sql` as an audited baseline check where appropriate, followed by `20260831_request_bound_execution.sql`.
2. Verify lease columns and all four service-role RPCs in the hosted database.
3. Remove fire-and-forget `void runJob(...)` calls from the Lovable handler.
4. Make job polling atomically claim and `await` bounded analysis.
5. Renew progress and complete/fail through the matching lease token.
6. Deploy the hosted service.
7. Run the opt-in full hosted lifecycle against a small public repository.
8. Confirm `queued → running → completed`, one report, `forkwise-report/v1`, `static-only`, and a 40-character commit SHA.
9. Set `FORKWISE_HOSTED_LIFECYCLE_ENABLED=true` only after success.
10. Activate hosted mode in the Pages reviewer and revalidate desktop/mobile progress, cancellation, rate-limit, timeout, failure, and expiry states.

Full handoff: [`HOSTED_RUNNER_HANDOFF.md`](HOSTED_RUNNER_HANDOFF.md).

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-30 | Use a dependency-free static reviewer | Auditability, reliable Pages deployment, minimal supply-chain surface. |
| 2026-08-30 | Pin analysis to an exact commit | Preserve reproducible evidence as branches change. |
| 2026-08-30 | Treat AI as a future synthesis layer | Deterministic evidence remains independently testable. |
| 2026-08-30 | Do not activate hosted mode after health alone | Liveness does not prove the analysis lifecycle. |
| 2026-08-31 | Use request-bound execution as the beta bridge | It fits current serverless constraints and can be retry-safe with leases. |
| 2026-08-31 | Keep hosted full lifecycle opt-in until fixed | Known infrastructure failure must not hide unrelated regressions. |
| 2026-08-31 | Complete non-credit work in GitHub first | Minimize later Lovable cost and make deployment changes auditable. |
| 2026-08-31 | Pin all GitHub Actions by commit SHA | Reduce mutable-tag supply-chain risk. |
| 2026-08-31 | Keep hosted integration dormant in source | Avoid accidental production activation before end-to-end evidence. |
| 2026-08-31 | Treat credit-free readiness as complete only after all five main workflows pass | Preserve evidence-based delivery rather than equating merged code with a validated release. |
