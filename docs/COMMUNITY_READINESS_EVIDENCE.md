# ForkWise Community Preview — Release Evidence

> Version: `0.9.0`  
> Release commit: `ae8db8a2207c18116db1bc8fb49609354de837f9`  
> Pull request: `#13`  
> Status: code, documentation, contributor intake, validation, and Pages deployment complete

## Release scope

This release opens ForkWise for:

- public testing of the browser-based reviewer;
- usability and accessibility feedback;
- false-positive and false-negative reports;
- deterministic analyzer-rule proposals;
- documentation and fixture contributions;
- focused code contributions that preserve the static-only security boundary.

It does not activate the hosted analysis lifecycle and does not declare production or general availability.

## Repository delivery

The community-readiness pull request added or updated:

- Apache License 2.0 and NOTICE;
- Code of Conduct, governance, support, security, privacy, terms, and acceptable-use policies;
- DCO-based contributor workflow;
- CODEOWNERS and pull-request template;
- six structured GitHub issue forms;
- blank-issue restrictions and private-security contact link;
- community readiness validator and tests;
- version `0.9.0` package metadata, README, changelog, plans, and release checklist.

GitHub now recognizes the repository license as `Apache-2.0`.

## Pull-request validation

| Gate | Run | Result |
| --- | ---: | :---: |
| Quality | `33445281965` | ✅ |

The pull-request gate verified:

- 41 JavaScript files passed syntax checks;
- reviewer/operator static, responsive, accessibility, and security contracts passed;
- 4 API documents and 5 paths passed contract validation;
- 6 workflows and 19 external actions passed immutable-SHA validation;
- 23 community-readiness files and six issue forms passed the community contract;
- 82 automated tests passed, 0 failed;
- the production bundle built successfully.

## Main-branch validation and deployment

| Gate | Run | Result |
| --- | ---: | :---: |
| Quality | `33445387103` | ✅ |
| Runner Contract and Hosted Health | `33445387096` | ✅ |
| Database Contract | `33445387069` | ✅ |
| Container Contract | `33445387066` | ✅ |
| Pages Readiness and Deploy | `33445387099` | ✅ |

The Pages workflow completed both build and deploy for the exact release commit.

Live surfaces:

- Reviewer: <https://yashumani.github.io/open-source-reviewer-app/>
- Operator console: <https://yashumani.github.io/open-source-reviewer-app/operator.html>

No interface implementation changed in version 0.9.0. The GitHub-native responsive baseline remains the validated version 0.8.0 production artifact from Visual Redesign run `33430877933`.

## Community contribution routes

### Structured issue forms

- Bug report
- Feature request
- Analyzer rule proposal
- False positive
- False negative or missing signal
- Documentation improvement

Blank public issues are disabled. The issue chooser links to private vulnerability reporting, the community preview guide, and support guidance.

### Pull requests

The pull-request template requires:

- a related issue where applicable;
- exact validation evidence;
- static-only and redaction checks;
- compatibility and rollback notes;
- known limitations;
- DCO sign-off and Apache-2.0 contribution rights.

### Ownership and governance

- `CODEOWNERS` assigns a default maintainer and explicit ownership for security, runner, persistence, API contracts, and workflows.
- `GOVERNANCE.md` defines maintainer, contributor, and reviewer roles.
- `docs/MAINTAINER_GUIDE.md` defines issue and pull-request triage gates.
- `CODE_OF_CONDUCT.md` defines participation and enforcement expectations.

## Starter contribution backlog

Twelve scoped, labeled issues were published:

| Issue | Scope | Labels |
| ---: | --- | --- |
| #14 | Synthetic FastAPI fixture | good first issue, help wanted |
| #15 | Synthetic TypeScript monorepo fixture | good first issue, help wanted |
| #16 | Compose database/queue detection | enhancement, help wanted |
| #17 | Release provenance indicators | enhancement, help wanted |
| #18 | README self-hosting claim matrix | good first issue, help wanted |
| #19 | Keyboard/screen-reader filter regression | good first issue, help wanted |
| #20 | Long mobile evidence-path regression | bug, good first issue |
| #21 | Evidence coverage/confidence documentation | documentation, good first issue |
| #22 | Disabled telemetry false-positive fixture | bug, help wanted |
| #23 | Python manifest coverage | enhancement, help wanted |
| #24 | Branch-protection observability as unknown | enhancement, help wanted |
| #25 | Contributor-template contract | documentation, good first issue |

Each issue defines the problem, expected behavior, relevant files, security boundary, acceptance criteria, required tests, difficulty, and out-of-scope boundary.

## Governance issue updates

- Issue #8 was closed after Apache-2.0 was committed and recognized by GitHub.
- Issue #9 records that browser Community Preview policies are published; it remains open for hosted-service retention, deletion/export, subprocessors, and legal/privacy approval.
- Issue #11 contains the exact administrator-only About metadata, vulnerability-reporting, merge, and `main` protection settings.

## Remaining administrator actions

The connected automation cannot modify these repository settings:

- repository description, website, and topics;
- GitHub Discussions;
- private vulnerability reporting;
- merge preferences and automatic branch deletion;
- branch protection/rulesets and required checks.

The exact desired values and verification steps are in [`REPOSITORY_SETTINGS.md`](REPOSITORY_SETTINGS.md). Current API evidence still shows the description/homepage/topics unset and `main` unprotected.

These are not blockers for public product testing. Main protection and private vulnerability reporting should be completed before a broad contribution campaign.

## Remaining hosted and production work

- Issue #3: deploy the prepared request-bound lifecycle to Lovable.
- Issue #4: activate hosted reviewer mode only after the lifecycle passes.
- Issue #5: identity, durable workers, observability, retention operations, backup/restore, security, and production release governance.

The public reviewer remains on bounded browser-side static analysis. No repository-controlled code is executed, and hosted mode remains statically disabled.
