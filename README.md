# ForkWise — Open Source Reviewer

> **Active preview:** evidence-first open-source adoption due diligence for public GitHub repositories.

ForkWise helps an engineer decide whether a repository should be **Adopted, Piloted, Forked, Avoided, or reviewed again with more evidence**. It does not produce a generic popularity or code-quality score. The recommendation changes with the user's intended use, deployment target, data sensitivity, team capacity, and external-service policy.

![ForkWise desktop intake](docs/screenshots/landing-desktop.webp)

## What is implemented

- Public `github.com` repository URL parsing and normalization.
- Default-branch resolution and exact commit pinning.
- Bounded read-only GitHub metadata, tree, README, release, and high-value text retrieval.
- Deterministic artifact, language/framework, documentation, license, test/CI, deployment, operations, telemetry/external-service, security, portability, and maintenance rules.
- **README Reality Check** with Verified, Partial, Unverified, Contradicted, and Not claimed states.
- Contextual **Fit / Trust / Run / Own / Exit** dimensions.
- Adopt / Pilot / Fork / Avoid / Insufficient evidence decision engine.
- Decision confidence, evidence coverage, blockers, adoption effort, ownership burden, unresolved questions, and a repository-specific pilot checklist.
- File- and metadata-level evidence links pinned to the analyzed commit.
- JSON and Markdown report exports.
- Responsive and keyboard-accessible dashboard.
- Static GitHub Pages build and deployment workflow.

## Safety boundary

The browser preview performs static inspection only. It does **not** run repository-controlled:

- package installation or lifecycle scripts;
- tests or build commands;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- arbitrary repository HTML or JavaScript.

Repository text is rendered through DOM text nodes rather than `innerHTML`. Suspected credential patterns are redacted before they can enter findings, evidence excerpts, or exports. See [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md).

## Run locally

Requires Node.js 22 or newer. The production workflow uses Node.js 24.

```bash
npm run validate
npm run serve
```

Then open `http://127.0.0.1:4173`.

No third-party production or test packages are required. The manual browser-validation script uses Python Playwright and system Chromium when those tools are available:

```bash
python scripts/ui_validation.py
```

## Validation status

| Gate | Result |
| --- | --- |
| JavaScript syntax | Passed — 16 JavaScript files |
| Static structure/accessibility/security checks | Passed |
| Automated tests | Passed — 49/49 |
| Production build | Passed |
| Chromium desktop 1440×1000 | Passed, no horizontal overflow |
| Chromium tablet 768×1024 | Passed, no horizontal overflow |
| Chromium mobile 390×844 | Passed, no horizontal overflow |
| Chromium small mobile 320×720 | Passed, no horizontal overflow |
| Browser console/page errors | 0 |

Full evidence: [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md).

## Repository map

```text
.
├── index.html                    # Intake and report application shell
├── styles.css                   # Responsive design system
├── src/
│   ├── app.js                    # Browser orchestration and safe rendering
│   ├── analyzer.js               # Deterministic evidence + decision engine
│   ├── export.js                 # JSON and Markdown exports
│   ├── github.js                 # Read-only, commit-pinned GitHub client
│   ├── inventory.js              # Artifact classification and content selection
│   ├── sample.js                 # Embedded auditable sample repository
│   └── schema.js                 # Report contracts and secret redaction
├── tests/                        # 49 deterministic tests
├── scripts/                      # Validation, build, server, and browser checks
├── docs/                         # Requirements, plans, architecture, rules, evidence
└── .github/workflows/            # Quality and Pages deployment
```

## Documentation

- [`docs/MASTER_DEVELOPMENT_PLAN.md`](docs/MASTER_DEVELOPMENT_PLAN.md) — 24-step execution board and evidence map.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — current development log and next target.
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — product requirements and intended outcomes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — current browser architecture and module boundaries.
- [`docs/ANALYZER_RULES.md`](docs/ANALYZER_RULES.md) — deterministic rules and limitations.
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) — threat model and safety controls.
- [`docs/BACKEND_TRANSITION.md`](docs/BACKEND_TRANSITION.md) — production analysis-service plan.
- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md) — automated and responsive UI evidence.

## Current limitations

- Public GitHub repositories only.
- Anonymous GitHub API limits apply.
- At most 24 bounded high-value text artifacts are read in the browser preview.
- Static indicators do not prove runtime behavior, exploitability, performance, or data flow.
- Repository history, private advisories, branch protection, and organization settings are not comprehensively assessed.
- This is decision support, not a security certification or legal opinion.

## Development status

Steps 01–23 of the master plan are implemented and locally validated. Step 24—GitHub Actions deployment and live-site smoke validation—is completed only after the workflow created by the release commit succeeds and the resulting Pages URL is checked.
