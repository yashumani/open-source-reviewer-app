# Analyzer Rules

The v0.3 analyzer is deterministic. Repository facts are collected first; context changes applicability and the final recommendation, not the underlying facts.

## Evidence families

- Repository state and maintenance recency.
- README and supporting documentation.
- License file and GitHub SPDX metadata.
- Test-oriented paths, CI workflows, and explicit coverage artifacts.
- Docker, Compose, Kubernetes, Helm, Terraform, environment templates, migrations, backup/recovery docs, and export/API artifacts.
- Dependency manifests, lockfiles, Dependabot/Renovate, CodeQL/security workflow indicators.
- Supported external-service, telemetry, cloud, payment, hosted-backend, and AI API indicators.
- Tracked `.env` files and high-risk credential-like text patterns.
- Mutable GitHub Actions references.
- Contributor governance files.

## README Reality Check

The initial claim families are:

1. Fully self-hosted.
2. Docker/easy container deployment.
3. Production ready.
4. Privacy focused/no telemetry.
5. Easy or quick setup.
6. No vendor lock-in/easy migration.

States:

- **Verified** — claim detected and supporting evidence observed.
- **Partial** — relevant evidence exists, but the complete claim is not established.
- **Unverified** — claim detected without sufficient supporting evidence.
- **Contradicted** — inspected evidence creates a material conflict or exception.
- **Not claimed** — the primary README did not make the claim.

## Contextual dimensions

- **Fit** — purpose, documentation, packaging, contributor path, and claim alignment.
- **Trust** — license, repository state, security governance, dependencies, CI, secrets, and supply-chain signals.
- **Run** — deployment artifacts, configuration, data services, ports, external integrations, and resilience guidance.
- **Own** — maintenance cadence, tests, documentation, technology breadth, and likely internal support burden.
- **Exit** — export/import/migration and API portability signals.

## Decision precedence

1. Disabled/archived states and critical blockers can force **Avoid**.
2. Very low evidence coverage produces **Insufficient evidence**.
3. Fork intent plus high ownership burden can produce **Fork**.
4. Blocking/high-risk combinations, many medium concerns, or reduced coverage produce **Pilot**.
5. Otherwise the result is **Adopt**.

License absence is critical for normal adoption but treated as a medium concern in contribution mode. External-service indicators become blocking when the user prohibits external services. Missing security governance becomes blocking for regulated-data context.

## Coverage and confidence

Coverage is based on the presence of independent evidence families, not repository popularity. A GitHub-truncated tree caps coverage at 68%; reading fewer than three selected artifacts caps it at 56%.

- High confidence: at least 80% coverage and a non-truncated tree.
- Medium confidence: at least 55% coverage.
- Low confidence: less than 55% coverage.

## Non-claims

The analyzer does not claim to prove:

- exploitability or absence of vulnerabilities;
- runtime network behavior;
- performance or scalability;
- true test coverage without a valid report;
- legal license compatibility;
- maintainer intent or future responsiveness;
- production readiness based solely on file presence.

## Credential candidate classification

The critical `potential-secret` rule is reserved for high-confidence structured tokens, high-entropy credential literals, and literal production/deployment credentials. Environment references, secret-store expressions, explicit placeholders, CI-only values, and local-only examples are not evidence of an exposed external credential. Ambiguous literal defaults can be surfaced separately for deployment review. See [`SECRET_SCAN_CALIBRATION.md`](SECRET_SCAN_CALIBRATION.md).

