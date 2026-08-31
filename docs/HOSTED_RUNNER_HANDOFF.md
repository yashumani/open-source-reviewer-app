# ForkWise Hosted Runner — Deployment Handoff

> Status: implementation prepared in GitHub; Lovable deployment intentionally deferred until platform credits are available.
>
> Last updated: 2026-08-31

## Why the hosted lifecycle is blocked

The published API accepts a review and persists a `queued` job, but the current handler starts analysis with an unawaited background promise. The Lovable/serverless request can end before that promise executes, so repeated status polls continue to return `queued`.

This is an execution-lifecycle problem, not an analyzer, database, GitHub Pages, or browser-client problem.

## Target execution model

```text
POST /v1/reviews
  └─ validate + persist queued job + return 202

GET /v1/jobs/:id
  ├─ terminal job → return status
  ├─ another invocation owns an active lease → return running
  └─ queued or stale-running job
       ├─ claim atomically in PostgreSQL
       ├─ await bounded static analysis inside this request
       ├─ persist report idempotently
       └─ return completed or sanitized failed status
```

The model remains static-only. It does not execute repository-controlled packages, tests, builds, shell commands, Dockerfiles, Makefiles, workflows, HTML, JavaScript, or binaries.

## GitHub-prepared implementation

The repository contains the non-credit work needed before deployment:

- `supabase/migrations/20260831_request_bound_execution.sql`
  - adds `lease_token`, `lease_expires_at`, and `attempt_count`;
  - atomically claims queued or stale-running jobs;
  - renews leases with progress updates;
  - persists one report per job with `ON CONFLICT` idempotency;
  - completes or fails jobs through service-role-only functions.
- `server/request-bound-runner.js`
  - reference implementation of poll-triggered execution;
  - lease recovery;
  - concurrent claim protection;
  - idempotent submissions;
  - sanitized failure handling.
- `tests/request-bound-runner.test.js`
  - first-poll execution;
  - concurrent poll behavior;
  - stale-lease recovery;
  - duplicate-report prevention;
  - idempotency;
  - CORS/context validation;
  - exact `/functions/v1/review-api` compatibility path.
- `.github/workflows/runner-smoke.yml`
  - required local request-bound lifecycle test;
  - required published health check;
  - opt-in hosted full lifecycle test.

## Lovable work to perform when credits are available

### 1. Apply the migration

Apply `supabase/migrations/20260831_request_bound_execution.sql` to the existing Lovable Cloud PostgreSQL database.

Verify:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'analysis_jobs'
  AND column_name IN ('lease_token', 'lease_expires_at', 'attempt_count');
```

Verify the four service functions exist:

```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
  'claim_analysis_job',
  'update_analysis_progress',
  'complete_analysis_job',
  'fail_analysis_job'
);
```

### 2. Replace fire-and-forget execution

Remove both uses of:

```ts
void runJob(jobId)
```

`POST /v1/reviews` must only persist and return the job.

`GET /v1/jobs/:id` must:

1. read the current job;
2. call `claim_analysis_job` for queued or stale-running jobs;
3. if the claim returns a row, `await` the bounded analysis;
4. call `update_analysis_progress` with the returned lease token while processing;
5. call `complete_analysis_job` or `fail_analysis_job` with the same lease token;
6. refetch and return the final public job state.

### 3. Preserve retry safety

- Only one claim may succeed for a given active lease.
- Completion must upsert by `job_id`.
- A late invocation must not overwrite a terminal result.
- Errors must remain sanitized.
- The 45-second static-analysis deadline and bounded file/content limits remain in force.

### 4. Deploy and verify health

Expected health contract:

```json
{
  "status": "ok",
  "service": "forkwise-runner",
  "schemaVersion": "forkwise-report/v1",
  "analyzerVersion": "forkwise-hosted/0.1.0",
  "execution": "static-only"
}
```

### 5. Enable the hosted lifecycle gate

After a successful manual lifecycle run, create the repository variable:

```text
FORKWISE_HOSTED_LIFECYCLE_ENABLED=true
```

Until then, GitHub Actions checks published health but deliberately skips the broken full lifecycle, while the local request-bound contract remains mandatory.

## Go-live acceptance evidence

The hosted runner is ready to activate in the main Pages UI only after all of the following are true:

1. A submitted job moves `queued → running → completed`.
2. A second concurrent poll does not execute a duplicate analysis.
3. An expired lease can be recovered.
4. Exactly one report exists for the job.
5. The report uses `forkwise-report/v1` and includes an exact 40-character commit SHA.
6. The full hosted smoke workflow passes on `main`.
7. The operator console reports healthy service and successful recent jobs.
8. The main UI is switched from browser analysis to hosted runner mode and desktop/mobile error states are revalidated.

## Remaining production hardening after beta activation

- authenticated user quotas;
- provider-token management;
- a true durable queue/worker rather than request-bound beta execution;
- ephemeral container or VM isolation if dynamic execution is ever introduced;
- metrics, alerting, retention automation, restore testing, and incident runbooks;
- privacy, terms, and security review before broad production promotion.
