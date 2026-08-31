-- ForkWise hosted runner: request-bound execution leases and idempotent completion.
--
-- This migration is intentionally committed before Lovable deployment so the
-- production database change is reviewable and reproducible without spending
-- platform credits. Apply it through Lovable Cloud/Supabase when credits are
-- available, then deploy the matching API handler change.

ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS analysis_jobs_lease_expires_at_idx
  ON public.analysis_jobs (lease_expires_at)
  WHERE status = 'running';

-- Atomically claim either a queued job or a running job whose previous
-- serverless invocation lost its lease. Exactly one concurrent caller receives
-- a row; every other caller receives an empty result and must only read status.
CREATE OR REPLACE FUNCTION public.claim_analysis_job(
  p_job_id UUID,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS SETOF public.analysis_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seconds INTEGER := GREATEST(5, LEAST(COALESCE(p_lease_seconds, 60), 300));
BEGIN
  RETURN QUERY
  UPDATE public.analysis_jobs
  SET
    status = 'running',
    updated_at = now(),
    lease_token = gen_random_uuid(),
    lease_expires_at = now() + make_interval(secs => v_seconds),
    attempt_count = attempt_count + 1,
    progress = jsonb_build_object(
      'stage', 'starting',
      'message', 'Starting bounded static analysis',
      'percent', 5
    ),
    error = NULL
  WHERE id = p_job_id
    AND expires_at > now()
    AND (
      status = 'queued'
      OR (
        status = 'running'
        AND (lease_expires_at IS NULL OR lease_expires_at <= now())
      )
    )
  RETURNING *;
END;
$$;

-- Progress writes also renew the lease. A token from a stale invocation cannot
-- update a job after a newer request has reclaimed it.
CREATE OR REPLACE FUNCTION public.update_analysis_progress(
  p_job_id UUID,
  p_lease_token UUID,
  p_progress JSONB,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
  v_seconds INTEGER := GREATEST(5, LEAST(COALESCE(p_lease_seconds, 60), 300));
BEGIN
  UPDATE public.analysis_jobs
  SET
    updated_at = now(),
    lease_expires_at = now() + make_interval(secs => v_seconds),
    progress = COALESCE(p_progress, progress)
  WHERE id = p_job_id
    AND status = 'running'
    AND lease_token = p_lease_token
    AND expires_at > now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- Persist the report and complete the job in one transaction. ON CONFLICT makes
-- retries harmless: at most one report row exists for each job. The lease token
-- prevents a late/stale invocation from replacing a newer result.
CREATE OR REPLACE FUNCTION public.complete_analysis_job(
  p_job_id UUID,
  p_lease_token UUID,
  p_report JSONB,
  p_commit_sha TEXT,
  p_analyzer_version TEXT DEFAULT 'forkwise-hosted/0.1.0',
  p_schema_version TEXT DEFAULT 'forkwise-report/v1'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.analysis_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job
  FROM public.analysis_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_job.status = 'completed' THEN
    RETURN TRUE;
  END IF;

  IF v_job.status <> 'running' OR v_job.lease_token IS DISTINCT FROM p_lease_token THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.analysis_reports (
    job_id,
    repository_url,
    commit_sha,
    report,
    analyzer_version,
    schema_version,
    expires_at
  ) VALUES (
    p_job_id,
    v_job.repository_url,
    p_commit_sha,
    p_report,
    p_analyzer_version,
    p_schema_version,
    v_job.expires_at
  )
  ON CONFLICT (job_id) DO UPDATE SET
    updated_at = now(),
    commit_sha = EXCLUDED.commit_sha,
    report = EXCLUDED.report,
    analyzer_version = EXCLUDED.analyzer_version,
    schema_version = EXCLUDED.schema_version,
    expires_at = EXCLUDED.expires_at;

  UPDATE public.analysis_jobs
  SET
    status = 'completed',
    updated_at = now(),
    completed_at = COALESCE(completed_at, now()),
    commit_sha = p_commit_sha,
    lease_token = NULL,
    lease_expires_at = NULL,
    error = NULL,
    progress = jsonb_build_object(
      'stage', 'completed',
      'message', 'Report ready',
      'percent', 100
    )
  WHERE id = p_job_id
    AND lease_token = p_lease_token;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_analysis_job(
  p_job_id UUID,
  p_lease_token UUID,
  p_error JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.analysis_jobs
  SET
    status = 'failed',
    updated_at = now(),
    completed_at = now(),
    lease_token = NULL,
    lease_expires_at = NULL,
    error = COALESCE(p_error, jsonb_build_object(
      'code', 'analysis_failed',
      'message', 'The analysis runner could not complete this review.',
      'retryable', false
    )),
    progress = jsonb_build_object(
      'stage', 'failed',
      'message', COALESCE(p_error->>'message', 'Analysis failed'),
      'percent', 100
    )
  WHERE id = p_job_id
    AND status = 'running'
    AND lease_token = p_lease_token;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_analysis_job(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_analysis_progress(UUID, UUID, JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_analysis_job(UUID, UUID, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_analysis_job(UUID, UUID, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_analysis_job(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_analysis_progress(UUID, UUID, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_analysis_job(UUID, UUID, JSONB, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_analysis_job(UUID, UUID, JSONB) TO service_role;

COMMENT ON FUNCTION public.claim_analysis_job(UUID, INTEGER) IS
  'Atomically claims a queued or stale-running ForkWise analysis job for request-bound execution.';
COMMENT ON FUNCTION public.complete_analysis_job(UUID, UUID, JSONB, TEXT, TEXT, TEXT) IS
  'Idempotently persists one report per analysis job and marks the matching lease completed.';
