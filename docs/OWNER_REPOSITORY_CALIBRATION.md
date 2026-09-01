# ForkWise Owner Repository Calibration

> Status: automated batch-calibration harness  
> Scope: public repositories owned by a selected GitHub account  
> Security boundary: static-only; repository-controlled code is never executed

## Purpose

This harness runs the same commit-pinned snapshot collector and deterministic analyzer used by the ForkWise reviewer across every public repository owned by a selected GitHub account.

It exists to answer two questions:

1. Does the reviewer complete reliably across repositories with different sizes, languages, purposes, and documentation quality?
2. Are decision rules producing suspicious outcomes, such as `Avoid` without a critical driver or a critical result supported only by example/test files?

## Why multiple intent profiles are required

ForkWise is contextual. A repository can be a strong contribution target, a reasonable library dependency, and a poor self-hosted application at the same time.

The calibration therefore evaluates every successfully collected repository under four fixed profiles:

- **Self-host · UI default constraints** — Docker, internal data, small team, external services must be disclosed.
- **Dependency** — flexible deployment, internal use, small team.
- **Fork and customize** — flexible deployment, internal ownership, small team.
- **Contribute** — public contribution context with external services allowed.

The first profile reproduces the most common initial UI path. The other three show whether the decision model responds to intent rather than presenting a universal repository grade.

## Public and private repository scope

The GitHub Pages Community Preview uses GitHub's public API and does not inherit a visitor's logged-in GitHub browser or ChatGPT session. It currently supports public repositories only.

The calibration workflow intentionally discovers repositories through GitHub's public user-repository endpoint. It does not publish private repository names or content into a public Actions artifact. Private-repository analysis requires a separately approved GitHub App/authentication design with server-side credentials, explicit permissions, deletion controls, and hosted privacy terms.

## Execution

Manual run:

```bash
GITHUB_TOKEN=<read-token> \
FORKWISE_CALIBRATION_OWNER=yashumani \
npm run calibrate:owner
```

GitHub Actions workflow:

```text
Owner Repository Calibration
```

The workflow also runs automatically on `main` when the analyzer, snapshot collector, calibration logic, or workflow itself changes.

## Output

The workflow produces a 30-day Actions artifact containing:

```text
validation/owner-repository-calibration/
├── owner-repository-calibration.json
└── owner-repository-calibration.md
```

The JSON file includes the complete redacted ForkWise report for all four profiles. The Markdown file includes aggregate decisions, the UI-default score table, the four-intent decision matrix, automatic calibration signals, and a dedicated ForkWise self-review section.

## Automatic calibration signals

The harness flags:

- `avoid-without-critical-driver`
- `license-only-avoid`
- `high-fit-avoid`
- `critical-test-fixture-evidence`
- `low-evidence-coverage`
- `decision-context-invariant`
- `all-intents-avoid`
- `noncritical-single-blocker-avoid`

Signals marked as errors fail the workflow after artifacts are written. Review and informational signals remain visible without failing the run.

The run also fails when:

- ForkWise cannot analyze its own repository;
- the current ForkWise self-review still returns `Avoid` under the UI-default self-host profile;
- a non-empty public repository analysis fails.

## Interpretation limits

This is a product-calibration suite, not a benchmark of repository quality. A decision reflects the selected context and the bounded evidence available at a pinned commit. It does not prove runtime behavior, absence of vulnerabilities, legal compatibility, or production fitness.

The calibration artifact may include file paths and short redacted evidence excerpts from public repositories. It must never include private repository content, complete secrets, or repository-controlled execution output.
