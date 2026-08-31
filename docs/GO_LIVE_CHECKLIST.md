# ForkWise Release Checklists

## Community Preview — completed repository gate

- [x] Public GitHub Pages reviewer deployed.
- [x] GitHub-native responsive interface validated.
- [x] Static-only boundary documented and regression-tested.
- [x] Apache License 2.0 and NOTICE committed.
- [x] Code of Conduct, governance, contribution, support, and security policies committed.
- [x] Privacy Notice, Community Preview Terms, and Acceptable Use committed.
- [x] Structured issue forms and pull-request template committed.
- [x] Community-readiness validator and tests added.
- [x] Public limitations and hosted-runner status disclosed.
- [ ] Repository About metadata, private vulnerability reporting, and `main` protection verified by an administrator.
- [ ] Starter issue backlog published and triaged.

The remaining unchecked community items are repository-administration or issue-triage actions, not application implementation blockers.

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

- [ ] Static-only boundary remains unchanged.
- [ ] Request, tree, file, content, time, and report limits are enforced server-side.
- [ ] CORS mutation origins are explicit; no wildcard.
- [ ] Service-role and provider credentials remain server-only.
- [ ] Direct browser table access is denied by RLS and privileges.
- [ ] Anonymous rate, active-job, and idempotency controls are verified.
- [ ] Secret-redaction regression suite passes.
- [ ] Workflow actions are pinned to immutable SHAs.
- [ ] Container/reference runtime runs as non-root with a read-only root filesystem.

## Data handling

- [ ] Hosted retention window matches the published hosted notice.
- [ ] Retention cleanup is scheduled and monitored.
- [ ] Hosted-service privacy and terms receive product/legal approval or explicit limited-beta approval.
- [ ] Logs exclude source content, excerpts, credentials, and complete reports.
- [ ] Incident deletion and credential-rotation procedures are exercised.

## Reliability and operations

- [ ] Health, readiness, and end-to-end checks are separate.
- [ ] Structured logs and minimum metrics are live.
- [ ] Alerts exist for health failure, stranded jobs, lease reclaims, failure spikes, provider limits, and retention lag.
- [ ] Database backup/restore is tested.
- [ ] Application rollback is tested.
- [ ] Capacity and provider-outage runbooks are reviewed.

## Public hosted-reviewer activation

- [ ] Hosted mode enabled only after the backend gate passes.
- [ ] Browser fallback behavior is explicit and never silent after security/quota failures.
- [ ] Queued, running, completed, failed, cancelled, rate-limited, timeout, inaccessible, and expired states are tested.
- [ ] 1440, 768, 390, and 320 px checks pass.
- [ ] No unintended horizontal overflow.
- [ ] Keyboard focus and live status are usable.
- [ ] No browser console or page errors.
- [ ] Retention, quota, static-only, and decision-support limitations are visible.

## Production/general availability

- [ ] Hosted lifecycle, identity, abuse, retention, observability, backup, rollback, and incident gates are complete.
- [ ] Legal/privacy review reflects the actual selected hosting stack.
- [ ] Required GitHub branch protections are enforced.
- [ ] Release notes and exact commit are recorded.
- [ ] All required GitHub Actions are green on the release commit.
- [ ] Explicit owner go/no-go decision is recorded with timestamp.
