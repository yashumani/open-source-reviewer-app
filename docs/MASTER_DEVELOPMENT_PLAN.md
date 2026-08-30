# Open Source Reviewer — Master Development Plan

> **Purpose:** execution evidence for building, validating, deploying, and maturing ForkWise. This is not the product-requirements document.
>
> **Plan version:** 1.2  
> **Working branch during bootstrap:** `main`  
> **Last updated:** 2026-08-30

## Status legend

- ⬜ Not started
- 🟡 In progress / awaiting external evidence
- ✅ Complete with repository evidence
- 🔴 Blocked

A checkpoint is complete only when implementation, validation, and documentation evidence exist in the repository. Local attempts alone do not count.

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
| 24 | Deploy and live-validate browser preview | ✅ | Pages deployment succeeded for commit `440654e068a827e7ca3e3bab23b7b9b7b98e732b`; live URL `https://yashumani.github.io/open-source-reviewer-app/` |
| 25 | Runner architecture | ✅ | `server/README.md`, worker-thread boundary, static-only execution model |
| 26 | Analysis API | ✅ | `server/api.js`; health, create-review, job-status and report endpoints |
| 27 | Job queue | ✅ | `server/job-queue.js`; bounded concurrency, progress, sanitized failures |
| 28 | Static-analysis worker | ✅ | `server/analysis-runner.js`, `server/worker-entry.js`; hard timeout and reuse of existing deterministic analyzer |
| 29 | Report/job persistence | ✅ | `server/job-store.js`; atomic file-backed persistence plus test memory store |
| 30 | Web-to-runner integration | 🟡 | `src/runner-client.js` and client tests complete; activation awaits a public backend API host, while Pages continues using the browser analyzer |

## Current backend cycle — Steps 25–30

### Architecture delivered

```text
GitHub Pages web client
        │
        │ current public preview: browser analysis
        │ future production mode: runner client
        ▼
Analysis API
        │ POST /v1/reviews
        │ GET /v1/jobs/:id
        │ GET /v1/reports/:id
        ▼
Bounded in-process queue
        ▼
Node worker thread
        │
        ├── parse public GitHub URL
        ├── pin default-branch commit
        ├── retrieve bounded static evidence
        ├── run deterministic analyzer
        └── return forkwise report contract
        ▼
Atomic file-backed job/report persistence
```

### Security boundary

- Repository-controlled install scripts, tests, containers, Makefiles, shell scripts, and application code are not executed.
- The worker thread is a concurrency/fault boundary, not a hostile-code sandbox.
- Unexpected runner failures are converted to sanitized public errors.
- Request bodies and context fields are bounded.
- Worker runtime is time bounded.
- Production dynamic build/test execution remains a separate future sandbox service requiring stronger container/VM isolation and explicit authorization.

### Backend-cycle validation gate

The cycle is accepted when:

1. Existing browser tests still pass.
2. Backend queue/API tests pass.
3. Browser runner-client tests pass.
4. Syntax/static checks include the new JavaScript modules.
5. Production Pages build remains successful.
6. Quality Actions succeeds on the final cycle commit.
7. Pages Actions succeeds and the live preview remains reachable.

## What remains before production-service go-live

The browser preview is already public. A full production service requires these additional gates rather than a calendar-date promise:

### Step 31 — Select and provision backend hosting — ⬜
A public HTTPS target must run `server/index.js` (or an evolved containerized equivalent) with controlled cost, secrets, logs, health checks, and rollback.

### Step 32 — Durable production datastore — ⬜
Replace local file persistence with a production database/object-store strategy supporting idempotency, retention, deletion, and audit provenance.

### Step 33 — Authentication, quotas and abuse controls — ⬜
Add user/session identity, per-user and per-repository limits, request throttling, job quotas, and provider credentials without exposing GitHub tokens to the browser.

### Step 34 — Strong worker isolation — ⬜
Run analysis workers in ephemeral containers/VMs with CPU, memory, file-count, archive-size, network and timeout limits. Continue static-only execution by default.

### Step 35 — Activate runner mode in the live UI — ⬜
Configure the Pages client with the public API base URL, switch production analysis from browser mode to asynchronous jobs, preserve browser fallback only for controlled failure/recovery cases, and validate desktop/mobile progress/error states.

### Step 36 — Production observability and operations — ⬜
Add structured logs, metrics, job latency/failure dashboards, alerting, backup/restore, runbooks, and deployment rollback evidence.

### Step 37 — Security/privacy/legal readiness review — ⬜
Review data retention, repository-content handling, secret redaction, terms/privacy disclosures, dependency/license posture, vulnerability response, and threat model before production approval.

### Step 38 — Production release gate — ⬜
Load/smoke testing, end-to-end adoption review against representative repositories, deployment rollback drill, final accessibility/responsive checks, and explicit go/no-go evidence.

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
