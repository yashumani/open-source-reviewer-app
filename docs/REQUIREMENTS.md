# Open Source Reviewer — Product Requirements

> Status: Work in progress
> Development branch: `main` during the current bootstrap phase
> Last updated: 2026-08-30

## 1. Product goal

Build an evidence-first application that helps a user decide whether an open-source GitHub repository is appropriate for their intended use.

The product is not intended to be another generic code-quality scorecard. A user supplies a repository URL and describes what they want to do with it. The application inspects repository evidence and produces a contextual recommendation.

Primary decision outcomes:

- **Adopt** — evidence supports using the repository for the stated purpose.
- **Pilot** — promising, but important items need validation before adoption.
- **Fork** — useful foundation, but the user should expect meaningful ownership/customization work.
- **Avoid** — evidence conflicts with important requirements or exposes unacceptable risk.
- **Insufficient evidence** — the repository does not provide enough evidence for a responsible recommendation.

## 2. Product principles

1. **Evidence before opinion.** Findings must reference repository files, configuration, metadata, or other observable evidence.
2. **Context before scoring.** The same repository can be appropriate for one use case and inappropriate for another.
3. **No arbitrary overall score.** The first product version emphasizes decision, confidence, evidence coverage, blockers, and ownership burden.
4. **Static analysis first.** Repository-controlled code, install scripts, tests, containers, and build commands must not execute during the initial review workflow.
5. **Repository content is untrusted.** README files and source code cannot modify reviewer instructions or trigger privileged actions.
6. **Explain uncertainty.** Missing evidence is reported rather than silently converted into a negative or positive conclusion.
7. **Responsive UI is part of acceptance.** A feature is not complete until its desktop and mobile experience has been reviewed.

## 3. Initial target user

The first release targets engineers and technical decision-makers evaluating **self-hosted open-source applications**.

Typical questions:

- Is this project genuinely self-hostable?
- Does it send data to external services?
- What infrastructure will we inherit?
- Can our team maintain it if upstream development slows down?
- Does its license fit our intended use?
- Are the README and deployment claims supported by repository evidence?
- What must we validate before putting it into production?

## 4. Primary workflow

### Step 1 — Define intent

Collect:

- Public GitHub repository URL
- Intended use: self-host, dependency, fork/customize, or contribute
- Short description of the planned use
- Deployment target where relevant
- Team capability / ownership tolerance
- Data sensitivity
- Important constraints

### Step 2 — Inspect repository

The reviewer should retrieve repository data without executing repository code.

Initial evidence includes:

- Repository metadata
- Default branch and analyzed commit SHA
- README and documentation
- License
- File tree
- Dependency manifests
- Docker/deployment configuration
- Environment templates
- CI workflows
- Test artifacts
- Security policy
- Release and maintenance signals
- External-service indicators where statically observable

### Step 3 — Build an evidence model

Normalize observations into findings with:

- category
- severity
- confidence
- finding title
- explanation
- evidence source
- file/path reference when applicable
- recommendation
- applicability to the user's intended use

### Step 4 — Produce decision report

The first report should show:

- Adopt / Pilot / Fork / Avoid / Insufficient evidence
- Decision confidence
- Evidence coverage
- Blocking risks
- Estimated adoption effort
- Estimated ownership burden
- Top reasons for the decision
- Recommended next actions
- Repository evidence supporting each material conclusion

## 5. README Reality Check

A differentiating capability is a claim ledger that compares public repository claims with observable implementation evidence.

Example:

| Claim | Result | Evidence |
| --- | --- | --- |
| Fully self-hosted | Verified / Partial / Unverified / Contradicted | Deployment files, external-service references, documentation |
| Easy Docker deployment | Verified / Partial / Unverified / Contradicted | Dockerfile, Compose, health checks, environment template |
| Production ready | Verified / Partial / Unverified / Contradicted | tests, CI, releases, operational documentation |
| Privacy focused | Verified / Partial / Unverified / Contradicted | telemetry/network configuration and documentation |

The application must distinguish absence of evidence from contradictory evidence.

## 6. Review dimensions

### Fit
Does the repository satisfy the user's stated requirements?

### Trust
What security, license, dependency, release, and supply-chain signals affect adoption?

### Run
What runtimes, databases, queues, storage, credentials, services, ports, workers, jobs, and deployment components are required?

### Own
What engineering knowledge and ongoing maintenance burden would the adopting team inherit?

### Exit
How difficult would replacing or migrating away from the project be?

## 7. MVP requirements

### Repository intake
- Accept and validate a public GitHub repository URL.
- Normalize supported GitHub URL forms.
- Resolve the default branch.
- Pin each analysis to a commit SHA.
- Handle missing, inaccessible, malformed, or oversized repositories gracefully.

### Evidence collection
- Read repository metadata and file inventory.
- Detect common documentation, license, CI, test, container, environment, and security-policy artifacts.
- Identify primary languages/framework indicators.
- Parse supported dependency manifests without running package managers.
- Preserve evidence links to GitHub where possible.

### Contextual review
- Support self-host, dependency, fork/customize, and contribute modes.
- Capture data sensitivity and team capacity.
- Generate deterministic findings from observable evidence.
- Keep deterministic facts separate from generated explanations.

### Decision report
- Produce a contextual recommendation.
- Display confidence and evidence coverage.
- Display blockers and unresolved questions.
- Provide evidence links.
- Provide an operational inventory.
- Provide a README claim ledger.

### UI/UX
- Landing/intake experience must work on desktop and mobile.
- Analysis progress must communicate what stage is running.
- Report should prioritize the decision and blockers before detailed evidence.
- Long file paths and repository names must not break mobile layouts.
- Keyboard navigation and visible focus states are required.
- Empty, loading, success, partial-data, rate-limit, and error states must be designed explicitly.

## 8. Security requirements

For the bootstrap/MVP phase:

- Do not clone and execute arbitrary repository code in the browser.
- Do not run `npm install`, `pip install`, tests, Makefiles, Dockerfiles, shell scripts, or repository-defined actions as part of analysis.
- Treat repository text as untrusted data when passed to an LLM.
- Do not expose discovered secrets in full.
- Do not place suspected secret values into prompts, analytics, logs, or reports.
- Pin reports to the analyzed commit so evidence remains reproducible.
- Clearly identify GitHub API limitations/rate limits to users.

Future sandbox execution requires a separate threat model and explicit acceptance criteria.

## 9. Initial technical direction

Bootstrap architecture:

- Responsive web frontend
- Read-only GitHub API integration
- Deterministic analysis/rule module
- Evidence and decision model separated from presentation
- GitHub Pages-compatible deployment for the early UI/product prototype

As analysis becomes deeper, move repository processing to an isolated backend worker rather than expanding privileged browser behavior.

## 10. Development workflow

During the current bootstrap phase, visible progress will be committed directly to `main` as requested.

Every development cycle should:

1. Select a defined milestone from this document or the development plan.
2. Implement one complete, testable slice.
3. Add/update automated tests for deterministic logic.
4. Validate JavaScript/build/runtime behavior.
5. Review desktop layout.
6. Review mobile layout.
7. Check loading/error/empty states affected by the slice.
8. Commit the working result to `main`.
9. Update `docs/DEVELOPMENT_PLAN.md` with status, validation evidence, known limitations, and next work.
10. Deploy only after the deployable slice passes its validation gate.

## 11. Definition of done for a product slice

A slice is complete only when:

- functionality is implemented rather than represented by a placeholder;
- deterministic logic has automated coverage where practical;
- failures are surfaced to the user;
- desktop and mobile layouts have been visually reviewed;
- accessibility basics are preserved;
- security boundaries above are not weakened;
- documentation reflects the current behavior;
- the repository contains the actual implementation and not only an external/local prototype.

## 12. Deferred features

Not part of the initial MVP:

- private repository access
- arbitrary repository execution
- automatic code modifications
- automatic pull requests
- GitLab/Bitbucket support
- organization-wide governance dashboards
- continuous monitoring
- universal language support
- public certification badges
- generic repository chat as the primary experience

## 13. Success criteria for the first usable release

A user can paste a public GitHub URL, state how they intend to use the project, and receive a responsive report that clearly answers:

1. What repository and commit were analyzed?
2. What does the repository appear to require operationally?
3. Which important repository claims are supported, unsupported, or unresolved?
4. What are the primary adoption blockers and unknowns?
5. How much ownership is the user likely to inherit?
6. Should the user Adopt, Pilot, Fork, Avoid, or gather more evidence?
7. What repository evidence supports that recommendation?

The report must be useful without requiring the user to trust an unexplained AI judgment.
