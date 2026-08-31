# ADR 0003 — License ForkWise under Apache License 2.0

- Status: Accepted
- Date: 2026-08-31
- Decision owner: Project maintainer

## Context

ForkWise is being opened for community testing and contribution. The repository needs explicit terms for use, modification, redistribution, contribution, and patent rights.

## Decision

License the project under the Apache License, Version 2.0. Contributions accepted through the repository are made under the same license. Contributor commits use Developer Certificate of Origin sign-off rather than a separate contributor license agreement during the community-preview phase.

## Rationale

Apache-2.0:

- permits commercial and non-commercial use;
- permits modification and redistribution;
- includes an explicit patent license and patent-termination provision;
- requires preservation of license and notice information;
- is familiar to enterprise and developer-tool communities;
- does not require downstream applications to publish proprietary modifications solely because they use ForkWise.

## Consequences

- A root `LICENSE` and `NOTICE` are required.
- Package metadata and documentation identify `Apache-2.0`.
- Contributions must be compatible with Apache-2.0.
- Third-party assets and copied code require compatible licensing and attribution.
- The ForkWise name and marks are not licensed as trademarks beyond customary attribution.
