# ForkWise Runner Observability Specification

## Objectives

Observability must answer four operational questions without copying repository content into telemetry:

1. Is the API reachable and returning the expected static-only contract?
2. Are jobs being accepted, claimed, completed, failed, or stranded?
3. Are GitHub upstream limits, analysis timeouts, or local capacity causing user-visible failures?
4. Can a release be correlated with a change in latency, error rate, or report integrity?

## Structured event schema

Every server event should include:

```json
{
  "timestamp": "2026-08-31T00:00:00.000Z",
  "service": "forkwise-runner",
  "environment": "production",
  "event": "job_completed",
  "jobId": "uuid",
  "repositoryKeyHash": "sha256",
  "schemaVersion": "forkwise-report/v1",
  "analyzerVersion": "forkwise-hosted/0.1.0",
  "durationMs": 1234,
  "attemptCount": 1,
  "decision": "Pilot",
  "evidenceCoverage": 78
}
```

Repository file content, excerpts, tokens, request bodies, and complete reports are prohibited telemetry fields.

## Required event names

| Event | Required fields | Purpose |
| --- | --- | --- |
| `request_rejected` | route, publicErrorCode, status | Validation/CORS/quota failures |
| `job_accepted` | jobId, repositoryKeyHash, intent, idempotent | Intake volume and replays |
| `job_claimed` | jobId, attemptCount, leaseDurationMs | Execution ownership |
| `job_progress` | jobId, stage, percent | Stranded-stage diagnosis; sample or rate-limit if noisy |
| `job_completed` | jobId, durationMs, decision, evidenceCoverage, counts | Success/quality trend |
| `job_failed` | jobId, durationMs, publicErrorCode, retryable | Error trend without sensitive details |
| `job_reclaimed` | jobId, attemptCount, previousLeaseAgeMs | Serverless termination/recovery |
| `retention_purged` | jobsDeleted, reportsDeleted, durationMs | Retention evidence |
| `provider_rate_limited` | provider, retryAfterSeconds | Upstream capacity |
| `report_contract_rejected` | jobId, reasonCode | Schema or provenance integrity |

## Metrics

### Availability and traffic

- health request success rate;
- review submissions per minute/hour;
- rejected requests by public error code;
- unique anonymous client hashes per window;
- CORS rejections.

### Queue and execution

- queued, running, completed, failed counts;
- oldest queued age;
- oldest active lease age;
- claim attempts and reclaim rate;
- execution attempts per completed job;
- concurrent active jobs;
- job duration p50/p90/p95/p99.

### Analysis bounds

- tree entry count;
- selected file count;
- fetched text bytes;
- skipped oversized/binary file count;
- truncated-tree count;
- report byte size;
- evidence and finding counts.

### Upstream and storage

- GitHub request count and latency;
- GitHub 403/404/422/429/5xx counts;
- database query/RPC latency and errors;
- job/report row count and storage size;
- expired rows awaiting cleanup;
- retention deletion count.

## Initial alerts

| Alert | Suggested condition | Response |
| --- | --- | --- |
| Health unavailable | 3 consecutive failures across 5 minutes | Check deployment/database, roll back if release-correlated |
| Jobs stranded queued | oldest queued age > 2 minutes | Verify claim handler and capacity controls |
| Lease reclaim spike | reclaim rate > 5% for 15 minutes | Investigate serverless timeouts or provider latency |
| High failure rate | failed / terminal > 10% for 15 minutes, excluding expected 404s | Group by public error code |
| Provider throttling | GitHub rate-limited events > threshold | Reduce concurrency, add authenticated provider quota |
| Retention lag | expired rows present > 24 hours | Run/repair cleanup schedule |
| Contract rejection | any production event | Stop rollout and inspect analyzer/client compatibility |
| Report size pressure | p95 > 80% of maximum | Tune evidence bounds before hard failures |

Thresholds must be calibrated during beta rather than treated as universal constants.

## Health versus readiness

- **Liveness:** process can return a minimal response.
- **Readiness:** database/RPC contract is available and the service can accept work.
- **End-to-end:** a real bounded repository progresses to a valid commit-pinned report.

The public status UI must not equate liveness with successful end-to-end analysis. GitHub Actions therefore maintains separate health and lifecycle checks.

## Dashboard minimum

A production dashboard should show:

- health and deployment version;
- current queued/running jobs;
- 24-hour accepted/completed/failed counts;
- p50/p95 execution duration;
- failure codes;
- lease-reclaim rate;
- GitHub rate-limit events;
- database size and expired-row count;
- latest successful end-to-end smoke timestamp.

## Retention and access

Operational logs need a documented retention period, access control, and deletion procedure. Repository identifiers should be hashed or minimized where full names are unnecessary. Security investigations may require longer audit retention, but that decision needs explicit approval rather than accidental logging.
