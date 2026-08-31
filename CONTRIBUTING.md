# Contributing to ForkWise

Thank you for helping build an evidence-first reviewer for public GitHub repositories.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are submitted under the [Apache License 2.0](LICENSE).

## Before starting

Use the appropriate issue form for bugs, false positives, false negatives, analyzer-rule proposals, features, or documentation. Small spelling and obvious test fixes may go directly to a pull request. Open an issue before:

- adding a new analyzer family;
- changing the static-only security boundary;
- changing API or report schemas;
- changing persistence or runner architecture;
- making a broad interface redesign;
- introducing a runtime dependency.

## Development setup

Requires Node.js 22 or newer. The application has no third-party production or test dependencies.

```bash
npm run validate
npm run serve
```

Open:

- reviewer: `http://127.0.0.1:4173`
- operator console: `http://127.0.0.1:4173/operator.html`

For optional responsive browser validation, install Python Playwright 1.55.0 and use a local Chrome/Chromium executable:

```bash
python3 -m pip install playwright==1.55.0
npm run validate:ui
```

## Contribution workflow

1. Choose or open an issue.
2. Comment that you are working on it when coordination would prevent duplication.
3. Create a focused branch from current `main`.
4. Implement one reviewable change.
5. Add deterministic tests and fixtures.
6. Run the applicable validation commands.
7. Update documentation and changelog when behavior changes.
8. Open a pull request using the template.

## Analyzer-rule requirements

Every analyzer rule must document:

- the exact observable evidence;
- what the evidence supports and does not prove;
- dimension, severity, confidence, and blocking behavior;
- applicability by review intent;
- recommendation text;
- false-positive and false-negative risks;
- fixture-based tests;
- commit-pinned evidence behavior.

Do not infer coverage percentages, runtime network behavior, exploitability, license compatibility, or production readiness without explicit evidence.

## Security boundary

Preserve these non-negotiable controls:

1. Do not execute repository-controlled packages, tests, builds, shell scripts, Makefiles, Dockerfiles, workflows, HTML, JavaScript, binaries, or application code.
2. Render repository-controlled text with DOM text nodes or `textContent`; do not add `innerHTML` paths.
3. Redact suspected secrets before findings, excerpts, logs, exports, or public errors.
4. Keep repository facts separate from contextual interpretation.
5. Pin evidence to the analyzed commit.
6. Keep request, file, content, time, and output bounds explicit.
7. Never silently fall back after a hosted security, quota, or provider failure.

A proposal to change the static-only boundary requires a threat model, architecture decision record, explicit owner approval, and isolated validation.

## Tests and evidence

Run:

```bash
npm run check:syntax
npm run check:static
npm run check:contracts
npm run check:community
npm test
npm run build
npm run validate
```

UI changes must also provide desktop, tablet, mobile, and small-mobile evidence through `npm run validate:ui` or the Visual Redesign workflow.

A pull request should report:

- commands executed;
- passed/failed counts;
- affected error and empty states;
- responsive evidence when applicable;
- security-boundary impact;
- known limitations.

## Commit sign-off

ForkWise uses the Developer Certificate of Origin process. Add a `Signed-off-by` line to each commit:

```text
Signed-off-by: Your Name <you@example.com>
```

With Git:

```bash
git commit -s -m "type: concise change summary"
```

The sign-off certifies that you have the right to submit the contribution under the project's license.

## Pull-request scope

Prefer small, complete slices. Keep refactoring separate from behavior changes when practical. Do not include generated secrets, private repository content, unrelated formatting, or large binary fixtures.

## Review and merge

Maintainers evaluate correctness, evidence quality, security boundaries, accessibility, compatibility, test coverage, and maintainability. Passing automation is necessary but does not guarantee merge. See [GOVERNANCE.md](GOVERNANCE.md) and [docs/MAINTAINER_GUIDE.md](docs/MAINTAINER_GUIDE.md).
