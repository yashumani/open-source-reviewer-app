# ForkWise — Open Source Reviewer

> **Community Preview:** a GitHub-native, evidence-first workspace for deciding whether a public repository should be **Adopted, Piloted, Forked, Avoided, or reviewed again with more evidence**.

- Live reviewer: <https://yashumani.github.io/open-source-reviewer-app/>
- Runner console: <https://yashumani.github.io/open-source-reviewer-app/operator.html>
- Community guide: [`docs/COMMUNITY_PREVIEW.md`](docs/COMMUNITY_PREVIEW.md)
- Current version: `0.9.0`
- License: [Apache License 2.0](LICENSE)

ForkWise pins a repository to an exact commit, inspects bounded static evidence, compares README claims with implementation signals, applies the user's intended use and constraints, and returns an auditable adoption recommendation. It does not assign a generic popularity score and does not execute repository-controlled code.

## Community preview status

| Surface | Status |
| --- | --- |
| GitHub Pages reviewer | Live; browser-side bounded static analysis |
| GitHub-native interface | Live and responsive-validated |
| Public issue and pull-request workflow | Open for scoped contributions |
| Project license | Apache-2.0 |
| Hosted runner health/schema | Live |
| Hosted analysis lifecycle | Not active; accepted jobs remain blocked pending issue #3 |
| Production/general availability | Not declared |

The website is ready for public product testing, false-positive and false-negative reports, analyzer-rule proposals, documentation work, accessibility feedback, and scoped code contributions. Do not submit private repositories, credentials, personal data, regulated data, or public exploit details.

## Repository-native experience

ForkWise uses familiar maintainer mental models:

- README-style product and scope overview;
- adoption-check composer for repository context;
- Actions-style analysis progress;
- checks-style recommendation summary;
- issue-like findings;
- review ledger for README claims;
- file and metadata evidence pinned to a commit;
- About-style repository facts;
- merge-readiness pilot checklist;
- Actions-style runner operator console.

## What ForkWise evaluates

- **Fit** — whether the project appears to match the intended use.
- **Trust** — license, security, dependency, release, and governance signals.
- **Run** — runtimes, databases, queues, storage, credentials, deployment, and external services.
- **Own** — maintenance burden, technical complexity, tests, documentation, and maintainer concentration.
- **Exit** — portability, data export, replaceability, and lock-in indicators.

A key capability is **README Reality Check**, which separates supported, partial, unverified, contradicted, and unclaimed statements.

## Current analysis boundary

The public reviewer supports public `github.com` repositories and performs bounded, read-only static inspection. It does **not** run repository-controlled:

- package installation or lifecycle scripts;
- tests or builds;
- shell scripts or Makefiles;
- Dockerfiles or containers;
- GitHub Actions workflows;
- arbitrary HTML, JavaScript, binaries, or application code.

Static signals do not prove runtime behavior, exploitability, legal compliance, or production fitness. ForkWise is decision support, not a security certification or legal opinion.

## Contribute

Start here:

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md).
2. Follow [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
3. Choose an issue form or a scoped `good first issue` / `help wanted` item.
4. Submit a focused pull request with deterministic tests and DCO sign-off.

Community documents:

- [Governance](GOVERNANCE.md)
- [Support](SUPPORT.md)
- [Security reporting](SECURITY.md)
- [Community preview guide](docs/COMMUNITY_PREVIEW.md)
- [Maintainer guide](docs/MAINTAINER_GUIDE.md)
- [Repository settings manifest](docs/REPOSITORY_SETTINGS.md)

## Policies

- [Privacy Notice](PRIVACY.md)
- [Community Preview Terms](TERMS.md)
- [Acceptable Use](ACCEPTABLE_USE.md)
- [Apache License 2.0](LICENSE)
- [Notice](NOTICE)

## Run locally

Requires Node.js 22 or newer. GitHub Actions uses Node.js 24.

```bash
npm run validate
npm run serve
```

Open:

- reviewer: `http://127.0.0.1:4173`
- operator console: `http://127.0.0.1:4173/operator.html`

Optional responsive validation:

```bash
python3 -m pip install playwright==1.55.0
npm run validate:ui
```

## Validation

```bash
npm run check:syntax
npm run check:static
npm run check:contracts
npm run check:community
npm test
npm run build
npm run validate
```

Infrastructure-specific gates also validate PostgreSQL lease semantics, the hardened container, request-bound runner behavior, hosted health, and Pages deployment.

## Repository map

```text
.
├── index.html / styles.css             # GitHub-native reviewer
├── operator.html / operator.css        # Actions-style runner console
├── src/                                # Browser analyzer, report, runner client
├── server/                             # Request-bound reference runner
├── supabase/migrations/                # Baseline and lease contracts
├── tests/                              # Deterministic application and community tests
├── scripts/                            # Build, contract, community, smoke, visual checks
├── .github/ISSUE_TEMPLATE/             # Structured public feedback intake
├── docs/                               # Plans, evidence, ADRs, operations, community guides
├── LICENSE / NOTICE                    # Apache-2.0 distribution terms
└── CODE_OF_CONDUCT.md / GOVERNANCE.md  # Community governance
```

## Hosted runner status

The hosted API shell and database baseline exist, but the deployed fire-and-forget handler does not yet progress accepted jobs beyond `queued`. The lease-based fix is prepared and tested in this repository. The public reviewer stays on its validated browser-analysis path until issue #3 passes the full hosted lifecycle and issue #4 explicitly activates it.

## Known limitations

- Public GitHub repositories only.
- GitHub anonymous API limits apply.
- Static indicators cannot prove runtime behavior or absence of vulnerabilities.
- Private advisories, organization settings, and complete repository history are not comprehensively assessed.
- Hosted analysis is not active for normal reviewer traffic.
- Authentication, durable production workers, operational alerts, and hosted retention controls remain production work.

See [`docs/MASTER_DEVELOPMENT_PLAN.md`](docs/MASTER_DEVELOPMENT_PLAN.md), [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md), and [`docs/GO_LIVE_CHECKLIST.md`](docs/GO_LIVE_CHECKLIST.md) for execution evidence and remaining production gates.
