# Open Source Reviewer

> **Work in progress** — active bootstrap development is currently happening directly on `main` so repository progress remains visible.

Open Source Reviewer is an evidence-first application for evaluating whether an open-source GitHub repository is appropriate for a specific intended use.

Instead of producing a generic repository score, the product is being designed to answer a practical engineering question:

> **Should we Adopt, Pilot, Fork, Avoid, or gather more evidence before using this repository?**

## Current development goal

Build the first deployable vertical slice:

```text
GitHub repository URL
        +
intended use and constraints
        ↓
read-only repository inspection
        ↓
deterministic evidence
        ↓
contextual adoption recommendation
        ↓
responsive evidence-backed report
```

The initial target is **self-hosted open-source applications**, where adoption requires understanding not only source code but also deployment, external services, privacy/telemetry, maintenance burden, licensing, tests, CI, and operational requirements.

## Current status

| Area | Status |
| --- | --- |
| Product requirements | In repository |
| Development roadmap | In repository |
| Application UI | Next active milestone |
| Deterministic evidence engine | Planned in current bootstrap sequence |
| Automated tests | Planned with implementation |
| Desktop/mobile validation | Required before deployment |
| GitHub Pages deployment | Not yet declared live |
| Backend analysis worker | Later milestone |

No deployment is considered complete until the application passes automated checks, desktop/mobile visual validation, and a live smoke test.

## Product principles

- **Evidence before opinion** — important conclusions must be traceable to repository evidence.
- **Context before scoring** — repository suitability depends on what the user intends to do with it.
- **Static analysis first** — arbitrary repository-controlled code will not be executed in the initial reviewer.
- **Uncertainty is visible** — missing evidence is not silently treated as failure or success.
- **AI is not the source of truth** — deterministic evidence remains separate from generated explanations.
- **Responsive UI is part of done** — desktop and mobile review happens before deployment.

## Planned review dimensions

- **Fit** — does the project satisfy the intended use?
- **Trust** — what security, license, dependency, and release signals matter?
- **Run** — what infrastructure and external services are required?
- **Own** — what maintenance burden would the adopting team inherit?
- **Exit** — how difficult would replacing or migrating away from the project be?

A key planned capability is **README Reality Check**, which compares repository claims such as self-hosting, Docker deployment, production readiness, or privacy with observable implementation evidence.

## Documentation

- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — product goals, user workflow, requirements, security boundaries, MVP scope, and success criteria.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — active milestones, validation gates, development log, delivered work, limitations, and next task.

These documents are intentionally kept in the repository so that planned work and actually delivered work remain distinguishable.

## Development workflow

During the current bootstrap phase, working increments are committed to `main` as requested.

For each development cycle:

1. Select the next milestone.
2. Implement a complete testable slice.
3. Add or update automated tests.
4. Validate runtime/build behavior.
5. Review desktop UI.
6. Review mobile UI.
7. Validate affected error/empty/loading states.
8. Update the development log.
9. Commit the working increment to `main`.
10. Deploy only after the validation gate passes, then smoke-test the live site.

## Security boundary

Open-source repositories are untrusted input. The initial product will inspect them without running repository-defined code.

The bootstrap reviewer must not execute repository-controlled:

- install scripts;
- package-manager lifecycle scripts;
- tests;
- Makefiles;
- shell scripts;
- Dockerfiles;
- GitHub Actions workflows.

Any future sandbox execution capability requires a separate threat model and acceptance criteria.

## Next milestone

**M1 — Visible review prototype**

The next repository increment will add the responsive application shell, GitHub repository input, intended-use controls, validation/loading/error states, and the first evidence-backed review view. It will then proceed through automated and responsive UI validation before deployment.
