# Open Source Reviewer — Master Development Plan

> **Purpose:** This is the execution plan for building, validating, deploying, and maturing the application. It is intentionally separate from product requirements.
>
> **Status:** Active
> **Working branch during bootstrap:** `main`
> **Plan version:** 1.0
> **Last updated:** 2026-08-30

## How to read this plan

Each step is an independently visible development checkpoint. A step is not marked complete because code was attempted locally; completion requires evidence in the repository and the validation listed for that step.

Status legend:

- ⬜ Not started
- 🟡 In progress
- ✅ Complete
- 🔴 Blocked

Each development cycle should update this document with the commit, tests, screenshots/visual validation where applicable, deployment evidence, known limitations, and the next step.

---

## Phase A — Foundation and visible baseline

### Step 01 — Establish repository development governance — ✅ Complete

**Work**
- Define the product requirements document.
- Define a living development plan.
- Make active development status visible from the repository README.
- Establish that bootstrap work is committed directly to `main`.

**Evidence required**
- `README.md`
- `docs/REQUIREMENTS.md`
- `docs/DEVELOPMENT_PLAN.md`

**Exit gate**
A person opening the repository can distinguish planned work from delivered work and can identify the next development target.

### Step 02 — Establish the master execution plan — 🟡 In progress

**Work**
- Create this master plan.
- Break development into at least 20 independently verifiable checkpoints.
- Define evidence and exit criteria for every checkpoint.
- Link this plan from the repository's other development documentation.

**Evidence required**
- `docs/MASTER_DEVELOPMENT_PLAN.md`
- Links from README/development plan

**Exit gate**
The complete development path can be audited without relying on chat history.

### Step 03 — Commit the first application skeleton — ⬜ Not started

**Work**
- Create the actual browser application on `main`.
- Establish semantic HTML structure and application entry point.
- Add global styling and reusable layout primitives.
- Add project scripts needed to run and validate the app.

**Evidence required**
- Application source files on `main`
- Local run instructions
- Successful local HTTP smoke test

**Exit gate**
Opening the application through a local web server produces a functional page rather than documentation-only repository content.

### Step 04 — Build the responsive design system — ⬜ Not started

**Work**
- Establish typography, spacing, surfaces, borders, cards, buttons, forms, status indicators, and responsive breakpoints.
- Define accessible focus and hover states.
- Create reusable patterns for decision status, evidence state, severity, and confidence.

**Evidence required**
- Design tokens/styles in source
- Desktop screenshot/review at ~1440 px
- Tablet review at ~768 px
- Mobile review at ~390 px
- Small-mobile review at ~320 px

**Exit gate**
No unintended horizontal scrolling; navigation, forms, cards, and status components remain usable at all required widths.

---

## Phase B — Repository intake and analysis foundation

### Step 05 — Build repository intake workflow — ⬜ Not started

**Work**
- Repository URL field.
- Intended-use selector.
- Planned-use description.
- Data-sensitivity control.
- Team-capacity/ownership control.
- Submit/review action.

**Evidence required**
- Working intake form
- Keyboard navigation test
- Desktop/mobile visual review

**Exit gate**
A user can describe both the repository and why they want to use it without ambiguity.

### Step 06 — Implement GitHub URL normalization and validation — ⬜ Not started

**Work**
- Parse supported public GitHub URL forms.
- Normalize owner/repository identifiers.
- Reject malformed or unsupported URLs.
- Prevent arbitrary hosts from being treated as GitHub.

**Evidence required**
- Deterministic parser module
- Unit tests for valid/invalid URL variants
- User-facing validation messages

**Exit gate**
The parser accepts intended GitHub repository forms and consistently rejects invalid input.

### Step 07 — Implement read-only GitHub repository retrieval — ⬜ Not started

**Work**
- Fetch repository metadata.
- Resolve default branch.
- Resolve analyzed commit SHA.
- Retrieve repository tree/file inventory.
- Handle inaccessible/deleted/rate-limited repositories.

**Evidence required**
- GitHub client module
- Mocked/deterministic tests where practical
- Loading, rate-limit, inaccessible, and generic error states

**Exit gate**
Every successful review identifies the exact repository and commit being analyzed.

### Step 08 — Build analysis progress experience — ⬜ Not started

**Work**
- Show explicit analysis stages rather than an indefinite spinner.
- Represent pending, running, complete, skipped, partial, and failed stages.
- Keep progress usable on mobile.

**Evidence required**
- Progress component
- Visual states for each stage condition
- Responsive review

**Exit gate**
Users can tell what the reviewer is doing and where a failure occurred.

### Step 09 — Build repository artifact inventory — ⬜ Not started

**Work**
- Classify README/docs, licenses, manifests, tests, CI, containers, environment templates, security policy, deployment files, migrations, and common runtime files.
- Record presence, absence, and evidence paths.

**Evidence required**
- Artifact classifier
- Fixture repositories/test trees
- Unit tests

**Exit gate**
The same repository tree produces a repeatable artifact inventory independent of the UI.

### Step 10 — Implement language and framework detection — ⬜ Not started

**Work**
- Infer primary languages from repository evidence.
- Detect supported frameworks using manifests/configuration rather than guesses.
- Attach confidence/evidence to detections.

**Evidence required**
- Detection rules
- Tests covering supported stacks and ambiguous cases

**Exit gate**
Detected technologies are traceable to files or manifest entries.

---

## Phase C — Deterministic evidence engine

### Step 11 — Define normalized evidence and finding schemas — ⬜ Not started

**Work**
- Define stable structures for findings, evidence, severity, confidence, applicability, and recommendations.
- Separate repository facts from interpretation.

**Evidence required**
- Schema/module in source
- Schema validation tests
- Example fixtures

**Exit gate**
All analyzer modules can emit findings through one consistent contract.

### Step 12 — Build documentation and license analyzer — ⬜ Not started

**Work**
- Evaluate README/documentation presence.
- Identify installation/deployment guidance.
- Detect license artifacts and observable license metadata.
- Detect contribution/security documentation.

**Evidence required**
- Analyzer rules
- Unit tests
- File-level evidence links

**Exit gate**
Documentation/license conclusions can be explained without an LLM.

### Step 13 — Build testing and CI analyzer — ⬜ Not started

**Work**
- Detect test files/framework configuration.
- Detect CI workflows and test/build checks.
- Distinguish presence of tests from proven coverage.
- Avoid fabricating a coverage percentage.

**Evidence required**
- Test/CI analyzer
- Fixtures and unit tests
- Explicit unknown state when coverage evidence is absent

**Exit gate**
The report accurately distinguishes observed test infrastructure from unsupported assumptions about quality or coverage.

### Step 14 — Build deployment and operational analyzer — ⬜ Not started

**Work**
- Detect Docker/container configuration.
- Detect environment templates.
- Identify databases, queues, storage, ports, workers, migrations, and deployment artifacts where statically observable.
- Build initial operational bill of materials.

**Evidence required**
- Operational analyzer
- Tests for representative deployment structures
- Evidence-backed inventory output

**Exit gate**
The reviewer can explain what operating the project appears to require and which requirements remain unknown.

### Step 15 — Build external-service and telemetry analyzer — ⬜ Not started

**Work**
- Detect common external-service configuration and SDK indicators.
- Detect telemetry/analytics indicators.
- Distinguish configured, optional, default, and unknown behavior when evidence permits.
- Avoid claiming actual runtime network behavior from static evidence alone.

**Evidence required**
- Rules and tests
- Evidence paths
- Clear static-analysis limitation text

**Exit gate**
External-service findings are useful without overstating what static inspection proves.

### Step 16 — Build security-posture analyzer — ⬜ Not started

**Work**
- Inspect security-policy presence.
- Detect risky repository configuration patterns within supported scope.
- Inspect dependency pinning/configuration signals where observable.
- Redact suspected secret values.

**Evidence required**
- Security rule module
- Redaction tests
- Negative tests proving secret values are not exposed in report output

**Exit gate**
Security findings identify evidence without executing repository code or leaking suspected secrets.

---

## Phase D — Product differentiation and decision engine

### Step 17 — Implement README Reality Check claim model — ⬜ Not started

**Work**
- Extract/evaluate initial claim families: self-hosting, Docker/easy deployment, production readiness, privacy/telemetry.
- Use Verified / Partial / Unverified / Contradicted states.
- Separate absence of evidence from contradictory evidence.

**Evidence required**
- Claim schema
- Deterministic claim evaluators where possible
- Claim fixtures and tests

**Exit gate**
A claim ledger can show both the repository claim and the evidence supporting the review state.

### Step 18 — Implement Fit / Trust / Run / Own / Exit dimensions — ⬜ Not started

**Work**
- Map normalized findings into the five adoption dimensions.
- Keep repository facts stable while contextual relevance changes based on user intent.

**Evidence required**
- Dimension mapping rules
- Tests showing the same evidence can have different applicability by intended use

**Exit gate**
The report can organize findings around an adoption decision rather than generic code categories.

### Step 19 — Implement contextual decision engine — ⬜ Not started

**Work**
- Generate Adopt / Pilot / Fork / Avoid / Insufficient Evidence.
- Calculate evidence coverage and decision confidence.
- Identify blocking risks and unresolved questions.
- Estimate adoption effort and ownership burden using transparent rules.

**Evidence required**
- Decision engine
- Decision fixtures
- Boundary/contradiction tests
- Rationale linked to findings

**Exit gate**
Changing intended use can change the decision while underlying repository evidence remains unchanged.

### Step 20 — Build executive review dashboard — ⬜ Not started

**Work**
- Put decision, confidence, blockers, evidence coverage, ownership burden, and next action first.
- Present repository/commit identity prominently.
- Avoid requiring users to inspect every finding before understanding the result.

**Evidence required**
- Desktop/tablet/mobile screenshots or equivalent visual review evidence
- Accessibility and hierarchy review

**Exit gate**
A user can understand the recommendation and its top reasons within the first report viewport on common desktop and mobile sizes.

### Step 21 — Build evidence explorer and detailed report UX — ⬜ Not started

**Work**
- Filter findings by dimension/severity/state.
- Expand evidence details.
- Link to GitHub files where possible.
- Add operational inventory and claim-ledger views.
- Handle long paths safely on mobile.

**Evidence required**
- Interactive report components
- Responsive validation
- Empty and partial-evidence states

**Exit gate**
Every material conclusion in the report can be traced to its evidence without leaving the report context unnecessarily.

### Step 22 — Add report export and pilot checklist — ⬜ Not started

**Work**
- JSON export preserving normalized evidence.
- Markdown export for human sharing.
- Generate a copyable validation/pilot checklist from unresolved questions and blockers.
- Preserve repository, commit SHA, analyzer version, and analysis date.

**Evidence required**
- Export tests
- Example generated artifacts
- Round-trip/schema validation for JSON

**Exit gate**
A report can be shared without losing the provenance needed to reproduce or audit it.

---

## Phase E — Quality, deployment, and production architecture

### Step 23 — Complete automated quality and security validation suite — ⬜ Not started

**Work**
- Expand unit tests across parsers, analyzers, schemas, decisions, and exports.
- Add integration tests for representative repository fixtures.
- Add syntax/build checks.
- Add regression cases for discovered bugs.
- Add checks for the no-code-execution security boundary.

**Evidence required**
- Test suite in repository
- Passing CI run
- Documented test command and results

**Exit gate**
A change that breaks core analysis behavior fails before deployment.

### Step 24 — Deploy, live-validate, and establish the next architecture phase — ⬜ Not started

**Work**
- Configure/verify GitHub Pages deployment for the browser prototype.
- Deploy only after Steps 03–23 relevant to the release candidate pass their gates.
- Smoke-test the live site on desktop and mobile.
- Record deployment URL, commit SHA, validation results, and known limitations.
- Define the transition plan for backend isolated analysis workers, persisted reports, authenticated API access, and later evidence-grounded AI synthesis.

**Evidence required**
- Successful deployment workflow
- Live URL
- Live desktop/mobile smoke-test record
- Deployment commit SHA
- Updated development log
- Backend architecture transition document

**Exit gate**
The deployed version is traceable to a validated commit and the repository contains a clear plan for moving deeper analysis out of the browser safely.

---

# Master execution board

| # | Step | Phase | Status | Primary evidence |
|---:|---|---|---|---|
| 01 | Repository development governance | Foundation | ✅ | README + requirements + development plan |
| 02 | Master execution plan | Foundation | 🟡 | This document |
| 03 | Application skeleton | Foundation | ⬜ | Runnable source |
| 04 | Responsive design system | Foundation | ⬜ | Multi-viewport visual evidence |
| 05 | Repository intake workflow | Intake | ⬜ | Working form |
| 06 | GitHub URL parser | Intake | ⬜ | Parser tests |
| 07 | GitHub repository retrieval | Intake | ⬜ | API + error-state tests |
| 08 | Analysis progress UX | Intake | ⬜ | State visual validation |
| 09 | Artifact inventory | Intake | ⬜ | Classifier tests |
| 10 | Language/framework detection | Intake | ⬜ | Detection tests |
| 11 | Evidence/finding schemas | Evidence | ⬜ | Schema tests |
| 12 | Docs/license analyzer | Evidence | ⬜ | Rule tests + evidence |
| 13 | Test/CI analyzer | Evidence | ⬜ | Rule tests + unknown states |
| 14 | Deployment/operations analyzer | Evidence | ⬜ | Operational inventory tests |
| 15 | External-service/telemetry analyzer | Evidence | ⬜ | Static evidence tests |
| 16 | Security-posture analyzer | Evidence | ⬜ | Security + redaction tests |
| 17 | README Reality Check | Decision | ⬜ | Claim ledger tests |
| 18 | Fit/Trust/Run/Own/Exit | Decision | ⬜ | Context mapping tests |
| 19 | Contextual decision engine | Decision | ⬜ | Decision matrix tests |
| 20 | Executive review dashboard | Decision | ⬜ | Responsive visual evidence |
| 21 | Evidence explorer | Decision | ⬜ | Interactive UX validation |
| 22 | Export + pilot checklist | Decision | ⬜ | Export/schema tests |
| 23 | Full quality/security validation | Quality | ⬜ | Passing CI |
| 24 | Deploy + live validation + next architecture | Release | ⬜ | Live deployment evidence |

# Evidence package required for every development cycle

Every cycle should leave a visible audit trail containing as many of the following as apply:

1. **Commit SHA** — what changed in the repository.
2. **Files changed** — implementation evidence.
3. **Automated test result** — number passed/failed and relevant command.
4. **Static/build validation** — syntax/build result.
5. **Desktop UI evidence** — screenshot or explicit viewport review result.
6. **Mobile UI evidence** — screenshot or explicit viewport review result.
7. **Error-state evidence** — what failure paths were tested.
8. **Security-boundary result** — confirmation that repository-controlled code was not executed.
9. **Deployment evidence** — workflow/run/live URL when deployment occurs.
10. **Known limitations** — what remains incomplete or uncertain.
11. **Plan update** — step status updated here.
12. **Next step** — exactly which numbered step becomes active.

# Release gates

## Prototype release gate

Before the first public browser prototype is called usable:

- Steps 03–08 must be complete.
- Core parts of Steps 09–19 required by the visible report must be tested.
- Step 20 must pass responsive validation.
- No arbitrary repository code execution may be introduced.
