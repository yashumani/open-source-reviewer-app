-- ForkWise Runner baseline schema.
-- Mirrors the Lovable/Supabase database provisioned for the hosted beta.
-- This migration is idempotent so CI can build a clean database and operators
-- can audit the expected production contract.

CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  repository_url TEXT NOT NULL,
  repository_key TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress JSONB NOT NULL DEFAULT '{"stage":"queued","message":"Job accepted","percent":0}'::jsonb,
  error JSONB,
  analyzer_version TEXT NOT NULL DEFAULT 'forkwise-hosted/0.1.0',
  schema_version TEXT NOT NULL DEFAULT 'forkwise-report/v1',
  commit_sha TEXT,
  client_request_id TEXT,
  client_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT analysis_jobs_status_check CHECK (status IN ('queued', 'running', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  repository_url TEXT NOT NULL,
  commit_sha TEXT,
  report JSONB NOT NULL,
  analyzer_version TEXT NOT NULL DEFAULT 'forkwise-hosted/0.1.0',
  schema_version TEXT NOT NULL DEFAULT 'forkwise-report/v1',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT analysis_reports_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS analysis_jobs_status_idx ON public.analysis_jobs (status);
CREATE INDEX IF NOT EXISTS analysis_jobs_created_at_idx ON public.analysis_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_jobs_expires_at_idx ON public.analysis_jobs (expires_at);
CREATE INDEX IF NOT EXISTS analysis_jobs_client_request_id_idx ON public.analysis_jobs (client_request_id);
CREATE INDEX IF NOT EXISTS analysis_jobs_idempotency_idx
  ON public.analysis_jobs (client_request_id, repository_key, context_hash);
CREATE INDEX IF NOT EXISTS analysis_jobs_client_hash_idx
  ON public.analysis_jobs (client_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_reports_expires_at_idx ON public.analysis_reports (expires_at);
CREATE INDEX IF NOT EXISTS analysis_reports_created_at_idx ON public.analysis_reports (created_at DESC);

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies are intentionally created. Direct browser
-- access is denied; the server-side service role is the only application path.
GRANT ALL ON public.analysis_jobs TO service_role;
GRANT ALL ON public.analysis_reports TO service_role;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_jobs_touch_updated_at ON public.analysis_jobs;
CREATE TRIGGER analysis_jobs_touch_updated_at
BEFORE UPDATE ON public.analysis_jobs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS analysis_reports_touch_updated_at ON public.analysis_reports;
CREATE TRIGGER analysis_reports_touch_updated_at
BEFORE UPDATE ON public.analysis_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.purge_expired_analyses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_jobs INTEGER;
BEGIN
  DELETE FROM public.analysis_reports WHERE expires_at < now();
  DELETE FROM public.analysis_jobs WHERE expires_at < now();
  GET DIAGNOSTICS deleted_jobs = ROW_COUNT;
  RETURN deleted_jobs;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_analyses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_analyses() TO service_role;
