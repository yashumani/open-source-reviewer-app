# ForkWise Release Checklists

## Community Preview — released

- [x] Public GitHub Pages reviewer deployed.
- [x] GitHub-native responsive interface validated.
- [x] Static-only boundary documented and regression-tested.
- [x] Apache License 2.0 and NOTICE committed and recognized.
- [x] Code of Conduct, governance, contribution, support, and security policies committed.
- [x] Privacy Notice, Community Preview Terms, and Acceptable Use committed.
- [x] Structured issue forms, CODEOWNERS, and pull-request template committed.
- [x] Community-readiness validator and tests added.
- [x] Public limitations and hosted-runner status disclosed.
- [x] Twelve starter issues published and labeled.
- [x] Main Quality, runner, database, container, and Pages workflows passed.
- [ ] Repository About metadata and topics configured by an administrator.
- [ ] Private vulnerability reporting verified by an administrator.
- [ ] `main` branch protection and required checks enforced by an administrator.

The unchecked items are repository-administration controls tracked in issue #11 and [`REPOSITORY_SETTINGS.md`](REPOSITORY_SETTINGS.md). They do not block public product testing, but protection and private reporting should be completed before broad contribution promotion.

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
- [ ] Every completed hosted report uses `forkwise-report/v1`.
- [ ] Every completed hosted report is pinned to a 40-character commit SHA.
- [ ] Evidence links target the analyzed commit.
- [ ] Coverage percentages are never invented.

## Security and abuse

- [x] Browser reviewer static-only boundary remains unchanged.
- [x] Public repository content uses safe text rendering.
- [x] Suspected secret-redaction tests pass.
- [x] Workflow actions are pinned to immutable SHAs.
- [x] Container/reference runtime is non-root with a read-only root filesystem.
- [ ] Hosted request, tree, file, content, time, and report limits verified in production.
- [ ] Hosted mutation CORS and server-only credentials verified.
- [ ] Hosted RLS and anonymous quota controls verified after deployment.

## Data handling

- [x] Browser Community Preview data path and limitations published.
- [x] Community Preview Terms and Acceptable Use published.
- [ ] Hosted retention window matches the final hosted notice.
- [ ] Retention cleanup is scheduled and monitored.
- [ ] Hosted-service privacy/legal approval reflects the selected stack.
- [ ] Hosted deletion/export and incident procedures are exercised.

## Reliability and operations

- [ ] Hosted health, readiness, and end-to-end checks are all green.
- [ ] Structured production logs and minimum metrics are live.
- [ ] Alerts exist for health failure, stranded jobs, lease reclaims, failure spikes, provider limits, and retention lag.
- [ ] Database backup/restore is tested.
- [ ] Application rollback is tested.
- [ ] Capacity and provider-outage runbooks are reviewed against production.

## Public hosted-reviewer activation

- [ ] Hosted mode enabled only after the backend gate passes.
- [ ] Browser fallback behavior is explicit and never silent after security/quota failures.
- [ ] Queued, running, completed, failed, cancelled, rate-limited, timeout, inaccessible, and expired states are tested.
- [ ] 1440, 768, 390, and 320 px checks pass after hosted integration.
- [ ] No unintended horizontal overflow or browser errors.
- [ ] Retention, quota, static-only, and decision-support limitations are visible.

## Production/general availability

- [ ] Hosted lifecycle, identity, abuse, retention, observability, backup, rollback, and incident gates are complete.
- [ ] Legal/privacy review reflects actual production processing and subprocessors.
- [ ] Required GitHub branch protections are enforced.
- [ ] Release notes and exact commit are recorded.
- [ ] All required Actions are green on the GA commit.
- [ ] Explicit owner go/no-go decision is recorded with timestamp.
