# ForkWise Maintainer Guide

## Triage cadence

Review new issues regularly and classify them as bug, enhancement, documentation, question, false-positive, false-negative, analyzer-rule, security, good-first-issue, or help-wanted work. Close duplicates with a link to the canonical issue.

## Issue quality gate

A contribution-ready issue should include:

- problem and expected behavior;
- relevant files or modules;
- static-only security considerations;
- acceptance criteria;
- required tests or visual evidence;
- out-of-scope boundaries;
- difficulty and dependencies.

## Pull-request review

Verify:

1. issue scope is respected;
2. repository facts remain separate from contextual interpretation;
3. conclusions are no stronger than their evidence;
4. repository-controlled code is never executed;
5. suspected secrets remain redacted;
6. tests cover positive, negative, and ambiguous cases;
7. API/report compatibility is preserved or migration is documented;
8. UI changes pass required responsive and accessibility checks;
9. commits include DCO sign-off;
10. documentation and changelog reflect material changes.

## Labels

Recommended labels:

- `bug`
- `enhancement`
- `documentation`
- `good first issue`
- `help wanted`
- `question`
- `false positive`
- `false negative`
- `analyzer rule`
- `security`
- `needs reproduction`
- `blocked`

Custom labels that are not available through automation should be created by a repository administrator using the names above.

## Release gate

Do not describe a release as generally available while hosted lifecycle, identity/abuse controls, retention operations, privacy approval, or other production gates remain incomplete. Community preview and hosted beta are separate states.

## Security reports

Move sensitive discussion to GitHub private vulnerability reporting. Do not copy report details into public issues, build logs, screenshots, or test fixtures.
