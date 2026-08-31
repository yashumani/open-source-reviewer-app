# Open Source Reviewer — Master Development Plan

> **Purpose:** execution evidence for building, validating, deploying, and maturing ForkWise. This is not the product-requirements document.
>
> **Plan version:** 1.3  
> **Working branch:** feature branch → pull request → validated merge to `main`  
> **Last updated:** 2026-08-31

## Status legend

- ⬜ Not started
- 🟡 In progress / partially complete
- ✅ Complete with repository or deployment evidence
- 🔴 Blocked by a known release dependency

A checkpoint is complete only when implementation, validation, and documentation evidence exist. Local attempts alone do not count.

## Master execution board

| # | Development checkpoint | Status | Primary evidence / exit gate |
| ---: | --- | :---: | --- |
| 01 | Repository development governance | ✅ | `README.md`, requirements and development docs |
| 02 | Master execution plan | ✅ | This document and auditable checkpoints |
| 03 | Runnable application skeleton | ✅ | Static application + local/production build |
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
| 24 | Deploy and live-validate browser preview | ✅ | Live Pages reviewer at `https://yashumani.github.io/open-source-reviewer-app/` |
| 25 | Runner architecture | ✅ | Local static-only worker and request/job model |
| 26 | Analysis API | ✅ | Health, stats, create-review, status and report endpoints |
| 27 | Job queue | ✅ | Bounded local queue and progress/failure handling |
| 28 | Static-analysis worker | ✅ | Worker-thread timeout and existing analyzer reuse |
| 29 | Report/job persistence | ✅ | Atomic local file store plus memory test store |
| 30 | Web-to-runner integration | 🟡 | `src/runner-client.js` complete; public reviewer stays in browser mode until hosted lifecycle passes |
| 31 | Select and provision backend hosting | ✅ | Lovable service published at `https://forkwise-runner.lovable.app` |
| 32 | Durable production datastore baseline | ✅ | PostgreSQL `analysis_jobs` / `analysis_reports`, RLS, indexes, retention function |
| 33 | Authentication, quotas and abuse controls | 🟡 | Anonymous rate/idempotency/capacity controls exist; authenticated identity/quotas remain |
| 34 | Strong worker isolation | ⬜ | Future ephemeral container/VM gate; static-only request execution remains current scope |
| 35 | Activate runner mode in live reviewer | 🔴 | Blocked until hosted job lifecycle completes and smoke is green |
| 36 | Production observability and operations | 🟡 | Operator console, health/stats, structured logs and runbook exist; alerting/metrics/restore drill remain |
| 37 | Security/privacy/legal readiness review | 🟡 | Security model and redaction tests exist; privacy/terms/legal approval remain |
| 38 | Production release gate | 🔴 | Hosted lifecycle currently remains `queued`; no go-live approval |
| 39 | Request-bound lease reference implementation | ✅ | `server/request-bound-runner.js`, extended stores, exact route-prefix API |
| 40 | Hosted database/handler handoff package | ✅ | `supabase/migrations/20260831_request_bound_execution.sql`, `docs/HOSTED_RUNNER_HANDOFF.md` |
| 41 | Layered runner CI gates | ✅ | Required local lifecycle + published health + opt-in hosted lifecycle workflow |
| 42 | Deploy request-bound execution to Lovable | 🔴 | Credit-dependent migration and handler deployment |
| 43 | Hosted lifecycle verification and UI activation | ⬜ | Enable full smoke, validate operator, switch Pages client, re-run responsive/error validation |

## Current architecture

```text
GitHub Pages reviewer
   ├── current live mode: bounded browser static analysis
   └── prepared future mode: src/runner-client.js
                         │
                         ▼
Published Lovable API shell
   ├── health + schema contract: live
   ├── PostgreSQL jobs/reports: provisioned
   └── queued-job execution: blocked in deployed handler
                         │
                         ▼
Prepared request-bound beta bridge (GitHub source)
   ├── atomic lease claim
   ├── first claimable poll awaits analysis
   ├── progress renews lease
   ├── stale invocation cannot overwrite newer result
   └── exactly one report per job
```

## GitHub-only cycle — Steps 39–41

This cycle intentionally uses no Lovable credits.

### Delivered

- `server/contracts.js`
  - normalized context validation with safe defaults;
  - bounded client request identifiers;
  - deterministic context/idempotency fingerprints.
- `server/request-bound-runner.js`
  - poll-triggered execution;
  - expiring lease tokens;
  - stale-job recovery;
  - idempotent submission;
  - sanitized failure output.
- `server/job-store.js`
  - atomic in-process claim/update/complete/fail operations for memory and file stores;
  - duplicate-report protection;
  - idempotency lookup.
- `server/api.js`
  - exact `/functions/v1/review-api/*` and `/api/public/review-api/*` compatibility;
  - request-bound status execution;
  - strict mutation CORS;
  - health/stats contract;
  - validated request context.
- `tests/request-bound-runner.test.js`
  - first-poll completion;
  - concurrent claim once;
  - stale lease recovery;
  - sanitized failures;
  - idempotency;
  - exact hosted route lifecycle;
  - invalid context and disallowed origin.
- `scripts/contract-runner-server.mjs`
  - deterministic dependency-free lifecycle fixture.
- `.github/workflows/runner-smoke.yml`
  - mandatory local request-bound lifecycle;
  - mandatory published health contract;
  - opt-in hosted full lifecycle.
- `supabase/migrations/20260831_request_bound_execution.sql`
  - production lease token, expiry, attempt count, atomic claim, progress renewal, idempotent completion, sanitized failure RPCs.
- Handoff, readiness and operations documentation.

### Local evidence before repository CI

- New JavaScript modules pass `node --check`.
- `node --test tests/request-bound-runner.test.js`: 7 passed, 0 failed.
- Deterministic local lifecycle smoke: queued job completed, one report returned, five dimensions and a 40-character commit SHA validated.

The repository Quality and runner workflows provide final evidence against the complete codebase after the branch commit.

## Security boundary

- Repository-controlled install scripts, tests, containers, Makefiles, shell scripts, workflows, HTML, JavaScript, binaries, and application code are not executed.
- A worker thread, request lease, and local file lock are orchestration/fault boundaries—not hostile-code sandboxes.
- Unexpected runner failures are converted to sanitized public errors.
- Request bodies, context fields, worker runtime, repository tree, file count, file size, total text, and report size remain bounded.
- Production dynamic build/test execution remains a separate future sandbox service requiring stronger container/VM isolation and explicit authorization.

## Current release blocker

The deployed Lovable handler calls unawaited analysis after returning a response. Serverless request termination prevents the job from progressing beyond `queued`.

The blocker closes only when:

1. the prepared PostgreSQL migration is applied;
2. the status handler atomically claims and awaits a job using the returned lease token;
3. completion/failure uses the same token;
4. the hosted lifecycle smoke passes;
5. the operator console observes a completed job;
6. runner mode is activated and revalidated in the public Pages UI.

## Evidence package required for every future cycle

1. Commit SHA.
2. Files changed.
3. Automated test command and passed/failed count.
4. Syntax/static/build result.
5. Desktop/mobile evidence when applicable.
6. Loading/empty/error-state evidence.
7. Security-boundary result.
8. Deployment workflow and URL when applicable.
9. Known limitations.
10. Updated checkpoint status and exact next checkpoint.
