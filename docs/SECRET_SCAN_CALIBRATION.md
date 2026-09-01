# Credential Signal Calibration

> Analyzer change: `0.3.2`  
> Scope: bounded static inspection of selected repository text  
> Security posture: preserve high-confidence secret blocking while reducing placeholder and test-credential false positives

## Problems found by owner-wide calibration

The first owner-repository calibration run completed 15 non-empty public repositories and reproduced ForkWise's self-review failure. ForkWise returned `Avoid` for its own repository because the generic assignment matcher interpreted this disposable PostgreSQL CI value as exposed credential material:

```yaml
POSTGRES_PASSWORD: forkwise-test
```

The first fix changed ForkWise's self-review from `Avoid` to `Pilot`, then a second complete owner run exposed one remaining false positive in `unified-knowledge-base`:

```yaml
OPENAI_API_KEY: graphiti-smoke-not-used
```

That value exists only to satisfy a CI smoke-test interface while the model provider is disabled. It is explicitly marked `smoke` and `not-used`, so analyzer `0.3.2` recognizes those terms as placeholder evidence rather than a leaked OpenAI credential.

The former broad pattern also treated README placeholders, environment-variable references, explicit local-only database defaults, and CI-only passwords as equivalent to high-confidence provider tokens.

That conflated two different risks:

1. **Potential exposed credential material** — a literal with strong credential structure or high-confidence characteristics.
2. **Development/default credential configuration** — a known placeholder, variable reference, CI value, local-only default, or low-entropy literal that may still require deployment review but is not evidence of a leaked account credential.

## Calibrated model

`src/secret-scanner.js` now classifies candidates before the analyzer creates a finding.

### Exposed

Examples:

- non-placeholder GitHub, OpenAI-style, AWS, or Slack token signatures;
- high-entropy literals assigned to credential-like keys;
- literal credential values in production/deployment-oriented paths.

These continue to produce the critical, blocking `potential-secret` finding and an `Avoid` decision.

### Reference

Examples:

```text
${POSTGRES_PASSWORD}
${POSTGRES_PASSWORD:?required}
${{ secrets.PROVIDER_API_KEY }}
process.env.CLIENT_SECRET
<your-api-key>
```

References are not secret values and do not create a credential-exposure finding.

### Placeholder

Examples:

```text
forkwise-test
talk2data-local-only
ci-only-password
graphiti-smoke-not-used
sk-proj-xxxxxxxxxxxxxxxx
```

Explicit test, smoke, unused, CI, local, sample, dummy, fake, redacted, or replacement values are excluded from the critical secret rule.

### Literal development/default credential

A low-entropy literal that is neither a clear reference nor a known placeholder can be surfaced separately as a low-severity deployment-review finding. It must not be represented as proof that an external account credential was leaked.

## Regression requirements

The deterministic suite verifies that:

- test service passwords do not turn a healthy repository into `Avoid`;
- README API-key placeholders do not create credential findings;
- smoke-test keys explicitly marked unused do not create credential findings;
- environment references in production Compose files do not create credential findings;
- actual high-confidence tokens remain critical and blocking;
- complete report serialization continues to redact detected values;
- the owner-repository calibration workflow requires ForkWise's own default self-host review not to return `Avoid`.

## Interpretation boundary

Static matching cannot prove that a literal is active, valid, exploitable, or harmless. Classification is deliberately conservative:

- high-confidence literal evidence remains blocking;
- known references and explicit placeholders are not promoted into credential leaks;
- ambiguous defaults are separated for human deployment review;
- values are redacted before entering report evidence or exports.
