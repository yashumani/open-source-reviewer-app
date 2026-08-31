# ForkWise Governance

ForkWise is maintained as an evidence-first open-source project. Governance is intentionally lightweight during the community-preview phase and can evolve as the contributor base grows.

## Project roles

### Maintainer

The maintainer owns release decisions, security response, repository administration, roadmap prioritization, and final merge authority. The initial maintainer is `@yashumani`.

### Contributor

A contributor is anyone who submits useful code, documentation, tests, design feedback, issue reports, repository fixtures, or analysis-rule evidence.

### Reviewer

A reviewer is a trusted contributor invited to review changes in a defined area. Reviewers may recommend approval or changes; maintainers retain merge responsibility.

## Decision principles

Decisions should favor:

1. reproducible evidence over unsupported claims;
2. deterministic analysis over model-generated facts;
3. safe static inspection over execution of repository-controlled code;
4. explicit uncertainty over fabricated certainty;
5. backwards-compatible contracts over avoidable churn;
6. accessible and responsive user experiences;
7. narrowly scoped, reviewable pull requests.

## Change process

- Small fixes may begin directly as a pull request.
- New analyzer families, API changes, security-boundary changes, persistence changes, and significant interface redesigns should begin with an issue or discussion proposal.
- Breaking changes require an architecture decision record or an issue documenting migration and rollback.
- Pull requests must pass applicable automated checks before merge.
- Security-sensitive changes may receive private review before public disclosure.

## Analyzer-rule governance

Every new rule must define:

- the observable repository evidence;
- the exact conclusion the evidence supports;
- confidence and severity behavior;
- false-positive and false-negative considerations;
- tests using fixtures;
- why the rule does not overstate runtime behavior.

Rules that cannot be explained with evidence are not eligible for merge.

## Release process

Community-preview releases use semantic versioning where practical. A release candidate should include:

- passing Quality and relevant contract workflows;
- responsive validation for UI changes;
- changelog entry;
- exact commit provenance;
- known limitations;
- an explicit preview/beta label until production gates are complete.

## Conflicts of interest

Reviewers should disclose material conflicts, including employment, financial interests, or direct competitive involvement that could affect a review. Maintainers may request an alternate reviewer.

## Governance changes

Governance changes use the normal pull-request process and should explain why the change improves accountability, safety, or contributor participation.
