# ForkWise Production Go-Live Checklist

> The GitHub Pages reviewer is a public preview. This checklist governs promotion of the hosted runner and reviewer integration, not the existing browser-only preview.

## Hosted execution

- [ ] Request-bound migration applied and verified.
- [ ] Fire-and-forget execution removed from the production handler.
- [ ] Job moves `queued → running → completed` against a real public repository.
- [ ] Concurrent polls execute once.
- [ ] Expired lease recovery passes.
- [ ] Exactly one report exists per job.
- [ ] Failure payloads remain sanitized.
- [ ] Full hosted lifecycle workflow is continuously green.

## Contract and provenance

- [ ] Health reports service, schema, analyzer, execution, and deployment version.
- [ ] OpenAPI and JSON schemas match production responses.
- [ ] Every completed report uses `forkwise-report/v1`.
- [ ] Every completed report is pinned to a 40-character commit SHA.
- [ ] Evidence links target the analyzed commit.
- [ ] Coverage percentages are never invented.

## Security and abuse

- [ ] Static-only boundary is unchanged.
- [ ] Request, tree, file, content, time, and report limits are enforced server-side.
- [ ] CORS mutation origins are explicit; no wildcard.
- [ ] Service-role and provider credentials remain server-only.
- [ ] Direct browser table access is denied by RLS and privileges.
- [ ] Anonymous rate, active-job, and idempotency controls are verified.
- [ ] Secret-redaction regression suite passes.
- [ ] Workflow actions are pinned to immutable SHAs.
- [ ] Container/reference runtime runs as non-root with a read-only root filesystem.

## Data handling

- [ ] Anonymous retention window is disclosed.
- [ ] Retention cleanup is scheduled and monitored.
- [ ] Privacy/data-handling draft has product/legal approval or replacement.
- [ ] Logs exclude source content, excerpts, credentials, and complete reports.
- [ ] Incident deletion and credential-rotation procedures are documented.

## Reliability and operations

- [ ] Health, readiness, and end-to-end checks are separate.
- [ ] Structured logs and minimum metrics are live.
- [ ] Alerts exist for health failure, stranded jobs, lease reclaims, failure spikes, provider limits, and retention lag.
- [ ] Database backup/restore is tested.
- [ ] Application rollback is tested.
- [ ] Capacity and provider-outage runbooks are reviewed.

## Public reviewer activation

- [ ] Hosted mode enabled only after the backend gate passes.
- [ ] Browser fallback behavior is explicit and never silent after security/quota failures.
- [ ] Queued, running, completed, failed, cancelled, rate-limited, timeout, inaccessible, and expired states are tested.
- [ ] 1440, 768, 390, and 320 px checks pass.
- [ ] No unintended horizontal overflow.
- [ ] Keyboard focus and live status are usable.
- [ ] No browser console or page errors.
- [ ] Retention, quota, static-only, and decision-support limitations are visible.

## Governance

- [ ] Project license selected and committed.
- [ ] Terms, acceptable-use, privacy, and security-response contacts approved.
- [ ] Release notes and exact commit recorded.
- [ ] All required GitHub Actions are green on the release commit.
- [ ] Go/no-go decision recorded with owner and timestamp.
