# Open Source Reviewer — Master Development Plan

> **Purpose:** execution evidence for building, validating, deploying, and maturing ForkWise. This is not the product-requirements document.
>
> **Plan version:** 1.1  
> **Working branch during bootstrap:** `main`  
> **Last updated:** 2026-08-30

## Status legend

- ⬜ Not started
- 🟡 In progress / awaiting external evidence
- ✅ Complete with repository evidence
- 🔴 Blocked

A step is complete only when implementation, validation, and documentation evidence exist in the repository. Local attempts alone do not count.

## Master execution board

| # | Development checkpoint | Status | Repository evidence | Validation/exit evidence |
| ---: | --- | :---: | --- | --- |
| 01 | Repository development governance | ✅ | `README.md`, `docs/REQUIREMENTS.md`, `docs/DEVELOPMENT_PLAN.md` | Project intent, delivered work, and next target are distinguishable. |
| 02 | Master execution plan | ✅ | This document | 24 auditable checkpoints with evidence and gates. |
| 03 | Runnable application skeleton | ✅ | `index.html`, `src/app.js`, `package.json`, `scripts/serve.mjs` | Static application and local server; production bundle generated. |
| 04 | Responsive design system | ✅ | `styles.css`, `assets/mark.svg` | Chromium at 1440, 768, 390, 320 px; 0 horizontal overflow. |
| 05 | Repository intake workflow | ✅ | Form in `index.html`, orchestration in `src/app.js` | URL, intent, use case, deployment, sensitivity, team, external-service policy. |
| 06 | GitHub URL normalization/validation | ✅ | `src/github.js` | URL acceptance/rejection tests, unsupported-host error UI. |
| 07 | Read-only GitHub retrieval | ✅ | `src/github.js` | Commit/tree pinning, optional release handling, rate-limit/not-found tests. |
| 08 | Analysis progress UX | ✅ | `index.html`, `src/app.js`, `styles.css` | Seven visible pending/running/complete stages. |
| 09 | Artifact inventory | ✅ | `src/inventory.js` | Artifact-classification and bounded-selection tests. |
| 10 | Language/framework detection | ✅ | `src/analyzer.js` | Evidence-derived runtime/framework/data/deployment technology signals. |
| 11 | Evidence/finding schemas | ✅ | `src/schema.js` | Unique IDs, valid dimensions/severities, evidence-reference validation tests. |
| 12 | Documentation/license analyzer | ✅ | `src/analyzer.js` | README, supporting docs, license metadata/file, contributor/security governance. |
| 13 | Testing/CI analyzer | ✅ | `src/analyzer.js` | Test paths, workflow commands, explicit unknown coverage; no fabricated percentage. |
| 14 | Deployment/operations analyzer | ✅ | `src/analyzer.js` | Containers, Kubernetes, environment, databases, variables, ports, migrations, backup. |
| 15 | External-service/telemetry analyzer | ✅ | `src/analyzer.js` | Supported static indicators with explicit runtime uncertainty and policy conflicts. |
| 16 | Security-posture analyzer | ✅ | `src/analyzer.js`, `src/schema.js`, `docs/SECURITY_MODEL.md` | Security policy, dependency automation, workflows, tracked `.env`, secret redaction. |
| 17 | README Reality Check | ✅ | `src/analyzer.js` | Six claim families and five claim states; sample contradiction/verification tests. |
| 18 | Fit/Trust/Run/Own/Exit dimensions | ✅ | `src/analyzer.js`, report dashboard | Five scored/status dimensions with contextual findings. |
| 19 | Contextual decision engine | ✅ | `src/analyzer.js` | Adopt/Pilot/Fork/Avoid/Insufficient boundaries and context-change tests. |
| 20 | Executive review dashboard | ✅ | `index.html`, `styles.css`, `src/app.js` | Decision, confidence, coverage, blockers, burden, effort, next action in first view. |
| 21 | Evidence explorer/detailed report | ✅ | `src/app.js` | Finding search/filter, claims, operations, evidence links, mobile containment. |
| 22 | Report export and pilot checklist | ✅ | `src/export.js`, `src/app.js` | JSON/Markdown provenance tests, browser download check, copyable checklist. |
| 23 | Full quality/security validation | ✅ | `tests/`, `scripts/check.mjs`, `scripts/validate-static.mjs`, `scripts/ui_validation.py` | 49/49 tests, build, 4 Chromium viewports, no console errors. |
| 24 | Deploy, live-validate, and establish next architecture | 🟡 | `.github/workflows/pages.yml`, `docs/BACKEND_TRANSITION.md` | Awaiting workflow execution and live GitHub Pages smoke test for the release commit. |

## Phase evidence

### Phase A — Foundation and visible baseline (Steps 01–04)

**Delivered:** repository governance, visible work-in-progress status, runnable shell, design system, responsive layout, accessibility basics, and production build scripts.

**Exit evidence:** `npm run validate`; responsive metrics and screenshot paths in `docs/validation/ui-validation.json` (captures are reproducible and intentionally git-ignored).

### Phase B — Repository intake and analysis foundation (Steps 05–10)

**Delivered:** contextual intake, strict public GitHub URL parser, exact default-branch commit, recursive tree, bounded high-value text retrieval, progress states, artifact classifier, and technology signals.

**Safety boundary:** retrieval is read-only. No install/build/test/container command from the reviewed repository is executed.

### Phase C — Deterministic evidence engine (Steps 11–16)

**Delivered:** normalized schema, evidence IDs, docs/license/test/CI/operations/external-service/security analyzers, redaction, and coverage/confidence limits.

**Exit evidence:** deterministic tests for redaction, truncated trees, no fabricated coverage, policy conflicts, and evidence-reference integrity.

### Phase D — Product differentiation and decision engine (Steps 17–22)

**Delivered:** README Reality Check, five adoption dimensions, contextual decision precedence, executive dashboard, evidence explorer, exports, and pilot checklist.

**Exit evidence:** embedded sample produces Pilot with 100% supported evidence coverage, 18 findings, 21 evidence records, five dimensions, and six claims.

### Phase E — Quality, deployment, and production architecture (Steps 23–24)

**Delivered:** dependency-free validation workflow, Pages workflow, manual Chromium harness, compressed screenshots, validation report, and safe backend transition plan.

**Remaining external evidence:** a successful GitHub Actions run, Pages deployment URL, and live desktop/mobile smoke test tied to the resulting commit SHA.

## Evidence package for every future cycle

1. Commit SHA.
2. Files changed.
3. Automated test command and passed/failed count.
4. Syntax/static/build result.
5. Desktop UI evidence when applicable.
6. Mobile UI evidence when applicable.
7. Loading/empty/error-state evidence.
8. Security-boundary result.
9. Deployment workflow and URL when applicable.
10. Known limitations.
11. Updated step status.
12. Exact next checkpoint.

## Release gates

### Browser preview gate

- Steps 03–23 complete.
- No arbitrary repository execution.
- Commit-pinned provenance.
- Zero failed automated tests.
- No horizontal overflow at required viewports.
- Invalid URL and provider failure states are recoverable.
- Static limitations visible in the report.

**Current result:** passed locally.

### Live preview gate

- Quality workflow succeeds on `main`.
- Pages build/deploy succeeds.
- Live URL returns the application.
- Embedded sample produces the expected Pilot report live.
- Desktop and mobile live smoke checks pass.
- Deployment commit SHA and URL are recorded in `docs/VALIDATION_REPORT.md` and `docs/DEVELOPMENT_PLAN.md`.

**Current result:** awaiting release-commit workflow execution.

### Production-service gate (future)

The Pages preview is not the production analysis architecture. Production requires isolated static-analysis workers, resource limits, authenticated provider access, versioned/persisted reports, operational monitoring, privacy/legal review, and a separate authorization/threat model for any future runtime execution.
