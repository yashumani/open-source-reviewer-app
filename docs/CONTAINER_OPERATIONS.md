# ForkWise Runner Container Operations

The repository includes a production-oriented container for the dependency-free Node reference runner. It gives the project a hosting-neutral fallback and validates the runtime boundary without requiring Lovable credits.

## Build

```bash
docker build -t forkwise-runner:local .
```

## Run with a persistent report volume

```bash
docker compose up --build
```

The local API listens at:

```text
http://127.0.0.1:8787
http://127.0.0.1:8787/functions/v1/review-api
```

## Hardened defaults

The image and Compose configuration use:

- the unprivileged `node` user;
- a read-only root filesystem;
- a dedicated writable `/data` volume;
- a small writable `/tmp` tmpfs;
- all Linux capabilities dropped;
- `no-new-privileges`;
- PID, CPU, and memory limits;
- a health check against the API contract.

The static analyzer still needs outbound HTTPS access to `api.github.com` for public repository metadata and content. The application code does not follow repository-controlled network destinations and does not execute repository code.

## Data volume

The local reference runner writes atomic JSON job and report files below `/data`. That store is suitable for single-instance development and demonstrations only. It does not provide distributed locks, database durability, authenticated tenancy, or production retention automation.

For a multi-instance service, use the PostgreSQL lease/claim contract in `supabase/migrations/` or another transactional datastore with equivalent semantics.

## Deterministic container verification

GitHub Actions builds the image, runs the deterministic contract server inside the container, verifies non-root/read-only/capability settings, and completes a queued job through the exact hosted API prefix.

The CI path intentionally avoids live GitHub analysis so packaging regressions are deterministic. Public provider behavior is tested separately through bounded smoke tests.

## Production deployment considerations

Before deploying this image publicly:

1. Put it behind TLS and a reverse proxy or managed ingress.
2. Configure an explicit origin allowlist.
3. Replace local file persistence with a transactional database.
4. Add authenticated quotas and provider credentials.
5. Restrict outbound traffic to required provider endpoints where the platform permits.
6. Add centralized structured logs, metrics, alerting, backup, and rollback.
7. Preserve the static-only boundary unless a separate dynamic-execution threat model is approved.
