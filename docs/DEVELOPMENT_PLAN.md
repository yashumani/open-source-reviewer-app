# Open Source Reviewer — Development Plan and Execution Log

> **Status:** Public reviewer live; hosted runner lifecycle blocked on deferred Lovable deployment  
> **Working method:** feature branch → pull request → GitHub Actions → merge → Pages deploy  
> **Current checkpoint:** Steps 39–41 complete in GitHub-only cycle; Step 42 awaits Lovable credits  
> **Last updated:** 2026-08-31

The execution board is maintained in [`MASTER_DEVELOPMENT_PLAN.md`](MASTER_DEVELOPMENT_PLAN.md). This file records development cycles, validation evidence, blockers, and the exact next action.

## Current objective

Complete every runner-readiness task that does not require Lovable credits, leave the public reviewer in its proven browser-analysis mode, and reduce the later hosted deployment to one migration/handler/verification cycle.

## Development cycle — 2026-08-31: GitHub-only hosted-runner readiness

### Trigger

The published Lovable service accepts review requests but leaves jobs in `queued`. A GitHub Actions end-to-end smoke test reproduced the condition for two minutes and failed with a client timeout.

### Root cause

The hosted serverless handler starts work with an unawaited background promise. The request returns before the platform guarantees execution of that promise. Polling repeats the same pattern and does not create a durable worker.

### Delivered without Lovable credits

- Request-bound execution reference implementation with expiring lease tokens.
- Atomic in-process claim, progress, completion, failure, and idempotency operations for memory and file stores.
- Stale-lease recovery and late-invocation protection.
- Duplicate-report prevention.
- Exact hosted route-prefix compatibility in the local API.
- Strict validated context and client request identifiers.
- Deterministic local lifecycle server and smoke script.
- CI split into:
  - required local request-bound lifecycle;
  - required published health check;
  - opt-in published full lifecycle.
- Production PostgreSQL migration for lease/claim/progress/completion/failure RPCs.
- Hosted deployment handoff and updated operations documentation.
- README corrected so health/provisioning are not represented as completed hosted analysis.

### Local validation before repository CI

```text
node --check server/contracts.js
node --check server/job-store.js
node --check server/request-bound-runner.js
node --check server/api.js
node --check scripts/contract-runner-server.mjs
node --check scripts/smoke-runner.mjs
node --check tests/request-bound-runner.test.js

node --test tests/request-bound-runner.test.js
  7 passed
  0 failed

Deterministic lifecycle smoke
  health: ok
  job: queued → completed
  report schema: forkwise-report/v1
  decision: Pilot
  dimensions: 5
  commit SHA: 40 characters
  reports persisted: 1
```

The complete repository validation is delegated to GitHub Actions after the branch commit. The change is mergeable only if Quality, the local request-bound lifecycle, and published health jobs are green.

### Security result

- Static-only boundary unchanged.
- Repository-controlled code is not executed.
- Concurrent polls cannot execute the same active lease.
- An expired lease can be recovered.
- A stale invocation cannot complete or fail a newer lease.
- Unexpected error details are replaced with a generic public message.
- CORS mutation allowlist remains explicit; no wildcard origin.
- PostgreSQL RPCs are restricted to `service_role`.

### Known limitations

- File-store atomicity is in-process only; it is a local reference, not a distributed production database.
- The published Lovable handler is unchanged until credits are available.
- The hosted job lifecycle therefore remains blocked.
- The public reviewer remains in browser-analysis mode.
- Request-bound execution is a beta bridge; a durable worker queue remains a production hardening step.

### Exact next action requiring Lovable credits

1. Apply `supabase/migrations/20260831_request_bound_execution.sql`.
2. Remove fire-and-forget `void runJob(...)` calls.
3. Make the status endpoint atomically claim and await analysis using the returned lease token.
4. Persist completion/failure through the matching service-role RPC.
5. Deploy the Lovable project.
6. Manually run the full hosted lifecycle workflow.
7. Set repository variable `FORKWISE_HOSTED_LIFECYCLE_ENABLED=true` only after it passes.
8. Activate hosted mode in the Pages reviewer and revalidate desktop/mobile progress and failures.

Full handoff: [`HOSTED_RUNNER_HANDOFF.md`](HOSTED_RUNNER_HANDOFF.md).

## Previous delivery evidence

### Browser reviewer and operator console

- Live reviewer: `https://yashumani.github.io/open-source-reviewer-app/`
- Live operator console: `https://yashumani.github.io/open-source-reviewer-app/operator.html`
- Latest merged operator cycle before this work: commit `14e2168785019638bac2d20d521838d3f0c99d08`
- Quality: 62 passed, 0 failed
- Pages build/deploy: successful

### Product capabilities already delivered

- Public GitHub URL validation and commit pinning.
- Bounded read-only repository evidence collection.
- Deterministic analyzers and normalized evidence.
- README Reality Check.
- Fit/Trust/Run/Own/Exit dimensions.
- Adopt/Pilot/Fork/Avoid/Insufficient Evidence decisions.
- Responsive report, evidence explorer, exports, and pilot checklist.
- Operator health/status console.
- Hosted database and API shell.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-30 | Use a zero-dependency static reviewer | Immediate auditability, reliable Pages deployment, and minimal supply-chain surface. |
| 2026-08-30 | Pin every analysis to the default-branch commit | Preserve reproducible evidence when branch contents change. |
| 2026-08-30 | Read at most 24 high-value text artifacts | Bound API usage and repository-content exposure. |
| 2026-08-30 | Treat AI as a future synthesis layer, not a fact source | Deterministic evidence must remain independently testable. |
| 2026-08-30 | Provision Lovable hosting and PostgreSQL | Establish the public API/database foundation. |
| 2026-08-30 | Do not activate hosted mode after health alone | Health does not prove the analysis lifecycle. |
| 2026-08-31 | Use request-bound execution as the beta bridge | It matches the current serverless constraint and can be made retry-safe with leases. |
| 2026-08-31 | Keep full hosted lifecycle opt-in until fixed | Prevent a known external blocker from hiding regressions in unrelated GitHub work. |
| 2026-08-31 | Complete all non-credit work in GitHub first | Minimize later Lovable credit usage and make deployment changes reviewable. |
