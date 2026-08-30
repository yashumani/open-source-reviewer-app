# Open Source Reviewer — Development Plan

> Status: Active development
> Current phase: Bootstrap / first visible release
> Working branch: `main`
> Last updated: 2026-08-30

This document is the living execution record for the application. `docs/REQUIREMENTS.md` defines what the product is intended to become; this file records how we are getting there, what has actually shipped to the repository, validation evidence, limitations, and the next development target.

## Current goal

Create the first visible, deployable version of the Open Source Reviewer on `main` so that repository progress is inspectable at all times.

The first usable vertical slice is:

**GitHub URL + intended use → static evidence collection → contextual recommendation → evidence-backed responsive report.**

## Current repository state

At the beginning of this cycle, `main` contained only the repository README. Previous prototype work existed outside the repository and therefore did not count as delivered application functionality.

### Completed in this cycle

- [x] Establish `docs/REQUIREMENTS.md` as the product requirements source.
- [x] Establish this development plan as the work-in-progress execution record.
- [ ] Commit the first visible application shell to `main`.
- [ ] Commit deterministic repository-analysis logic.
- [ ] Commit automated tests.
- [ ] Add deployment workflow.
- [ ] Validate desktop UI.
- [ ] Validate mobile UI.
- [ ] Deploy the validated slice.
- [ ] Smoke-test the live deployment.

## Milestone roadmap

### M0 — Repository foundation

**Goal:** Make the repository self-describing and development visible.

Deliverables:

- Product requirements
- Development plan
- README with project purpose, current status, local run instructions, validation command, and roadmap links
- Basic contribution/development conventions

Acceptance:

- A person opening the repository can understand what is being built, what phase it is in, and what happens next.

### M1 — Visible review prototype

**Goal:** A user can interact with a real UI rather than a documentation-only repository.

Deliverables:

- Responsive application shell
- Repository URL input
- Intended-use selector
- Data-sensitivity/team-capacity controls
- GitHub URL validation
- Loading and error states
- Initial evidence report
- Decision summary

Acceptance:

- Works through a static web server.
- Desktop and mobile layouts are visually validated.
- Invalid repository URLs produce a clear user-facing error.
- No repository-controlled code is executed.

### M2 — Evidence engine

**Goal:** Make recommendations traceable and deterministic.

Deliverables:

- Commit pinning
- Repository metadata inventory
- File inventory
- README/documentation detection
- License detection
- CI/test/container/security-policy signals
- Operational inventory
- Evidence-link model
- Unit tests for deterministic rules

Acceptance:

- Every material deterministic finding has a source/evidence object.
- Missing evidence is distinguishable from contradictory evidence.
- Analysis result identifies the commit SHA.

### M3 — README Reality Check

**Goal:** Verify repository claims instead of simply summarizing documentation.

Deliverables:

- Claim extraction model
- Claim categories
- Verified / Partial / Unverified / Contradicted states
- Evidence for each evaluated claim
- Prominent claim ledger in the report

Acceptance:

- At least the initial self-hosting, Docker/deployment, production-readiness, and privacy/telemetry claim families can be evaluated when relevant evidence exists.

### M4 — Adoption decision model

**Goal:** Turn evidence into a contextual engineering decision.

Deliverables:

- Fit / Trust / Run / Own / Exit dimensions
- Blocking-risk rules
- Unresolved-question generation
- Adoption-effort estimate
- Ownership-burden estimate
- Adopt / Pilot / Fork / Avoid / Insufficient Evidence recommendation
- Decision confidence and evidence coverage

Acceptance:

- Changing the intended use can change the recommendation without changing repository facts.
- Decision rationale points back to evidence.
- The UI never presents a recommendation as certainty when evidence coverage is inadequate.

### M5 — Report UX and export

**Goal:** Make results easy to inspect and share.

Deliverables:

- Executive decision view
- Filterable findings
- Evidence explorer
- Operational inventory view
- Claim ledger view
- Responsive mobile report
- Markdown/JSON export
- Copyable pilot checklist

Acceptance:

- Critical blockers can be found without scrolling through the entire report.
- Evidence paths remain readable on narrow screens.
- Export preserves commit SHA and evidence references.

### M6 — Backend analysis service

**Goal:** Move beyond browser/API limitations while preserving safe static analysis.

Deliverables:

- API service
- Job model
- Isolated analysis worker
- Safe archive acquisition/extraction
- Size/file/time limits
- Parser/rule registry
- Persisted versioned reports
- GitHub API authentication strategy

Acceptance:

- Repository-controlled code still does not execute.
- Analysis jobs are resource bounded.
- Reports are reproducible from repository + commit + analyzer version.

### M7 — Advanced intelligence

**Goal:** Add AI synthesis without making AI the source of truth.

Deliverables:

- Evidence-grounded executive summaries
- Related-finding grouping
- Prioritized validation plan
- Repository-specific pilot checklist
- Prompt-injection defenses for repository content

Acceptance:

- Generated statements can be traced to supplied evidence.
- The model cannot modify deterministic facts or tool permissions.
- Unsupported claims are explicitly identified as inference/unknown.

## UI validation gate

Every UI milestone must be reviewed at minimum at:

- Desktop: approximately 1440 px wide
- Tablet: approximately 768 px wide
- Mobile: approximately 390 px wide
- Small mobile: approximately 320 px wide

Review checklist:

- [ ] No unintended horizontal scrolling
- [ ] Primary action visible and understandable
- [ ] Forms remain usable with long repository URLs
- [ ] Long repository/file names wrap or truncate intentionally
- [ ] Decision/blockers have clear visual hierarchy
- [ ] Loading state is informative
- [ ] Error state gives a recovery action
- [ ] Empty/unknown evidence is not visually confused with success
- [ ] Keyboard focus is visible
- [ ] Touch targets are usable on mobile

## Validation gate before deployment

A deployment candidate must pass:

1. Automated unit tests.
2. JavaScript/build syntax checks.
3. Local application smoke test.
4. Desktop visual review.
5. Mobile visual review.
6. Error-path review.
7. Security-boundary check: no arbitrary repository execution.
8. Documentation/status update.

Deployment should happen only after the candidate passes these checks. After deployment, perform a live smoke test and record the result below.

## Development log

### 2026-08-30 — Cycle 1: project documentation and visible-development reset

**Decision**

Development is being moved to `main` during bootstrap so progress is visible directly in the repository, as requested. The previous local prototype is treated as reference work until its implementation is committed to GitHub.

**Delivered**

- Product requirements document
- Living development plan
- Milestone roadmap
- Definition of done and validation gates
- Explicit UI validation requirements
- Static-analysis security boundary

**Validation**

- Documentation created directly on `main`.
- Requirements and plan distinguish delivered work from planned work.

**Known limitations**

- No application UI is yet committed to `main` at this exact checkpoint.
- No deployment should be represented as live until a Pages deployment succeeds and is smoke-tested.

**Next target**

M1: commit the first responsive application shell and review workflow to `main`, then add the deterministic analysis engine/tests and run the full UI validation gate before deployment.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-30 | Use `main` directly during bootstrap | Keep development visible in the repository while the first application baseline is established. |
| 2026-08-30 | Evidence-first product model | Avoid unexplained AI judgments and generic repository scores. |
| 2026-08-30 | Static analysis before execution | Arbitrary open-source repositories are untrusted code. |
| 2026-08-30 | Self-hosted apps are the initial target | Operational, privacy, ownership, and deployment questions create a clearer adoption decision use case. |
| 2026-08-30 | UI validation is part of development, not post-processing | Desktop/mobile usability must be verified before deployment. |
