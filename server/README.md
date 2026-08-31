# ForkWise analysis service

This directory contains the backend runner reference implementation. It preserves the evidence-first report contract while modeling the request-bound execution pattern required by the current Lovable/serverless beta.

## Current local execution model

```text
POST /v1/reviews
  └─ persist queued job and return 202

GET /v1/jobs/:id
  ├─ atomically claim queued/stale job with an expiring lease
  ├─ await bounded static analysis in the request
  ├─ persist exactly one report
  └─ return completed or sanitized failed status
```

The lease prevents concurrent polls from executing the same job. If an invocation ends unexpectedly, a later poll can reclaim the job after the lease expires. Completion is idempotent and cannot create duplicate reports.

## API paths

The local service supports both simple development routes and the hosted compatibility prefixes:

- `GET /health`
- `POST /v1/reviews`
- `GET /v1/jobs/:id`
- `GET /v1/reports/:id`
- `GET /v1/stats`
- `/functions/v1/review-api/*`
- `/api/public/review-api/*`

## Run locally

```bash
npm run api
```

Health check:

```bash
curl http://127.0.0.1:8787/functions/v1/review-api/health
```

Create a review using the full validated context:

```bash
curl -X POST http://127.0.0.1:8787/functions/v1/review-api/v1/reviews \
  -H 'content-type: application/json' \
  -d '{
    "repositoryUrl":"https://github.com/octocat/Hello-World",
    "clientRequestId":"local-example-1",
    "context":{
      "intent":"self-host",
      "useCase":"Local request-bound runner validation.",
      "deploymentTarget":"flexible",
      "sensitivity":"public",
      "teamSize":"small",
      "externalServices":"disclosed"
    }
  }'
```

Poll the returned `statusUrl`. The first claimable poll performs the bounded analysis before returning the final state.

## Deterministic contract server

The GitHub Actions lifecycle test does not depend on public GitHub availability. It starts a deterministic contract service:

```bash
npm run api:contract
```

Then run:

```bash
FORKWISE_RUNNER_BASE=http://127.0.0.1:8787/functions/v1/review-api \
FORKWISE_EXPECT_ANALYZER_VERSION=forkwise-contract/0.1.0 \
npm run smoke:runner:lifecycle
```

## Security boundary

The runner performs bounded public GitHub API reads and deterministic parsing only. It never executes repository-controlled:

- install or package-manager commands;
- tests or build commands;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- repository HTML, JavaScript, binaries, or application code.

A worker thread and request lease are orchestration/fault boundaries, not hostile-code sandboxes. Any future dynamic execution requires a separate ephemeral container or VM service with no default outbound network, non-root execution, resource limits, provenance capture, and explicit authorization.

## Hosted deployment status

The published Lovable runner currently passes health checks but does not yet complete queued jobs. The production SQL and handler handoff are prepared in:

- `supabase/migrations/20260831_request_bound_execution.sql`
- `docs/HOSTED_RUNNER_HANDOFF.md`

Until that deployment occurs, the public Pages reviewer remains in browser-analysis mode and the hosted lifecycle GitHub Action stays opt-in.
