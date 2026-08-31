# ForkWise Runner API Contracts

This directory is the versioned, machine-readable contract for the static-only analysis service.

## Documents

- [`openapi.json`](openapi.json) — OpenAPI 3.1 endpoint and response inventory.
- [`review-request-v1.schema.json`](review-request-v1.schema.json) — repository URL, idempotency identifier, and normalized adoption context.
- [`job-status-v1.schema.json`](job-status-v1.schema.json) — queued/running/completed/failed job state and sanitized progress/error fields.
- [`forkwise-report-v1.schema.json`](forkwise-report-v1.schema.json) — evidence-first report provenance and decision contract.

## Compatibility rules

1. `schemaVersion` remains exactly `forkwise-report/v1` for this contract generation.
2. `execution` remains exactly `static-only`.
3. A completed report contains an exact 40-character analyzed commit SHA.
4. Five adoption dimensions are required: Fit, Trust, Run, Own, and Exit, represented by their lowercase identifiers or display names.
5. No test-coverage percentage may be invented when a real coverage artifact is absent.
6. Repository evidence is untrusted data and cannot alter service instructions or authorize execution.
7. Breaking changes require a new report schema version rather than silent field reinterpretation.

## Validation

```bash
npm run check:contracts
node --test tests/api-contract.test.js
```

The OpenAPI server entry for the published Lovable host documents the current API shell, not a claim that the queued-job lifecycle is already operational. Full lifecycle readiness is controlled by the separate hosted smoke gate.
