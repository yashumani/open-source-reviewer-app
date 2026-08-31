# ADR 0001: Request-bound execution as the hosted beta bridge

- **Status:** Accepted for preparation; production deployment pending
- **Date:** 2026-08-31

## Context

The initial Lovable/serverless handler persists a queued job and starts analysis in an unawaited promise. The serverless request may terminate before that promise completes, leaving jobs permanently queued. A dedicated durable worker is the preferred production architecture but requires additional hosting, operations, and cost decisions.

## Decision

For the limited hosted beta, the first claimable job-status request will:

1. atomically claim a queued or stale-running job in PostgreSQL;
2. receive an expiring lease token;
3. await the bounded static analysis inside the request;
4. renew the lease with progress updates;
5. idempotently persist one report and complete the matching lease;
6. return a terminal or current state.

## Consequences

### Positive

- works within the existing serverless request lifecycle;
- is deterministic and testable without a separate queue vendor;
- prevents concurrent duplicate execution;
- recovers jobs after an invocation is terminated;
- preserves the existing asynchronous client contract.

### Negative

- a status request can remain open for the duration of analysis;
- serverless request limits constrain repository-analysis duration;
- throughput and fairness are weaker than a true worker queue;
- clients must poll to trigger execution;
- lease recovery may repeat bounded GitHub reads after a terminated request.

## Guardrails

- static-only repository inspection;
- hard analysis deadline;
- bounded tree, file, byte, and report sizes;
- matching lease token required for progress/completion/failure;
- one report per job;
- no automatic UI activation until the hosted lifecycle smoke is green.

## Supersession condition

Replace this bridge with a durable queue/worker when authenticated usage, multi-instance scale, predictable latency, retry policy, or stronger isolation becomes a release requirement.
