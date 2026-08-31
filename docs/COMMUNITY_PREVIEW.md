# ForkWise Community Preview

ForkWise is open for public testing and scoped open-source contributions.

## What we need from the community

- Test public GitHub repositories across languages and project shapes.
- Report confusing or inaccessible workflows.
- Report false positives and false negatives with commit-pinned public evidence.
- Propose deterministic analyzer rules.
- Add small, license-compatible repository fixtures.
- Improve documentation, tests, responsive behavior, and evidence explanations.

## Current product boundary

- Public GitHub repositories only.
- Browser-side bounded static analysis is the normal public review path.
- No repository-controlled code is executed.
- Hosted runner health is available, but hosted analysis activation remains blocked until its queued-job lifecycle passes.
- Reports are decision support, not security certification or legal advice.

## How to participate

1. Read `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
2. Choose an issue marked `good first issue` or `help wanted`, or use an issue form.
3. Confirm the issue is unclaimed when coordination matters.
4. Submit a focused, signed-off pull request with tests and evidence.

## What not to submit

Do not submit private repositories, credentials, personal information, regulated data, proprietary source code, public exploit details, or large copied repositories as fixtures.

## Feedback quality

Strong reports identify:

- public repository and commit;
- review intent and constraints;
- actual versus expected behavior;
- exact finding or UI location;
- why the result is unsupported, incomplete, or confusing;
- a minimal reproduction.

## Release status

The website is suitable for community-preview use. Hosted-runner activation and production/general-availability claims remain separate release gates.
