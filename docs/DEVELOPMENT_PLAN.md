# Open Source Reviewer — Development Plan and Execution Log

> **Status:** Public reviewer live; second credit-free production-readiness cycle in validation  
> **Working method:** feature branch → pull request → GitHub Actions → merge → Pages deploy  
> **Current checkpoint:** Steps 44–50 implemented; repository CI evidence pending  
> **Last updated:** 2026-08-31

The execution board is maintained in [`MASTER_DEVELOPMENT_PLAN.md`](MASTER_DEVELOPMENT_PLAN.md). This file records development cycles, validation evidence, blockers, and the exact next action.

## Current objective

Complete every safe development task that does not require Lovable credits, while keeping the public reviewer on its proven browser-analysis path until the hosted lifecycle is genuinely operational.

## Development cycle — 2026-08-31: credit-free production readiness

### Scope

This cycle builds executable evidence around the already prepared request-bound runner instead of changing the deployed Lovable service.

### Implemented

1. **Formal API contract**
   - OpenAPI 3.1 document.
   - JSON Schemas for review requests, job states, and `forkwise-report/v1`.
   - Contract validator and deterministic tests.
2. **Reproducible PostgreSQL contract**
   - Idempotent clean baseline migration.
   - Existing request-bound lease migration.
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

### Local targeted validation

```text
API contract validator: passed
Workflow pin/permission/timeout validator: passed
Request-bound tests: 7 passed, 0 failed
API contract tests: 4 passed, 0 failed
Hosted adapter/runtime tests: 5 passed, 0 failed
Shell syntax: passed
```

PostgreSQL and Docker are intentionally verified in GitHub Actions because those runtimes are not available in the current local tool environment.

### Merge gates

This cycle is mergeable only when:

- Quality passes the full zero-dependency suite and build.
- Runner Contract passes local lifecycle and published health.
- Database Contract passes on PostgreSQL 16.
- Container Contract passes its hardened lifecycle.
- Hosted full lifecycle remains skipped until the Lovable fix is deployed.

### Safety result

- Static-only boundary unchanged.
- Hosted reviewer mode remains off.
- Automatic failure fallback remains off.
- PostgreSQL RPCs are service-role-only.
- Direct browser database access remains denied.
- Workflow dependencies are immutable at execution time.
- Container runs as non-root with a read-only root and no Linux capabilities.
- No paid service, private-repository credential, or dynamic execution was introduced.

### Known limitations

- PostgreSQL contract verifies the committed schema, not the still-unmodified Lovable production database.
- Container reference persistence is single-instance only.
- The published hosted runner still leaves jobs queued.
- The privacy notice is a draft, not legal approval.
- Observability is specified but not deployed.
- The project license remains an unresolved governance decision.

### Exact next action after GitHub CI

If all branch workflows pass:

1. merge the readiness pull request;
2. verify Quality, Runner, Database, Container, and Pages workflows on the merge commit;
3. update Steps 44–50 to complete with exact evidence;
4. create/maintain issues for project license and privacy/legal approval;
5. pause only the Lovable-dependent deployment and public hosted-mode activation.

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

1. Apply both committed migrations to the hosted database.
2. Replace fire-and-forget `void runJob(...)` calls.
3. Make job polling atomically claim and await bounded analysis.
4. Complete/fail through matching service-role lease RPCs.
5. Deploy the hosted service.
6. Run the opt-in full hosted lifecycle.
7. Enable continuous hosted lifecycle only after a successful manual run.
8. Activate hosted mode in the Pages reviewer and revalidate desktop/mobile progress and failures.

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
