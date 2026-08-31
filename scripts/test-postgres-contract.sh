#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to a disposable PostgreSQL database}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL=(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;
SQL

for migration in \
  "$ROOT/supabase/migrations/20260830_forkwise_runner_schema.sql" \
  "$ROOT/supabase/migrations/20260831_request_bound_execution.sql"
do
  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done

"${PSQL[@]}" <<'SQL'
DO $$
DECLARE
  missing TEXT[];
  policy_count INTEGER;
  rls_count INTEGER;
BEGIN
  SELECT array_agg(expected.name ORDER BY expected.name)
  INTO missing
  FROM (VALUES
    ('attempt_count'),
    ('lease_expires_at'),
    ('lease_token')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'analysis_jobs'
      AND c.column_name = expected.name
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing analysis_jobs columns: %', missing;
  END IF;

  SELECT count(*) INTO rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('analysis_jobs', 'analysis_reports')
    AND c.relrowsecurity;
  IF rls_count <> 2 THEN
    RAISE EXCEPTION 'RLS must be enabled on both tables; found %', rls_count;
  END IF;

  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('analysis_jobs', 'analysis_reports');
  IF policy_count <> 0 THEN
    RAISE EXCEPTION 'Browser policies must remain absent; found %', policy_count;
  END IF;

  IF NOT has_function_privilege('service_role', 'public.claim_analysis_job(uuid,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute claim_analysis_job';
  END IF;
  IF has_function_privilege('anon', 'public.claim_analysis_job(uuid,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute claim_analysis_job';
  END IF;
END
$$;
SQL

JOB_ID="$(${PSQL[@]} -Atc "INSERT INTO public.analysis_jobs (repository_url, repository_key, context, context_hash, client_request_id) VALUES ('https://github.com/octocat/Hello-World', 'octocat/hello-world', '{\"intent\":\"self-host\"}'::jsonb, 'context-hash', 'postgres-contract') RETURNING id;")"

if [[ ! "$JOB_ID" =~ ^[0-9a-f-]{36}$ ]]; then
  echo "Invalid job id from database: $JOB_ID" >&2
  exit 1
fi

# Simultaneous claims prove that the UPDATE predicate is atomic: exactly one
# caller receives a row while the other observes an active lease.
(${PSQL[@]} -Atc "SELECT count(*) FROM public.claim_analysis_job('$JOB_ID'::uuid, 60);" > /tmp/forkwise-claim-a.txt) &
PID_A=$!
(${PSQL[@]} -Atc "SELECT count(*) FROM public.claim_analysis_job('$JOB_ID'::uuid, 60);" > /tmp/forkwise-claim-b.txt) &
PID_B=$!
wait "$PID_A" "$PID_B"

CLAIMS="$(cat /tmp/forkwise-claim-a.txt /tmp/forkwise-claim-b.txt | tr -d '[:space:]' | fold -w1 | sort | tr -d '\n')"
if [[ "$CLAIMS" != "01" ]]; then
  echo "Expected one successful and one rejected concurrent claim; got $(cat /tmp/forkwise-claim-a.txt) / $(cat /tmp/forkwise-claim-b.txt)" >&2
  exit 1
fi

LEASE_TOKEN="$(${PSQL[@]} -Atc "SELECT lease_token FROM public.analysis_jobs WHERE id = '$JOB_ID'::uuid;")"
if [[ ! "$LEASE_TOKEN" =~ ^[0-9a-f-]{36}$ ]]; then
  echo "Claim did not return a valid lease token" >&2
  exit 1
fi

WRONG_TOKEN="00000000-0000-4000-8000-000000000000"
WRONG_RESULT="$(${PSQL[@]} -Atc "SELECT public.complete_analysis_job('$JOB_ID'::uuid, '$WRONG_TOKEN'::uuid, '{}'::jsonb, repeat('a', 40));")"
if [[ "$WRONG_RESULT" != "f" ]]; then
  echo "A stale/wrong lease unexpectedly completed the job" >&2
  exit 1
fi

PROGRESS_RESULT="$(${PSQL[@]} -Atc "SELECT public.update_analysis_progress('$JOB_ID'::uuid, '$LEASE_TOKEN'::uuid, '{\"stage\":\"analysis\",\"message\":\"running\",\"percent\":75}'::jsonb, 60);")"
if [[ "$PROGRESS_RESULT" != "t" ]]; then
  echo "Matching lease could not renew progress" >&2
  exit 1
fi

COMPLETE_RESULT="$(${PSQL[@]} -Atc "SELECT public.complete_analysis_job('$JOB_ID'::uuid, '$LEASE_TOKEN'::uuid, '{\"schemaVersion\":\"forkwise-report/v1\",\"execution\":\"static-only\"}'::jsonb, repeat('b', 40));")"
if [[ "$COMPLETE_RESULT" != "t" ]]; then
  echo "Matching lease failed to complete the job" >&2
  exit 1
fi

# Completion is idempotent and report uniqueness is enforced by job_id.
SECOND_COMPLETE="$(${PSQL[@]} -Atc "SELECT public.complete_analysis_job('$JOB_ID'::uuid, '$LEASE_TOKEN'::uuid, '{\"schemaVersion\":\"forkwise-report/v1\"}'::jsonb, repeat('b', 40));")"
REPORT_COUNT="$(${PSQL[@]} -Atc "SELECT count(*) FROM public.analysis_reports WHERE job_id = '$JOB_ID'::uuid;")"
STATUS="$(${PSQL[@]} -Atc "SELECT status FROM public.analysis_jobs WHERE id = '$JOB_ID'::uuid;")"

if [[ "$SECOND_COMPLETE" != "t" || "$REPORT_COUNT" != "1" || "$STATUS" != "completed" ]]; then
  echo "Idempotent completion contract failed: second=$SECOND_COMPLETE reports=$REPORT_COUNT status=$STATUS" >&2
  exit 1
fi

# Direct browser roles must not have table privileges.
if ${PSQL[@]} -c "SET ROLE anon; SELECT count(*) FROM public.analysis_jobs;" >/tmp/forkwise-anon-read.txt 2>&1; then
  echo "anon unexpectedly read analysis_jobs" >&2
  exit 1
fi

# Expired records are removable through the service-only retention function.
EXPIRED_ID="$(${PSQL[@]} -Atc "INSERT INTO public.analysis_jobs (repository_url, repository_key, context_hash, expires_at) VALUES ('https://github.com/octocat/expired', 'octocat/expired', 'expired', now() - interval '1 minute') RETURNING id;")"
PURGED="$(${PSQL[@]} -Atc "SELECT public.purge_expired_analyses();")"
EXPIRED_COUNT="$(${PSQL[@]} -Atc "SELECT count(*) FROM public.analysis_jobs WHERE id = '$EXPIRED_ID'::uuid;")"
if [[ "$PURGED" -lt 1 || "$EXPIRED_COUNT" != "0" ]]; then
  echo "Retention cleanup contract failed: purged=$PURGED remaining=$EXPIRED_COUNT" >&2
  exit 1
fi

echo "PostgreSQL contract passed: schema, RLS, privileges, atomic claims, lease renewal, idempotent completion, report uniqueness, and retention cleanup."
