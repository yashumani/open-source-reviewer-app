# ForkWise analysis service

This directory is the first backend runner slice. It preserves the evidence-first browser report contract while moving orchestration into a server-side job model.

## Included in this cycle

- `POST /v1/reviews` creates an asynchronous analysis job.
- `GET /v1/jobs/:id` returns queued/running/completed/failed state and progress.
- `GET /v1/reports/:id` returns the persisted report when complete.
- File-backed persistence uses atomic JSON writes under `.runtime/` by default.
- The queue has bounded concurrency from 1 to 4 workers.
- Each analysis runs in a separate Node worker thread with a hard timeout.
- The worker reuses `src/github.js` and `src/analyzer.js`, so browser and backend reports share the same evidence contract.
- Repository-controlled code is never installed or executed.

## Run locally

```bash
npm run api
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

Create a review:

```bash
curl -X POST http://127.0.0.1:8787/v1/reviews \
  -H 'content-type: application/json' \
  -d '{"repositoryUrl":"https://github.com/owner/repo","context":{"intent":"self-host"}}'
```

## Security boundary

A worker thread is a fault/concurrency boundary, not a hostile-code sandbox. This cycle remains within the static-analysis safety model because the runner performs bounded GitHub API reads and deterministic parsing only. Any future build/test execution requires a separate container or VM sandbox with no default outbound network, non-root execution, resource limits, and explicit authorization.

## Deployment status

GitHub Pages deploys the web client only. This service is committed, tested, and runnable, but it is not exposed as a public API until a backend hosting target is selected. The Pages client continues using its browser analysis path in the meantime.
