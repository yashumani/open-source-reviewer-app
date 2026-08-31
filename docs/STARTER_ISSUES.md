# ForkWise Starter Issues

This backlog is designed for community contributors who want a focused first change. Read [`../CONTRIBUTING.md`](../CONTRIBUTING.md), [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), and [`../SECURITY.md`](../SECURITY.md) before starting.

## Good first issues

- [#14 — Add a synthetic FastAPI repository fixture and detection tests](https://github.com/yashumani/open-source-reviewer-app/issues/14)
- [#15 — Add a synthetic TypeScript monorepo fixture for workspace detection](https://github.com/yashumani/open-source-reviewer-app/issues/15)
- [#18 — Expand the README self-hosting claim test matrix](https://github.com/yashumani/open-source-reviewer-app/issues/18)
- [#19 — Add keyboard and screen-reader regression coverage for finding filters](https://github.com/yashumani/open-source-reviewer-app/issues/19)
- [#20 — Add mobile regression coverage for very long evidence paths and repository names](https://github.com/yashumani/open-source-reviewer-app/issues/20)
- [#21 — Document how evidence coverage and decision confidence are calculated](https://github.com/yashumani/open-source-reviewer-app/issues/21)
- [#25 — Add a contributor-onboarding contract for issue and pull-request templates](https://github.com/yashumani/open-source-reviewer-app/issues/25)

## Analyzer and evidence improvements

- [#16 — Improve Docker Compose database and queue service detection](https://github.com/yashumani/open-source-reviewer-app/issues/16)
- [#17 — Add signed release and provenance indicators to Trust findings](https://github.com/yashumani/open-source-reviewer-app/issues/17)
- [#22 — Add a false-positive fixture for telemetry SDKs that are configured but disabled](https://github.com/yashumani/open-source-reviewer-app/issues/22)
- [#23 — Expand Python dependency manifest coverage without invoking package managers](https://github.com/yashumani/open-source-reviewer-app/issues/23)
- [#24 — Represent unavailable branch-protection evidence as unknown instead of absent](https://github.com/yashumani/open-source-reviewer-app/issues/24)

## Claiming work

Comment on the issue when coordination would prevent duplicate work. A maintainer may confirm scope or note dependencies. Passing automation is necessary but does not guarantee merge.

Every contribution must preserve:

- static-only analysis;
- commit-pinned evidence;
- redaction of suspected secrets;
- conclusions no stronger than their sources;
- deterministic tests;
- DCO sign-off.
