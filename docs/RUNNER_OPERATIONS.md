# ForkWise Runner Operations Runbook

> **Current release state:** the published service passes health/schema checks, but queued analysis does not yet execute in Lovable. The request-bound lease migration and handler pattern are prepared in GitHub and await a credit-enabled deployment. The public reviewer remains in browser-analysis mode.

## Service inventory

| Surface | URL / location | Purpose | Current status |
| --- | --- | --- | --- |
| Public reviewer | `https://yashumani.github.io/open-source-reviewer-app/` | Evidence-first browser review experience | Live |
| Operator console | `https://yashumani.github.io/open-source-reviewer-app/operator.html` | Health, recent workload, limits, and API test UI | Live |
| Hosted runner | `https://forkwise-runner.lovable.app` | Lovable Cloud application hosting the static-analysis API | Health live; lifecycle blocked |
| Public API base | `https://forkwise-runner.lovable.app/functions/v1/review-api` | Versioned review/job/report endpoints | Health live; submitted jobs remain queued |
| Lovable project | `eba70e78-93f1-43a5-ac32-f6f6facae256` | Deployment and PostgreSQL owner | Provisioned |
| Source repository | `yashumani/open-source-reviewer-app` | Reviewer UI, operator console, reference runner, tests, SQL, docs | Source of truth |

## Health and status

```http
GET /health
GET /v1/stats
```

`/health` returns the service name, schema version, analyzer version, execution mode, and server time. `/v1/stats` returns aggregate counts for the previous 24 hours. It intentionally excludes repository content, evidence excerpts, and complete reports.

Expected contract:

```json
{
  "status": "ok",
  "service": "forkwise-runner",
  "schemaVersion": "forkwise-report/v1",
  "execution": "static-only",
  "analyzerVersion": "forkwise-hosted/0.1.0"
}
```

GitHub Actions continuously verifies this health contract. It does not treat health as proof that the full analysis lifecycle works.

## Review lifecycle

### Create a review

```http
POST /v1/reviews
Content-Type: application/json
```

```json
{
  "repositoryUrl": "https://github.com/octocat/Hello-World",
  "clientRequestId": "operator-example-001",
  "context": {
    "intent": "self-host",
    "useCase": "Validate the hosted runner.",
    "deploymentTarget": "flexible",
    "sensitivity": "public",
    "teamSize": "small",
    "externalServices": "disclosed"
  }
}
```

A successful request returns `202` with `jobId`, `statusUrl`, and `reportUrl`. Reusing the same `clientRequestId`, normalized repository, and normalized context inside the idempotency window returns the existing job.

### Poll the job

```http
GET /v1/jobs/:id
```

States are `queued`, `running`, `completed`, and `failed`. Progress contains a stage, message, and percentage when known. Public errors are sanitized and may include retry guidance.

### Retrieve the report

```http
GET /v1/reports/:id
```

A completed job returns a `forkwise-report/v1` object. Pending jobs return `409`. Unknown or expired reports return `404`.

## Current lifecycle incident

### Symptom

- `POST /v1/reviews` returns `202` and a durable job ID.
- Repeated `GET /v1/jobs/:id` calls continue to return `queued`.
- The full hosted smoke test times out without seeing `running` or `completed`.

### Root cause

The deployed serverless handler starts analysis with an unawaited background promise. The request ends before the platform guarantees completion of that promise. Polling repeats the same fire-and-forget pattern, so work is never durably claimed and awaited.

### Prepared fix

The repository contains:

- `server/request-bound-runner.js` — tested reference behavior;
- `tests/request-bound-runner.test.js` — concurrency, recovery, idempotency, and safety tests;
- `supabase/migrations/20260831_request_bound_execution.sql` — service-role lease/claim/progress/completion functions;
- `docs/HOSTED_RUNNER_HANDOFF.md` — exact deployment sequence.

The beta bridge makes the first claimable status poll atomically claim the job, await bounded static analysis inside the request, and persist one report. A lease token prevents stale invocations from overwriting a newer result.

## Request-bound lease model

```text
queued job
   ↓ first status poll
claim_analysis_job(job_id)
   ├─ returns no row → another invocation owns the lease
   └─ returns row + lease_token
          ↓
      await bounded static analysis
          ↓
      progress updates renew lease
          ↓
      complete_analysis_job(job_id, lease_token, report)
          ↓
      completed + exactly one report
```

If a request terminates, `lease_expires_at` permits a later poll to reclaim the job. Completion and failure operations require the matching token, so stale work cannot replace a newer terminal result.

## Static-only safety boundary

The runner may:

- call GitHub's public REST API;
- normalize a public `github.com` repository URL;
- resolve the default branch to an exact commit;
- enumerate a bounded recursive tree;
- read a bounded set of high-value UTF-8 text artifacts;
- inspect path names and text using deterministic rules;
- store a redacted report for the configured retention window.

The runner must never execute repository-controlled:

- package managers, lifecycle hooks, tests, or builds;
- shell scripts, Makefiles, or task runners;
- Dockerfiles, containers, or Kubernetes manifests;
- GitHub Actions or other CI workflows;
- HTML, JavaScript, binaries, or application code.

A future runtime-verification product requires a separate sandbox, explicit authorization, non-root ephemeral workers, disabled-by-default outbound network access, resource limits, and captured provenance. It must not be added to this service implicitly.

## Database controls

Lovable Cloud provisions PostgreSQL through Supabase. The existing database includes:

- `public.analysis_jobs`
- `public.analysis_reports`
- `public.touch_updated_at()`
- `public.purge_expired_analyses()`

Both tables have row-level security enabled. There are no `anon` or `authenticated` policies, so direct browser reads and writes are denied by default. The server-side service-role client is the only application path with table access.

The prepared migration adds:

- `analysis_jobs.lease_token`
- `analysis_jobs.lease_expires_at`
- `analysis_jobs.attempt_count`
- `claim_analysis_job(...)`
- `update_analysis_progress(...)`
- `complete_analysis_job(...)`
- `fail_analysis_job(...)`

These changes are **not yet deployed** to Lovable. Do not represent them as production-active until the database is queried after deployment and the hosted lifecycle test passes.

### Retention cleanup

Schedule the following service-role operation at least daily:

```sql
select public.purge_expired_analyses();
```

The function removes expired reports and jobs. Monitor deletion counts and database size. The current migration exposes the function only to `service_role`.

## Free-beta limits

| Control | Current target |
| --- | ---: |
| Request body | 8 KiB hosted / 32 KiB local reference |
| Use-case text | 1,000 characters |
| Recursive tree entries considered | 12,000 |
| Text artifacts fetched | 24 |
| Single file | 128 KiB |
| Total fetched text | 768 KiB |
| Analysis deadline | 45 seconds |
| Serialized report | 512 KiB |
| Per-client submissions | 8 per 10 minutes |
| Active jobs | 12 |
| Idempotency replay | 30 minutes |
| Anonymous retention | 7 days |
| Request-bound lease | 60 seconds target |

The in-memory limiter is a fast first layer. PostgreSQL-backed recent-job counts are the durable anonymous quota. Stronger authenticated quotas, organization policy, and cost controls are production gates.

## CORS

Mutation requests allow these origins:

- `https://yashumani.github.io`
- approved Lovable preview and production host patterns
- explicitly configured local development origins

No wildcard origin is returned for mutation routes. Add a production origin only through a reviewed code change and a deployment smoke test.

## Environment and secrets

Lovable Cloud supplies the Supabase URL, publishable key, and service-role secret. The service-role key must remain server-only. An optional `GITHUB_TOKEN` may raise upstream GitHub API limits; it must be stored as a deployment secret and never returned to the browser, logs, excerpts, or reports.

Structured logs may contain job IDs, normalized repository keys, decisions, coverage, and error codes. They must not contain repository file contents, credentials, request secrets, or unredacted provider messages.

## CI verification layers

### Required on normal changes

1. `Quality` — syntax, static validation, all deterministic tests, build.
2. `Runner Contract and Hosted Health / Local request-bound lifecycle` — complete lifecycle against the deterministic local contract service.
3. `Runner Contract and Hosted Health / Published runner health contract` — exact hosted health/schema/analyzer/static-only response.

### Opt-in production gate

`Runner Contract and Hosted Health / Published runner full lifecycle` runs only when:

- a workflow dispatch selects `full_hosted_lifecycle`, or
- repository variable `FORKWISE_HOSTED_LIFECYCLE_ENABLED=true`.

Keep that variable unset until the Lovable execution deployment succeeds manually. After it passes, enable the variable so every `main` push continuously verifies the full lifecycle.

## Operator smoke test after deployment

1. Open `operator.html` from the deployed Pages site.
2. Confirm the health badge reports Operational and the contract fields match this runbook.
3. Submit the default small public repository.
4. Confirm progress advances `queued → running → completed` through a durable job.
5. Confirm the result shows decision, confidence, coverage, dimensions, blockers, commit SHA, and generated time only.
6. Confirm no evidence excerpts or complete report JSON are displayed.
7. Refresh status and confirm the 24-hour counters reflect the job.
8. Run the opt-in GitHub Actions lifecycle and record its run URL and release commit.

## Incident response

### Health unavailable

- Check Lovable deployment status and the production URL.
- Check Supabase availability and environment variables.
- Review sanitized structured logs for configuration or upstream failures.
- Do not expose service-role credentials while debugging.

### Jobs remain queued

- Confirm the request-bound migration and handler were actually deployed.
- Verify `claim_analysis_job` exists and is executable by `service_role`.
- Confirm the status handler awaits the claimed job rather than calling `void runJob(...)`.
- Inspect sanitized logs for claim, GitHub rate-limit, timeout, and completion events.

### Jobs remain running

- Inspect `lease_expires_at` and `attempt_count`.
- Confirm a poll after lease expiry can reclaim the job.
- Verify progress updates renew the matching lease token.
- Avoid manual status edits unless data integrity is understood.

### Elevated failures

- Group by public error code: `upstream_rate_limited`, `repository_not_found`, `analysis_timeout`, or `analysis_failed`.
- Avoid retry storms; honor retry guidance.
- Roll back the application deployment when failures correlate with a release.
- Preserve the database unless data integrity is compromised.

### Suspected sensitive-data exposure

- Stop public traffic or roll back immediately.
- Rotate affected secrets.
- Purge impacted anonymous reports.
- Preserve a minimal audit trail without copying exposed values.
- Review redaction rules and add a regression test before redeployment.

## Production-hardening gates

Before calling the runner generally available:

- hosted request-bound lifecycle passing continuously;
- authenticated identity and per-user/organization quotas;
- a scheduled and monitored retention job;
- durable worker orchestration rather than request-bound beta execution;
- GitHub App authentication and upstream quota monitoring;
- latency, failure, capacity, and database-size dashboards;
- backup/restore and rollback drills;
- privacy, terms, license, and vulnerability-response review;
- load tests and representative repository smoke tests;
- an explicit go/no-go record tied to a release commit.
