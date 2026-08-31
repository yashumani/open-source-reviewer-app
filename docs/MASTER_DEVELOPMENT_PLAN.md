# Open Source Reviewer — Master Development Plan

> **Purpose:** execution evidence for building, validating, releasing, and governing ForkWise. This is not the product-requirements document.  
> **Plan version:** 1.7  
> **Working method:** feature branch → pull request → required checks → merge → Pages deploy  
> **Last updated:** 2026-08-31

## Status legend

- ⬜ Not started
- 🟡 Implemented or in validation
- ✅ Complete with repository or deployment evidence
- 🔴 Blocked by a known external, administrative, or release dependency

## Master execution board

| # | Development checkpoint | Status | Primary evidence / exit gate |
| ---: | --- | :---: | --- |
| 01 | Repository development governance | ✅ | README, requirements, development docs |
| 02 | Master execution plan | ✅ | Auditable execution board |
| 03 | Runnable application skeleton | ✅ | Static application and build |
| 04 | Responsive design system | ✅ | Desktop/tablet/mobile validation |
| 05 | Repository intake workflow | ✅ | URL, intent, context controls |
| 06 | GitHub URL normalization | ✅ | Deterministic parser tests |
| 07 | Read-only GitHub retrieval | ✅ | Default branch, commit, tree, provider errors |
| 08 | Analysis progress UX | ✅ | Explicit stages and statuses |
| 09 | Artifact inventory | ✅ | Deterministic classifier tests |
| 10 | Language/framework detection | ✅ | Evidence-derived technology signals |
| 11 | Evidence/finding schemas | ✅ | Stable schema and reference validation |
| 12 | Documentation/license analyzer | ✅ | Deterministic rules and evidence |
| 13 | Testing/CI analyzer | ✅ | Test/CI signals without fabricated coverage |
| 14 | Deployment/operations analyzer | ✅ | Runtime and operational inventory |
| 15 | External-service/telemetry analyzer | ✅ | Static indicators with uncertainty |
| 16 | Security-posture analyzer | ✅ | Governance/workflow/redaction rules |
| 17 | README Reality Check | ✅ | Claim ledger and state tests |
| 18 | Fit/Trust/Run/Own/Exit model | ✅ | Contextual dimensions |
| 19 | Contextual decision engine | ✅ | Adopt/Pilot/Fork/Avoid/Insufficient Evidence |
| 20 | Executive review dashboard | ✅ | Decision-first responsive report |
| 21 | Evidence explorer | ✅ | Search, filters, links, details |
| 22 | Report export and pilot checklist | ✅ | JSON/Markdown provenance |
| 23 | Full quality/security validation | ✅ | Automated CI and responsive checks |
| 24 | Browser preview deployment | ✅ | Live GitHub Pages reviewer |
| 25 | Runner architecture | ✅ | Static-only request/job model |
| 26 | Analysis API | ✅ | Health, stats, submit, status, report routes |
| 27 | Job queue | ✅ | Bounded queue and failure handling |
| 28 | Static-analysis worker | ✅ | Timeout and analyzer reuse |
| 29 | Report/job persistence | ✅ | Atomic local/memory stores |
| 30 | Web-to-runner integration | 🟡 | Client complete; activation gated on hosted lifecycle |
| 31 | Backend hosting provisioned | ✅ | Published Lovable shell |
| 32 | Hosted datastore baseline | ✅ | PostgreSQL jobs/reports, RLS, indexes, retention |
| 33 | Authentication, quotas, abuse controls | 🟡 | Anonymous controls exist; identity tiers remain |
| 34 | Strong worker isolation | 🟡 | Hardened reference container; distributed worker remains |
| 35 | Activate hosted runner in reviewer | 🔴 | Blocked by hosted lifecycle |
| 36 | Production observability/operations | 🟡 | Console/runbooks/spec exist; live alerts/drills remain |
| 37 | Security/privacy/legal readiness | 🟡 | Community policies complete; hosted approval remains |
| 38 | Production release gate | 🔴 | Hosted analysis is not complete |
| 39 | Request-bound lease reference | ✅ | Lease runner and exact route prefixes |
| 40 | Hosted database/handler handoff | ✅ | Migration and deployment guide |
| 41 | Layered runner CI gates | ✅ | Local lifecycle, hosted health, opt-in full lifecycle |
| 42 | Deploy request-bound execution to Lovable | 🔴 | Credit-dependent issue #3 |
| 43 | Hosted lifecycle verification/UI activation | ⬜ | Full smoke and issue #4 |
| 44 | Formal API/report contracts | ✅ | OpenAPI 3.1 and JSON Schemas |
| 45 | Executable PostgreSQL contract | ✅ | PostgreSQL 16 schema/RLS/lease/idempotency tests |
| 46 | Hardened hosting-neutral container | ✅ | Non-root/read-only/cap-drop lifecycle |
| 47 | Dormant hosted adapter/runtime | ✅ | Adapter tests; hosted mode statically off |
| 48 | Workflow supply-chain hardening | ✅ | Immutable action SHAs and Dependabot |
| 49 | Privacy/observability/go-live governance | ✅ | Drafts, specs, ADRs, checklist |
| 50 | Credit-free readiness release | ✅ | Core workflows and Pages passed |
| 51 | Apache-2.0 project licensing | ✅ | LICENSE, NOTICE, package metadata, ADR, GitHub recognition |
| 52 | Community governance and policies | ✅ | Conduct, governance, support, privacy, terms, AUP, security |
| 53 | Structured contribution intake | ✅ | CODEOWNERS, PR template, six issue forms |
| 54 | Community-readiness validation | ✅ | 23-file contract, 82 tests, Quality run 33445387103 |
| 55 | Crowdsourcing starter backlog | ✅ | Twelve scoped issues #14–#25 |
| 56 | Repository metadata and main protection | 🔴 | Administrator settings; issue #11 |
| 57 | ForkWise Community Preview release | ✅ | Commit ae8db8a, Pages run 33445387099, release evidence |
| 58 | Hosted beta and production GA | 🔴 | Issues #3–#5 and hosted release checklist |

## Release tracks

### Community Preview — live

The public browser reviewer, license, policies, issue forms, pull-request workflow, starter backlog, deterministic validation, and Pages deployment are complete. See [`COMMUNITY_READINESS_EVIDENCE.md`](COMMUNITY_READINESS_EVIDENCE.md).

### Hosted beta — blocked

The Lovable handler must adopt the prepared lease-based request-bound implementation and pass the real hosted lifecycle before the reviewer can switch from browser analysis.

### General availability — not approved

Identity, durable workers, operational metrics/alerts, retention scheduling, backup/restore, incident drills, implementation-matched legal/privacy approval, and protected release governance remain.

## Security boundary

- Repository-controlled packages, tests, builds, scripts, Dockerfiles, Makefiles, workflows, HTML, JavaScript, binaries, and application code are not executed.
- Request, tree, file, content, time, and report limits remain bounded.
- Public errors and evidence excerpts remain redacted.
- Hosted mode cannot be enabled accidentally without failing static validation.
- Community contributions must preserve commit-pinned evidence and conclusions no stronger than their sources.

## Current external and administrative blockers

- Issue #3: credit-enabled Lovable request-bound deployment.
- Issue #4: hosted reviewer activation after lifecycle success.
- Issue #5: production hardening.
- Issue #9: hosted privacy/retention/legal approval.
- Issue #11: administrator must configure About metadata, private vulnerability reporting, merge preferences, and `main` protection.

## Evidence package for every future cycle

1. Commit SHA and files changed.
2. Automated test commands and passed/failed counts.
3. Syntax, static, contract, community, and build results.
4. Database/container/runner evidence where applicable.
5. Desktop/mobile and error-state evidence where applicable.
6. Security-boundary result.
7. Deployment workflow and live URL when applicable.
8. Known limitations and unresolved decisions.
9. Updated checkpoint status.
10. Exact next checkpoint.
